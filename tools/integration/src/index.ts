#!/usr/bin/env node

import { Separator, checkbox, input, password } from '@inquirer/prompts';
import axios, { AxiosError } from 'axios';
import { exec, spawn } from 'child_process';

import Handlebars from 'handlebars';
import fs from 'fs';
import { globSync } from 'glob';
import https from 'https';
import logger from './logger'; // Import the logger
import path from 'path';
import { promisify } from 'util';
import semver from 'semver';
import yargs from 'yargs';

const execAsync = promisify(exec);

interface IdObject {
    id: string;
    title: string;
    ownerId: string;
    annotations: string[];
}


// Helper function to promisify spawn
const spawnAsync = (command: any, args: any, options: any) => {
    return new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, options);
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with exit code ${code}`));
            } else {
                resolve();
            }
        });
        child.on('error', reject);
    });
};

// Helper function to check if a path exists
const pathExists = (filePath: string) => {
    try {
        return fs.existsSync(filePath);
    } catch (err) {
        return false;
    }
};

// Helper function to read the package.json file
const readPackageJson = (filePath: string) => {
    try {
        const packageJson = fs.readFileSync(path.join(filePath, 'package.json'), 'utf8');
        return JSON.parse(packageJson);
    } catch (error) {
        logger.error('Failed to read the package.json:', error);
        return null;
    }
};

// Helper function to check and read README.md
const readReadmeFile = (directoryPath: string) : string | null => {
    const readmeFilePath = path.join(directoryPath, 'README.md');
    try {
        if(fs.existsSync(readmeFilePath)){
	    	return fs.readFileSync(readmeFilePath, 'utf8');
		} else {
	    	logger.error(`README.md is missing in the directory: ${directoryPath}`);
            return null;
		}
    } catch (error){
        logger.error('Failed to read README.md.');
        return null;
    }
};

// Helper function to check if the package is private
function isPrivatePackage(packageData: any): boolean {
    return packageData.private === true;
}

async function isUserLoggedIn() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const npmrcPath = path.join(homeDir, '.npmrc');
    if (fs.existsSync(npmrcPath)) {
        const npmrcContent = fs.readFileSync(npmrcPath, 'utf-8');
        return npmrcContent.includes('//registry.npmjs.org/:_authToken=');
    }
    return false;
}

// Register a helper to preserve placeholders if no value is provided
Handlebars.registerHelper('default', function (value: string, defaultValue: string) {
    return typeof value !== 'undefined' ? value : defaultValue;
});

// Dynamically determine the executable name
const execName = path.basename(process.argv[1]);

const examplesForDownload = `
Examples:

Download integration package to a specific location:
  ${execName} download --package my-package --location ./my-packages
`;

const examplesForImport = `
Examples:

Import integration package with parameters replaced:
  ${execName} import --package my-package --server example.com --include "dashboards/**/test-*.json" --set key1=value1 --set key2=value2
  ${execName} import --package my-package --server example.com --include "events/**/*.json"
`;

const examplesForExport = `
Examples:

Export integration elements:
  ${execName} export --server example.com --include type=dashboard title="Runtime.*" --location ./my-package
  ${execName} export --server example.com --include type=event id=exampleid --location ./my-package
