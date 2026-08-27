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

    const includePattern: string = argv.include;
    const configName: string = argv['config-name'];
    const configVersion: string = argv['config-version'];

    const matchedPaths = globSync(includePattern);
    if (matchedPaths.length === 0) {
        throw new Error(`No files matched pattern: ${includePattern}`);
    }

    // Group matched files by their top-level directory.
    const topLevelDir = (filePath: string): string => {
        const first = path.normalize(filePath).split(path.sep)[0];
        return first === path.basename(filePath) ? '.' : first;
    };

    const groups = new Map<string, string[]>();
    for (const filePath of matchedPaths) {
        const dir = topLevelDir(filePath);
        if (!groups.has(dir)) {
            groups.set(dir, []);
        }
        groups.get(dir)!.push(filePath);
    }

    // Only single-folder import is supported
    if (groups.size > 1) {
        const folderNames = [...groups.keys()].join(', ');
        throw new Error(
            `--include matched files across ${groups.size} folders (${folderNames}). ` +
            `Only single-folder import is supported. Use a more specific pattern.`
        );
    }

    const [, files] = [...groups][0];

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
            logger.info(`Successfully created configuration "${configName}": ${response.status}`);
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
            logger.info(`Successfully updated configuration "${configName}": ${response.status}`);
            if (logger.isDebugEnabled()) {
                logger.debug(`PUT response: ${JSON.stringify(response.data, null, 2)}`);
            }
            const actualVersion = response.data?.configuration_version;
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
