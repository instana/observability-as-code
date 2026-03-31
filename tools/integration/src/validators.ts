import axios, { AxiosError } from 'axios';

import fs from 'fs';
import logger from './logger';
import path from 'path';
import semver from 'semver';

export interface ValidationResult {
    errors: string[];
    warnings: string[];
    successMessages: string[];
}

/* Validates that the server address does not include protocol (http:// or https://) */
export function validateServerAddress(server: string): void {
    if (!server || typeof server !== 'string') {
        throw new Error('Server address is required and must be a string');
    }

    const trimmedServer = server.trim();
    
    if (trimmedServer.startsWith('http://') || trimmedServer.startsWith('https://')) {
        throw new Error(
            'Invalid server address: Do not include protocol (http:// or https://). Please use only the hostname.'
        );
    }

    if (trimmedServer.includes('://')) {
        throw new Error(
            'Invalid server address: Protocol prefix detected. Please use only the hostname.'
        );
    }
}

/* Valid types for the --include type parameter */
export const VALID_INCLUDE_TYPES = ['dashboard', 'event', 'entity', 'smart-alert'] as const;
export type ValidIncludeType = typeof VALID_INCLUDE_TYPES[number];

/* Validates that include types are valid */
export function validateIncludeTypes(parsedIncludes: Array<{ type: string; conditions: string[]; explicitlyTyped: boolean }>): void {
    const invalidTypes: string[] = [];
    
    for (const include of parsedIncludes) {
        if (include.explicitlyTyped && !VALID_INCLUDE_TYPES.includes(include.type as any)) {
            invalidTypes.push(include.type);
        }
    }
    
    if (invalidTypes.length > 0) {
        const uniqueInvalidTypes = [...new Set(invalidTypes)];
        throw new Error(
            `Invalid --include type value(s): ${uniqueInvalidTypes.map(t => `"${t}"`).join(', ')}. ` +
            `Valid types are: ${VALID_INCLUDE_TYPES.map(t => `"${t}"`).join(', ')}`
        );
    }
}

/**
 * Validates package.json file for required fields and version constraints
 */
export async function validatePackageJson(
    packageData: any,
    errors: string[],
    warnings: string[],
    successMessages: string[],
    strictMode: boolean
): Promise<void> {
    // Validate `name`
    const namePattern = /^@instana-integration\/[a-zA-Z0-9-_]+$/;
    if (!namePattern.test(packageData.name)) {
        const warningMessage = `Warning: Package name "${packageData.name}" does not align with the IBM package naming convention.`;
        if (strictMode) {
            errors.push(warningMessage);
        } else {
            warnings.push(warningMessage);
        }
    } else {
        successMessages.push('The package name is correctly defined.');
    }

    // Validate `version`
    const versionPattern = /^\d+\.\d+\.\d+$/;
    if (!versionPattern.test(packageData.version)) {
        errors.push(`Invalid version "${packageData.version}". The version must follow the format "x.y.z".`);
    } else {
        successMessages.push('The package version format is valid and follows the correct format.');
    }

    // Fetch the currently published version from npm and compare
    try {
        const response = await axios.get(`https://registry.npmjs.org/${packageData.name}`);
        const publishedVersion = response.data['dist-tags']?.latest;
        if (!publishedVersion) {
            successMessages.push(`The package "${packageData.name}" exists in the npm registry but has no published versions. Treating as a new package.`);
        } else {
            if (semver.eq(packageData.version, publishedVersion)) {
                errors.push(`The package version "${packageData.version}" is the same as the currently published version "${publishedVersion}". It must be greater than the currently published version.`);
            } else if (semver.lt(packageData.version, publishedVersion)) {
                errors.push(`The package version "${packageData.version}" is invalid. It must be greater than the currently published version "${publishedVersion}".`);
            } else {
                successMessages.push('The package version is valid and greater than the currently published version.');
            }
        }
    } catch (error) {
        if ((error as AxiosError).response?.status === 404) {
            successMessages.push(`The package "${packageData.name}" not found on npm. This is a new package.`);
        } else {
            const axiosError = error as AxiosError;
            errors.push(axiosError.message || String(error));
        }
    }

    // Check for required fields and description
    const requiredFields = ['name', 'version', 'author', 'license', 'description'];
    const presentFields: string[] = [];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
        const value = packageData[field];
        if (value === undefined || value === null || value === '') {
            if (field === 'description') {
                warnings.push('Warning: The package description is missing. Adding a description is recommended.');
            } else {
                missingFields.push(field);
            }
        } else {
            presentFields.push(field);
        }
    }

    if (presentFields.length > 0) {
        successMessages.push(`The package field(s) ${presentFields.join(', ')} are present.`);
    }

    if (missingFields.length > 0) {
        errors.push(`The package is missing required field(s): ${missingFields.join(', ')}.`);
    }

    // Check for publishConfig.access = "public"
    if (!packageData.publishConfig || packageData.publishConfig.access !== "public") {
        errors.push(`"publishConfig.access" is missing or not set to "public". It is mandatory to include "publishConfig": { "access": "public" } for public packages.`);
    } else {
        successMessages.push(`The "publishConfig.access" is correctly set to "public".`);
    }
}

