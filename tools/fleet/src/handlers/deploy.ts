import { sendAgentRequest } from '../utils';

export async function handleDeploy(argv: any) {
    const configurationId = argv['configuration-id'];
    if (!configurationId) {
        throw new Error('Missing required parameter: --configuration-id');
    }
    return sendAgentRequest('agent.component.deploy', argv, configurationId);
}
