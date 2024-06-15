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

const supportedActions = ['import', 'export', 'download']; // Add more actions here as needed

// Configure yargs to parse command-line arguments with subcommands
yargs
    .wrap(120) // Set the desired width here
    .command(
        'configuration <action>',
        'Perform actions on configurations',
        (yargs) => {
            yargs
                .positional('action', {
                    describe: `Action to perform (supported actions: ${supportedActions.join(', ')})`,
                    type: 'string',
                    choices: supportedActions as ReadonlyArray<string>
                })
                .option('package', {
                    alias: 'p',
                    describe: 'Name of the package to locate',
                    type: 'string',
                    demandOption: true
                })
                .option('server', {
                    alias: 's',
                    describe: 'Address of Instana server',
                    type: 'string',
                    demandOption: false
                })
                .option('token', {
                    alias: 't',
                    describe: 'API token to post the configuration',
                    type: 'string',
                    demandOption: false
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
                .example(
                    'stanctl configuration deploy --package my-package --server example.com --include "dashboards/**/test-*.json" --set key1=value1 --set key2=value2',
                    'Import configuration with parameters replaced'
                )
                .example(
                    'stanctl configuration download --package my-package --location ./my-packages',
                    'Download configuration package to a specific location'
                );
        },
        async (argv) => {
            const { action, package: packageName, server, token, include: includePattern, set: parameters, location, debug } = argv as unknown as {
                action: string;
                package: string;
                server?: string;
                token?: string;
                include?: string;
                set?: string[];
                location: string;
                debug?: boolean;
            };

            // Set log level to debug if the debug flag is set
            if (debug) {
                logger.level = 'debug';
            }

            if (!supportedActions.includes(action)) {
                logger.error(`Unsupported action. Supported actions are: ${supportedActions.join(', ')}`);
                process.exit(1);
            }

            if (action === 'download') {
                if (!location) {
                    logger.error('Location must be specified for download action.');
                    process.exit(1);
                }

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
            } else if (action === 'import') {
                if (!server || !token) {
                    logger.error('Server and API token must be specified for import action.');
                    process.exit(1);
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
        }
    )
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .alias('help', 'h')
    .argv;

// Print help information if no command is given
if (process.argv.length === 2) {
    yargs.showHelp();
}