/**
 * Validates dashboard files for required accessRules
 */
export function validateDashboardFiles(
    dashboardsPath: string,
    errors: string[],
    warnings: string[],
    successMessages: string[],
    embeddedRefs: Set<string> = new Set()
): void {
    const files = fs.readdirSync(dashboardsPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
        warnings.push('No JSON files found in the dashboards folder.');
        return;
    }

    jsonFiles.forEach(file => {
        const filePath = path.join(dashboardsPath, file);
        const isEmbedded = embeddedRefs.has(file);

        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const dashboard = JSON.parse(fileContent);
            const accessRules = dashboard.accessRules;

            const requiredAccessRule = {
                accessType: 'READ_WRITE',
                relationType: 'GLOBAL',
                relatedId: ''
            };

            if (!isEmbedded) {
                if (!Array.isArray(accessRules) || accessRules.length === 0) {
                    errors.push(`accessRules are missing in the dashboard file: ${file}.`);
                    return;
                }

                const hasRequiredRule = accessRules.some(rule =>
                    rule.accessType === requiredAccessRule.accessType &&
                    rule.relationType === requiredAccessRule.relationType &&
                    rule.relatedId === requiredAccessRule.relatedId
                );

                if (!hasRequiredRule) {
                    errors.push(`The dashboard file ${file} must include the required accessRule: ${JSON.stringify(requiredAccessRule)}.`);
                } else {
                    successMessages.push(`The dashboard file ${file} contains the required GLOBAL accessRule.`);
                }
            } else {
                successMessages.push(`Skipping accessRule validation for entity dashboard: ${file} ...`);
            }
        } catch (error) {
            errors.push(`Error validating file ${file}: ${error instanceof Error ? error.message : String(error)}.`);
        }
    });
}

/**
 * Recursively gets all JSON files in a directory
 */
export function getAllJsonFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat && stat.isDirectory()) {
            results = results.concat(getAllJsonFiles(filePath));
        } else if (file.endsWith('.json')) {
            results.push(filePath);
        }
    });

    return results;
}

/**
 * Validates event files for required fields
 */
