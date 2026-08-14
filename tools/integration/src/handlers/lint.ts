import * as utils from '../utils';
import * as validators from '../validators';

import fs from 'fs';
import logger from '../logger';
import path from 'path';

/**
 * Handler for linting integration packages
 * Validates package.json, README, dashboards, events, entities, smart-alerts, and collector
 * @param argv Command line arguments containing debug and strict-mode flags
 */
export async function handleLint(argv: any): Promise<void> {
    const currentDirectory = process.cwd();
    const errors: string[] = [];
    const warnings: string[] = [];
    const successMessages: string[] = [];

    const packageData = utils.readPackageJson(currentDirectory);
    if (utils.isPrivatePackage(packageData)) {
        console.log(`Skipping linting for package: ${packageData.name}`);
        process.exit(0);
    }

    const readmeContent = utils.readReadmeFile(currentDirectory);
    const dashboardsPath = path.join(currentDirectory, 'dashboards');
    const eventsPath = path.join(currentDirectory, 'events');
    const entitiesPath = path.join(currentDirectory, 'entities');
    const smartAlertPath = path.join(currentDirectory, 'smart-alerts');
    const collectorPath = path.join(currentDirectory, 'collector');
    const collectorConfigPath = path.join(currentDirectory, 'collector', 'config');

    let embeddedDashboardRefs = new Set<string>();

    // Check README
    if (readmeContent) {
        try {
            validators.validateReadmeContent(readmeContent, packageData.name, currentDirectory, errors, warnings, successMessages);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(errorMessage);
        }
    } else {
        errors.push('README.md is missing or empty.');
    }
    
    try {
        const strictMode = argv['strict-mode'];
        await validators.validatePackageJson(packageData, errors, warnings, successMessages, strictMode);
        
        if (fs.existsSync(entitiesPath)) {
            embeddedDashboardRefs = validators.getEntityDashboardRefs(entitiesPath);
            validators.validateEntityFiles(entitiesPath, errors, warnings, successMessages);
        } else {
            logger.info('No entities folder found for this package.');
        }
        
        if (fs.existsSync(dashboardsPath)) {
            validators.validateDashboardFiles(dashboardsPath, errors, warnings, successMessages, embeddedDashboardRefs);
        } else {
            logger.info('No dashboards folder found for this package.');
        }
        
        if (fs.existsSync(eventsPath)) {
            validators.validateEventFiles(eventsPath, errors, warnings, successMessages);
        } else {
            logger.info('No events folder found for this package.');
        }

		if (fs.existsSync(smartAlertPath)) {
            validators.validateSmartAlertFiles(smartAlertPath, errors, warnings, successMessages);
        } else {
            logger.info('No smart alerts folder found for this package.');
        }

        if (fs.existsSync(collectorPath)) {
            validators.validateCollectorFiles(collectorPath, collectorConfigPath, errors, warnings, successMessages);
        } else {
            logger.info('No collector folder found for this package.');
        }
    } catch (error) {
        errors.push(`Linting failed: ${error}`);
    }

    // Check if debug is enabled
    const isDebug = argv.debug;

    if (isDebug) {
        successMessages.forEach((message) => {
            logger.info(message);
        });
        if (warnings.length > 0) {
            logger.warn(`Warnings encountered during linting:`);
            warnings.forEach((warning) => {
                logger.warn(warning);
            });
        }
        if (errors.length > 0) {
            logger.error(`Linting failed with the following errors:`);
            errors.forEach((error) => {
                logger.error(error);
            });
        }
    }

    if (errors.length > 0) {
        logger.error(`Linting failed.`);
        process.exit(-1);
    } else {
        logger.info('Linting completed successfully.');
        process.exit(0);
    }
}