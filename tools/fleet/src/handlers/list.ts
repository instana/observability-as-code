import { createAxiosInstance, handleAxiosError } from '../utils';
import { validateServerAddress } from '../validators';
import logger from '../logger';

export async function handleList(argv: any) {
    const server = argv.server ?? process.env.INSTANA_SERVER;
    if (!server) {
        throw new Error('Missing server. Specify --server or set INSTANA_SERVER');
    }

    const token = argv.token ?? process.env.INSTANA_API_TOKEN;
    if (!token) {
        throw new Error('Missing API token. Specify --token or set INSTANA_API_TOKEN');
    }

    if (argv.debug) {
        logger.level = 'debug';
    }

    validateServerAddress(server);

    const { type, resource } = argv;

    if (!type) {
        throw new Error('Missing required parameter: --type');
    }

    if (resource === 'configuration') {
        const axiosInstance = createAxiosInstance();
        const url = `http://${server}/api/fleet/configurations`;

        try {
            logger.info(`Listing configurations for type: ${type}...`);

            const response = await axiosInstance.get(url, {
                params: { type },
                headers: {
                    'Authorization': `apiToken ${token}`
                }
            });

            const data = response.data;

            if (logger.isDebugEnabled()) {
                logger.debug(JSON.stringify(data, null, 2));
            }

            logger.info(JSON.stringify(data, null, 2));

            return data;

        } catch (error: any) {
            handleAxiosError(error, 'list configurations');
            throw error;
        }
    }
}
