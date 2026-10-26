import path from 'path';
import yargs from 'yargs';

/**
 * CLI Configuration Module
 * Contains all yargs command definitions and configurations
 */

// Dynamically determine the executable name
const execName = (process as any).pkg
    ? path.basename(process.argv[0])
    : path.basename(process.argv[1]);

// Example texts for each command
const examplesForDownload = `
Examples:

Download integration package to a specific location:
  ${execName} download --package my-package --location ./my-packages
`;

const examplesForImport = `
Examples:

Import integration package with parameters replaced:
  ${execName} import --package my-package --server example.com --token mytoken --include "dashboards/**/test-*.json" --set key1=value1 --set key2=value2
  ${execName} import --package my-package --server example.com --token mytoken --include "events/**/*.json"
  ${execName} import --package my-package --server example.com --token mytoken --include "entities/**/*.json"
  ${execName} import --package my-package --server example.com --token mytoken --include "smart-alerts/**/*.json"
  ${execName} import --package my-package --server example.com --token mytoken --include "collector/**/*.json"
`;

const examplesForExport = `
Examples:

Export integration elements:
  ${execName} export --server example.com --include type=dashboard title="exampleTitle" --location ./my-package
  ${execName} export --server example.com --include type=event id=exampleid --location ./my-package
  ${execName} export --server example.com --include type=entity title="exampleTitle" --location ./my-package
  ${execName} export --server example.com --include type=smart-alert title="exampleTitle" --location ./my-package
`;

const examplesForPublish = `
Examples:

Publish an integration package to npm:
  ${execName} publish --package @instana-integration/my-package --npm-registry-username myuser --npm-registry-email me@example.com --artifact-type package

Publish a collector container image to a registry:
  ${execName} publish --package @instana-integration/my-package --image-registry-username myuser --image-registry-password mypassword --artifact-type image

Publish both the integration package and container image:
  ${execName} publish --package @instana-integration/my-package --npm-registry-username mynpmuser --image-registry-username myimageuser --npm-registry-email me@example.com --image-registry-password mypassword --artifact-type both
`;

const examplesForBuild = `
Examples:

Build collector container image from integration package:
  ${execName} build --package @instana-integration/my-collector
  ${execName} build --package @instana-integration/my-collector --platform linux/amd64
  ${execName} build --package @instana-integration/my-collector --build-arg RUNTIME_TAG=1.0.0
  ${execName} build --package @instana-integration/my-collector --build-arg APP_VERSION=1.0.0
  ${execName} build --package @instana-integration/my-collector --no-cache
  ${execName} build --package @instana-integration/my-collector --network host
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
    handleBuild: (argv: any) => Promise<void>;
}) {
    return yargs
        .scriptName(execName)
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
                .option('npm-registry-username', {
                    describe: 'Username to access the integration package registry (required when --artifact-type is package or both)',
                    type: 'string',
                    demandOption: false
                })
                .option('npm-registry-email', {
                    describe: 'Email to access the integration package registry (required when --artifact-type is package or both)',
                    type: 'string',
                    demandOption: false
                })
                .option('artifact-type', {
                    alias: 't',
                    describe: 'Type of publish: integration package or container image (default: package)',
                    type: 'string',
                    default: 'package',
                    choices: ['package', 'image', 'both'],
                    demandOption: false
                })
                .option('image-registry-username', {
                    describe: 'Username to access the container image registry (required when --artifact-type is image or both)',
                    type: 'string',
                    demandOption: false
                })
                .option('image-registry-password', {
                    describe: 'Password to access the container image registry (required when --artifact-type is image or both)',
                    type: 'string',
                    demandOption: false
                })
                // TODO(1.7): remove the hidden registry-* options below and the renamedFlags check in .check().
                // They only exist so that users of the removed flags get a "renamed to" message instead of
                // yargs' generic "Unknown arguments" error (kept hidden so .strict() doesn't mask it).
                .option('registry-username', { alias: 'U', type: 'string', hidden: true })
                .option('registry-email', { alias: 'E', type: 'string', hidden: true })
                .option('registry-password', { alias: 'P', type: 'string', hidden: true })
                .check((argv) => {
                    // TODO(1.7): remove this renamedFlags check together with the hidden registry-* options above.
                    const renamedFlags: Record<string, string> = {
                        'registry-username': '--npm-registry-username (for --artifact-type package) or --image-registry-username (for --artifact-type image)',
                        'registry-email': '--npm-registry-email',
                        'registry-password': '--image-registry-password'
                    };
                    for (const [oldFlag, replacement] of Object.entries(renamedFlags)) {
                        if (argv[oldFlag] !== undefined) {
                            throw new Error(`--${oldFlag} has been removed. Use ${replacement} instead.`);
                        }
                    }
                    if ((argv['artifact-type'] === 'package' || argv['artifact-type'] === 'both') && !argv['npm-registry-username']) {
                        throw new Error('--npm-registry-username is required when --artifact-type is package or both');
                    }
                    if ((argv['artifact-type'] === 'package' || argv['artifact-type'] === 'both') && !argv['npm-registry-email']) {
                        throw new Error('--npm-registry-email is required when --artifact-type is package or both');
                    }
                    if ((argv['artifact-type'] === 'image' || argv['artifact-type'] === 'both') && !argv['image-registry-username']) {
                        throw new Error('--image-registry-username is required when --artifact-type is image or both');
                    }
                    if ((argv['artifact-type'] === 'image' || argv['artifact-type'] === 'both') && !argv['image-registry-password']) {
                        throw new Error('--image-registry-password is required when --artifact-type is image or both');
                    }
                    return true;
                })
                .epilog(examplesForPublish);
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
        .command('build', 'Build collector container image', (yargs) => {
            return yargs
                .option('package', {
                    alias: 'p',
                    describe: 'The package name or path to the package',
                    type: 'string',
                    demandOption: true
                })
                .option('platform', {
                    describe: 'Target platform for the build (e.g., linux/amd64, linux/arm64)',
                    type: 'string',
                    demandOption: false
                })
                .option('build-arg', {
                    describe: 'Build-time variables (can be specified multiple times)',
                    type: 'array',
                    demandOption: false
                })
                .option('cache', {
                    describe: 'Use cache when building the image',
                    type: 'boolean',
                    default: true
                })
                .option('network', {
                    describe: 'Set the networking mode for RUN instructions during build',
                    type: 'string',
                    demandOption: false
                })
                .option('debug', {
                    alias: 'd',
                    describe: 'Enable debug mode',
                    type: 'boolean',
                    default: false
                })
                .epilog(examplesForBuild);
        }, handlers.handleBuild)
        .demandCommand(1, 'You need at least one command before moving on')
        .help()
        .alias('help', 'h')
        .version()
        .alias('version', 'v')
        .strict()
        .parse();
}
