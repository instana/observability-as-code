import path from 'path';
import yargs from 'yargs';

/**
 * CLI Configuration Module
 * Contains all yargs command definitions and configurations
 */

const execName = path.basename(process.argv[1]);

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
  ${execName} list-configs --server example.com --token validToken --type agentType --debug
`;

export function configureCLI(handlers: {
    handleRestart: (argv: any) => Promise<void>;
    handleDeploy: (argv: any) => Promise<void>;
    handleUpdate: (argv: any) => Promise<void>;
    handleList: (argv: any) => Promise<any>;
}) {
    return yargs
        .wrap(160)
        .usage(`The Instana CLI for agent fleet management\n\nUsage: ${execName} <command> <options>`)
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
                        describe: 'Agent type, allowed values (com.ibm.opentelemetrycollector, com.ibm.instana.agent, com.ibm.instana.customcollector)',
                        type: 'string',
                        demandOption: true
                    })
                    .option('debug', {
                        alias: 'd',
                        describe: 'Enable debug mode',
                        type: 'boolean',
                        default: false
                    })
                    .epilog(examplesForList);
            }, handlers.handleList)
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
        .demandCommand(1, 'You need at least one command before moving on')
        .help()
        .alias('help', 'h')
        .version()
        .alias('version', 'v')
        .strict()
        .parse();
}