`;

// Configure yargs to parse command-line arguments with subcommands
yargs
    .wrap(160) // Set the desired width here
    .usage(`The Instana CLI for integration package management\n\nUsage: ${execName} <command> <options>`)
    .command('download', 'Download an integration package', (yargs) => {
        return yargs
            .option('package', {
                alias: 'p',
                describe: 'The package name',
                type: 'string',
                demandOption: true
            })
            .option('location', {
                alias: 'l',
                describe: 'The location to store all the integration packages',
                type: 'string',
                demandOption: false,
                default: process.cwd() // Set the default location to the current working directory
            })
            .epilog(examplesForDownload);
    }, handleDownload)
    .command('import', 'Import an integration package into an environment', (yargs) => {
        return yargs
            .option('package', {
                alias: 'p',
                describe: 'The package name or path to the package',
                type: 'string',
                demandOption: true
            })
            .option('server', {
                alias: 'S',
                describe: 'Address of an environment',
                type: 'string',
                demandOption: true
            })
            .option('token', {
                alias: 't',
                describe: 'API token to import the integration package',
                type: 'string',
                demandOption: true
            })
            .option('location', {
                alias: 'L',
                describe: 'The location to store all the integration packages',
                type: 'string',
                demandOption: false,
                default: process.cwd() // Set the default location to the current working directory
            })
            .option('include', {
                alias: 'i',
                describe: 'Folder or pattern to match integration element files to include',
                type: 'string',
                demandOption: false
            })
            .option('set', {
                alias: 's',
                describe: 'Parameter values in the format key=value',
                type: 'array',
                demandOption: false
            })
            .option('debug', {
                alias: 'd',
                describe: 'Enable debug mode',
                type: 'boolean',
                default: false
            })
            .epilog(examplesForImport);
    }, handleImport)
    .command('export', 'Export integration elements from an environment', (yargs) => {
        return yargs
            .option('server', {
                alias: 'S',
                describe: 'Address of an environment',
                type: 'string',
                demandOption: true
            })
            .option('token', {
                alias: 't',
                describe: 'API token to export the integration elements',
                type: 'string',
                demandOption: true
            })
            .option('location', {
                alias: 'L',
                describe: 'The location to store the integration elements',
                type: 'string',
                demandOption: false,
                default: process.cwd() // Set the default location to the current working directory
            })
            .option('include', {
                alias: 'F',
                describe: 'Pattern to match different aspects, e.g.: title, for the integration elements to be exported',
                type: 'string',
                demandOption: false
            })
            .option('debug', {
                alias: 'd',
                describe: 'Enable debug mode',
                type: 'boolean',
                default: false
            })
            .epilog(examplesForExport);
    }, handleExport)
    .command('init', 'Initialize a new integration package', {}, handleInit)
    .command('publish', 'Publish the local integration package', (yargs) => {
        return yargs
            .option('package', {
                alias: 'p',
                describe: 'The package name or path to the package',
                type: 'string',
                demandOption: true
            })
            .option('registry-username', {
                alias: 'U',
                describe: 'Username to access the integration package registry',
                type: 'string',
                demandOption: true
            })
            .option('registry-email', {
                alias: 'E',
                describe: 'Email to access the integration package registry',
                type: 'string',
                demandOption: true
            });
    }, handlePublish)
    .command('lint', 'Provides linting for package', (yargs) => {
    	return yargs
            .option('path', {
        		alias: 'p',
                describe: 'The path to the package',
                type: 'string',
                demandOption: false
            })
	    	.option('strict-mode', {
                alias: 's',
                describe: 'Restricts the validations',
                type: 'boolean',
                demandOption: false
            })
	    	.option('debug', {
				alias: 'd',
                describe: 'Enable debug mode',
                type: 'boolean',
                default: false
            });
    }, handleLint)
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .alias('help', 'h')
    .argv;

// Function to handle lint logic
async function handleLint(argv: any) {
    const currentDirectory = process.cwd();
    const errors: string[] = [];
    const warnings: string[] = [];
    const successMessages: string[] = [];

    const packageData = readPackageJson(currentDirectory);
    if (isPrivatePackage(packageData)) {
    	console.log(`Skipping linting for package: ${packageData.name}`);
        process.exit(0);
    }

    const readmeContent = readReadmeFile(currentDirectory);
    const dashboardsPath = path.join(currentDirectory, 'dashboards');
    const eventsPath = path.join(currentDirectory, 'events');
    const entitiesPath = path.join(currentDirectory, 'entities');

    // Check README
    if (readmeContent) {
	try {
	    validateReadmeContent(readmeContent, packageData.name, currentDirectory, errors, warnings, successMessages);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(errorMessage);
        }
    } else {
        errors.push('README.md is missing or empty.');
    }
    try {
		const strictMode = argv['strict-mode'];
        await validatePackageJson(packageData, errors, warnings, successMessages, strictMode);
        if(fs.existsSync(dashboardsPath)){
            validateDashboardFiles(dashboardsPath, errors, warnings, successMessages);
        } else {
            logger.info('No dashboards folder found for this package.');
        }
        if(fs.existsSync(eventsPath)){
            validateEventFiles(eventsPath, errors, warnings, successMessages);
        } else {
            logger.info('No events folder found for this package.');
        }
		if(fs.existsSync(entitiesPath)){
			validateEntityFiles(entitiesPath, errors, warnings, successMessages);
		} else{
			logger.info('No entities folder found for this package.');
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

// Helper function to validate `package.json`
async function validatePackageJson(packageData: any, errors: string[], warnings: string[], successMessages: string[], strictMode: boolean): Promise<void> {
    // Validate `name`
    const namePattern = /^@instana-integration\/[a-zA-Z0-9-_]+$/;
    if (!namePattern.test(packageData.name)) {
        const warningMessage = `Warning: Package name "${packageData.name}" does not align with the IBM package naming convention.`;
	if(strictMode) {
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
    for (const field of requiredFields) {
        if (packageData[field] === undefined || packageData[field] === null || packageData[field] === '') {
            if (field === 'description') {
                warnings.push('Warning: The package description is missing. Adding a description is recommended.');
            } else {
                errors.push(`The package is missing required field ${field}.`);
            }
        } else {
            successMessages.push(`The package field ${field} is present.`);
        }
    }

    // Check for publishConfig.access = "public"
    if (!packageData.publishConfig || packageData.publishConfig.access !== "public") {
        errors.push(`"publishConfig.access" is missing or not set to "public". It is mandatory to include "publishConfig": { "access": "public" } for public packages.`);
    } else {
        successMessages.push(`The "publishConfig.access" is correctly set to "public".`);
    }

}

// Helper function to validate dashboard files
function validateDashboardFiles(dashboardsPath: string, errors: string[], warnings: string[], successMessages: string[]): void {
    const files = fs.readdirSync(dashboardsPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
        warnings.push('No JSON files found in the dashboards folder.');
        return;
    }

    jsonFiles.forEach(file => {
        const filePath = path.join(dashboardsPath, file);
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const dashboard = JSON.parse(fileContent);
            const accessRules = dashboard.accessRules;

            const requiredAccessRule = {
                accessType: 'READ_WRITE',
                relationType: 'GLOBAL',
                relatedId: ''
            };

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
            	errors.push(`Dashboard file ${file} must include the required accessRule: ${JSON.stringify(requiredAccessRule)}.`);
			} else {
				successMessages.push(`Dashboard file ${file} contains the required GLOBAL accessRule.`);
			}
		} catch (error) {
			errors.push(`Error validating file ${file}: ${error instanceof Error ? error.message : String(error)}.`);
		}
    });
}

// Helper function to validate event files
function getAllJsonFiles(dir: string): string[] {
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

function validateEventFiles(eventsPath: string, errors: string[], warnings: string[], successMessages: string[]): void {
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
                successMessages.push(`Event is correctly defined in the file: ${file}.`);
            } else {
                errors.push(`Event is not correctly defined in the file: ${file}.`);
            }
        } catch (error) {
            errors.push(`Error validating file ${filePath}: ${error instanceof Error ? error.message : String(error)}.`);
        }
    });
}

// Helper function to validate entity files
function validateEntityFiles(entitiesPath: string, errors: string[], warnings: string[], successMessages: string[]): void {
	const jsonFiles = getAllJsonFiles(entitiesPath);
	if(jsonFiles.length === 0){
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

            if (!entity.data || typeof entity.data !== 'object'  || Object.keys(entity.data).length === 0) {
            	errors.push(`Missing or invalid 'data' object in file: ${file}.`);
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

			if(allEntityFieldsValid === true){
				successMessages.push(`Entity is correctly defined in the file: ${file}.`);
			} else {
				errors.push(`Entity is not correctly defined in the file: ${file}.`);
			}

        } catch (error) {
			errors.push(`Error validating file ${filePath}: ${error instanceof Error ? error.message : String(error)}.`);
        }
    });
}


// Helper function to validate README content
function validateReadmeContent(readmeContent: string, packageName: string, currentDirectory: string, errors: string[], warnings: string[], successMessages: string[]): void {

    const dashboardsExist = fs.existsSync(path.join(currentDirectory, 'dashboards'));
    const eventsExist = fs.existsSync(path.join(currentDirectory, 'events'));
    const requiredSections = [packageName];
    if(dashboardsExist){
		requiredSections.push('Dashboards');
    }
    requiredSections.push('Metrics', 'Semantic Conventions', 'Resource Attributes');
    if(eventsExist){
		requiredSections.push('Events');
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

// Function to handle download logic
async function handleDownload(argv: any) {
    const { package: packageName, location } = argv;

    logger.info(`Start to download the integration package: ${packageName}`);

    const downloadCommand = `npm install ${packageName} --prefix ${location}`;
    try {
        const { stdout, stderr } = await execAsync(downloadCommand);
        logger.info(`Download completed, detailed logs: \n${stdout}`);
        logger.info(`The integration package is downloaded at: ${location}`);
        if (stderr) {
            logger.error(`Download warnings/errors: ${stderr}`);
        }
    } catch (error) {
        logger.error(`Failed to download the integration package ${packageName}: ${error}`);
        process.exit(1);
    }
}

// Function to handle publish logic
async function handlePublish(argv: any) {
    let { package: packageNameOrPath, registryUsername, registryEmail } = argv;

    logger.info(`Start to publish the integration package: ${packageNameOrPath}`);

    let packageName;
    let packagePath;
    let scope;

    if (pathExists(packageNameOrPath)) {
        packagePath = packageNameOrPath;
        const packageJson = readPackageJson(packagePath);
        if (!packageJson) {
            logger.error('Failed to read the package.json');
            return;
        }
        packageName = packageJson.name;
    } else {
        packageName = packageNameOrPath;
        packagePath = path.join(process.cwd(), packageNameOrPath); // Assume the current working directory if only the package name is provided
        if (!pathExists(packagePath)) {
            logger.error(`Path does not exist: ${packagePath}`);
            return;
        }
    }

    // Extract scope from package name if it exists
    const scopeMatch = packageName.match(/^@([^/]+)\/.+$/);
    scope = scopeMatch ? scopeMatch[1] : null;

    logger.info('Logging into the integration package registry ...');

    if (!(await isUserLoggedIn())) {
        try {
            // npm login
            const loginArgs = ['login', '--username', registryUsername, '--email', registryEmail];
            if (scope) {
                loginArgs.push(`--scope=@${scope}`);
            }
            await spawnAsync('npm', loginArgs, { stdio: 'inherit' });

            logger.info('Logged into the integration package registry successfully');
        } catch (error) {
            logger.error('Error occurred during login:', error);
            process.exit(1)
        }
    } else {
        logger.info('Already logged into the integration package registry');
    }

    logger.info(`Publishing the integration package from ${packagePath} ...`);
    logger.info(`Package name: ${packageName}`);
    logger.info(`Scope: ${scope || 'none'}`);

    try {
        // npm publish command
        const publishArgs = ['publish'];
        if (scope) {
            publishArgs.push('--access', 'public');
        }
        await spawnAsync('npm', publishArgs, { cwd: packagePath, stdio: 'inherit' });

        logger.info(`Package ${packageName} published successfully`);
    } catch (error) {
        logger.error(`Error publishing the integration package ${packageNameOrPath}:`, error);
        process.exit(1);
    }
}

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

interface AccessRule {
    accessType: string;
    relationType: string;
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

// Function to handle import logic
async function handleImport(argv: any) {
    const { package: packageNameOrPath, server, token, location, include: includePattern, set: parameters, debug } = argv;

    // Set log level to debug if the debug flag is set
    if (debug) {
        logger.level = 'debug';
    }

    let packagePath = packageNameOrPath;
    if (!fs.existsSync(packageNameOrPath)) {
        packagePath = path.join(location, 'node_modules', packageNameOrPath);
    }

    const defaultFolders = ['dashboards'];
    const defaultEventsFolders = ['events'];

    // Create an axios instance with a custom httpsAgent to ignore self-signed certificate errors
    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    async function importIntegration(searchPattern: string, apiPath: string, typeLabel: string) {
        const files = globSync(searchPattern);

        logger.info(`Start to import the integration package from ${searchPattern}`);

        if (files.length === 0) {
            logger.warn(`No files found for pattern: ${searchPattern}`);
            return;
        }

        const paramsObject = parameters ? parseParams(parameters) : {};

        for (const file of files) {
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

                if (apiPath === 'api/custom-dashboard') {
                  ensureAccessRules(jsonContent)
                }

                try {
                    const url = `https://${server}/${apiPath}`;
                    logger.info(`Applying the ${typeLabel} to ${url} ...`);
                    const response = await axiosInstance.post(url, jsonContent, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `apiToken ${token}`
						}
                    });
		    		logger.info(`Successfully applied ${file}: ${response.status}`);
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        logger.error(`Failed to apply ${file}: ${error.message}`);
                        if (error.response) {
                            logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
                            logger.error(`Response status: ${error.response.status}`);
                            logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
                        }
                    } else {
                        logger.error(`Failed to apply ${file}: ${String(error)}`);
                    }
                }
            }
        }

        logger.info(`Total file(s) processed: ${files.length}`)
    }

    if (includePattern) {
        const searchPattern = path.join(packagePath, includePattern);
        if (includePattern.includes('events')) {
            await importIntegration(searchPattern, "api/events/settings/event-specifications/custom", "custom event");
        } else {
            await importIntegration(searchPattern, "api/custom-dashboard", "custom dashboard");
        }
    } else {
        for (const defaultFolder of defaultFolders) {
            const searchPattern = path.join(packagePath, defaultFolder, '**/*.json');
            await importIntegration(searchPattern, "api/custom-dashboard", "custom dashboard");
        }
        for (const defaultFolder of defaultEventsFolders) {
            const searchPattern = path.join(packagePath, defaultFolder, '**/*.json');
            await importIntegration(searchPattern, "api/events/settings/event-specifications/custom", "custom event");
        }
    }
}

