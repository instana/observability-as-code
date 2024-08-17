#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import https from 'https';
import yargs from 'yargs';
import { globSync } from 'glob';
import Handlebars from 'handlebars';
import logger from './logger'; // Import the logger
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { input, checkbox, password, Separator } from '@inquirer/prompts';

const execAsync = promisify(exec);

interface IdObject {
    id: string;
    title: string;
    ownerId: string;
    annotations: string[];
}

function filterDashboardsBy(idObjects: IdObject[], include: string[]): IdObject[] {
    return idObjects.filter(obj => {
        return include.every(condition => {
            const [key, value] = condition.split('=');
            if (key === 'title') {
                const regex = new RegExp(value);
                return regex.test(obj.title);
            } else if (key === 'ownerid') {
                const regex = new RegExp(value);
                return regex.test(obj.ownerId);
            } else if (key === 'annotation') {
                const annotations = value.split(' ');
                return annotations.every(annotation => obj.annotations.includes(annotation));
            }
            return false;
        });
    });
}

function getValueByKeyFromArray(array: string[], key: string): string | undefined {
    const prefix = `${key}=`;
    for (const item of array) {
        if (item.startsWith(prefix)) {
            return item.substring(prefix.length);
        }
    }
    return undefined;
}

// Function to sanitize dashboard titles
function sanitizeDashboardTitles(idObjects: IdObject[]): IdObject[] {
    const titleMap: { [key: string]: number } = {};

    return idObjects.map((obj) => {
        let originalTitle = obj.title.replace(/[^a-z0-9-]/gi, '_').toLowerCase(); // sanitize title;
        let newTitle = originalTitle;

        if (titleMap[originalTitle]) {
            // If title exists, append a counter
            titleMap[originalTitle]++;
            newTitle = `${originalTitle}_${titleMap[originalTitle]}`;
        } else {
            // First time this title is encountered
            titleMap[originalTitle] = 1;
        }

        // Update the title in the object
        return { ...obj, title: newTitle };
    });
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

Download configuration package to a specific location:
  ${execName} download --package my-package --location ./my-packages
`;

const examplesForImport = `
Examples:

Import configuration with parameters replaced:
  ${execName} import --package my-package --server example.com --include "dashboards/**/test-*.json" --set key1=value1 --set key2=value2
`;

const examplesForExport = `
Examples:

Export configuration:
  ${execName} export --server example.com --include title="foo.*" --location ./my-package
`;

// Configure yargs to parse command-line arguments with subcommands
yargs
    .wrap(160) // Set the desired width here
    .usage(`The Instana CLI for configuration package management\n\nUsage: ${execName} <command> <options>`)
    .command('download', 'Download a configuration package', (yargs) => {
        return yargs
            .option('package', {
                alias: 'p',
                describe: 'The package name',
                type: 'string',
                demandOption: true
            })
            .option('location', {
                alias: 'l',
                describe: 'The location to store all the configuration packages',
                type: 'string',
                demandOption: false,
                default: process.cwd() // Set the default location to the current working directory
            })
            .epilog(examplesForDownload);
    }, handleDownload)
    .command('import', 'Import configuration into an environment', (yargs) => {
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
                describe: 'API token to import the configuration',
                type: 'string',
                demandOption: true
            })
            .option('location', {
                alias: 'L',
                describe: 'The location to store all the configuration packages',
                type: 'string',
                demandOption: false,
                default: process.cwd() // Set the default location to the current working directory
            })
            .option('include', {
                alias: 'i',
                describe: 'Folder or pattern to match configuration files to include',
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
    .command('export', 'Export configuration from an environment', (yargs) => {
        return yargs
            .option('server', {
                alias: 'S',
                describe: 'Address of an environment',
                type: 'string',
                demandOption: true
            })
            .option('token', {
                alias: 't',
                describe: 'API token to export the configuration',
                type: 'string',
                demandOption: true
            })
            .option('location', {
                alias: 'L',
                describe: 'The location to store the configuration',
                type: 'string',
                demandOption: false,
                default: process.cwd() // Set the default location to the current working directory
            })
            .option('include', {
                alias: 'F',
                describe: 'Pattern to match different aspects, e.g.: title, for the configuration to be exported',
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
    .command('init', 'Initialize a new configuration package', {}, handleInit)
    .command('publish', 'Publish the local configuration package', (yargs) => {
        return yargs
            .option('package', {
                alias: 'p',
                describe: 'The package name or path to the package',
                type: 'string',
                demandOption: true
            })
            .option('registry-username', {
                alias: 'U',
                describe: 'Username to access the configuration package registry',
                type: 'string',
                demandOption: true
            })
            .option('registry-email', {
                alias: 'E',
                describe: 'Email to access the configuration package registry',
                type: 'string',
                demandOption: true
            });
    }, handlePublish)
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .alias('help', 'h')
    .argv;

// Function to handle download logic
async function handleDownload(argv: any) {
    const { package: packageName, location } = argv;

    logger.info(`Start to download the configuration package: ${packageName}`);

    const downloadCommand = `npm install ${packageName} --prefix ${location}`;
    try {
        const { stdout, stderr } = await execAsync(downloadCommand);
        logger.info(`Download completed, detailed logs: \n${stdout}`);
        logger.info(`The configuration package is downloaded at: ${location}`);
        if (stderr) {
            logger.error(`Download warnings/errors: ${stderr}`);
        }
    } catch (error) {
        logger.error(`Failed to download the configuration package ${packageName}: ${error}`);
        process.exit(1);
    }
}

// Function to handle publish logic
async function handlePublish(argv: any) {
    let { package: packageNameOrPath, registryUsername, registryEmail } = argv;

    logger.info(`Start to publish the configuration package: ${packageNameOrPath}`);

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

    logger.info('Logging into the configuration package registry ...');

    if (!(await isUserLoggedIn())) {
        try {
            // npm login
            const loginArgs = ['login', '--username', registryUsername, '--email', registryEmail];
            if (scope) {
                loginArgs.push(`--scope=@${scope}`);
            }
            await spawnAsync('npm', loginArgs, { stdio: 'inherit' });

            logger.info('Logged into the configuration package registry successfully');
        } catch (error) {
            logger.error('Error occurred during login:', error);
            process.exit(1)
        }
    } else {
        logger.info('Already logged into the configuration package registry');
    }

    logger.info(`Publishing the configuration package from ${packagePath} ...`);
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
        logger.error(`Error publishing the configuration package ${packageNameOrPath}:`, error);
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

    // Create an axios instance with a custom httpsAgent to ignore self-signed certificate errors
    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    async function importConfiguration(searchPattern: string) {
        const files = globSync(searchPattern);

        logger.info(`Start to import the configuration package from ${searchPattern}`);

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

                ensureAccessRules(jsonContent)

                try {
                    const url = `https://${server}/api/custom-dashboard`
                    logger.info(`Applying the dashboard to ${url} ...`);

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
        await importConfiguration(searchPattern);
    } else {
        for (const defaultFolder of defaultFolders) {
            const searchPattern = path.join(packagePath, defaultFolder, '**/*.json');
            await importConfiguration(searchPattern);
        }
    }
}