export function validateEventFiles(
    eventsPath: string,
    errors: string[],
    warnings: string[],
    successMessages: string[]
): void {
    const jsonFiles = getAllJsonFiles(eventsPath);

    if (jsonFiles.length === 0) {
        warnings.push('No JSON files found in the events folder.');
        return;
    }

    jsonFiles.forEach(filePath => {
        const file = path.relative(eventsPath, filePath);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const event = JSON.parse(fileContent);
            let allEventFieldsValid = true;
            const requiredEventFields = ['name', 'entityType', 'rules'];

            const presentFields: string[] = [];
            const missingFields: string[] = [];

            for (const field of requiredEventFields) {
                const value = event[field];
                const isEmptyArray = Array.isArray(value) && value.length === 0;
                const isEmptyValue = value === undefined || value === null || value === '' || isEmptyArray;
                if (isEmptyValue) {
                    missingFields.push(field);
                    allEventFieldsValid = false;
                } else {
                    presentFields.push(field);
                }
            }

            if (presentFields.length > 0) {
                successMessages.push(`The event field(s) ${presentFields.join(', ')} are present in the file: ${file}.`);
            }

            if (missingFields.length > 0) {
                errors.push(`The event is missing required field(s): ${missingFields.join(', ')} in file: ${file}.`);
            }

            if (allEventFieldsValid) {
                successMessages.push(`The event is correctly defined in the file: ${file}.`);
            } else {
                errors.push(`The event is not correctly defined in the file: ${file}.`);
            }
        } catch (error) {
            errors.push(`Error validating file ${filePath}: ${error instanceof Error ? error.message : String(error)}.`);
        }
    });
}

/**
 * Validates entity files for required fields
 */
export function validateEntityFiles(
    entitiesPath: string,
    errors: string[],
    warnings: string[],
    successMessages: string[]
): void {
    const jsonFiles = getAllJsonFiles(entitiesPath);
    if (jsonFiles.length === 0) {
        warnings.push('No JSON files found in the entities folder.');
    }
    jsonFiles.forEach((filePath) => {
        const file = path.relative(entitiesPath, filePath);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const entity = JSON.parse(fileContent);
            let allEntityFieldsValid = true;
            const requiredEntityFields = ['label', 'identifiers', 'tagFilterExpression'];

            const presentFields: string[] = [];
            const missingFields: string[] = [];

            if (!entity.data || typeof entity.data !== 'object' || Object.keys(entity.data).length === 0) {
                errors.push(`Missing or invalid 'data' object in entity: ${file}.`);
                allEntityFieldsValid = false;
                return;
            }

            for (const field of requiredEntityFields) {
                const value = entity.data[field];
                const isEmptyArray = Array.isArray(value) && value.length === 0;
                const isEmptyObject = typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0;
                const isEmptyValue = value === undefined || value === null || value === '' || isEmptyArray || isEmptyObject;
                if (isEmptyValue) {
                    missingFields.push(field);
                    allEntityFieldsValid = false;
                } else {
                    presentFields.push(field);
                }
            }

            if (presentFields.length > 0) {
                successMessages.push(`The entity field(s) ${presentFields.join(', ')} are present in the file: ${file}.`);
            }
            if (missingFields.length > 0) {
                errors.push(`The entity is missing required field(s): ${missingFields.join(', ')} in file: ${file}.`);
            }

            if (allEntityFieldsValid === true) {
                successMessages.push(`The entity is correctly defined in the file: ${file}.`);
            } else {
                errors.push(`The entity is not correctly defined in the file: ${file}.`);
            }

        } catch (error) {
            errors.push(`Error validating file ${filePath}: ${error instanceof Error ? error.message : String(error)}.`);
        }
    });
}

/**
 * Gets dashboard references from entity files
 */
export function getEntityDashboardRefs(entitiesPath: string): Set<string> {
    const embeddedDashboardRefs = new Set<string>();
    
    // Return empty set if entities path doesn't exist
    if (!fs.existsSync(entitiesPath)) {
        return embeddedDashboardRefs;
    }
    
    const jsonFiles = getAllJsonFiles(entitiesPath);

    jsonFiles.forEach(filePath => {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const entity = JSON.parse(content);
            const dashboards = entity?.data?.dashboards;

            if (Array.isArray(dashboards)) {
                dashboards.forEach((dashboard: any) => {
                    if (dashboard?.reference) {
                        embeddedDashboardRefs.add(dashboard.reference);
                    }
                });
            }
        } catch (error) {
            // Silently ignore errors in this helper function
        }
    });
    return embeddedDashboardRefs;
}

/**
 * Validates README content for required sections
 */
