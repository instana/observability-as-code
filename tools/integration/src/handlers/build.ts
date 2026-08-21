import fs from 'fs';
import logger from '../logger';
import path from 'path';
import { detectContainerRuntime, pathExists } from '../utils';
import { spawn } from 'child_process';
import { validateCollectorFiles } from '../validators';

/**
 * Handler for building collector container images
 * Validates package structure and collector configuration
 */
export async function handleBuild(argv: any): Promise<void> {
    const packagePath = path.resolve(argv.package);
    
    logger.info(`Building collector for package: ${packagePath}`);
    
    // Detect and verify container runtime
    const containerRuntime = detectContainerRuntime();

    // Check if package directory exists
    if (!pathExists(packagePath)) {
        throw new Error(`Package directory not found: ${packagePath}`);
    }
    logger.info(`Package directory exists: ${packagePath}`);

    // Check if collector directory exists
    const collectorPath = path.join(packagePath, 'collector');
    if (!pathExists(collectorPath)) {
        throw new Error(
            `Collector directory not found: ${collectorPath}. Make sure your package includes a 'collector' folder.`
        );
    }
    logger.info(`Collector directory exists: ${collectorPath}`);

    // Check if collector/config directory exists
    const configPath = path.join(packagePath, 'collector', 'config');
    if (!pathExists(configPath)) {
        throw new Error(
            `Collector config directory not found: ${configPath}. Make sure your package includes a 'collector/config' folder.`
        );
    }
    logger.info(`Collector config directory exists: ${configPath}`);

    // Validate collector files
    const errors: string[] = [];
    const warnings: string[] = [];
    const successMessages: string[] = [];

    validateCollectorFiles(collectorPath, configPath, errors, warnings, successMessages);
    
    // Show detailed validation results in debug mode
    if (argv.debug) {
        logger.info('=== Validation Results ===');
        if (successMessages.length > 0) {
            logger.info(`✓ Success (${successMessages.length}):`);
            successMessages.forEach(msg => logger.info(`  ${msg}`));
        }
        if (warnings.length > 0) {
            logger.warn(`⚠ Warnings (${warnings.length}):`);
            warnings.forEach(warning => logger.warn(`  ${warning}`));
        }
        if (errors.length > 0) {
            logger.error(`✗ Errors (${errors.length}):`);
            errors.forEach(error => logger.error(`  ${error}`));
        }
        logger.info('==========================');
    }
    
    if (errors.length > 0) {
        errors.forEach(error => logger.error(error));
        throw new Error('Collector validation failed.');
    }
    
    if (!argv.debug) {
        logger.info('Required collector files exist');
    }

    // Read collector/config/config.json to get image information for container image build
    const configFilePath = path.join(configPath, 'config.json');
    let config: any;
    try {
        const configContent = fs.readFileSync(configFilePath, 'utf-8');
        config = JSON.parse(configContent);
    } catch (error) {
        throw new Error(
            `Failed to read collector/config/config.json: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }

    // Construct image tag (validation already done by validateCollectorFiles)
    const imageTag = `${config.image.registry}/${config.image.repository}:${config.image.tag}`;

    // Validate the constructed image tag against container image naming conventions
    const imageTagPattern = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9._-]*[a-z0-9])?)*\/[a-z0-9]+([._-][a-z0-9]+)*(\/[a-z0-9]+([._-][a-z0-9]+)*)*:[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    
    if (!imageTagPattern.test(imageTag)) {
        throw new Error(
            `Invalid container image tag format: "${imageTag}". ` +
            `Image tag must follow container image naming conventions: ` +
            `lowercase alphanumeric with allowed separators (-, ., _), no consecutive special characters.`
        );
    }

    logger.info('Configuration is valid');
    logger.info(`Extension ID: ${config.extension_id || 'N/A'}`);
    logger.info(`Extension Name: ${config.extension_name || 'N/A'}`);
    logger.info(`Image Tag: ${imageTag}`);

    // Build container image
    if (argv.debug) {
        logger.info(`=== ${containerRuntime} Build Debug Information ===`);
        logger.info(`Build Context: ${collectorPath}`);
        logger.info(`Image Tag: ${imageTag}`);
        logger.info(`Registry: ${config.image.registry}`);
        logger.info(`Repository: ${config.image.repository}`);
        logger.info(`Tag: ${config.image.tag}`);
        logger.info(`Containerfile: ${path.join(collectorPath, 'Containerfile')}`);
        logger.info(`Build Command: ${containerRuntime} build -f ${path.join(collectorPath, 'Containerfile')} -t ${imageTag} ${collectorPath}`);
        logger.info('======================================');
    }
    
    // Prepare container runtime build arguments
    const dockerArgs = ['build', '-f', path.join(collectorPath, 'Containerfile'), '-t', imageTag];

    const effectiveOptions = {
        platform: argv.platform ?? config.build_options?.platform,
        noCache: argv.cache === false || argv['no-cache'] === true || config.build_options?.no_cache === true,
        network: argv.network ?? config.build_options?.network,
    };

    // Add platform
    if (effectiveOptions.platform) {
        dockerArgs.push('--platform', effectiveOptions.platform);
        if (argv.debug) {
            logger.info(`Using platform: ${effectiveOptions.platform} (from ${argv.platform ? 'CLI' : 'config'})`);
        }
    }
    
    // Add build arguments
    const buildArgs = argv['build-arg'] || [];
    if (buildArgs.length > 0) {
        buildArgs.forEach((arg: string) => {
            dockerArgs.push('--build-arg', arg);
            if (argv.debug) {
                logger.info(`Using build arg: ${arg} (from CLI)`);
            }
        });
    } else if (config.build_options?.build_args && typeof config.build_options.build_args === 'object') {
        Object.entries(config.build_options.build_args).forEach(([key, value]) => {
            dockerArgs.push('--build-arg', `${key}=${value}`);
            if (argv.debug) {
                logger.info(`Using build arg: ${key}=${value} (from config)`);
            }
        });
    }

	// Add no-cache flag
    if (effectiveOptions.noCache) {
        dockerArgs.push('--no-cache');
        if (argv.debug) {
            logger.info(`Disabling ${containerRuntime} cache (--no-cache)`);
        }
    }
    
    // Add network setting
    if (effectiveOptions.network) {
        dockerArgs.push('--network', effectiveOptions.network);
        if (argv.debug) {
            logger.info(`Using network: ${effectiveOptions.network} (from ${argv.network ? 'CLI' : 'config'})`);
        }
    }
    
    // Add build context path
    dockerArgs.push(collectorPath);
    
    const buildCommand = `${containerRuntime} ${dockerArgs.join(' ')}`;
    logger.info(`Executing: ${buildCommand}`);

    try {
        await new Promise<void>((resolve, reject) => {
            const dockerBuild = spawn(containerRuntime, dockerArgs, { stdio: 'inherit' });

            dockerBuild.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Container image build failed with exit code ${code}`));
                } else {
                    resolve();
                }
            });

            dockerBuild.on('error', (error) => {
                reject(new Error(`Failed to execute ${containerRuntime} build: ${error.message}`));
            });
        });
    } catch (error) {
        throw new Error(
            `Container image build failed: ${
                error instanceof Error ? error.message : String(error)
            }`
        );
    }

    logger.info(`Successfully built container image: ${imageTag}`);
    logger.info('To run the collector locally:');
    logger.info(`  ${containerRuntime} run ${imageTag}`);
    logger.info('To view the image:');
    logger.info(`  ${containerRuntime} images | grep ${config.image.repository}`);
}
