import * as utils from '../../utils';

import fs from 'fs';
import { handlePublish } from '../../handlers/publish';
import logger from '../../logger';
import path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('../../utils');
jest.mock('../../logger');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Publish Handler', () => {
    let mockExit: jest.SpyInstance;
    let mockCwd: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockExit = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
            throw new Error(`process.exit(${code})`);
        }) as any);
        
        mockCwd = jest.spyOn(process, 'cwd').mockReturnValue('/current/dir');
        
        // Default mocks
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    });

    afterEach(() => {
        mockExit.mockRestore();
        mockCwd.mockRestore();
    });

    describe('handlePublish', () => {
        it('should publish a package from a valid path', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: '@scope/test-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(logger.info).toHaveBeenCalledWith('Start to publish the integration package: /path/to/package');
            expect(logger.info).toHaveBeenCalledWith('Already logged into the integration package registry');
            expect(logger.info).toHaveBeenCalledWith('Package @scope/test-package published successfully');
            expect(utils.spawnAsync).toHaveBeenCalledWith('npm', ['publish', '--access', 'public'], {
                cwd: '/path/to/package',
                stdio: 'inherit'
            });
        });

        it('should handle package name without path', async () => {
            const argv = {
                package: 'test-package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: 'test-package' };

            (utils.pathExists as jest.Mock)
                .mockReturnValueOnce(false) // First call for package name
                .mockReturnValueOnce(true);  // Second call for constructed path
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(path.join).toHaveBeenCalledWith('/current/dir', 'test-package');
            expect(logger.info).toHaveBeenCalledWith('Package test-package published successfully');
        });

        it('should exit with code 1 if package.json cannot be read', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(null);

            await expect(handlePublish(argv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: 'Failed to read the package.json' }));
            expect(mockExit).toHaveBeenCalledWith(1);
            expect(utils.isUserLoggedIn).not.toHaveBeenCalled();
        });

        it('should exit with code 1 if package path does not exist', async () => {
            const argv = {
                package: 'nonexistent-package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            (utils.pathExists as jest.Mock).mockReturnValue(false);

            await expect(handlePublish(argv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Path does not exist: /current/dir/nonexistent-package');
            expect(mockExit).toHaveBeenCalledWith(1);
            expect(utils.isUserLoggedIn).not.toHaveBeenCalled();
        });

        it('should login when user is not logged in', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: 'test-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(utils.spawnAsync).toHaveBeenCalledWith(
                'npm',
                ['login', '--username', 'testuser', '--email', 'test@example.com'],
                { stdio: 'inherit' }
            );
            expect(logger.info).toHaveBeenCalledWith('Logged into the integration package registry successfully');
        });

        it('should include scope in login args for scoped packages', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: '@myorg/test-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(utils.spawnAsync).toHaveBeenCalledWith(
                'npm',
                ['login', '--username', 'testuser', '--email', 'test@example.com', '--scope=@myorg'],
                { stdio: 'inherit' }
            );
        });

        it('should exit with code 1 on login error', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: 'test-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            (utils.spawnAsync as jest.Mock).mockRejectedValueOnce(new Error('Login failed'));

            await expect(handlePublish(argv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: expect.stringContaining('Failed to login to npm registry') }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should publish with --access public for scoped packages', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: '@scope/test-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(utils.spawnAsync).toHaveBeenCalledWith(
                'npm',
                ['publish', '--access', 'public'],
                { cwd: '/path/to/package', stdio: 'inherit' }
            );
        });

        it('should publish without --access flag for non-scoped packages', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: 'test-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(utils.spawnAsync).toHaveBeenCalledWith(
                'npm',
                ['publish'],
                { cwd: '/path/to/package', stdio: 'inherit' }
            );
        });

        it('should exit with code 1 on publish error', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: 'test-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockRejectedValue(new Error('Publish failed'));

            await expect(handlePublish(argv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith(
                'Publish failed:',
                expect.objectContaining({ message: expect.stringContaining('Failed to publish package test-package') })
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should log package details before publishing', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: '@myorg/my-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(logger.info).toHaveBeenCalledWith('Publishing the integration package from /path/to/package ...');
            expect(logger.info).toHaveBeenCalledWith('Package name: @myorg/my-package');
            expect(logger.info).toHaveBeenCalledWith('Scope: myorg');
        });

        it('should log "none" for scope when package is not scoped', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: 'unscoped-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(logger.info).toHaveBeenCalledWith('Scope: none');
        });

        it('should extract scope correctly from package name', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: '@instana/integration-package' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(logger.info).toHaveBeenCalledWith('Scope: instana');
        });

        it('should handle complex scoped package names', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                'artifact-type': 'package'
            };

            const packageJson = { name: '@my-org/my-package-name' };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue(undefined);

            await handlePublish(argv);

            expect(logger.info).toHaveBeenCalledWith('Scope: my-org');
        });
    });

    describe('handlePublish --artifact-type image', () => {
        const imageArgv = {
            package: '/path/to/package',
            registryUsername: 'testuser',
            'registry-password': 'secret',
            'artifact-type': 'image'
        };

        const mockConfig = {
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/my-collector',
                tag: '1.0.0'
            }
        };

        beforeEach(() => {
            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.detectContainerRuntime as jest.Mock).mockReturnValue('docker');
            (utils.spawnAsync as jest.Mock).mockResolvedValue({ stdout: '', stderr: '' });
        });

        it('should publish image successfully', async () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);

            await handlePublish(imageArgv);

            expect(utils.detectContainerRuntime).toHaveBeenCalled();
            expect(utils.spawnAsync).toHaveBeenCalledWith(
                'docker',
                ['login', 'quay.io', '--username', 'testuser', '--password-stdin'],
                expect.objectContaining({ input: 'secret' })
            );
            expect(utils.spawnAsync).toHaveBeenCalledWith(
                'docker',
                ['push', 'quay.io/instana-collectors/my-collector:1.0.0'],
                { stdio: ['inherit', 'pipe', 'pipe'] }
            );
        });

        it('should exit with code 1 if collector directory does not exist', async () => {
            (utils.pathExists as jest.Mock)
                .mockReturnValueOnce(true)   // packagePath exists
                .mockReturnValueOnce(false); // collectorPath does not

            await expect(handlePublish(imageArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: expect.stringContaining('Collector directory not found') }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should exit with code 1 if collector/config directory does not exist', async () => {
            (utils.pathExists as jest.Mock)
                .mockReturnValueOnce(true)   // packagePath exists
                .mockReturnValueOnce(true)   // collectorPath exists
                .mockReturnValueOnce(false); // collectorConfigPath does not

            await expect(handlePublish(imageArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: expect.stringContaining('Collector config directory not found') }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should exit with code 1 if config.json is missing or invalid', async () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('ENOENT');
            });

            await expect(handlePublish(imageArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: expect.stringContaining('Failed to read collector/config/config.json') }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should exit with code 1 if config.json is missing image fields', async () => {
            mockFs.readFileSync.mockReturnValue(
                JSON.stringify({ image: { registry: 'quay.io' } }) as any
            );

            await expect(handlePublish(imageArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: expect.stringContaining('collector/config/config.json is missing required image fields') }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should exit with code 1 if container runtime login fails', async () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);
            (utils.spawnAsync as jest.Mock).mockRejectedValueOnce(new Error('unauthorized'));

            await expect(handlePublish(imageArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: expect.stringContaining('Failed to login to container registry') }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should exit with code 1 if container image push fails', async () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);
            (utils.spawnAsync as jest.Mock)
                .mockResolvedValueOnce({ stdout: '', stderr: '' })  // login succeeds
                .mockRejectedValueOnce(new Error('push failed')); // push fails

            await expect(handlePublish(imageArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: expect.stringContaining('Failed to push container image') }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should use podman when docker is not available', async () => {
            (utils.detectContainerRuntime as jest.Mock).mockReturnValue('podman');
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);

            await handlePublish(imageArgv);

            expect(utils.spawnAsync).toHaveBeenCalledWith(
                'podman',
                ['login', 'quay.io', '--username', 'testuser', '--password-stdin'],
                expect.objectContaining({ input: 'secret' })
            );
            expect(utils.spawnAsync).toHaveBeenCalledWith(
                'podman',
                ['push', 'quay.io/instana-collectors/my-collector:1.0.0'],
                { stdio: ['inherit', 'pipe', 'pipe'] }
            );
        });

        it('should exit with code 1 if no container runtime is available', async () => {
            (utils.detectContainerRuntime as jest.Mock).mockImplementation(() => {
                throw new Error('No container runtime detected');
            });

            await expect(handlePublish(imageArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Publish failed:', expect.objectContaining({ message: expect.stringContaining('No container runtime detected') }));
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should warn and not log success when all layers already exist on registry (stdout)', async () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);
            const pushOutput = [
                'The push refers to repository [quay.io/instana-collectors/my-collector]',
                'da396a519e4d: Preparing',
                'ae1ec844c4de: Waiting',
                'da396a519e4d: Layer already exists',
                'ae1ec844c4de: Layer already exists',
                '1.0.0: digest: sha256:abc123 size: 1234'
            ].join('\n');
            (utils.spawnAsync as jest.Mock)
                .mockResolvedValueOnce({ stdout: '', stderr: '' })            // login
                .mockResolvedValueOnce({ stdout: pushOutput, stderr: '' });   // push via stdout (TTY)

            await handlePublish(imageArgv);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('The image tag "quay.io/instana-collectors/my-collector:1.0.0" is identical to the currently published image')
            );
            expect(logger.info).not.toHaveBeenCalledWith(
                expect.stringContaining('Container image quay.io/instana-collectors/my-collector:1.0.0 published successfully')
            );
        });

        it('should warn and not log success when all layers already exist on registry (stderr, non-TTY/CI)', async () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);
            const pushOutput = [
                'The push refers to repository [quay.io/instana-collectors/my-collector]',
                'da396a519e4d: Preparing',
                'ae1ec844c4de: Waiting',
                'da396a519e4d: Layer already exists',
                'ae1ec844c4de: Layer already exists',
                '1.0.0: digest: sha256:abc123 size: 1234'
            ].join('\n');
            (utils.spawnAsync as jest.Mock)
                .mockResolvedValueOnce({ stdout: '', stderr: '' })            // login
                .mockResolvedValueOnce({ stdout: '', stderr: pushOutput });   // push via stderr (non-TTY/CI)

            await handlePublish(imageArgv);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('The image tag "quay.io/instana-collectors/my-collector:1.0.0" is identical to the currently published image')
            );
            expect(logger.info).not.toHaveBeenCalledWith(
                expect.stringContaining('Container image quay.io/instana-collectors/my-collector:1.0.0 published successfully')
            );
        });

        it('should log success and not warn when some layers are new', async () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);
            const pushOutput = [
                'The push refers to repository [quay.io/instana-collectors/my-collector]',
                'da396a519e4d: Preparing',
                'ae1ec844c4de: Preparing',
                'da396a519e4d: Layer already exists',
                'ae1ec844c4de: Pushed',
                '1.0.0: digest: sha256:abc123 size: 1234'
            ].join('\n');
            (utils.spawnAsync as jest.Mock)
                .mockResolvedValueOnce({ stdout: '', stderr: '' })       // login
                .mockResolvedValueOnce({ stdout: pushOutput, stderr: '' }); // push

            await handlePublish(imageArgv);

            expect(logger.warn).not.toHaveBeenCalledWith(
                expect.stringContaining('The image tag "quay.io/instana-collectors/my-collector:1.0.0" is identical to the currently published image')
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Container image quay.io/instana-collectors/my-collector:1.0.0 published successfully'
            );
        });
    });

    describe('handlePublish --artifact-type both', () => {
        const bothArgv = {
            package: '/path/to/package',
            registryUsername: 'testuser',
            'registry-email': 'test@example.com',
            'registry-password': 'secret',
            'artifact-type': 'both'
        };

        const mockConfig = {
            image: {
                registry: 'quay.io',
                repository: 'instana-collectors/my-collector',
                tag: '1.0.0'
            }
        };

        beforeEach(() => {
            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.detectContainerRuntime as jest.Mock).mockReturnValue('docker');
        });

        it('should publish package then image successfully', async () => {
            const packageJson = { name: '@scope/test-package' };
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockResolvedValue({ stdout: '', stderr: '' });
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);

            await handlePublish(bothArgv);

            expect(utils.spawnAsync).toHaveBeenCalledWith('npm', ['publish', '--access', 'public'], expect.any(Object));
            expect(utils.spawnAsync).toHaveBeenCalledWith('docker', ['push', 'quay.io/instana-collectors/my-collector:1.0.0'], expect.any(Object));
        });

        it('should exit with code 1 and clear message if publishImage fails after publishPackage succeeds', async () => {
            const packageJson = { name: '@scope/test-package' };
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock)
                .mockResolvedValueOnce({ stdout: '', stderr: '' })  // npm publish succeeds
                .mockResolvedValueOnce({ stdout: '', stderr: '' })  // docker login succeeds
                .mockRejectedValueOnce(new Error('push failed'));   // docker push fails
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);

            await expect(handlePublish(bothArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith(
                'Publish failed:',
                expect.objectContaining({
                    message: expect.stringContaining('The npm package was published successfully, but publishing the container image failed')
                })
            );
            expect(logger.error).toHaveBeenCalledWith(
                'Publish failed:',
                expect.objectContaining({
                    message: expect.stringContaining('Re-run with --artifact-type image to retry only the image step')
                })
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should exit with code 1 normally if publishPackage itself fails', async () => {
            const packageJson = { name: '@scope/test-package' };
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            (utils.spawnAsync as jest.Mock).mockRejectedValueOnce(new Error('npm login failed'));

            await expect(handlePublish(bothArgv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith(
                'Publish failed:',
                expect.objectContaining({ message: expect.stringContaining('Failed to login to npm registry') })
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });
});
