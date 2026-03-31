import path from 'path';
import yargs from 'yargs';

/**
 * CLI Configuration Module
 * Contains all yargs command definitions and configurations
 */

// Dynamically determine the executable name
const execName = path.basename(process.argv[1]);

// Example texts for each command
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
  ${execName} import --package my-package --server example.com --include "entities/**/*.json"
  ${execName} import --package my-package --server example.com --include "smart-alerts/**/*.json"
`;

const examplesForExport = `
Examples:

Export integration elements:
  ${execName} export --server example.com --include type=dashboard title="exampleTitle" --location ./my-package
  ${execName} export --server example.com --include type=event id=exampleid --location ./my-package
  ${execName} export --server example.com --include type=entity title="exampleTitle" --location ./my-package
  ${execName} export --server example.com --include type=smart-alert title="exampleTitle" --location ./my-package
`;

/**
 * Configure and return the yargs CLI instance
 * @param handlers Object containing all command handler functions
 */
export function configureCLI(handlers: {
    handleDownload: (argv: any) => Promise<void>;
    handleImport: (argv: any) => Promise<void>;
    handleExport: (argv: any) => Promise<void>;
    handleInit: () => Promise<void>;
    handlePublish: (argv: any) => Promise<void>;
    handleLint: (argv: any) => Promise<void>;
}) {
    return yargs
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
        }, handlers.handleDownload)
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
        }, handlers.handleImport)
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
                .strict(false)
                .epilog(examplesForExport);
        }, handlers.handleExport)
        .command('init', 'Initialize a new integration package', {}, handlers.handleInit)
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
        }, handlers.handlePublish)
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
        }, handlers.handleLint)
        .demandCommand(1, 'You need at least one command before moving on')
        .help()
        .alias('help', 'h')
        .version()
        .alias('version', 'v')
        .strict()
        .parse();
}