// Function to handle export logic
async function handleExport(argv: any) {
    const { server, token, location, include: includePattern, debug } = argv;

    // Set log level to debug if the debug flag is set
    if (debug) {
        logger.level = 'debug';
    }

    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    async function exportDashboardConfiguration(dashboardId: string): Promise<any> {
        try {
            const url = `https://${server}/api/custom-dashboard/${dashboardId}`
            logger.info(`Start to get the dashboard(id=${dashboardId}) from ${url}`);

            const response = await axiosInstance.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `apiToken ${token}`
                }
            });
            logger.info(`Successfully got the dashboard(id=${dashboardId}): ${response.status}`);
            if (logger.isDebugEnabled()) {
                logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Failed to get the dashboard(id=${dashboardId}): ${error.message}`);
                if (error.response) {
                    logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
                    logger.error(`Response status: ${error.response.status}`);
                    logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
                }
            } else {
                logger.error(`Failed to get the dashboard(id=${dashboardId}): ${String(error)}`);
            }
            return null;
        }
    }

    async function getDashboardList(): Promise<any> {
        try {
            const url = `https://${server}/api/custom-dashboard`
            logger.info(`Start to get the dashboard list from ${url}`);

            const response = await axiosInstance.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `apiToken ${token}`
                }
            });
            logger.info(`Successfully got the dashboard list: ${response.status}`);
            if (logger.isDebugEnabled()) {
                logger.debug(`Response data: \n${JSON.stringify(response.data)}`);
            }
        return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error(`Failed to get the dashboard list: ${error.message}`);
                if (error.response) {
                    logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
                    logger.error(`Response status: ${error.response.status}`);
                    logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
                }
            } else {
                logger.error(`Failed to get the dashboard list: ${String(error)}`);
            }
        }
    }

    async function saveDashboard(dir: string, id: string, title: string, dashboard: string) {
        try {
            const filename = `${title}.json`
            const filepath = path.join(dir, filename)
            logger.info(`Saving the dashboard(id=${id}) into ${filepath} ...`);
            fs.writeFileSync(filepath, JSON.stringify(dashboard));
            logger.info(`Dashboard(id=${id}) saved successfully`)
        } catch (error) {
            logger.error(`Error saving the dashboard(id=${id}):`, error);
        }
    }

    const includeConditions = Array.isArray(argv.include) ? argv.include : ( argv.include ? [argv.include] : []);

    const dashboardId = getValueByKeyFromArray(includeConditions, "id");
    const dashboardsPath = path.join(location, "dashboards");
    fs.mkdirSync(dashboardsPath, { recursive: true });
    if (dashboardId) {
        const dashboard = await exportDashboardConfiguration(dashboardId);
        saveDashboard(dashboardsPath, dashboardId, dashboard.title, dashboard)
    } else {
        const idObjects = await getDashboardList();

        const filteredIdObjects = filterDashboardsBy(idObjects, includeConditions);
        const sanitizedIdObjects = sanitizeDashboardTitles(filteredIdObjects)

        for (const obj of sanitizedIdObjects) {
            const dashboard = await exportDashboardConfiguration(obj.id);
            saveDashboard(dashboardsPath, obj.id, obj.title, dashboard)
        }

        logger.info(`Total dashboard(s) processed: ${sanitizedIdObjects.length}`)
    }
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

