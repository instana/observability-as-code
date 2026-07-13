import logger from '../logger';
import { validateServerAddress } from '../validators';
import { createAxiosInstance, handleAxiosError, parseTags } from '../utils';

interface AgentControlActionRequest {
    action: 'agent.configuration.update';
    type: 'com.ibm.opentelemetrycollector' | 'com.ibm.instana.agent' | 'com.ibm.instana.customcollector';
    tags?: Record<string, string>;
    args: {
        configurationId: string;
    };
}

export async function handleUpdate(argv: any) {
    const server = argv.server ?? process.env.INSTANA_SERVER;
    if (!server) {
        throw new Error('Missing server. Specify --server or set INSTANA_SERVER');
    }

    const token = argv.token ?? process.env.INSTANA_API_TOKEN;
    if (!token) {
        throw new Error('Missing API token. Specify --token or set INSTANA_API_TOKEN');
    }

    const { type, debug } = argv;
    const configurationId = argv.configurationId;
    if (!configurationId) {
        throw new Error('Missing required parameter: --configurationId');
    }

    if (debug) {
        logger.level = 'debug';
    }

    validateServerAddress(server);

    if (!type) {
        throw new Error('Missing required parameter: --type');
    }

    const tagsInput = [].concat(argv.tag ?? []).filter(Boolean);
    if (tagsInput.length === 0) {
        throw new Error('Missing required parameter: --tag (at least one tag is required)');
    }
    const tags = parseTags(tagsInput);

    const request: AgentControlActionRequest = {
        action: 'agent.configuration.update',
        type,
        ...(tags && { tags }),
        args: { configurationId }
    };

    const axiosInstance = createAxiosInstance();
    const url = `http://${server}/api/unified-agent-request`;

    try {
        logger.info(`Sending ${request.action} request...`);

        const response = await axiosInstance.post(url, request, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apiToken ${token}`
            }
        });

        const data = response.data;

        logger.info(`Request accepted`);
        logger.info(`Request ID: ${data.requestId}`);
        logger.info(`Status: ${data.status}`);

        if (data.message) {
            logger.info(`Message: ${data.message}`);
        }

        if (logger.isDebugEnabled()) {
            logger.debug(JSON.stringify(data, null, 2));
        }

        return data;

    } catch (error: any) {
        handleAxiosError(error, 'agent.configuration.update request');
        throw error;
    }
}
