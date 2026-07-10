import axios from 'axios';
import https from 'https';
import logger from './logger';

/**
 * Parse an array of key=value tag strings into a Record.
 * Returns undefined if the input array is empty.
 */
export function parseTags(tagsInput: string[]): Record<string, string> | undefined {
    if (tagsInput.length === 0) {
        return undefined;
    }

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
 * Create an axios instance that skips TLS certificate verification.
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
