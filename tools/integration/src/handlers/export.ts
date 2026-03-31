import * as utils from '../utils';
import * as validators from '../validators';

import axios from 'axios';
import fs from 'fs';
import https from 'https';
import logger from '../logger';
import path from 'path';

interface IdObject {
    id: string;
    title: string;
    ownerId: string;
    annotations: string[];
}

/**
 * Handle export command - exports dashboards, events, and entities from Instana
 */
export async function handleExport(argv: any) {
    const { server, token, location, include: includeRaw, debug } = argv;

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

	const parsedIncludes = utils.parseIncludesFromArgv(process.argv);

	// Validate include types
	try {
		validators.validateIncludeTypes(parsedIncludes);
	} catch (error) {
		logger.error(error instanceof Error ? error.message : String(error));
	    process.exit(1);
	}

	const exportPath = path.resolve(location);
    if (fs.existsSync(exportPath)) {
        const foldersToCheck = [
            path.join(location, 'dashboards'),
            path.join(location, 'events'),
            path.join(location, 'entities'),
            path.join(location,'smart-alerts')
        ];

        for (const folderPath of foldersToCheck) {
            if (fs.existsSync(folderPath)) {
                const files = fs.readdirSync(folderPath);
                // Filter out hidden files (starting with .) and only check for JSON files
                const jsonFiles = files.filter(file => !file.startsWith('.') && file.endsWith('.json'));
                if (jsonFiles.length > 0) {
                    logger.error(`Cannot export: folder contains existing JSON files.`);
                    const folderNames = foldersToCheck.map(folder => path.basename(folder));
                    logger.info(`The export directory must not contain any JSON files in ${folderNames.join(', ')} folders.`);
                    logger.info(`Please clean the folder or choose a new one.`);
                    process.exit(1);
                }
            }
        }
    } else {
        fs.mkdirSync(exportPath, { recursive: true });
    }

    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    const dashboardsPath = path.join(location, "dashboards");
    const eventsPath = path.join(location, "events");
    const entitiesPath = path.join(location, "entities");
    const smartAlertsPath = path.join(location, "smart-alerts");

    let wasDashboardFound = false;
    let wasEventFound = false;
    let wasEntityFound = false;
    let wasSmartAlertFound = false;

    // Dashboard export
    if (parsedIncludes.some(inc => inc.type === "dashboard" || inc.type === "all")) {
        // Create dashboards folder only when exporting dashboards
        fs.mkdirSync(dashboardsPath, { recursive: true });
        const allDashboards = await fetchDashboards(server, token, axiosInstance);
        let totalDashboardProcessed = 0;

        for (const inc of parsedIncludes.filter(inc => inc.type === "dashboard" || inc.type === "all")) {
            const matches = inc.conditions.filter(c => c.startsWith("id="));

            let filtered;
            if (matches.length) {
                filtered = matches.map(idCond => {
                    const id = idCond.split("=")[1]?.replace(/^"|"$/g, '');
                    const found = allDashboards.find((d: any) => d.id === id);
                    return found;
                }).filter(Boolean);
            } else {
                filtered = utils.filterElementsBy(allDashboards, inc.conditions);
            }

            if (filtered.length === 0) {
                const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                logFn(`No dashboard(s) found matching: ${inc.conditions.join(', ')}`);
                continue;
            }
     	const enriched = filtered.map(item => ({
                ...item,
                name: item.name ?? `dashboard-${item.id}`
            }));
            const sanitized = utils.sanitizeTitles(filtered, "dashboard");
            for (const dash of sanitized) {
                const dashboard = await fetchDashboards(server, token, axiosInstance, dash.id);
                if (dashboard) {
                    saveDashboard(dashboardsPath, dash.id, dash.title, dashboard);
                    totalDashboardProcessed++;
                    wasDashboardFound = true;
                } else {
                    const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                    logFn(`The dashboard with id=${dash.id} not found or failed to export.`);
                }
            }
        }
        logger.info(`Total dashboard(s) processed: ${totalDashboardProcessed}`);
    }

    // Event export
    if (parsedIncludes.some(inc => inc.type === "event" || inc.type === "all")) {
        // Create events folder only when exporting events
        fs.mkdirSync(eventsPath, { recursive: true });
        const allEvents = await fetchEvents(server, token, axiosInstance);
        let totalEventProcessed = 0;

        for (const inc of parsedIncludes.filter(inc => inc.type === "event" || inc.type === "all")) {
        	const matches = inc.conditions.filter(c => c.startsWith("id="));
            let filtered;
    		if (matches.length) {
            	filtered = matches.map(idCond => {
                	const id = idCond.split("=")[1]?.replace(/^"|"$/g, '');
                    const found = allEvents.find((e: any) => e.id === id);
                    return found;
                }).filter(Boolean);
            } else {
                filtered = utils.filterElementsBy(allEvents, inc.conditions);
            }

            if (filtered.length === 0) {
                const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                logFn(`No event(s) found matching: ${inc.conditions.join(', ')}`);
                continue;
            }
     	const enriched = filtered.map(item => ({
                ...item,
                name: item.name ?? `event-${item.id}`
            }));
            const sanitized = utils.sanitizeTitles(filtered, "event");
            for (const evt of sanitized) {
                const event = await fetchEvents(server, token, axiosInstance, evt.id);
                if (event) {
                    saveEvent(eventsPath, evt.id, evt.title, event);
                    totalEventProcessed++;
                    wasEventFound = true;
                } else {
                    const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                    logFn(`The event with id=${evt.id} not found or failed to export.`);
                }
            }
        }

        logger.info(`Total event(s) processed: ${totalEventProcessed}`);
    }

	// Entity export
	if (parsedIncludes.some(inc => inc.type === "entity" || inc.type === "all")){
		// Create entities folder only when exporting entities
		fs.mkdirSync(entitiesPath, { recursive: true });
		const allEntities = await fetchEntities(server, token, axiosInstance);
		let totalEntitiesProcessed = 0;

		for (const inc of parsedIncludes.filter(inc => inc.type === "entity" || inc.type === "all")){
			const matches = inc.conditions.filter(c => c.startsWith("id="));
			let filtered;
			if (matches.length) {
				filtered = matches.map(idCond => {
	            	const id = idCond.split("=")[1]?.replace(/^"|"$/g, '');
	                const found = allEntities.find((e: any) => e.id === id);
	                return found;
	            }).filter(Boolean);
			} else {
				filtered = utils.filterElementsBy(allEntities, inc.conditions);
			}

			if (filtered.length === 0){
				const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
				logFn(`No entities found matching: ${inc.conditions.join(', ')}`)
				continue;
			}

			const enriched = filtered.map(item => ({
				...item,
	           	data: {
	           		...item.data,
	           		label: item.data?.label ?? `entity-${item.id}`
	           	}
			}));

	           const sanitized = utils.sanitizeTitles(enriched, "entity");

	           for (const ent of sanitized) {
				const entity = await fetchEntities(server, token, axiosInstance, ent.id);
	           	if (entity) {
	           		saveEntity(entitiesPath, dashboardsPath, entity);
	           		totalEntitiesProcessed++;
	           		wasEntityFound = true;
	           	} else {
	           		const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
	           		logFn(`The entity with id=${ent.id} not found or failed to export.`);
	           	}
			}
		}
		logger.info(`Total entities processed: ${totalEntitiesProcessed}`);
	}

    // smart-alert export
    if (parsedIncludes.some(inc => inc.type === "smart-alert" || inc.type === "all")) {
        // Create smart-alerts folder only when exporting smart-alerts
        fs.mkdirSync(smartAlertsPath, { recursive: true });
        const allSmartAlerts = await fetchSmartAlerts(server, token, axiosInstance);
        let totalSmartAlertsProcessed = 0;

        for (const inc of parsedIncludes.filter(inc => inc.type === "smart-alert" || inc.type === "all")) {
        	const matches = inc.conditions.filter(c => c.startsWith("id="));
            let filtered;
    		if (matches.length) {
            	filtered = matches.map(idCond => {
                	const id = idCond.split("=")[1]?.replace(/^"|"$/g, '');
                    const found = allSmartAlerts.find((e: any) => e.id === id);
                    return found;
                }).filter(Boolean);
            } else {
                filtered = utils.filterElementsBy(allSmartAlerts, inc.conditions);
            }

            if (filtered.length === 0) {
                const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                logFn(`No smart-alert(s) found matching: ${inc.conditions.join(', ')}`);
                continue;
            }
      const enriched = filtered.map((item: any) => ({
                ...item,
                name: item.name ?? `smart-alert-${item.id}`
            }));
            const sanitized = utils.sanitizeTitles(filtered, "smart-alert");
            for (const alert of sanitized) {
                const smartAlert = await fetchSmartAlerts(server, token, axiosInstance, alert.id);
                if (smartAlert) {
                    saveSmartAlert(smartAlertsPath, smartAlert);
                    totalSmartAlertsProcessed++;
                    wasSmartAlertFound = true;
                } else {
                    const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                    logFn(`The smart-alert with id=${alert.id} not found or failed to export.`);
                }
            }
        }

        logger.info(`Total smart alert(s) processed: ${totalSmartAlertsProcessed}`);
    }

    // Final info
    if (!wasDashboardFound && !wasEventFound && !wasEntityFound && !wasSmartAlertFound) {
        logger.error("No elements were found or exported.");
    }
}