export function validateReadmeContent(
    readmeContent: string,
    packageName: string,
    currentDirectory: string,
    errors: string[],
    warnings: string[],
    successMessages: string[]
): void {
    const dashboardsExist = fs.existsSync(path.join(currentDirectory, 'dashboards'));
    const eventsExist = fs.existsSync(path.join(currentDirectory, 'events'));
    const entitiesExist = fs.existsSync(path.join(currentDirectory, 'entities'));
    const smartAlertsExist = fs.existsSync(path.join(currentDirectory, 'smart-alerts'));
    const requiredSections = [packageName];
    if (dashboardsExist) {
        requiredSections.push('Dashboards');
    }
    requiredSections.push('Metrics', 'Semantic Conventions', 'Resource Attributes');
    if (eventsExist) {
        requiredSections.push('Events');
    }
    if (entitiesExist) {
        requiredSections.push('Entities');
    }
    if (smartAlertsExist) {
        requiredSections.push('Smart Alerts');
    }
    const readmeLines = readmeContent.split('\n');
    const headingLines = readmeLines
        .filter(line => /^#{1,6}\s+/.test(line.trim()))
        .map(line => line.trim().replace(/^#{1,6}\s+/, '').trim());

    const missingSections = requiredSections.filter(section =>
        !headingLines.some(heading => heading.toLowerCase() === section.toLowerCase())
    );

    if (missingSections.length > 0) {
        errors.push(`README.md is missing required sections: ${missingSections.join(', ')}`);
    } else {
        successMessages.push('README.md contains all required sections.');
    }
}
/**
 * Validate smart alerts files for required fields
 */
export function validateSmartAlertFiles(
	smartAlertPath: string,
	errors: string[],
	warnings: string[],
	successMessages: string[]
): void {
	const jsonFiles = getAllJsonFiles(smartAlertPath);

	if(jsonFiles.length === 0) {
		warnings.push('No JSON files found in the smart-alerts folder.');
		return;
	}

	jsonFiles.forEach(filePath => {
    	const file = path.relative(smartAlertPath, filePath);
    	try {
    		const fileContent = fs.readFileSync(filePath, 'utf-8');
    		const smartAlert = JSON.parse(fileContent);
    		let allSmartAlertFieldsValid = true;

    		const alwaysRequiredSmartAlertFields = ['name', 'granularity', 'timeThreshold'];
    		const presentFields: string[] = [];
    		const missingFields: string[] = [];

    		// Check always required fields
    		for (const field of alwaysRequiredSmartAlertFields) {
    			const value = smartAlert[field];
    			const isEmptyArray = Array.isArray(value) && value.length === 0;
    			const isEmptyValue = value === undefined || value === null || value === '' || isEmptyArray;

    			if (isEmptyValue) {
    				missingFields.push(field);
    				allSmartAlertFieldsValid = false;
    			} else {
    				presentFields.push(field);
    			}
    		}

    		// Check "rule + threshold" OR "rules" array
    		const hasRuleAndThreshold = smartAlert.rule != null && smartAlert.threshold != null;
    		const hasRulesArray = Array.isArray(smartAlert.rules) && smartAlert.rules.length > 0;

    		if (!hasRuleAndThreshold && !hasRulesArray) {
    			missingFields.push('rule + threshold OR rules[]');
    			allSmartAlertFieldsValid = false;
    		} else {
    			presentFields.push(hasRuleAndThreshold ? 'rule + threshold' : 'rules[]');
    		}

			if (presentFields.length > 0) {
				successMessages.push(`The smart alert field(s) ${presentFields.join(', ')} are present in the file: ${file}.`);
			}
			if (missingFields.length > 0) {
				errors.push(`The smart alert is missing required field(s) ${missingFields.join(', ')} in file: ${file}.`);
			}

			if (allSmartAlertFieldsValid) {
				successMessages.push(`The smart alert is correctly defined in the file: ${file}.`);
			} else {
				errors.push(`The smart alert is not correctly defined in the file: ${file}.`);
			}
    	} catch (error) {
    		errors.push(`Error validating file ${filePath}: ${error instanceof Error ? error.message : String(error)}.`);
    	}
    });
}