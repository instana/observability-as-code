import path from 'path';
import yargs from 'yargs';

/**
 * CLI Configuration Module
 * Contains all yargs command definitions and configurations
 */

const execName = (process as any).pkg
    ? path.basename(process.argv[0])
    : path.basename(process.argv[1]);

// Example texts for each command
const examplesForRestart = `
Examples:

Restart the agent instances:
  ${execName} restart --server example.com --token validToken --type agentType --tag key1=value1 --tag key2=value2
  ${execName} restart --type agentType --tag key1=value1 --tag key2=value2 (specify the server and token as environment variables using INSTANA_SERVER and INSTANA_API_TOKEN)
  ${execName} restart --type agentType --tag key1=value1 --debug
`;

const examplesForDeploy = `
Examples:

Deploy the agent component:
  ${execName} deploy --server example.com --token validToken --type agentType --tag key1=value1 --tag key2=value2 --configuration-id=configID
  ${execName} deploy --type agentType --tag key1=value1 --configuration-id=configID (specify the server and token as environment variables using INSTANA_SERVER and INSTANA_API_TOKEN)
  ${execName} deploy --type agentType --tag key1=value1 --configuration-id=configID --debug
`;

const examplesForImport = `
Examples:

Import agent or IDOT configurations:
  ${execName} import-config --server example.com --token validToken --type com.ibm.instana.agent --include "agent-folder/**/*.yaml" --config-name configName --config-version configVersion
  ${execName} import-config --type com.ibm.opentelemetrycollector --include "agent-folder/**/*.yaml" --config-name configName --config-version configVersion (specify the server and token as environment variables using INSTANA_SERVER and INSTANA_API_TOKEN)
`;

const examplesForUpdate = `
Examples:

Update the agent configuration:
  ${execName} update-config --server example.com --token validToken --type agentType --tag key1=value1 --tag key2=value2 --configuration-id=configID
  ${execName} update-config --type agentType --tag key1=value1 --configuration-id=configID (specify the server and token as environment variables using INSTANA_SERVER and INSTANA_API_TOKEN)
  ${execName} update-config --type agentType --tag key1=value1 --configuration-id=configID --debug
`;

const examplesForList = `
Examples:

List configurations:
  ${execName} list-configs --server example.com --token validToken --type agentType
  ${execName} list-configs --type agentType (specify the server and token as environment variables using INSTANA_SERVER and INSTANA_API_TOKEN)
  ${execName} list-configs --server example.com --token validToken --configuration-id=-FL1OxD0TIeT8kYFisTUzQ
  ${execName} list-configs --server example.com --token validToken --type agentType --config-name="Config Name"
  ${execName} list-configs --server example.com --token validToken --type agentType --debug
`;

const examplesForTagSet = `
Examples:

Add or update a tag on all custom collectors tagged with env=staging:
  ${execName} set-tag team=sre --server example.com --token validToken --type com.ibm.instana.customcollector --tag env=staging

Delete a tag by setting its value to empty:
  ${execName} set-tag team= --type com.ibm.instana.customcollector --tag env=staging (specify the server and token as environment variables using INSTANA_SERVER and INSTANA_API_TOKEN)

Apply multiple tag changes at once:
  ${execName} set-tag team=sre region=us-east --type com.ibm.instana.customcollector --tag env=staging --tag dc=prod
`;

