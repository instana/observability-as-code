import * as utils from '../utils';

import { Separator, checkbox, input } from '@inquirer/prompts';

import fs from 'fs';
import logger from '../logger';
import path from 'path';

/**
 * Handler for initializing new integration packages
 * Creates package structure with package.json, README, and selected folders
 */
export async function handleInit(): Promise<void> {
    const packageName = await input({
        message: `Enter integration package name: (e.g.: @instana-integration/nodejs, my-awesome-xyz-integration): `,
        validate: (input: string) => input ? true : 'Package name is required'
    });

    const packageVersion = await input({
        message: 'Enter integration package version: ',
        default: '1.0.0',
        validate: (input: string) => /^\d+\.\d+\.\d+$/.test(input) ? true : 'Please enter a valid version number'
    });

    const packageDescription = await input({
        message: 'Enter integration package description: '
    });

    const keywordsInput = await input({
        message: 'Enter integration package keywords (comma-separated): '
    });

    const keywords = keywordsInput.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);

    const packageAuthor = await input({
        message: 'Enter integration package author: ',
        validate: (input: string) => input ? true : 'Package author is required'
    });

    const packageLicense = await input({
        message: 'Enter integration package license: ',
        default: 'MIT'
    });

    const configTypes = await checkbox({
        message: 'Select the types of integration elements to be included in the package:',
        choices: [
            { name: 'dashboards', value: 'dashboards', checked: true },
            { name: 'events', value: 'events'},
            { name: 'entities', value: 'entities'},
            { name: 'smart alerts', value: 'smart-alerts'},
            { name: 'collector', value: 'collector'},
        ],
        required: true
    });

    logger.info(`Start to generate the skeleton for the integration package: ${packageName}`);

    const packagePath = path.join(process.cwd(), packageName);
    fs.mkdirSync(packagePath, { recursive: true });
    logger.info(`Created the integration package folder: ${packagePath}`);

    configTypes.forEach((type: string) => {
        const configTypePath = path.join(packagePath, type)
        fs.mkdirSync(configTypePath, { recursive: true });
        logger.info(`Created the integration package sub-folder: ${configTypePath}`);
    });

    if (configTypes.includes('collector')) {
        utils.generateCollectorFiles(packagePath, packageName, configTypes);
    }

    const packageJson: {
        name: string;
        version: string;
        description: string;
        keywords?: string[];
        author: string;
        license: string;
        scripts: object;
        publishConfig: {
            access: string;
        };
    } = {
        name: packageName,
        version: packageVersion,
        description: packageDescription,
        author: packageAuthor,
        license: packageLicense,
        scripts: {},
        publishConfig: {
            access: 'public'
        }
    };

    if (keywords.length > 0) {
        packageJson.keywords = keywords;
    }

    fs.writeFileSync(path.join(packagePath, 'package.json'), JSON.stringify(packageJson, null, 2));
    logger.info(`Created the package.json file`);

    // Generate README file
    utils.generateReadme(packagePath, packageName, configTypes);

    logger.info(`Initialized new integration package at ${packagePath}`);

    logger.info(`The following contents are created:`);
    utils.printDirectoryTree(packagePath, packageName)
}
