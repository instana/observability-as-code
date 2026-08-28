import { createAxiosInstance, handleAxiosError, resolveConnection } from '../utils';

import fs from 'fs';
import { globSync } from 'glob';
import logger from '../logger';
import path from 'path';

/**
 * Handle import-config command.
 *
 * Reads configuration files matched by --include from a single folder, then
 * POSTs (create) or PUTs (update) them as a named configuration via the fleet REST API.
 *
 * Only single-folder import is supported. If --include matches files across multiple
 * sub-directories, the command fails fast with a clear error.
 */
export async function handleImport(argv: any): Promise<void> {
    const { server, token, type } = resolveConnection(argv);

    if (!type) {
        throw new Error('Missing required parameter: --type');
    }

    const includePattern: string = argv.include;
    const configName: string = argv['config-name'];
    const configVersion: string = argv['config-version'];

    const matchedPaths = globSync(includePattern);
    if (matchedPaths.length === 0) {
        throw new Error(`No files matched pattern: ${includePattern}`);
    }

    // All matched files must share the same immediate parent directory.
    const dirs = new Set(matchedPaths.map(f => path.dirname(f)));
    if (dirs.size > 1) {
        const folderNames = [...dirs].join(', ');
        throw new Error(
            `--include matched files across ${dirs.size} directories (${folderNames}). ` +
            `Only files from a single directory are supported. Use a more specific pattern.`
        );
    }

    const files = matchedPaths;

    const newFiles = files.map(f => ({
        name: path.basename(f),
        data: fs.readFileSync(f).toString('base64')
    }));

    logger.info(`Processing configuration "${configName}" (${newFiles.length} file(s): ${newFiles.map(f => f.name).join(', ')})`);

    const axiosInstance = createAxiosInstance();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `apiToken ${token}`
    };
    const listUrl = `https://${server}/api/fleet/configurations`;

    // Fetch existing configurations to check if one with this name already exists
    let existingConfigs: any[] = [];
    try {
        logger.info(`Fetching existing configurations for type: ${type}...`);
        const listResponse = await axiosInstance.get(listUrl, {
            params: { type },
            headers: { 'Authorization': `apiToken ${token}` }
        });
        existingConfigs = listResponse.data?.items ?? listResponse.data ?? [];
    } catch (error) {
        handleAxiosError(error, 'fetch existing configurations');
        throw error;
    }

    const existing = existingConfigs.find((c: any) => c.name === configName) ?? null;

    if (!existing) {
        // POST - create new configuration
        logger.info(`No existing configuration found for "${configName}" — creating...`);
        const payload: Record<string, any> = { name: configName, type, version: configVersion, configuration: { files: newFiles } };
        if (logger.isDebugEnabled()) {
            logger.debug(`POST payload: ${JSON.stringify({ ...payload, configuration: { files: payload.configuration.files.map((f: any) => ({ ...f, data: '<base64>' })) } }, null, 2)}`);
        }
        try {
            const response = await axiosInstance.post(listUrl, payload, { headers });
            const responseId = response.data?.id ?? response.data?.configuration?.configuration_id ?? 'unknown';
            const responseName = response.data?.configuration?.name ?? configName;
            const responseVersion = response.data?.configuration_version ?? response.data?.configuration?.version ?? configVersion;
            logger.info(`Successfully created configuration "${responseName}" (id=${responseId}, version=${responseVersion}): ${response.status}`);
            if (logger.isDebugEnabled()) {
                logger.debug(`POST response: ${JSON.stringify(response.data, null, 2)}`);
            }
        } catch (error) {
            handleAxiosError(error, `create configuration "${configName}"`);
            throw error;
        }
    } else {
        // PUT - merge files into existing configuration
        const existingId: string = existing.configuration_id;
        logger.info(`Existing configuration found for "${configName}" (id=${existingId}) — updating...`);

        const existingFiles: any[] = existing.configuration?.files ?? [];
        const mergedFiles = [...existingFiles];
        let changed = false;

        for (const newFile of newFiles) {
            const idx = mergedFiles.findIndex((f: any) => f.name === newFile.name);
            if (idx >= 0) {
                if (mergedFiles[idx].data !== newFile.data) {
                    logger.info(`  Replacing existing file: ${newFile.name}`);
                    mergedFiles[idx] = newFile;
                    changed = true;
                } else {
                    logger.info(`  No changes detected for file: ${newFile.name} - skipping...`);
                }
            } else {
                logger.info(`  Adding new file: ${newFile.name}...`);
                mergedFiles.push(newFile);
                changed = true;
            }
        }

        if (!changed) {
            logger.info(`Configuration "${configName}" is already up to date - no update needed`);
            return;
        }

        const payload: Record<string, any> = { name: configName, type, version: configVersion, configuration: { files: mergedFiles } };
        if (logger.isDebugEnabled()) {
            logger.debug(`PUT payload: ${JSON.stringify({ ...payload, configuration: { files: payload.configuration.files.map((f: any) => ({ ...f, data: '<base64>' })) } }, null, 2)}`);
        }
        const putUrl = `${listUrl}/${existingId}`;
        try {
            const response = await axiosInstance.put(putUrl, payload, { headers });
            const responseId = response.data?.id ?? response.data?.configuration?.configuration_id ?? existingId;
            const responseName = response.data?.configuration?.name ?? configName;
            const actualVersion: string | undefined = response.data?.configuration_version ?? response.data?.configuration?.version;
            const responseVersion = actualVersion ?? configVersion;
            logger.info(`Successfully updated configuration "${responseName}" (id=${responseId}, version=${responseVersion}): ${response.status}`);
            if (logger.isDebugEnabled()) {
                logger.debug(`PUT response: ${JSON.stringify(response.data, null, 2)}`);
            }
            if (actualVersion && actualVersion !== configVersion) {
                logger.warn(
                    `Configuration version "${configVersion}" already exists. Auto-incremented to "${actualVersion}".`
                );
            }
        } catch (error) {
            handleAxiosError(error, `update configuration "${configName}"`);
            throw error;
        }
    }
}
