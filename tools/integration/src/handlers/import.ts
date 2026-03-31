import * as validators from '../validators';

import Handlebars from 'handlebars';
import axios from 'axios';
import fs from 'fs';
import { globSync } from 'glob';
import https from 'https';
import logger from '../logger';
import path from 'path';

// Register a helper to preserve placeholders if no value is provided
Handlebars.registerHelper('default', function (value: string, defaultValue: string) {
    return typeof value !== 'undefined' ? value : defaultValue;
});

interface AccessRule {
    accessType: string;
    relationType: string;
}

/**
 * Handle import command - imports dashboards, events, and entities to Instana
 */
export async function handleImport(argv: any) {
    const { package: packageNameOrPath, server, token, location, include: includePattern, set: parameters, debug } = argv;

    // Set log level to debug if the debug flag is set
    if (debug) {
        logger.level = 'debug';
    }

    // Validate server address
    try {
        validators.validateServerAddress(server);
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }

    let packagePath = packageNameOrPath;
    if (!fs.existsSync(packageNameOrPath)) {
        packagePath = path.join(location, 'node_modules', packageNameOrPath);
    }

    const defaultFolders = ['dashboards'];
    const defaultEventsFolders = ['events'];
    const defaultEntitiesFolders = ['entities'];
    const defaultSmartAlertsFolders = ['smart-alerts'];

    // Create an axios instance with a custom httpsAgent to ignore self-signed certificate errors
    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    async function importIntegration(searchPattern: string, apiPath: string, typeLabel: string, skipFiles: Set<string> = new Set()) {
        const files = globSync(searchPattern);

        logger.info(`Start to import the integration package from ${searchPattern}`);

        if (files.length === 0) {
            logger.warn(`No files found for pattern: ${searchPattern}`);
            return;
        }

        const paramsObject = parameters ? parseParams(parameters) : {};

		let successFileCount = 0;
        let failFileCount = 0;

        for (const file of files) {

			if (skipFiles.has(file)){
				logger.info(`Skipping entity dashboard file ${file}.`);
				continue;
			}

            if (path.extname(file) === '.json') {

                logger.info(`Importing ${file} ...`);

                const fileContent = fs.readFileSync(file, 'utf8');

                // Modify template to use default helper to preserve parameters
                const templateContent = fileContent.replace(/{{\s*(\w+)\s*}}/g, (match, p1) => `{{default ${p1} "${match}"}}`);
                const template = Handlebars.compile(templateContent);
                const resolvedContent = template(paramsObject)

                if (logger.isDebugEnabled()) {
                    logger.debug(`The content after parameters are replaced: \n${resolvedContent}`);
                }

                let jsonContent;
                try {
                    jsonContent = JSON.parse(resolvedContent);
                } catch (error) {
                    if (error instanceof Error) {
                        logger.error(`Failed to parse the content for ${file}: ${error.message}`);
                    } else {
                        logger.error(`Failed to parse the content for ${file}: ${String(error)}`);
                    }
                    continue; // Continue with the next file
                }

                // Determine actual API path for smart alerts based on content
                let actualApiPath = apiPath;
                if (typeLabel === 'smart alert') {
                    try {
                        actualApiPath = determineSmartAlertAPI(jsonContent);
                        
                        const typeName = actualApiPath.includes('mobile-app')
                            ? 'mobile app'
                            : actualApiPath.includes('application')
                            ? 'application'
                            : actualApiPath.includes('website')
                            ? 'website'
                            : actualApiPath.includes('synthetics')
                            ? 'synthetics'
                            : actualApiPath.includes('service-levels')
                            ? 'service levels'
                            : actualApiPath.includes('infra')
                            ? 'infrastructure'
                            : 'logs';
                        
                        logger.info(`Detected ${typeName} smart alert`);
                    } catch (err) {
                        logger.error(`Unable to determine smart alert type for ${file}: ${(err as Error).message}`);
                        failFileCount++;
                        continue;
                    }
                }

                if (apiPath === 'api/custom-dashboard') {
                  ensureAccessRules(jsonContent)
                }

                if (apiPath === 'api/custom-entitytypes' && jsonContent.data){
					logger.info(`Flattening the structure for entity file ${file} ...`);
					jsonContent = {
                    	...jsonContent.data,
                        id: jsonContent.id,
                        version: jsonContent.version,
                        created: jsonContent.created
                    };
				}

				if (apiPath === 'api/custom-entitytypes' && Array.isArray(jsonContent.dashboards) && jsonContent.dashboards.length > 0) {
					// Check if any dashboard reference that needs to be resolved
				    const hasReferences = jsonContent.dashboards.some((dashboard: any) => dashboard.reference);
				                
				    if (hasReferences) {
				    	const dashboardsFolderPath = path.join(packagePath, 'dashboards');
				        logger.info(`Resolving entity dashboard references in file ${file} from: ${dashboardsFolderPath}...`);
				        try {
				        	jsonContent.dashboards = resolveDashboardReferences(jsonContent.dashboards, dashboardsFolderPath);
				        } catch (err) {
				        	logger.error(`Failed to resolve entity dashboards in file ${file}: ${err instanceof Error ? err.message : String(err)}.`);
				            continue;
				        }
				    }
				} else if (apiPath === 'api/custom-entitytypes') {
					logger.info(`No entity dashboards defined in file ${file}.`);
				}

                try {
                    const url = `https://${server}/${actualApiPath}`;
                    logger.info(`Applying the ${typeLabel} to ${url} ...`);
                    const response = await axiosInstance.post(url, jsonContent, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `apiToken ${token}`
     					 }
                	});
					logger.info(`Successfully applied ${file}: ${response.status}`);
        			successFileCount++;
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        // Handle 409 conflict for entities only
                        if (error.response?.status === 409 && actualApiPath === 'api/custom-entitytypes') {
                            // Extract label from jsonContent
                            const entityLabel = jsonContent.label;
                            logger.info(`Entity with label "${entityLabel}" already exists. Checking if update is needed ...`);

                            // Check if backend provides conflicting entity ID in response (efficient path)
                            const conflictingEntityId = error.response?.data?.conflictingEntityId || error.response?.data?.id;
                            
                            // Find existing entity - use ID if provided, otherwise fallback to label search
                            const existingEntity = await findEntityByLabel(server, token, entityLabel, axiosInstance, conflictingEntityId);
                            
                            if (!existingEntity) {
                                logger.error(`Entity with label "${entityLabel}" conflicts with existing entity but could not be found for comparison.`);
                                failFileCount++;
                                continue;
                            }
                            
                            logger.info(`Found existing entity with label "${entityLabel}" (id=${existingEntity.id}).`);
                            
                            // Compare data
                            const isSame = compareEntityData(existingEntity, jsonContent);
                            
                            if (isSame) {
                                logger.info(`Entity "${entityLabel}" already exists with the same data. Skipping import.`);
                                successFileCount++;
                            } else {
                                logger.info(`Entity "${entityLabel}" exists but data is different. Updating ...`);
                                const entityId = existingEntity.id;
                                const updateSuccess = await updateEntity(server, token, entityId, jsonContent, axiosInstance);
                                
                                if (updateSuccess) {
                                    logger.info(`Successfully updated entity "${entityLabel}" from ${file}.`);
                                    successFileCount++;
                                } else {
                                    logger.error(`Failed to update entity "${entityLabel}" from ${file}.`);
                                    failFileCount++;
                                }
                            }
                        } else {
                            // Handle other errors
                            logger.error(`Failed to apply ${file}: ${error.message}`);
                            if (error.response) {
                                logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
                                logger.error(`Response status: ${error.response.status}`);
                                logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
                            }
                            failFileCount++;
                        }
                    } else {
                        logger.error(`Failed to apply ${file}: ${String(error)}`);
                        failFileCount++;
                    }
                }
            }
        }
		const totalFiles = successFileCount + failFileCount;

		      if (totalFiles === 0) {
		          // No files were processed
		          return;
		      } else if (successFileCount > 0 && failFileCount === 0) {
		          logger.info(`Total files: ${totalFiles} | Successfully imported: ${successFileCount}`);
		      } else if (failFileCount > 0 && successFileCount === 0) {
		          logger.info(`Total files: ${totalFiles} | Failed to import: ${failFileCount}`);
		      } else {
		          logger.info(`Total files: ${totalFiles} | Successfully imported: ${successFileCount} | Failed: ${failFileCount}`);
		      }
    }

    if (includePattern) {
        const searchPattern = path.join(packagePath, includePattern);
        if (includePattern.includes('events')) {
            await importIntegration(searchPattern, "api/events/settings/event-specifications/custom", "event");
        } else if (includePattern.includes('entities')) {
            await importIntegration(searchPattern, "api/custom-entitytypes", "entity");
        } else if (includePattern.includes('smart-alerts')) {
            await importIntegration(searchPattern, "smart-alert", "smart alert");
        } else if (includePattern.includes('dashboards')) {
			const entitiesPath = path.join(packagePath, 'entities');
            let referencedDashboardPaths = new Set<string>();

            if (fs.existsSync(entitiesPath)) {
            	const referencedDashboards = validators.getEntityDashboardRefs(entitiesPath);
                const allDashboardFiles = globSync(searchPattern);
                referencedDashboardPaths = new Set(
                	allDashboardFiles.filter(file => referencedDashboards.has(path.basename(file)))
                );
                referencedDashboardPaths.forEach(d => {
                	logger.info(`Skipping entity dashboard ${path.basename(d)} ...`);
                });
			} else {
            	logger.warn(`No 'entities' folder found — cannot check for entity dashboards.`);
            }
            await importIntegration(searchPattern, "api/custom-dashboard", "dashboard", referencedDashboardPaths);
        }
    } else {
        const entitiesPath = path.join(packagePath, 'entities');
        let referencedDashboards = new Set<string>();
        
        // Only check for entity dashboard references if entities folder exists
        if (fs.existsSync(entitiesPath)) {
            referencedDashboards = validators.getEntityDashboardRefs(entitiesPath);
        } else {
            logger.warn(`No 'entities' folder found — cannot check for entity dashboards.`);
        }
        
        const referencedDashboardPaths = new Set<string>();

        const allDashboardFiles = globSync(path.join(packagePath, 'dashboards', '**/*.json'));
        allDashboardFiles.forEach(file => {
            const filename = path.basename(file);
            if (referencedDashboards.has(filename)) {
                referencedDashboardPaths.add(file);
            }
        });

        await importIntegration(path.join(packagePath, 'dashboards', '**/*.json'), "api/custom-dashboard", "dashboard", referencedDashboardPaths);
        for (const defaultFolder of defaultEventsFolders) {
            const searchPattern = path.join(packagePath, defaultFolder, '**/*.json');
            await importIntegration(searchPattern, "api/events/settings/event-specifications/custom", "event");
        }
        for (const defaultFolder of defaultEntitiesFolders) {
            const searchPattern = path.join(packagePath, defaultFolder, '**/*.json');
            await importIntegration(searchPattern, "api/custom-entitytypes", "entity");
        }
        for (const defaultFolder of defaultSmartAlertsFolders) {
            const searchPattern = path.join(packagePath, defaultFolder, '**/*.json');
            await importIntegration(searchPattern, "smart-alert", "smart alert");
        }
    }
}

