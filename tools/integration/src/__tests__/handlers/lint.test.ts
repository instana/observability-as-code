import * as utils from '../../utils';
import * as validators from '../../validators';

import fs from 'fs';
import { handleLint } from '../../handlers/lint';
import logger from '../../logger';
import path from 'path';

// Mock dependencies
jest.mock('../../utils');
jest.mock('../../validators');
jest.mock('../../logger');
jest.mock('fs');
jest.mock('path');

describe('Lint Handler', () => {
    let mockExit: jest.SpyInstance;
    let mockConsoleLog: jest.SpyInstance;
    let mockCwd: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockExit = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
            throw new Error(`process.exit(${code})`);
        }) as any);
        
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
        mockCwd = jest.spyOn(process, 'cwd').mockReturnValue('/test/package');
        
        // Default mocks
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        (fs.existsSync as jest.Mock).mockReturnValue(false);
    });

    afterEach(() => {
        mockExit.mockRestore();
        mockConsoleLog.mockRestore();
        mockCwd.mockRestore();
    });

    describe('handleLint', () => {
        it('should skip linting for private packages', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'private-package', private: true };

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(true);

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(mockConsoleLog).toHaveBeenCalledWith('Skipping linting for package: private-package');
            expect(mockExit).toHaveBeenCalledWith(0);
        });

        it('should fail when README is missing', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(null);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);

            await expect(handleLint(argv)).rejects.toThrow('process.exit(-1)');

            expect(logger.error).toHaveBeenCalledWith('Linting failed.');
            expect(mockExit).toHaveBeenCalledWith(-1);
        });

        it('should successfully lint a valid package', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test Package\n## Installation\n## Usage';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(logger.info).toHaveBeenCalledWith('Linting completed successfully.');
            expect(mockExit).toHaveBeenCalledWith(0);
        });

        it('should validate entities when entities folder exists', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (validators.getEntityDashboardRefs as jest.Mock).mockReturnValue(new Set(['dash1']));
            (validators.validateEntityFiles as jest.Mock).mockImplementation(() => {});
            
            (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
                return p.includes('entities');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(validators.getEntityDashboardRefs).toHaveBeenCalled();
            expect(validators.validateEntityFiles).toHaveBeenCalled();
        });

        it('should validate dashboards when dashboards folder exists', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (validators.validateDashboardFiles as jest.Mock).mockImplementation(() => {});
            
            (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
                return p.includes('dashboards');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(validators.validateDashboardFiles).toHaveBeenCalled();
        });

        it('should validate events when events folder exists', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (validators.validateEventFiles as jest.Mock).mockImplementation(() => {});
            
            (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
                return p.includes('events');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(validators.validateEventFiles).toHaveBeenCalled();
        });

        it('should validate smart-alerts when folder exists', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (validators.validateSmartAlertFiles as jest.Mock).mockImplementation(() => {});
            
            (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
                return p.includes('smart-alerts');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(validators.validateSmartAlertFiles).toHaveBeenCalled();
        });

        it('should log info when no smart-alerts folder found', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(logger.info).toHaveBeenCalledWith('No smart alerts folder found for this package.');
        });

        it('should log info when no entities folder found', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(logger.info).toHaveBeenCalledWith('No entities folder found for this package.');
            expect(logger.info).toHaveBeenCalledWith('No dashboards folder found for this package.');
            expect(logger.info).toHaveBeenCalledWith('No events folder found for this package.');
        });

        it('should enable strict mode when flag is set', async () => {
            const argv = { debug: false, 'strict-mode': true };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(validators.validatePackageJson).toHaveBeenCalledWith(
                packageData,
                expect.any(Array),
                expect.any(Array),
                expect.any(Array),
                true
            );
        });

        it('should log success messages in debug mode', async () => {
            const argv = { debug: true, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation((content, name, dir, errors, warnings, success) => {
                success.push('README validated successfully');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(logger.info).toHaveBeenCalledWith('README validated successfully');
        });

        it('should log warnings in debug mode', async () => {
            const argv = { debug: true, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation((content, name, dir, errors, warnings) => {
                warnings.push('Missing optional section');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(logger.warn).toHaveBeenCalledWith('Warnings encountered during linting:');
            expect(logger.warn).toHaveBeenCalledWith('Missing optional section');
        });

        it('should log errors in debug mode', async () => {
            const argv = { debug: true, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation((content, name, dir, errors) => {
                errors.push('Critical error found');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(-1)');

            expect(logger.error).toHaveBeenCalledWith('Linting failed with the following errors:');
            expect(logger.error).toHaveBeenCalledWith('Critical error found');
        });

        it('should handle README validation errors', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {
                throw new Error('README validation failed');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(-1)');

            expect(logger.error).toHaveBeenCalledWith('Linting failed.');
        });

        it('should handle non-Error exceptions in README validation', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {
                throw 'String error';
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(-1)');

            expect(logger.error).toHaveBeenCalledWith('Linting failed.');
        });

        it('should handle validation exceptions', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (validators.validatePackageJson as jest.Mock).mockRejectedValue(new Error('Validation error'));

            await expect(handleLint(argv)).rejects.toThrow('process.exit(-1)');

            expect(logger.error).toHaveBeenCalledWith('Linting failed.');
        });

        it('should validate all folders when they all exist', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (validators.getEntityDashboardRefs as jest.Mock).mockReturnValue(new Set());
            (validators.validateEntityFiles as jest.Mock).mockImplementation(() => {});
            (validators.validateDashboardFiles as jest.Mock).mockImplementation(() => {});
            (validators.validateEventFiles as jest.Mock).mockImplementation(() => {});
            (validators.validateSmartAlertFiles as jest.Mock).mockImplementation(() => {});
            (validators.validateCollectorFiles as jest.Mock).mockImplementation(() => {});
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(validators.validateEntityFiles).toHaveBeenCalled();
            expect(validators.validateDashboardFiles).toHaveBeenCalled();
            expect(validators.validateEventFiles).toHaveBeenCalled();
            expect(validators.validateSmartAlertFiles).toHaveBeenCalled();
            expect(validators.validateCollectorFiles).toHaveBeenCalled();
        });

        it('should validate collector when collector folder exists', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (validators.validateCollectorFiles as jest.Mock).mockImplementation(() => {});
            (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
                return path.includes('collector');
            });

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(validators.validateCollectorFiles).toHaveBeenCalledWith(
                '/test/package/collector',
                '/test/package/collector/config',
                expect.any(Array),
                expect.any(Array),
                expect.any(Array)
            );
        });

        it('should log info when no collector folder found', async () => {
            const argv = { debug: false, 'strict-mode': false };
            const packageData = { name: 'test-package', private: false };
            const readmeContent = '# Test';

            (utils.readPackageJson as jest.Mock).mockReturnValue(packageData);
            (utils.isPrivatePackage as jest.Mock).mockReturnValue(false);
            (utils.readReadmeFile as jest.Mock).mockReturnValue(readmeContent);
            (validators.validatePackageJson as jest.Mock).mockResolvedValue(undefined);
            (validators.validateReadmeContent as jest.Mock).mockImplementation(() => {});
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await expect(handleLint(argv)).rejects.toThrow('process.exit(0)');

            expect(logger.info).toHaveBeenCalledWith('No collector folder found for this package.');
        });
    });
});