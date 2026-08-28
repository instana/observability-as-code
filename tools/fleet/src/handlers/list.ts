import { createAxiosInstance, handleAxiosError, resolveConnection } from '../utils';
import logger from '../logger';

export async function handleList(argv: any): Promise<any> {
    const { server, token, type } = resolveConnection(argv);
    const configName: string | undefined = argv['config-name'];
    const configId: string | undefined = argv['configuration-id'];

    if (configId && configName) {
        throw new Error('--configuration-id and --config-name are mutually exclusive');
    }

    if (!configId && !type) {
        throw new Error('Missing required parameter: --type');
    }

    const url = configId
        ? `https://${server}/api/fleet/configurations/${configId}`
        : `https://${server}/api/fleet/configurations`;

    const context = configId ? `configuration (id=${configId})` : 'configuration list';
    logger.info(`Getting ${context} ...`);

    const axiosInstance = createAxiosInstance();

    try {
        const response = await axiosInstance.get(url, {
            // Content-Type is intentionally omitted: GET requests have no body
            headers: { 'Authorization': `apiToken ${token}` },
            ...(configId ? {} : { params: { type } })
        });

        logger.info(`Successfully got ${context}: ${response.status}`);

        let data = response.data;

        if (Array.isArray(data) && configName) {
            data = data.filter((cfg: any) => cfg.name === configName);
            logger.info(`Filtered to ${data.length} configuration(s) matching name: ${configName}`);
        }

        if (logger.isDebugEnabled()) {
            logger.debug(JSON.stringify(data, null, 2));
        } else {
            logger.info(JSON.stringify(data, null, 2));
        }

        return data;

    } catch (error: any) {
        handleAxiosError(error, context);
        throw error;
    }
}