// Helper functions for smart-alert export
async function fetchSmartAlerts(server: string, token: string, axiosInstance: any, alertId?: string): Promise<any> {
    try {
        const urls = [
            `https://${server}/api/events/settings/mobile-app-alert-configs`,
            `https://${server}/api/events/settings/application-alert-configs`,
            `https://${server}/api/events/settings/infra-alert-configs`,
            `https://${server}/api/events/settings/website-alert-configs`,
            `https://${server}/api/events/settings/global-alert-configs/synthetics`,
            `https://${server}/api/events/settings/global-alert-configs/service-levels`,
            `https://${server}/api/events/settings/global-alert-configs/logs`
        ];
        
        if (alertId) {
            // Fetch single alert - try each endpoint
            logger.info(`Getting smart-alert (id=${alertId}) ...`);
            for (const baseUrl of urls) {
                try {
                    const url = `${baseUrl}/${alertId}`;
                    const response = await axiosInstance.get(url, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `apiToken ${token}`
                        }
                    });
                    logger.info(`Successfully got smart-alert (id=${alertId}): ${response.status}`);
                    if (logger.isDebugEnabled()) {
                        logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
                    }
                    return response.data;
                } catch (err) {
                    // Try next endpoint
                    continue;
                }
            }
            throw new Error(`Smart alert with id=${alertId} not found in any endpoint`);
        } else {
            // Fetch all alerts from all endpoints
            logger.info(`Getting smart-alert list from multiple endpoints ...`);
            const allAlerts: any[] = [];
            
            for (const url of urls) {
                try {
                    const response = await axiosInstance.get(url, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `apiToken ${token}`
                        }
                    });
                    if (Array.isArray(response.data)) {
                        allAlerts.push(...response.data);
                    }
                } catch (err) {
                    logger.debug(`Failed to fetch from ${url}: ${err}`);
                }
            }
            
            if (logger.isDebugEnabled()) {
                logger.debug(`Response data: \n${JSON.stringify(allAlerts)}`);
            }
            return allAlerts;
        }
    } catch (error) {
        handleAxiosError(error, alertId ? `smart-alert (id=${alertId})` : `smart-alert list`);
        return alertId ? null : [];
    }
}


