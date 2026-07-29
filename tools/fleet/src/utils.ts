import axios from 'axios';
import https from 'https';
import logger from './logger';
import { validateServerAddress } from './validators';

/**
 * Parse an array of key=value tag strings into a Record.
 * Callers are expected to validate that tagsInput is non-empty before calling.
 */
export function parseTags(tagsInput: string[]): Record<string, string> {
    const tags: Record<string, string> = {};

    for (const tag of tagsInput) {
        const [key, ...rest] = String(tag).split('=');
        const value = rest.join('=');
        if (!key || !value) {
            throw new Error(`Invalid tag format: ${tag}. Expected key=value`);
        }
        tags[key.trim()] = value.trim();
    }

    return tags;
}

/**
 * Parse an array of key=value tag strings into a Record, allowing empty values.
 * An empty value (key=) signals tag deletion for the tag-set command.
 */
export function parseTagsAllowEmpty(tagsInput: string[]): Record<string, string> {
    const tags: Record<string, string> = {};

    for (const tag of tagsInput) {
        const eqIndex = String(tag).indexOf('=');
        if (eqIndex === -1) {
            throw new Error(`Invalid tag format: ${tag}. Expected key=value or key= (to delete)`);
        }
        const key = tag.slice(0, eqIndex).trim();
        const value = tag.slice(eqIndex + 1).trim();
        if (!key) {
            throw new Error(`Invalid tag format: ${tag}. Expected key=value or key= (to delete)`);
        }
        tags[key] = value;
    }

    return tags;
}

/**
 * Create an axios instance that skips TLS certificate verification.
 * TLS certificate verification is disabled intentionally to support environments
 * where the Instana server uses self-signed certificates (e.g. on-prem deployments).
 */
export function createAxiosInstance() {
    return axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });
}

/**
 * Log an axios (or generic) error with context.
 */
export function handleAxiosError(error: any, context: string): void {
    if (axios.isAxiosError(error)) {
        if (error.response) {
            logger.error(`Failed ${context}: ${JSON.stringify(error.response.data)}`);
        } else {
            logger.error(`Failed ${context}: ${error.message}`);
        }
    } else {
        logger.error(`Failed ${context}: ${String(error)}`);
    }
}

/**
 * Resolves and validates the common connection parameters (server, token, type, debug)
 * shared across all fleet commands. Extracted to avoid duplication between sendAgentRequest
 * and other handlers (e.g. handleList) that cannot reuse sendAgentRequest directly.
 */
export function resolveConnection(argv: any): { server: string; token: string; type: string } {
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

    const { type } = argv;
    if (!type) {
        throw new Error('Missing required parameter: --type');
    }

    return { server, token, type };
}

/**
 * Shared handler logic for all agent control actions (restart, deploy, update-config).
 * Resolves server/token, validates inputs, builds and sends the POST request.
 */
export async function sendAgentRequest(
    action: string,
    argv: any,
    configurationId?: string,
    tagsToApply?: Record<string, string>
): Promise<any> {
    const { server, token, type } = resolveConnection(argv);

    const tagsInput: string[] = [].concat(argv.tag ?? []).filter(Boolean);
    if (tagsInput.length === 0) {
        throw new Error('Missing required parameter: --tag (at least one tag is required)');
    }
    const tags = parseTags(tagsInput);

    const args: Record<string, any> = {
        ...(configurationId && { configurationId }),
        ...(tagsToApply && { tags: tagsToApply })
    };

    const request: Record<string, any> = {
        action,
        type,
        tags,
        ...(Object.keys(args).length > 0 && { args })
    };

    const axiosInstance = createAxiosInstance();
    const url = `http://${server}/api/unified-agent-request`;

    try {
        logger.info(`Sending ${action} request...`);

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
        handleAxiosError(error, `${action} request`);
        throw error;
    }
}
