import * as child_process from 'child_process';
import * as utils from '../../utils';
import * as validators from '../../validators';

import { EventEmitter } from 'events';
import fs from 'fs';
import { handleBuild } from '../../handlers/build';
import path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process');
jest.mock('../../utils');
jest.mock('../../validators');
jest.mock('../../logger');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockUtils = utils as jest.Mocked<typeof utils>;
const mockValidators = validators as jest.Mocked<typeof validators>;
const mockChildProcess = child_process as jest.Mocked<typeof child_process>;

describe('handleBuild', () => {
    const mockPackagePath = '/test/package';
    const mockCollectorPath = path.join(mockPackagePath, 'collector');
    const mockConfigPath = path.join(mockCollectorPath, 'config', 'config.json');
    const mockContainerfilePath = path.join(mockCollectorPath, 'Containerfile');

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock detectContainerRuntime to return docker by default
        mockUtils.detectContainerRuntime.mockReturnValue('docker');
    });

    const setupMockSpawn = (exitCode: number = 0) => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        
        mockChildProcess.spawn.mockReturnValue(mockProcess);
        
        // Simulate process completion after a short delay
        setTimeout(() => {
            mockProcess.emit('close', exitCode);
        }, 10);
        
        return mockProcess;
    };

    it('should validate package structure and build successfully', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors, warnings, successMessages) => {
            // No errors - validation passes
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            extension_name: 'test-monitor',
            extension_version: '1.0.0',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        await handleBuild({ package: mockPackagePath });

        expect(mockUtils.pathExists).toHaveBeenCalledWith(mockPackagePath);
        expect(mockUtils.pathExists).toHaveBeenCalledWith(mockCollectorPath);
        expect(mockValidators.validateCollectorFiles).toHaveBeenCalledWith(
            mockCollectorPath,
            path.join(mockCollectorPath, 'config'),
            expect.any(Array),
            expect.any(Array),
            expect.any(Array)
        );
        expect(mockFs.readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf-8');
        expect(mockUtils.detectContainerRuntime).toHaveBeenCalled();
        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'docker',
            ['build', '-f', mockContainerfilePath, '-t', 'quay.io/instana-collectors/test:1.0.0', mockCollectorPath],
            { stdio: 'inherit' }
        );
    });

    it('should throw error if package directory does not exist', async () => {
        mockUtils.pathExists.mockReturnValue(false);

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Package directory not found');
    });

    it('should throw error if collector directory does not exist', async () => {
        mockUtils.pathExists
            .mockReturnValueOnce(true)  // packagePath exists
            .mockReturnValueOnce(false); // collectorPath missing

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector directory not found');
    });

    it('should throw error if collector/config directory does not exist', async () => {
        mockUtils.pathExists
            .mockReturnValueOnce(true)  // packagePath exists
            .mockReturnValueOnce(true)  // collectorPath exists
            .mockReturnValueOnce(false); // configPath missing

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector config directory not found');
    });

    it('should throw error if validator finds missing files', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors, warnings, successMessages) => {
            errors.push('Missing required collector file: config/config.json');
            errors.push('Missing required collector file: Containerfile');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should throw error if validator finds empty files', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors, warnings, successMessages) => {
            warnings.push('Collector file is empty: requirements.txt');
        });
        const mockConfig = {
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        // Should not throw - warnings don't fail the build
        await handleBuild({ package: mockPackagePath, debug: false });
        
        expect(mockValidators.validateCollectorFiles).toHaveBeenCalled();
    });

    it('should throw error if config.json is invalid JSON', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors) => {
            errors.push('Collector config.json is not valid JSON');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should throw error if config is missing image section', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors) => {
            errors.push('Collector config.json is missing required "image" section');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should throw error if config is missing image.registry', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors) => {
            errors.push('Collector config.json is missing required fields: image.registry');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should throw error if config is missing image.repository', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors) => {
            errors.push('Collector config.json is missing required fields: image.repository');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should throw error if config is missing image.tag', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors) => {
            errors.push('Collector config.json is missing required fields: image.tag');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should throw error with all missing image fields in one message', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors) => {
            errors.push('Collector config.json is missing required fields: image.registry, image.repository, image.tag');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should throw error if docker build fails', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(1); // Exit code 1 = failure

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Container image build failed');
    });

    it('should throw error if docker command fails to execute', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        
        const mockProcess = new EventEmitter() as any;
        mockChildProcess.spawn.mockReturnValue(mockProcess);
        
        setTimeout(() => {
            mockProcess.emit('error', new Error('Command not found'));
        }, 10);

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Container image build failed');
    });

    it('should use CLI build options over config options', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            },
            build_options: {
                platform: 'linux/arm64',
                no_cache: false
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        await handleBuild({
            package: mockPackagePath,
            platform: 'linux/amd64',
            'no-cache': true
        });

        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'docker',
            expect.arrayContaining([
                'build',
                '-t',
                'quay.io/instana-collectors/test:1.0.0',
                '--platform',
                'linux/amd64',
                '--no-cache',
                mockCollectorPath
            ]),
            { stdio: 'inherit' }
        );
    });

    it('should use config build options when CLI options not provided', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            },
            build_options: {
                platform: 'linux/arm64',
                build_args: {
                    PYTHON_VERSION: '3.11'
                }
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        await handleBuild({ package: mockPackagePath });

        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'docker',
            expect.arrayContaining([
                'build',
                '-t',
                'quay.io/instana-collectors/test:1.0.0',
                '--platform',
                'linux/arm64',
                '--build-arg',
                'PYTHON_VERSION=3.11',
                mockCollectorPath
            ]),
            { stdio: 'inherit' }
        );
    });

    it('should detect and use podman when docker is not available', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

        // Mock detectContainerRuntime to return podman
        mockUtils.detectContainerRuntime.mockReturnValue('podman');

        setupMockSpawn(0);

        await handleBuild({ package: mockPackagePath });

        expect(mockUtils.detectContainerRuntime).toHaveBeenCalled();
        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'podman',
            ['build', '-f', mockContainerfilePath, '-t', 'quay.io/instana-collectors/test:1.0.0', mockCollectorPath],
            { stdio: 'inherit' }
        );
    });

    it('should throw error when no container runtime is available', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });

        // Mock detectContainerRuntime throwing
        mockUtils.detectContainerRuntime.mockImplementation(() => {
            throw new Error('No container runtime detected');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('No container runtime detected');
    });

    it('should throw error for invalid tag format with special characters', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors) => {
            errors.push('Collector config.json has invalid fields: image.tag (invalid format, must be alphanumeric with dots, dashes, underscores, max 128 chars)');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should throw error for tag format exceeding 128 characters', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation((collectorPath, configPath, errors) => {
            errors.push('Collector config.json has invalid fields: image.tag (invalid format, must be alphanumeric with dots, dashes, underscores, max 128 chars)');
        });

        await expect(handleBuild({ package: mockPackagePath }))
            .rejects.toThrow('Collector validation failed');
    });

    it('should build successfully with --debug flag enabled', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        await handleBuild({ package: mockPackagePath, debug: true });

        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'docker',
            ['build', '-f', mockContainerfilePath, '-t', 'quay.io/instana-collectors/test:1.0.0', mockCollectorPath],
            { stdio: 'inherit' }
        );
    });

    it('should build successfully with all optional config fields', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            extension_name: 'Test Monitor',
            extension_version: '1.0.0',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            },
            configuration: {
                interval: 60,
                timeout: 30,
                batch_size: 100,
                log_level: 'INFO'
            },
            metadata: {
                created_at: '2026-03-22T00:00:00Z',
                created_by: 'instana-integration'
            },
            build_options: {
                platform: 'linux/amd64',
                build_args: {
                    PYTHON_VERSION: '3.11',
                    APP_VERSION: '1.0.0'
                },
                no_cache: false,
                network: 'host'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        await handleBuild({ package: mockPackagePath });

        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'docker',
            expect.arrayContaining([
                'build',
                '-t',
                'quay.io/instana-collectors/test:1.0.0',
                '--platform',
                'linux/amd64',
                '--build-arg',
                'PYTHON_VERSION=3.11',
                '--build-arg',
                'APP_VERSION=1.0.0',
                '--network',
                'host',
                mockCollectorPath
            ]),
            { stdio: 'inherit' }
        );
    });

    it('should handle multiple build-arg flags from CLI', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        await handleBuild({
            package: mockPackagePath,
            'build-arg': ['PYTHON_VERSION=3.11', 'APP_VERSION=2.0.0', 'BUILD_DATE=2026-06-09']
        });

        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'docker',
            expect.arrayContaining([
                'build',
                '-t',
                'quay.io/instana-collectors/test:1.0.0',
                '--build-arg',
                'PYTHON_VERSION=3.11',
                '--build-arg',
                'APP_VERSION=2.0.0',
                '--build-arg',
                'BUILD_DATE=2026-06-09',
                mockCollectorPath
            ]),
            { stdio: 'inherit' }
        );
    });

    it('should handle network flag from CLI', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            extension_id: 'test-monitor',
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        await handleBuild({
            package: mockPackagePath,
            network: 'host'
        });

        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'docker',
            expect.arrayContaining([
                'build',
                '-t',
                'quay.io/instana-collectors/test:1.0.0',
                '--network',
                'host',
                mockCollectorPath
            ]),
            { stdio: 'inherit' }
        );
    });

    it('should build with minimal required config fields only', async () => {
        mockUtils.pathExists.mockReturnValue(true);
        mockValidators.validateCollectorFiles.mockImplementation(() => {
            // No errors
        });
        const mockConfig = {
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/test',
                tag: '1.0.0'
            }
        };
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
        setupMockSpawn(0);

        await handleBuild({ package: mockPackagePath });

        expect(mockChildProcess.spawn).toHaveBeenCalledWith(
            'docker',
            ['build', '-f', mockContainerfilePath, '-t', 'quay.io/instana-collectors/test:1.0.0', mockCollectorPath],
            { stdio: 'inherit' }
        );
    });

});