function saveSmartAlert(dir: string, smartAlert: any) {
	try {
		const alertId = smartAlert.id;
		const alertName = utils.sanitizeFileName(smartAlert.name ?? `smart-alert-${alertId}`);
		const alertFilePath = path.join(dir, `${alertName}.json`);

		logger.info(`Saving smart-alert (id=${alertId}) to ${alertFilePath} ...`);
		fs.writeFileSync(alertFilePath, JSON.stringify(smartAlert, null, 2));
		logger.info(`The smart-alert (id=${alertId}) saved successfully to ${alertFilePath}`);
	} catch (error) {
		logger.error(`Error saving smart-alert (id=${smartAlert?.id ?? 'unknown'}):`, error);
	}
}


// Helper functions for entity export
async function fetchEntities(server: string, token: string, axiosInstance: any, entityId?: string): Promise<any> {
	try {
		const url = entityId
			? `https://${server}/api/custom-entitytypes/${entityId}`
			: `https://${server}/api/custom-entitytypes`;
		
		const context = entityId ? `entity (id=${entityId})` : 'entity list';
		logger.info(`Getting ${context} from ${url} ...`);

		const response = await axiosInstance.get(url, {
        	headers: {
            	'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
		});
        logger.info(`Successfully got ${context}: ${response.status}`);
        if (logger.isDebugEnabled()) {
        	logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
        }
        return response.data;
	} catch (error) {
		handleAxiosError(error, entityId ? `entity (id=${entityId})` : `entity list`);
        return entityId ? null : [];
	}
}


function saveEntity(entityDir: string, dashboardDir: string, entity: any) {
	try {
		const entityId = entity.id;
		const entityName = utils.sanitizeFileName(entity.data?.label ?? `entity-${entityId}`);
		const entityFilePath = path.join(entityDir, `${entityName}.json`);

		logger.info(`Saving entity (id=${entityId}) to ${entityFilePath} ...`);

		const dashboards = entity.data?.dashboards || [];
		const updatedDashboards: any[] = [];

		// Create dashboards folder if entity has embedded dashboards
		if (dashboards.length > 0 && !fs.existsSync(dashboardDir)) {
			fs.mkdirSync(dashboardDir, { recursive: true });
			logger.debug('Created dashboards folder for entity embedded dashboards');
		}

		dashboards.forEach((dashboard: any, index: number) => {
			const dashboardContent = dashboard;
			const dashboardFileName = `${entityName}_dashboard_${index + 1}.json`;
			const dashboardFilePath = path.join(dashboardDir, dashboardFileName);

			logger.info(`Saving dashboard for entity (id=${entityId}) to ${dashboardFilePath} ...`);
			try {
				fs.writeFileSync(dashboardFilePath, JSON.stringify(dashboardContent, null, 2));
				logger.info(`Dashboard for entity (id=${entityId}) saved successfully to ${dashboardFilePath}`);
				updatedDashboards.push({ reference: dashboardFileName });
			} catch (err) {
				logger.error(`Error saving dashboard for entity (id=${entityId}) to ${dashboardFilePath}:`, err);
			}
		});

		entity.data.dashboards = updatedDashboards;

		fs.writeFileSync(entityFilePath, JSON.stringify(entity, null, 2));
		logger.info(`The entity (id=${entityId}) saved successfully to ${entityFilePath}`);
	} catch (error) {
		logger.error(`Error saving entity (id=${entity?.id ?? 'unknown'}):`, error);
	}
}


// Helper functions for dashboard export
async function fetchDashboards(server: string, token: string, axiosInstance: any, dashboardId?: string): Promise<any> {
    try {
        const url = dashboardId
            ? `https://${server}/api/custom-dashboard/${dashboardId}`
            : `https://${server}/api/custom-dashboard`;
        
        const context = dashboardId ? `dashboard (id=${dashboardId})` : 'dashboard list';
        logger.info(`Getting ${context} from ${url} ...`);

        const response = await axiosInstance.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
        });

        logger.info(`Successfully got ${context}: ${response.status}`);
        if (logger.isDebugEnabled()) {
            logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
        }

        return response.data;
    } catch (error) {
        handleAxiosError(error, dashboardId ? `dashboard (id=${dashboardId})` : `dashboard list`);
        return dashboardId ? null : [];
    }
}

