import { sendAgentRequest } from '../utils';

export async function handleRestart(argv: any) {
    return sendAgentRequest('agent.restart', argv);
}