export function configureCLI(handlers: {
    handleRestart: (argv: any) => Promise<void>;
    handleDeploy: (argv: any) => Promise<void>;
    handleUpdate: (argv: any) => Promise<void>;
    handleList: (argv: any) => Promise<any>;
    handleTag: (argv: any) => Promise<any>;
    handleImport: (argv: any) => Promise<void>;
}) {
    return yargs
        .scriptName(execName)
        .wrap(160)
        .usage(`The Instana CLI for agent fleet management\n\nUsage: ${execName} <command> <options>`)
        // Agent lifecycle commands
        .command(
            'import-config',
            'Import agent or IDOT configuration files and save them to the Instana backend',
            (yargs) => {
                return yargs
                    .option('server', {
                        alias: 'S',
                        describe: 'Address of an environment',
                        type: 'string',
                        demandOption: false
                    })
                    .option('token', {
                        alias: 't',
                        describe: 'API token for authenticating agent requests',
                        type: 'string',
                        demandOption: false
                    })
                    .option('type', {
                        alias: 'y',
                        describe: 'Agent type, allowed values (com.ibm.opentelemetrycollector, com.ibm.instana.agent, com.ibm.instana.customcollector)',
                        type: 'string',
                        demandOption: true
                    })
                    .option('include', {
                        alias: 'i',
                        describe: 'Folder or glob pattern to match configuration files to import, e.g. "agent-folder/**/*.yaml"',
                        type: 'string',
                        demandOption: true
                    })
                    .option('config-name', {
                        alias: 'n',
                        describe: 'Configuration name',
                        type: 'string',
                        demandOption: true
                    })
                    .option('config-version', {
                        alias: 'V',
                        describe: 'Configuration version',
                        type: 'string',
                        demandOption: true
                    })
                    .option('debug', {
                        alias: 'd',
                        describe: 'Enable debug mode',
                        type: 'boolean',
                        default: false
                    })
                    .epilog(examplesForImport);
            }, handlers.handleImport)
        .command(
            'deploy',
            'Deploy the agent component',
            (yargs) => {
                return yargs
                    .option('server', {
                        alias: 'S',
                        describe: 'Address of an environment',
                        type: 'string',
                        demandOption: false
                    })
                    .option('token', {
                        alias: 't',
                        describe: 'API token for authenticating agent requests',
                        type: 'string',
                        demandOption: false
                    })
                    .option('type', {
                        alias: 'y',
                        describe: 'Agent type, allowed values (com.ibm.opentelemetrycollector, com.ibm.instana.agent, com.ibm.instana.customcollector)',
                        type: 'string',
                        demandOption: true
                    })
                    .option('tag', {
                        alias: 'T',
                        describe: 'Tags in the format key=value, can be specified multiple times',
                        type: 'array',
                        demandOption: true
                    })
                    .option('debug', {
                        alias: 'd',
                        describe: 'Enable debug mode',
                        type: 'boolean',
                        default: false
                    })
                    .option('configuration-id', {
                        alias: 'c',
                        describe: 'Configuration ID',
                        type: 'string',
                        demandOption: true
                    })
                    .epilog(examplesForDeploy);
            }, handlers.handleDeploy)
        .command(
            'restart',
            'Restart the agent instances',
            (yargs) => {
                return yargs
                    .option('server', {
                        alias: 'S',
                        describe: 'Address of an environment',
                        type: 'string',
                        demandOption: false
                    })
                    .option('token', {
                        alias: 't',
                        describe: 'API token for authenticating agent requests',
                        type: 'string',
                        demandOption: false
                    })
                    .option('type', {
                        alias: 'y',
                        describe: 'Agent type, allowed values (com.ibm.opentelemetrycollector, com.ibm.instana.agent, com.ibm.instana.customcollector)',
                        type: 'string',
                        demandOption: true
                    })
                    .option('tag', {
                        alias: 'T',
                        describe: 'Tags in the format key=value, can be specified multiple times',
                        type: 'array',
                        demandOption: true
                    })
                    .option('debug', {
                        alias: 'd',
                        describe: 'Enable debug mode',
                        type: 'boolean',
                        default: false
                    })
                    .epilog(examplesForRestart);
            }, handlers.handleRestart)
        .command(
            'update-config',
            'Update the agent configuration',
            (yargs) => {
                return yargs
                    .option('server', {
                        alias: 'S',
                        describe: 'Address of an environment',
                        type: 'string',
                        demandOption: false
                    })
                    .option('token', {
                        alias: 't',
                        describe: 'API token for authenticating agent requests',
                        type: 'string',
                        demandOption: false
                    })
                    .option('type', {
                        alias: 'y',
                        describe: 'Agent type, allowed values (com.ibm.opentelemetrycollector, com.ibm.instana.agent, com.ibm.instana.customcollector)',
                        type: 'string',
                        demandOption: true
                    })
                    .option('tag', {
                        alias: 'T',
                        describe: 'Tags in the format key=value, can be specified multiple times',
                        type: 'array',
                        demandOption: true
                    })
                    .option('debug', {
                        alias: 'd',
                        describe: 'Enable debug mode',
                        type: 'boolean',
                        default: false
                    })
                    .option('configuration-id', {
                        alias: 'c',
                        describe: 'Configuration ID',
                        type: 'string',
                        demandOption: true
                    })
                    .epilog(examplesForUpdate);
            }, handlers.handleUpdate)
        // Configuration commands
        .command(
            'list-configs',
            'List configurations',
            (yargs) => {
                return yargs
                    .option('server', {
                        alias: 'S',
                        describe: 'Address of an environment',
                        type: 'string',
                        demandOption: false
                    })
                    .option('token', {
                        alias: 't',
                        describe: 'API token for authenticating agent requests',
                        type: 'string',
                        demandOption: false
                    })
                    .option('type', {
                        alias: 'y',
                        describe: 'Agent type, allowed values (com.ibm.opentelemetrycollector, com.ibm.instana.agent, com.ibm.instana.customcollector). Required unless --configuration-id is provided.',
                        type: 'string',
                        demandOption: false
                    })
                    .option('debug', {
                        alias: 'd',
                        describe: 'Enable debug mode',
                        type: 'boolean',
                        default: false
                    })
                    .option('configuration-id', {
                        alias: 'c',
                        describe: 'Configuration ID',
                        type: 'string',
                        demandOption: false
                    })
                    .option('config-name', {
                        alias: 'n',
                        describe: 'Configuration name',
                        type: 'string',
                        demandOption: false
                    })
                    .check((argv) => {
                        if (argv['configuration-id'] && argv['config-name']) {
                            throw new Error('--configuration-id and --config-name are mutually exclusive');
                        }
                        if (!argv['configuration-id'] && !argv.type) {
                            throw new Error('--type is required unless --configuration-id is provided');
                        }
                        return true;
                    })
                    .epilog(examplesForList);
            }, handlers.handleList)
        // Tag management commands
        .command(
            'set-tag <tags..>',
            'Add, update, or delete tags on agent instances selected by --tag',
            (yargs) => {
                return yargs
                    .positional('tags', {
                        describe: 'Tags to apply: use key=value to add/update, key= (empty value) to delete. One or more pairs required.',
                        type: 'string'
                    })
                    .option('server', {
                        alias: 'S',
                        describe: 'Address of an environment',
                        type: 'string',
                        demandOption: false
                    })
                    .option('token', {
                        alias: 't',
                        describe: 'API token for authenticating agent requests',
                        type: 'string',
                        demandOption: false
                    })
                    .option('type', {
                        alias: 'y',
                        describe: 'Agent type, allowed values (com.ibm.opentelemetrycollector, com.ibm.instana.agent, com.ibm.instana.customcollector)',
                        type: 'string',
                        demandOption: true
                    })
                    .option('tag', {
                        alias: 'T',
                        describe: 'Selector tag in key=value format. Targets only agents that match all supplied tags. Can be specified multiple times.',
                        type: 'array',
                        demandOption: true
                    })
                    .option('debug', {
                        alias: 'd',
                        describe: 'Enable debug mode',
                        type: 'boolean',
                        default: false
                    })
                    .epilog(examplesForTagSet);
            }, handlers.handleTag)
        .demandCommand(1, 'You need at least one command before moving on')
        .help()
        .alias('help', 'h')
        .version()
        .alias('version', 'v')
        .strict()
        .parse();
}