//Helper functions for import
function parseParams(params: string[]): any {
    const result: any = {};

    params.forEach(param => {
        const [key, value] = param.split('=');
        const keys = key.split('.');
        keys.reduce((acc, key, index) => {
            if (index === keys.length - 1) {
                acc[key] = value || acc[key];
            } else {
                acc[key] = acc[key] || {};
            }
            return acc[key];
        }, result);
    });

    return result;
}

function ensureAccessRules(dashboard: any): void {
    const globalAccessRule = {
        accessType: "READ_WRITE",
        relationType: "GLOBAL",
        relatedId: ""
    }

    const globalAccessRuleExists = dashboard.accessRules.some(
        (rule: AccessRule) => rule.accessType === "READ_WRITE" && rule.relationType === "GLOBAL"
    );

    if (!globalAccessRuleExists) {
        dashboard.accessRules.push(globalAccessRule);
        logger.info("Added the missing global access rule.");
    }
}

function resolveDashboardReferences(dashboards: any[], dashboardsFolderPath: string): any[] {
	return dashboards.map((dashboard) => {
		if (dashboard.reference) {
			const dashboardPath = path.resolve(dashboardsFolderPath, dashboard.reference);
			if (!fs.existsSync(dashboardPath)) {
				throw new Error(`Dashboard reference not found: ${dashboardPath}`);
			}
			try {
				const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
				return JSON.parse(dashboardContent);
			} catch (err) {
				throw new Error(`Failed to read or parse dashboard at ${dashboardPath}: ${err}`);
			}
		}
		return dashboard;
	});
}