// Function to handle export logic
async function handleExport(argv: any) {
    const { server, token, location, include: includeRaw, debug } = argv;

    if (debug) {
        logger.level = 'debug';
    }

    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    const parsedIncludes = parseIncludesFromArgv(process.argv);

    const dashboardsPath = path.join(location, "dashboards");
    const eventsPath = path.join(location, "events");
    fs.mkdirSync(dashboardsPath, { recursive: true });
    fs.mkdirSync(eventsPath, { recursive: true });

    let wasDashboardFound = false;
    let wasEventFound = false;

    // Dashboard export
    if (parsedIncludes.some(inc => inc.type === "dashboard" || inc.type === "all")) {
        const allDashboards = await getDashboardList(server, token, axiosInstance);
        let totalDashboardProcessed = 0;

        for (const inc of parsedIncludes.filter(inc => inc.type === "dashboard" || inc.type === "all")) {
            const matches = inc.conditions.filter(c => c.startsWith("id="));

            let filtered;
            if (matches.length) {
                filtered = matches.map(idCond => {
                    const id = idCond.split("=")[1]?.replace(/^"|"$/g, '');
                    const found = allDashboards.find(d => d.id === id);
                    return found;
                }).filter(Boolean);
            } else {
                filtered = filterDashboardsBy(allDashboards, inc.conditions);
            }

            if (filtered.length === 0) {
                const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                logFn(`No custom dashboard(s) found matching: ${inc.conditions.join(', ')}`);
                continue;
            }
	    	const enriched = filtered.map(item => ({
                ...item,
                name: item.name ?? `custom-dashboard-${item.id}`
            }));
            const sanitized = sanitizeTitles(filtered, "custom-dashboard");
            for (const dash of sanitized) {
                const dashboard = await exportDashboard(server, token, dash.id, axiosInstance);
                if (dashboard) {
                    saveDashboard(dashboardsPath, dash.id, dash.title, dashboard);
                    totalDashboardProcessed++;
                    wasDashboardFound = true;
                } else {
                    const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                    logFn(`Dashboard with id=${dash.id} not found or failed to export.`);
                }
            }
        }

        logger.info(`Total custom dashboard(s) processed: ${totalDashboardProcessed}`);
    }

    // Event export
    if (parsedIncludes.some(inc => inc.type === "event" || inc.type === "all")) {
        const allEvents = await getEventList(server, token, axiosInstance);
        let totalEventProcessed = 0;

        for (const inc of parsedIncludes.filter(inc => inc.type === "event" || inc.type === "all")) {
        	const matches = inc.conditions.filter(c => c.startsWith("id="));
            let filtered;
	   		if (matches.length) {
            	filtered = matches.map(idCond => {
                	const id = idCond.split("=")[1]?.replace(/^"|"$/g, '');
                    const found = allEvents.find(e => e.id === id);
                    return found;
                }).filter(Boolean);
            } else {
                filtered = filterEventsBy(allEvents, inc.conditions);
            }

            if (filtered.length === 0) {
                const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                logFn(`No custom event(s) found matching: ${inc.conditions.join(', ')}`);
                continue;
            }
	    	const enriched = filtered.map(item => ({
                ...item,
                name: item.name ?? `custom-event-${item.id}`
            }));
            const sanitized = sanitizeTitles(filtered, "custom-event");
            for (const evt of sanitized) {
                const event = await exportEvent(server, token, evt.id, axiosInstance);
                if (event) {
                    saveEvent(eventsPath, evt.id, evt.title, event);
                    totalEventProcessed++;
                    wasEventFound = true;
                } else {
                    const logFn = inc.explicitlyTyped ? logger.error : logger.debug;
                    logFn(`Event with id=${evt.id} not found or failed to export.`);
                }
            }
        }

        logger.info(`Total custom event(s) processed: ${totalEventProcessed}`);
    }

    // Final info
    if (!wasDashboardFound && !wasEventFound) {
        logger.error("No custom elements were found or exported.");
    }
}