// Function to handle init logic
async function handleInit() {
    const packageName = await input({
        message: `Enter configuration package name: (e.g.: @ibm-instana/self-monitoring, my-awesome-xyz-monitoring): `,
        validate: (input: string) => input ? true : 'Package name is required'
    });

    const packageVersion = await input({
        message: 'Enter configuration package version: ',
        default: '1.0.0',
        validate: (input: string) => /^\d+\.\d+\.\d+$/.test(input) ? true : 'Please enter a valid version number'
    });

    const packageDescription = await input({
        message: 'Enter configuration package description: '
    });

    const keywordsInput = await input({
        message: 'Enter configuration package keywords (comma-separated): '
    });

    const keywords = keywordsInput.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);

    const packageAuthor = await input({
        message: 'Enter configuration package author: ',
        validate: (input: string) => input ? true : 'Package author is required'
    });

    const packageLicense = await input({
        message: 'Enter configuration package license: ',
        default: 'MIT'
    });

    const configTypes = await checkbox({
        message: 'Select the types of configuration to be included in the package:',
        choices: [
            { name: 'dashboards', value: 'dashboards', checked: true },
            new Separator('-- Below items are not supported yet --'),
            { name: 'alerts', value: 'alerts', disabled: true, },
            { name: 'entities', value: 'entities', disabled: true, },
        ],
        required: true
    });

    logger.info(`Start to generate the skeleton for the configuration package: ${packageName}`);

    const packagePath = path.join(process.cwd(), packageName);
    fs.mkdirSync(packagePath, { recursive: true });
    logger.info(`Created the configuration package folder: ${packagePath}`);

    configTypes.forEach((type: string) => {
        const configTypePath = path.join(packagePath, type)
        fs.mkdirSync(configTypePath, { recursive: true });
        logger.info(`Created the configuration package sub-folder: ${configTypePath}`);
    });

    const packageJson: {
        name: string;
        version: string;
        description: string;
        keywords?: string[];
        author: string;
        license: string;
        scripts: object;
    } = {
        name: packageName,
        version: packageVersion,
        description: packageDescription,
        author: packageAuthor,
        license: packageLicense,
        scripts: {},
    };

    if (keywords.length > 0) {
        packageJson.keywords = keywords;
    }

    fs.writeFileSync(path.join(packagePath, 'package.json'), JSON.stringify(packageJson, null, 2));
    logger.info(`Created the package.json file`);

    // Generate README file
    const readmeContent = `# ${packageName}\n\n${packageDescription}`;
    fs.writeFileSync(path.join(packagePath, 'README.md'), readmeContent);
    logger.info(`Created the package README file`);

    logger.info(`Initialized new configuration package at ${packagePath}`);

    logger.info(`The following contents are created:`);
    printDirectoryTree(packagePath, packageName)
}
