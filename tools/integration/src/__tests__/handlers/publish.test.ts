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
                type: 'package'
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
                type: 'package'
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

        it('should return early if package.json cannot be read', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                type: 'package'
            };

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(null);

            await handlePublish(argv);

            expect(logger.error).toHaveBeenCalledWith('Failed to read the package.json');
            expect(utils.isUserLoggedIn).not.toHaveBeenCalled();
        });

        it('should return early if package path does not exist', async () => {
            const argv = {
                package: 'nonexistent-package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                type: 'package'
            };

            (utils.pathExists as jest.Mock).mockReturnValue(false);

            await handlePublish(argv);

            expect(logger.error).toHaveBeenCalledWith('Path does not exist: /current/dir/nonexistent-package');
            expect(utils.isUserLoggedIn).not.toHaveBeenCalled();
        });

        it('should login when user is not logged in', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                type: 'package'
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
                type: 'package'
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
                type: 'package'
            };

            const packageJson = { name: 'test-package' };
            const loginError = new Error('Login failed');

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(false);
            (utils.spawnAsync as jest.Mock).mockRejectedValueOnce(loginError);

            await expect(handlePublish(argv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith('Error occurred during login:', loginError);
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should publish with --access public for scoped packages', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                type: 'package'
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
                type: 'package'
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
                type: 'package'
            };

            const packageJson = { name: 'test-package' };
            const publishError = new Error('Publish failed');

            (utils.pathExists as jest.Mock).mockReturnValue(true);
            (utils.readPackageJson as jest.Mock).mockReturnValue(packageJson);
            (utils.isUserLoggedIn as jest.Mock).mockResolvedValue(true);
            (utils.spawnAsync as jest.Mock).mockRejectedValue(publishError);

            await expect(handlePublish(argv)).rejects.toThrow('process.exit(1)');

            expect(logger.error).toHaveBeenCalledWith(
                'Error publishing the integration package /path/to/package:',
                publishError
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('should log package details before publishing', async () => {
            const argv = {
                package: '/path/to/package',
                registryUsername: 'testuser',
                'registry-email': 'test@example.com',
                type: 'package'
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
                type: 'package'
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
                type: 'package'
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
                type: 'package'
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

    describe('handlePublish --type image', () => {
        const imageArgv = {
            package: '/path/to/package',
            registryUsername: 'testuser',
            'registry-password': 'secret',
            type: 'image'
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
                { stdio: ['inherit', 'pipe', 'inherit'] }
            );
        });

        it('should throw if collector directory does not exist', async () => {
            (utils.pathExists as jest.Mock)
                .mockReturnValueOnce(true)   // packagePath exists
                .mockReturnValueOnce(false); // collectorPath does not

            await expect(handlePublish(imageArgv)).rejects.toThrow('Collector directory not found');
        });

        it('should throw if config.json is missing or invalid', async () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('ENOENT');
            });

            await expect(handlePublish(imageArgv)).rejects.toThrow('Failed to read config.json');
        });

        it('should throw if config.json is missing image fields', async () => {
            mockFs.readFileSync.mockReturnValue(
                JSON.stringify({ image: { registry: 'quay.io' } }) as any
            );

            await expect(handlePublish(imageArgv)).rejects.toThrow('config.json is missing required image fields');
        });

        it('should throw if container runtime login fails', async () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);
            (utils.spawnAsync as jest.Mock).mockRejectedValueOnce(new Error('unauthorized'));

            await expect(handlePublish(imageArgv)).rejects.toThrow('Failed to login to container registry');
        });

        it('should throw if container image push fails', async () => {
            mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig) as any);
            (utils.spawnAsync as jest.Mock)
                .mockResolvedValueOnce({ stdout: '', stderr: '' })  // login succeeds
                .mockRejectedValueOnce(new Error('push failed')); // push fails

            await expect(handlePublish(imageArgv)).rejects.toThrow('Failed to push container image');
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
                { stdio: ['inherit', 'pipe', 'inherit'] }
            );
        });

        it('should throw if no container runtime is available', async () => {
            (utils.detectContainerRuntime as jest.Mock).mockImplementation(() => {
                throw new Error('No container runtime detected');
            });

            await expect(handlePublish(imageArgv)).rejects.toThrow('No container runtime detected');
        });

        it('should log info when all layers already exist on registry', async () => {
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
                .mockResolvedValueOnce({ stdout: '', stderr: '' })       // login
                .mockResolvedValueOnce({ stdout: pushOutput, stderr: '' }); // push

            await handlePublish(imageArgv);

            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('The image tag "quay.io/instana-collectors/my-collector:1.0.0" is identical to the currently published image')
            );
        });

        it('should not log already-exists info when some layers are new', async () => {
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

            expect(logger.info).not.toHaveBeenCalledWith(
                expect.stringContaining('The image tag "quay.io/instana-collectors/my-collector:1.0.0" is identical to the currently published image')
            );
        });
    });
});