// Helper functions for dashboard export
async function exportDashboard(server: string, token: string, dashboardId: string, axiosInstance: any): Promise<any> {
    try {
        const url = `https://${server}/api/custom-dashboard/${dashboardId}`;
        logger.info(`Getting custom dashboard (id=${dashboardId}) from ${url} ...`);

        const response = await axiosInstance.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
        });

        logger.info(`Successfully got custom dashboard (id=${dashboardId}): ${response.status}`);
        if (logger.isDebugEnabled()) {
            logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
        }

        return response.data;
    } catch (error) {
        handleAxiosError(error, `dashboard (id=${dashboardId})`);
        return null;
    }
}

async function getDashboardList(server: string, token: string, axiosInstance: any): Promise<any[]> {
    try {
        const url = `https://${server}/api/custom-dashboard`;
        logger.info(`Getting custom dashboard list from ${url} ...`);

        const response = await axiosInstance.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
        });
        logger.info(`Successfully got custom dashboard list: ${response.status}`);
        if (logger.isDebugEnabled()) {
            logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
        }
        return response.data;
    } catch (error) {
        handleAxiosError(error, `dashboard list`);
        return [];
    }
}

function saveDashboard(dir: string, id: string, title: string, dashboard: any) {
    try {
        const filename = `${title}.json`;
        const filepath = path.join(dir, filename);
        logger.info(`Saving custom dashboard (id=${id}) to ${filepath} ...`);
        fs.writeFileSync(filepath, JSON.stringify(dashboard, null, 2));
        logger.info(`Custom dashboard (id=${id}) saved successfully`);
    } catch (error) {
        logger.error(`Error saving custom dashboard (id=${id}):`, error);
    }
}