// Helper function to find entity by label or ID
async function findEntityByLabel(server: string, token: string, label: string, axiosInstance: any, id?: string): Promise<any | null> {
    try {
        if (id) {
            // Fetch entity directly by ID if provided
            const url = `https://${server}/api/custom-entitytypes/${id}`;
            logger.info(`Fetching entity by ID "${id}" at ${url} ...`);
            const response = await axiosInstance.get(url, {
                headers: {
                    'Authorization': `apiToken ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (logger.isDebugEnabled()) {
                logger.debug(`Response data: ${JSON.stringify(response.data)}`);
            }
            return response.data;
        }

        // fetch all entities and find by label
        const entities = await getEntityList(server, token, axiosInstance);
        const entitiesFound = entities.find((entity: any) => {
            const entityLabel = entity.label || entity.data?.label;
            return entityLabel === label;
        });
        if (!entitiesFound) {
            logger.info(`No entity found with label "${label}".`);
        }
        return entitiesFound || null;
    } catch (error) {
        logger.error(
            `Error finding entity${id ? ` with ID "${id}"` : ` with label "${label}"`}: ${error}`
        );
        return null;
    }
}

// Helper function to compare entity data
function compareEntityData(existingEntity: any, newEntity: any): boolean {
	// Remove system generated fields
	const normalizeEntity = (entity: any) => {
		const {id, version, created, ...rest} = entity;
		return rest;
	}
	
	// Handle both flattened and nested structures
	let existingData = existingEntity;
	let newData = newEntity;
	
	// If existing entity has nested structure, flatten it for comparison
	if (existingEntity.data && typeof existingEntity.data === 'object') {
		existingData = {
			...existingEntity.data,
			id: existingEntity.id,
			version: existingEntity.version,
			created: existingEntity.created
		};
	}
	
	const existingNormalized = normalizeEntity(existingData);
	const newNormalized = normalizeEntity(newData);
	
	// Sort arrays and objects for consistent comparison
	const sortObject = (obj: any): any => {
		if (Array.isArray(obj)) {
			// Sort array elements by their JSON string representation for consistent ordering
			return obj
				.map(sortObject)
				.sort((a, b) => {
					const aStr = JSON.stringify(a);
					const bStr = JSON.stringify(b);
					return aStr.localeCompare(bStr);
				});
		} else if (obj !== null && typeof obj === 'object') {
			return Object.keys(obj)
				.sort()
				.reduce((result: any, key: string) => {
					result[key] = sortObject(obj[key]);
					return result;
				}, {});
		}
		return obj;
	};
	
	const existingSorted = sortObject(existingNormalized);
	const newSorted = sortObject(newNormalized);
	
	const existingStr = JSON.stringify(existingSorted);
	const newStr = JSON.stringify(newSorted);
	const isSame = existingStr === newStr;
	
	
	if (logger.isDebugEnabled()) {
		logger.debug(`Comparing entities:`);
		logger.debug(`Existing (normalized & sorted): ${JSON.stringify(existingSorted, null, 2)}`);
		logger.debug(`New (normalized & sorted): ${JSON.stringify(newSorted, null, 2)}`);
	}

	return isSame;
}

// Helper function to update an existing entity using PUT API
async function updateEntity(server: string, token: string, entityId: string, entityData: any, axiosInstance: any): Promise<boolean> {
	try {
		const url = `https://${server}/api/custom-entitytypes/${entityId}`;
		logger.info(`Updating entity (id=${entityId}) at ${url} ...`);
		
		const response = await axiosInstance.put(url, entityData, {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `apiToken ${token}`
			}
		});
		
		logger.info(`Successfully updated entity (id=${entityId}): ${response.status}.`);
		if (logger.isDebugEnabled()) {
			logger.debug(`Response data: \n${JSON.stringify(response.data)}.`);
		}
		return true;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			logger.error(`Failed to update entity (id=${entityId}): ${error.message}.`);
			if (error.response) {
				logger.error(`Response data: ${JSON.stringify(error.response.data)}.`);
				logger.error(`Response status: ${error.response.status}.`);
			}
		} else {
			logger.error(`Failed to update entity (id=${entityId}): ${String(error)}.`);
		}
		return false;
	}
}

// Helper function to get entity list
async function getEntityList(server: string, token: string, axiosInstance: any): Promise<any[]> {
	try {
		const url = `https://${server}/api/custom-entitytypes`;
		logger.info(`Getting entity list from ${url} ...`);

		const response = await axiosInstance.get(url, {
        	headers: {
            	'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
		});
        logger.info(`Successfully got entity list: ${response.status}`);
        if (logger.isDebugEnabled()) {
        	logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
        }
        return response.data;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			logger.error(`Failed to get entity list: ${error.message}`);
			if (error.response) {
				if (logger.isDebugEnabled()) {
					logger.debug(`Response data: ${JSON.stringify(error.response.data)}`);
					logger.debug(`Response status: ${error.response.status}`);
					logger.debug(`Response headers: ${JSON.stringify(error.response.headers)}`);
				} else {
					logger.error(`Response status: ${error.response.status}`);
				}
			}
		} else {
			logger.error(`Failed to get entity list: ${String(error)}`);
		}
        return [];
	}
}

// Helper function to determine which API to call for smart alerts
function determineSmartAlertAPI(alertJson: any): string {
	// Check for mobile app alert
	if (alertJson.mobileAppId) {
		return 'api/events/settings/mobile-app-alert-configs';
	}
	// Check for application alert
	else if (alertJson.applicationId || alertJson.applications) {
		return 'api/events/settings/application-alert-configs';
	}
	// Check for website alert
	else if (alertJson.websiteId) {
		return 'api/events/settings/website-alert-configs';
	}
	// Check for synthetics alert 
	else if (alertJson.syntheticTestIds) {
		return 'api/events/settings/global-alert-configs/synthetics';
	}
	// Check for service level alert 
	else if (alertJson.sloIds) {
		return 'api/events/settings/global-alert-configs/service-levels';
	}
	// Check for infrastructure alert (has rule.entityType OR rules array with rule.entityType in items)
	else if (alertJson.rule?.entityType || (Array.isArray(alertJson.rules) && alertJson.rules.some((r: any) => r.rule?.entityType))) {
		return 'api/events/settings/infra-alert-configs';
	}
	// Check for logs alert (has rules array - fallback for remaining alerts with rules)
	else if (alertJson.rules) {
		return 'api/events/settings/global-alert-configs/logs';
	}
	// Unknown smart alert type
	else {
		throw new Error(
			`Unable to determine smart alert type. Alert must have one of: mobileAppId, applicationId/applications, websiteId, syntheticTestIds, sloIds, rule.entityType, or rules array`
		);
	}
}