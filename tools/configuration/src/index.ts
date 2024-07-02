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
import { input, checkbox, password } from '@inquirer/prompts';

const execAsync = promisify(exec);
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

// Configure yargs to parse command-line arguments with subcommands
yargs
    .wrap(160) // Set the desired width here
    .usage(`Usage: ${execName} <command> <options>`)
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
    .command('init', 'Initialize a new package', {}, handleInit)
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

    // Determine if packageNameOrPath is a path or a name
    const isPath = path.isAbsolute(packageNameOrPath) || packageNameOrPath.includes('/');
    let packageName;
    let packagePath;
    let scope;

    if (isPath) {
        packagePath = packageNameOrPath;
        const packageJsonPath = path.join(packageNameOrPath, 'package.json');
        try {
            const packageJson = require(packageJsonPath);
            packageName = packageJson.name;
        } catch (error) {
            logger.error('Failed to read package.json:', error);
            return;
        }
    } else {
        packageName = packageNameOrPath;
        packagePath = path.join(process.cwd(), packageName); // Assume the current working directory if only the package name is provided
    }

    // Extract scope from package name if it exists
    const scopeMatch = packageName.match(/^@([^/]+)\/.+$/);
    scope = scopeMatch ? scopeMatch[1] : null;    

    try {
        // npm login
        const loginArgs = ['login', '--username', registryUsername, '--email', registryEmail];
        if (scope) {
            loginArgs.push(`--scope=@${scope}`);
        }
        await spawnAsync('npm', loginArgs, { stdio: 'inherit' });

        logger.info('Logged in to the configuration package registry successfully.');
        logger.info('Start to publish the configuration package to the registry ...');

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
    
    const defaultFolders = ['dashboards', 'alerts'];

    // Create an axios instance with a custom httpsAgent to ignore self-signed certificate errors
    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    async function importConfiguration(searchPattern: string) {
        const files = globSync(searchPattern);

        logger.info(`Start to import the configuration from ${searchPattern}.`);

        if (files.length === 0) {
            logger.warn(`No files found for pattern: ${searchPattern}`);
            return;
        }

        const paramsObject = parameters ? parseParams(parameters) : {};

        for (const file of files) {
            if (path.extname(file) === '.json') {

                logger.info(`Importing ${file}.`);

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
                        logger.error(`Failed to parse JSON content for ${file}: ${error.message}`);
                    } else {
                        logger.error(`Failed to parse JSON content for ${file}: ${String(error)}`);
                    }
                    continue; // Continue with the next file
                }

                try {
                    const url = `https://${server}/api/custom-dashboard`
                    logger.info(`Applying the configuration to ${url}.`);

                    const response = await axiosInstance.post(url, jsonContent, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `apiToken ${token}`
                        }
                    });
                    logger.info(`Successfully posted ${file}: ${response.status}`);
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        logger.error(`Failed to post ${file}: ${error.message}`);
                        if (error.response) {
                            logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
                            logger.error(`Response status: ${error.response.status}`);
                            logger.error(`Response headers: ${JSON.stringify(error.response.headers)}`);
                        }
                    } else {
                        logger.error(`Failed to post ${file}: ${String(error)}`);
                    }
                }
            }
        }
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

// Function to handle init logic
async function handleInit() {
    const pkgName = await input({
        message: `Enter configuration package name: (e.g.: @ibm-instana/self-monitoring, my-awesome-package): `,
        validate: (input: string) => input ? true : 'Package name is required'
    });

    const pkgVersion = await input({
        message: 'Enter configuration package version: ',
        default: '1.0.0',
        validate: (input: string) => /^\d+\.\d+\.\d+$/.test(input) ? true : 'Please enter a valid version number'
    });

    const pkgDescription = await input({
        message: 'Enter configuration package description: '
    });

    const keywordsInput = await input({
        message: 'Enter configuration package keywords (comma-separated): '
      });
    
    const keywords = keywordsInput.split(',').map(keyword => keyword.trim()).filter(keyword => keyword);

    const pkgAuthor = await input({
        message: 'Enter configuration package author: ',
        validate: (input: string) => input ? true : 'Package author is required'
    });

    const pkgLicense = await input({
        message: 'Enter configuration package license: ',
        default: 'MIT'
    });

    const cfgTypes = await checkbox({
        message: 'Select the types of configuration to be included in the package:',
        choices: [
            { name: 'dashboards', value: 'dashboards' },
            { name: 'alerts', value: 'alerts' },
            { name: 'misc', value: 'misc' },
        ],
        required: true
    });

    logger.info(`Start to generate the skeleton for the configuration package: ${pkgName} ...`);

    const packagePath = path.join(process.cwd(), pkgName);
    fs.mkdirSync(packagePath, { recursive: true });
    
    cfgTypes.forEach((type: string) => {
        fs.mkdirSync(path.join(packagePath, type), { recursive: true });
    });
    
    const packageJson: {
        name: string;
        version: string;
        description: string;
        keywords?: string[];
        author: string;
        license: string;
      } = {
        name: pkgName,
        version: pkgVersion,
        description: pkgDescription,
        author: pkgAuthor,
        license: pkgLicense,
    };

    if (keywords.length > 0) {
        packageJson.keywords = keywords;
    }

    fs.writeFileSync(path.join(packagePath, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    logger.info(`Initialized new configuration package at ${packagePath}`);
}