function filterDashboardsBy(idObjects: IdObject[], include: string[]): IdObject[] {
    return idObjects.filter(obj => {
        return include.every(condition => {
            const [key, rawValue] = condition.split('=');
            const value = rawValue?.replace(/^"|"$/g, '');
            if (key === 'title') {
                return new RegExp(value, 'i').test(obj.title);
            } else if (key === 'ownerid') {
                return new RegExp(value, 'i').test(obj.ownerId ?? '');
            } else if (key === 'annotation') {
                return (obj.annotations ?? []).includes(value);
            }
            return false;
        });
    });
}

// Helper functions for event export
async function exportEvent(server: string, token: string, eventId: string, axiosInstance: any): Promise<any> {
    try {
        const url = `https://${server}/api/events/settings/event-specifications/custom/${eventId}`;
        logger.info(`Getting custom event (id=${eventId}) from ${url} ...`);

        const response = await axiosInstance.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
        });

        logger.info(`Successfully got custom event (id=${eventId}): ${response.status}`);
        if (logger.isDebugEnabled()) {
            logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
        }

        return response.data;
    } catch (error) {
        handleAxiosError(error, `event (id=${eventId})`);
        return null;
    }
}

async function getEventList(server: string, token: string, axiosInstance: any): Promise<any[]> {
    try {
        const url = `https://${server}/api/events/settings/event-specifications/custom`;
        logger.info(`Getting custom event list from ${url} ...`);

        const response = await axiosInstance.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
        });

        logger.info(`Successfully got custom event list: ${response.status}`);
        if (logger.isDebugEnabled()) {
            logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
        }

        return response.data;
    } catch (error) {
        handleAxiosError(error, `event list`);
        return [];
    }
}

