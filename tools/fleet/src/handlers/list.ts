import { createAxiosInstance, handleAxiosError, resolveConnection } from '../utils';
import logger from '../logger';

export async function handleList(argv: any) {
    const { server, token, type } = resolveConnection(argv);

    const axiosInstance = createAxiosInstance();
    const url = `http://${server}/api/fleet/configurations`;

    try {
        logger.info(`Listing configurations for type: ${type}...`);

        const response = await axiosInstance.get(url, {
            params: { type },
            headers: {
                // Content-Type is intentionally omitted: GET requests have no body
                'Authorization': `apiToken ${token}`
            }
        });

        const data = response.data;

        if (logger.isDebugEnabled()) {
            logger.debug(JSON.stringify(data, null, 2));
        } else {
            logger.info(JSON.stringify(data, null, 2));
        }

        return data;

    } catch (error: any) {
        handleAxiosError(error, 'list configurations');
        throw error;
    }
}
