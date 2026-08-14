import * as utils from '../utils';

import fs from 'fs';
import logger from '../logger';
import path from 'path';

/**
 * Handler for publishing integration packages to npm or container images to a registry
 * @param argv Command line arguments
 */
export async function handlePublish(argv: any): Promise<void> {
    const { package: packageNameOrPath, registryUsername } = argv;
    const type = argv['artifact-type'] || 'package';

    logger.info(`Start to publish the integration package: ${packageNameOrPath}`);

    // Resolve package path
    let packagePath: string;

    if (utils.pathExists(packageNameOrPath)) {
        packagePath = packageNameOrPath;
    } else {
        packagePath = path.join(process.cwd(), packageNameOrPath);
        if (!utils.pathExists(packagePath)) {
            logger.error(`Path does not exist: ${packagePath}`);
            process.exit(1);
        }
    }

    try {
        if (type === 'image') {
            await publishImage(packagePath, registryUsername, argv['registry-password'], argv.debug);
        } else if (type === 'both') {
            await publishPackage(packagePath, packageNameOrPath, registryUsername, argv['registry-email']);
            try {
                await publishImage(packagePath, registryUsername, argv['registry-password'], argv.debug);
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                throw new Error(
                    `The npm package was published successfully, but publishing the container image failed: ${msg}\n` +
                    `The npm package has already been published - do not retry the full command. Re-run with --artifact-type image to retry only the image step.`
                );
            }
        } else {
            await publishPackage(packagePath, packageNameOrPath, registryUsername, argv['registry-email']);
        }
    } catch (error) {
        logger.error('Publish failed:', error);
        process.exit(1);
    }
}

/**
 * Publish npm integration package
 */
async function publishPackage( packagePath: string, packageNameOrPath: string, registryUsername: string, registryEmail: string): Promise<void> {
    const packageJson = utils.readPackageJson(packagePath);
    if (!packageJson) {
        throw new Error('Failed to read the package.json');
    }

    const packageName = packageJson.name;
    const scopeMatch = packageName.match(/^@([^/]+)\/.+$/);
    const scope = scopeMatch ? scopeMatch[1] : null;

    logger.info('Logging into the integration package registry ...');

    if (!(await utils.isUserLoggedIn())) {
        try {
            // npm login
            const loginArgs = ['login', '--username', registryUsername, '--email', registryEmail];
            if (scope) {
                loginArgs.push(`--scope=@${scope}`);
            }
            await utils.spawnAsync('npm', loginArgs, { stdio: 'inherit' });

            logger.info('Logged into the integration package registry successfully');
        } catch (error) {
            throw new Error(`Failed to login to npm registry: ${error instanceof Error ? error.message : String(error)}`);
        }
    } else {
        logger.info('Already logged into the integration package registry');
    }

    logger.info(`Publishing the integration package from ${packagePath} ...`);
    logger.info(`Package name: ${packageName}`);
    logger.info(`Scope: ${scope || 'none'}`);

    try {
        // npm publish command
        const publishArgs = ['publish'];
        if (scope) {
            publishArgs.push('--access', 'public');
        }
        await utils.spawnAsync('npm', publishArgs, { cwd: packagePath, stdio: 'inherit' });

        logger.info(`Package ${packageName} published successfully`);
    } catch (error) {
        throw new Error(`Failed to publish package ${packageName}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Publish collector container image to a registry
 */
async function publishImage( packagePath: string, registryUsername: string, registryPassword: string, debug: boolean = false): Promise<void> {
    // Detect container runtime
    const containerRuntime = utils.detectContainerRuntime();

    // Read collector/config/config.json
    const collectorPath = path.join(packagePath, 'collector');
    if (!utils.pathExists(collectorPath)) {
        throw new Error(`Collector directory not found: ${collectorPath}. Make sure your package includes a 'collector' folder.`);
    }

    const collectorConfigPath = path.join(collectorPath, 'config');
    if (!utils.pathExists(collectorConfigPath)) {
        throw new Error(`Collector config directory not found: ${collectorConfigPath}. Make sure your package includes a 'collector/config' folder.`);
    }

    const configFilePath = path.join(collectorConfigPath, 'config.json');
    let config: any;
    try {
        const configContent = fs.readFileSync(configFilePath, 'utf-8');
        config = JSON.parse(configContent);
    } catch (error) {
        throw new Error(`Failed to read collector/config/config.json: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!config.image?.registry || !config.image?.repository || !config.image?.tag) {
        throw new Error('collector/config/config.json is missing required image fields: registry, repository, tag');
    }

    const registry = config.image.registry;
    const imageTag = `${registry}/${config.image.repository}:${config.image.tag}`;

    logger.info(`Publishing container image: ${imageTag}`);

    if (debug) {
        logger.info(`=== ${containerRuntime} Publish Debug Information ===`);
        logger.info(`Registry: ${registry}`);
        logger.info(`Image Tag: ${imageTag}`);
        logger.info(`Username: ${registryUsername}`);
        logger.info('======================================');
    }

    // Login to container registry
    logger.info(`Logging into container registry: ${registry} ...`);
    try {
        await utils.spawnAsync(
            containerRuntime,
            ['login', registry, '--username', registryUsername, '--password-stdin'],
            { stdio: ['pipe', 'inherit', 'inherit'], input: registryPassword }
        );
        logger.info('Logged into container registry successfully');
    } catch (error) {
        throw new Error(`Failed to login to container registry: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Push image
    logger.info(`Pushing image ${imageTag} ...`);
    try {
        // Pipe both stdout and stderr to capture docker push layer progress.
        // In non-TTY environments (e.g. CI), Docker routes layer lines to stderr instead of stdout.
        const { stdout, stderr } = await utils.spawnAsync(containerRuntime, ['push', imageTag], { stdio: ['inherit', 'pipe', 'pipe'] });
        // Combine both streams, then strip ANSI escape codes before parsing
        const plain = (stdout + stderr).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
        // Only consider final-state layer lines (exclude intermediate Preparing/Waiting lines)
        const layerLines = plain.split('\n').filter(l => /^[a-f0-9]+: /.test(l.trim()) && !l.includes('Preparing') && !l.includes('Waiting'));
        const allAlreadyExist = layerLines.length > 0 && layerLines.every(l => l.includes('Layer already exists'));
        if (allAlreadyExist) {
            logger.warn(`The image tag "${imageTag}" is identical to the currently published image. Bump the tag in config.json before publishing.`);
        } else {
            logger.info(`Container image ${imageTag} published successfully`);
        }
    } catch (error) {
        throw new Error(`Failed to push container image: ${error instanceof Error ? error.message : String(error)}`);
    }
}