function saveEvent(dir: string, id: string, name: string, event: any) {
    try {
        const filename = `${name}.json`;
        const filepath = path.join(dir, filename);
        logger.info(`Saving custom event (id=${id}) to ${filepath} ...`);
        fs.writeFileSync(filepath, JSON.stringify(event, null, 2));
        logger.info(`Custom event (id=${id}) saved successfully`);
    } catch (error) {
        logger.error(`Error saving custom event (id=${id}):`, error);
    }
}

function filterEventsBy(idObjects: any[], include: string[]): any[] {
    return idObjects.filter(obj => {
        return include.every(condition => {
            const [key, rawValue] = condition.split('=');
            const value = rawValue?.replace(/^"|"$/g, '');

            if (key === 'name' || key === 'title') {
                return new RegExp(value, 'i').test(obj.name ?? '');
            } else if (key === 'id') {
                return obj.id === value;
            }
            return false;
        });
    });
}

// Helpers for export
function parseIncludesFromArgv(argv: string[]): { type: string, conditions: string[], explicitlyTyped: boolean }[] {
	const includes: { type: string, conditions: string[], explicitlyTyped: boolean }[] = [];
  	let current: { type: string, conditions: string[], explicitlyTyped: boolean } | null = null;
  	let clauseParts: string[] = [];

  	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
	  	if (arg === "--include") {
      		if (clauseParts.length && !current?.explicitlyTyped) {
				logger.warn(`'type=' missing in include clause "${clauseParts.join(" ")}", interpreting as type=all`);
      		}
			clauseParts = [];
			const next = argv[i + 1];
		  	const keyVal = next?.split("=");
			if (keyVal?.[0] === "type") {
				current = { type: keyVal[1], conditions: [], explicitlyTyped: true };
			  	i++;
			  	clauseParts.push(`type=${keyVal[1]}`);
		  	} else {
				current = { type: "all", conditions: [], explicitlyTyped: false };
		  	}
		  	includes.push(current);
	  	} else if (current) {
      		current.conditions.push(arg);
      		clauseParts.push(arg);
    	}
  	}
  	if (clauseParts.length && !current?.explicitlyTyped) {
    	logger.warn(`'type=' missing in include clause "${clauseParts.join(" ")}", interpreting as type=all`);
  	}
  	return includes;
}

