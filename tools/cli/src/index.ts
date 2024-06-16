#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import https from 'https'; // Import the https module
import yargs from 'yargs';
import { globSync } from 'glob';
import Handlebars from 'handlebars';
import logger from './logger'; // Import the logger
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Register a helper to preserve placeholders if no value is provided
Handlebars.registerHelper('default', function (value: string, defaultValue: string) {
    return typeof value !== 'undefined' ? value : defaultValue;
});

// Dynamically determine the executable name
const execName = path.basename(process.argv[1]);

const examplesForDownload = `
Examples:

Download configuration package to a specific location:
  ${execName} configuration download --package my-package --location ./my-packages
`;

const examplesForImport = `
Examples:

Import configuration with parameters replaced:
  ${execName} configuration deploy --package my-package --server example.com --include "dashboards/**/test-*.json" --set key1=value1 --set key2=value2
`;

// Configure yargs to parse command-line arguments with subcommands
yargs
    .wrap(200) // Set the desired width here
    .command('configuration <action>', 'Perform actions on configurations', (yargs) => {
        return yargs
            .command('download', 'Download a configuration package', (yargs) => {
                return yargs
                    .option('package', {
                        alias: 'p',
                        describe: 'Name of the package to download',
                        type: 'string',
                        demandOption: true
                    })
                    .option('location', {
                        alias: 'l',
                        describe: 'Location to store the downloaded package',
                        type: 'string',
                        demandOption: false,
                        default: process.cwd() // Set the default location to the current working directory
                    })
                    .option('debug', {
                        alias: 'd',
                        describe: 'Enable debug mode',
                        type: 'boolean',
                        default: false
                    })
                    .epilog(examplesForDownload);
                })
            .command('import', 'Import configuration into an environment', (yargs) => {
                return yargs
                    .option('package', {
                        alias: 'p',
                        describe: 'Name of the package to locate',
                        type: 'string',
                        demandOption: true
                    })
                    .option('server', {
                        alias: 's',
                        describe: 'Address of an environment',
                        type: 'string',
                        demandOption: true
                    })
                    .option('token', {
                        alias: 't',
                        describe: 'API token to post the configuration',
                        type: 'string',
                        demandOption: true
                    })
                    .option('location', {
                        alias: 'l',
                        describe: 'Location to store the downloaded package',
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
            })
            .demandCommand(1, 'You need at least one command before moving on')
            .help()
            .alias('help', 'h');
    })
    .argv;

// Print help information if no command is given
if (process.argv.length === 2) {
    yargs.showHelp();
}

// Function to handle download logic
async function handleDownload(argv: any) {
    const { package: packageName, location, debug } = argv;

    logger.info(`Start to download configuration package: ${packageName}`);

    const downloadCommand = `npm install ${packageName} --prefix ${location}`;
    try {
        const { stdout, stderr } = await execAsync(downloadCommand);
        logger.info(`Download completed: \n${stdout}`);
        if (stderr) {
            logger.error(`Download warnings/errors: ${stderr}`);
        }
    } catch (error) {
        logger.error(`Failed to download package ${packageName}: ${error}`);
        process.exit(1);
    }

}

// Function to handle import logic
async function handleImport(argv: any) {
    const { package: packageName, server, token, location, include: includePattern, set: parameters, debug } = argv;

    // Set log level to debug if the debug flag is set
    if (debug) {
        logger.level = 'debug';
    }

    const basePath = path.join(location, "node_modules", packageName);
    const defaultFolders = ['dashboards', 'alerts'];

    // Parse parameter values into an object
    const parameterValues: { [key: string]: string } = {};
    if (parameters) {
        (parameters as string[]).forEach(ph => {
            const [key, value] = ph.split('=');
            parameterValues[key] = value;
        });
    }

    // Create an axios instance with a custom httpsAgent to ignore self-signed certificate errors
    const axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    async function importConfiguration(searchPattern: string) {
        const files = globSync(searchPattern);

        logger.info(`Start to import configuration from ${searchPattern}.`);

        for (const file of files) {
            if (path.extname(file) === '.json') {

                logger.info(`Importing ${file}.`);

                const fileContent = fs.readFileSync(file, 'utf8');
            
                // Modify template to use default helper to preserve parameters
                const templateContent = fileContent.replace(/{{\s*(\w+)\s*}}/g, (match, p1) => `{{default ${p1} "${match}"}}`);
                const template = Handlebars.compile(templateContent);
                const resolvedContent = template(parameterValues)

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
                    logger.info(`Applying configuration to ${url}.`);

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
        const searchPattern = path.join(basePath, includePattern);
        await importConfiguration(searchPattern);
    } else {
        for (const defaultFolder of defaultFolders) {
            const searchPattern = path.join(basePath, defaultFolder, '**/*.json');
            await importConfiguration(searchPattern);
        }
    }
}

// Route to the appropriate function based on the sub-command
const command = process.argv[2];
if (command === 'configuration') {
    const action = process.argv[3];
    if (action === 'download') {
        handleDownload(yargs.argv);
    } else if (action === 'import') {
        handleImport(yargs.argv);
    }
}