function saveDashboard(dir: string, id: string, title: string, dashboard: any) {
    try {
        const filename = `${title}.json`;
        const filepath = path.join(dir, filename);
        logger.info(`Saving dashboard (id=${id}) to ${filepath} ...`);
        fs.writeFileSync(filepath, JSON.stringify(dashboard, null, 2));
        logger.info(`The dashboard (id=${id}) saved successfully`);
    } catch (error) {
        logger.error(`Error saving dashboard (id=${id}):`, error);
    }
}


// Helper functions for event export
async function fetchEvents(server: string, token: string, axiosInstance: any, eventId?: string): Promise<any> {
    try {
        const url = eventId
            ? `https://${server}/api/events/settings/event-specifications/custom/${eventId}`
            : `https://${server}/api/events/settings/event-specifications/custom`;
        
        const context = eventId ? `event (id=${eventId})` : 'event list';
        logger.info(`Getting ${context} from ${url} ...`);

        const response = await axiosInstance.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
        });

        logger.info(`Successfully got ${context}: ${response.status}`);
        if (logger.isDebugEnabled()) {
            logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
        }

        return response.data;
    } catch (error) {
        handleAxiosError(error, eventId ? `event (id=${eventId})` : `event list`);
        return eventId ? null : [];
    }
}

function saveEvent(dir: string, id: string, name: string, event: any) {
    try {
        const filename = `${name}.json`;
        const filepath = path.join(dir, filename);
        logger.info(`Saving event (id=${id}) to ${filepath} ...`);
        fs.writeFileSync(filepath, JSON.stringify(event, null, 2));
        logger.info(`The event (id=${id}) saved successfully`);
    } catch (error) {
        logger.error(`Error saving event (id=${id}):`, error);
    }
}


// Helper for axios error handling
function handleAxiosError(error: any, context: string) {
    if (axios.isAxiosError(error)) {
        logger.error(`Failed to get ${context}: ${error.message}`);
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
        logger.error(`Failed to get ${context}: ${String(error)}`);
    }
}