function parseIncludeItem(item: string): string[] {
    const result: string[] = [];
    let buffer = '';
    let inQuotes = false;

    for (let i = 0; i < item.length; i++) {
        const char = item[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ' ' && !inQuotes) {
            if (buffer.length > 0) {
                result.push(buffer);
                buffer = '';
            }
        } else {
            buffer += char;
        }
    }

    if (buffer.length > 0) {
        result.push(buffer);
    }

    return result;
}

function sanitizeFileName(name: string): string {
    if (!name) return 'untitled'; // fallback
    return name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

function getValueByKeyFromArray(array: string[], key: string): string | undefined {
    const prefix = `${key}=`;
    return array.find(item => item.startsWith(prefix))?.substring(prefix.length);
}

function handleAxiosError(error: any, context: string) {
    if (axios.isAxiosError(error)) {
        logger.error(`Failed to get ${context}: ${error.message}`);
        if (error.response) {
            logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
            logger.error(`Response status: ${error.response.status}`);
            logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
        }
    } else {
        logger.error(`Failed to get ${context}: ${String(error)}`);
    }
}

function sanitizeTitles<T extends { id: string; title?: string; name?: string }>(idObjects: T[], fallbackPrefix: string): T[] {
    const titleMap: { [key: string]: number } = {};
    return idObjects.map(obj => {
        const fallback = obj.name || `${fallbackPrefix}-${obj.id}`;
        const baseTitle = sanitizeFileName(obj.title || fallback);
        let newTitle = baseTitle;

        if (titleMap[baseTitle]) {
            titleMap[baseTitle]++;
            newTitle = `${baseTitle}_${titleMap[baseTitle]}`;
        } else {
            titleMap[baseTitle] = 1;
        }

        return { ...obj, title: newTitle };
    });
}

// Function to handle init logic
async function handleInit() {
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
            new Separator('-- Below items are not supported yet --'),
            { name: 'collector configs', value: 'collector-configs', disabled: true, },
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
    generateReadme(packagePath, packageName, configTypes);

    logger.info(`Initialized new integration package at ${packagePath}`);

    logger.info(`The following contents are created:`);
    printDirectoryTree(packagePath, packageName)
}

function printDirectoryTree(dirPath: string, rootLabel: string, indent: string = ''): void {
    const isRoot = indent === '';
    if (isRoot) {
		logger.info(rootLabel);
    }

    const files = fs.readdirSync(dirPath);
    const lastIndex = files.length - 1;

    files.forEach((file, index) => {
		const fullPath = path.join(dirPath, file);
      	const isDirectory = fs.statSync(fullPath).isDirectory();
      	const isLast = index === lastIndex;
      	const prefix = isLast ? '└── ' : '├── ';

      	logger.info(indent + prefix + file);
    	if (isDirectory) {
			const newIndent = indent + (isLast ? '    ' : '│   ');
        	printDirectoryTree(fullPath, rootLabel, newIndent);
      	}
    });
}

//function to generate README.md file content
function generateReadme(packagePath: string, packageName: string, configTypes: string[]) {
    let readmeContent = `# ${packageName}

(Note: Write your package description here.)
`;
    if (configTypes.includes('dashboards')) {
        readmeContent += `
## Dashboards

Below are the dashboards that are currently supported by this integration package.

(Note: Replace the sample entries below with actual dashboards defined in your package.)

| Dashboard Title        | Description                                                |
|------------------------|------------------------------------------------------------|
| <dashboard_title>      | Brief description of what this dashboard displays.         |
`;
    }

    readmeContent += `
## Metrics

### Semantic Conventions

Below are the runtime metrics that are currently supported by this integration package.

(Note: Replace the sample entries below with actual metrics for your package.)

| Metric Name             | Description                      | Unit    |
|-------------------------|----------------------------------|---------|
| <metric.name.example1>  | Description of the metric        | <unit>  |
| <metric.name.example2>  | Description of another metric    | <unit>  |

### Resource Attributes

Below are the resource attributes that are currently supported by this integration package.

(Note: Replace with the actual resource attributes relevant to your package.)

| Attribute Key                    | Type   | Description                                      |
|----------------------------------|--------|--------------------------------------------------|
| <resource.attribute.key1>        | string | Describes the entity name or other identifier    |
| <resource.attribute.key2>        | string | Further identifies or qualifies the entity       |
`;

    if (configTypes.includes('events')) {
        readmeContent += `
## Events

Below are the events that are currently supported by this integration package.

(Note: Replace the sample entries below with actual events from your package.)

| Event Name               | Description                       |
|--------------------------|---------------------------------  |
| <event.name.example1>    | Triggered when condition X occurs |
| <event.name.example2>    | Triggered when condition Y occurs |
`;
    }

    if (configTypes.includes('entities')) {
        readmeContent += `
## Entities

Below are the entities that are currently supported by this integration package.

(Note: Repeat the following structure for each custom entity in your package.)

### Entity: <Entity Label>

(Note: Write your entity description here.)

#### Dashboards

| Dashboard Title        | Description                                         |
|------------------------|-----------------------------------------------------|
| <dashboard_title>      | Describe the dashboard linked to this entity.       |

#### Metrics

| Metric Name             | Description                          | Unit   |
|-------------------------|------------------------------------- |--------|
| <metric.name.example1>  | What the metric tracks               | <unit> |
| <metric.name.example2>  | Another metric for this entity       | <unit> |

#### Dependencies

| Related Entity          | Description of Relationship                                     |
|-------------------------|-----------------------------------------------------------------|
| <related_entity_label>  | Explain how this entity depends on or relates to another entity |
`;
    }

    readmeContent += `
## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package, such as downloading the package and importing it into Instana. You can find the available binaries for the CLI on different platforms on the [release page of this project](https://github.com/instana/observability-as-code/releases). Select the binary from the latest release that matches your platform to download, then rename it to stanctl-integration. You should now be able to run it on your local machine.

Downloading the package:

\`\`\`shell
$ stanctl-integration download --package ${packageName}
\`\`\`

Importing the package into Instana:

\`\`\`shell
$ stanctl-integration import --package ${packageName} \\
  --server $INSTANA_SERVER \\
  --token $API_TOKEN \\
  --set servicename=$SERVICE_NAME \\
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
\`\`\`

- INSTANA_SERVER: This is the base URL of an Instana tenant unit, e.g. https://test-example.instana.io, which is used by the CLI to communicate with Instana server for package lifecycle management.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refer to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_NAME: Logical name of the service.
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).
`;

    const readmeFilePath = path.join(packagePath, 'README.md');
    fs.writeFileSync(readmeFilePath, readmeContent);
    logger.info(`Created the package README file at ${readmeFilePath}`);
}

