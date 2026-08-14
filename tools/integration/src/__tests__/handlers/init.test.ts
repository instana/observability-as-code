import * as utils from '../../utils';

import { checkbox, input } from '@inquirer/prompts';

import fs from 'fs';
import { handleInit } from '../../handlers/init';
import logger from '../../logger';
import path from 'path';

// Mock dependencies
jest.mock('@inquirer/prompts');
jest.mock('../../utils');
jest.mock('../../logger');
jest.mock('fs');
jest.mock('path');

describe('Init Handler', () => {
    let mockCwd: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockCwd = jest.spyOn(process, 'cwd').mockReturnValue('/test/dir');
        
        // Default mocks
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    });

    afterEach(() => {
        mockCwd.mockRestore();
    });

    describe('handleInit', () => {
        it('should create a new integration package with all inputs', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('@instana/test-package') // package name
                .mockResolvedValueOnce('1.0.0') // version
                .mockResolvedValueOnce('Test package description') // description
                .mockResolvedValueOnce('test, integration, instana') // keywords
                .mockResolvedValueOnce('Test Author') // author
                .mockResolvedValueOnce('MIT'); // license

            (checkbox as jest.Mock).mockResolvedValue(['dashboards', 'events']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(logger.info).toHaveBeenCalledWith('Start to generate the skeleton for the integration package: @instana/test-package');
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir/@instana/test-package', { recursive: true });
            expect(logger.info).toHaveBeenCalledWith('Created the integration package folder: /test/dir/@instana/test-package');
        });

        it('should create selected config type folders', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards', 'events', 'entities', 'smart-alerts']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir/test-package/dashboards', { recursive: true });
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir/test-package/events', { recursive: true });
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir/test-package/entities', { recursive: true });
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir/test-package/smart-alerts', { recursive: true });
        });

        it('should create package.json with correct structure', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('my-package')
                .mockResolvedValueOnce('2.0.0')
                .mockResolvedValueOnce('My package description')
                .mockResolvedValueOnce('keyword1, keyword2')
                .mockResolvedValueOnce('John Doe')
                .mockResolvedValueOnce('Apache-2.0');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            expect(writeCall[0]).toBe('/test/dir/my-package/package.json');
            
            const packageJson = JSON.parse(writeCall[1]);
            expect(packageJson).toEqual({
                name: 'my-package',
                version: '2.0.0',
                description: 'My package description',
                keywords: ['keyword1', 'keyword2'],
                author: 'John Doe',
                license: 'Apache-2.0',
                scripts: {},
                publishConfig: {
                    access: 'public'
                }
            });
        });

        it('should not include keywords if none provided', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('') // empty keywords
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const packageJson = JSON.parse(writeCall[1]);
            expect(packageJson.keywords).toBeUndefined();
        });

        it('should trim and filter keywords', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('  keyword1  ,  , keyword2 , ') // keywords with spaces and empty
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const packageJson = JSON.parse(writeCall[1]);
            expect(packageJson.keywords).toEqual(['keyword1', 'keyword2']);
        });

        it('should use default version 1.0.0', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0') // default version
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const packageJson = JSON.parse(writeCall[1]);
            expect(packageJson.version).toBe('1.0.0');
        });

        it('should use default license MIT', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT'); // default license

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const packageJson = JSON.parse(writeCall[1]);
            expect(packageJson.license).toBe('MIT');
        });

        it('should call generateReadme with correct parameters', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards', 'events']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(utils.generateReadme).toHaveBeenCalledWith(
                '/test/dir/test-package',
                'test-package',
                ['dashboards', 'events']
            );
        });

        it('should call printDirectoryTree with correct parameters', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(utils.printDirectoryTree).toHaveBeenCalledWith(
                '/test/dir/test-package',
                'test-package'
            );
        });

        it('should log all creation steps', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(logger.info).toHaveBeenCalledWith('Start to generate the skeleton for the integration package: test-package');
            expect(logger.info).toHaveBeenCalledWith('Created the integration package folder: /test/dir/test-package');
            expect(logger.info).toHaveBeenCalledWith('Created the integration package sub-folder: /test/dir/test-package/dashboards');
            expect(logger.info).toHaveBeenCalledWith('Created the package.json file');
            expect(logger.info).toHaveBeenCalledWith('Initialized new integration package at /test/dir/test-package');
            expect(logger.info).toHaveBeenCalledWith('The following contents are created:');
        });

        it('should handle scoped package names', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('@myorg/my-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir/@myorg/my-package', { recursive: true });
            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const packageJson = JSON.parse(writeCall[1]);
            expect(packageJson.name).toBe('@myorg/my-package');
        });

        it('should create package.json with proper formatting', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const jsonString = writeCall[1];
            
            // Verify it's properly formatted with 2-space indentation
            expect(jsonString).toContain('\n');
            expect(jsonString).toMatch(/"name":\s+"test-package"/);
        });

        it('should set publishConfig.access to public', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
            const packageJson = JSON.parse(writeCall[1]);
            expect(packageJson.publishConfig).toEqual({ access: 'public' });
        });

        it('should call generateCollectorFiles when collector is selected', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards', 'collector']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.generateCollectorFiles as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(utils.generateCollectorFiles).toHaveBeenCalledWith(
                '/test/dir/test-package',
                'test-package',
                ['dashboards', 'collector']
            );
        });

        it('should not call generateCollectorFiles when collector is not selected', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['dashboards', 'events']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.generateCollectorFiles as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(utils.generateCollectorFiles).not.toHaveBeenCalled();
        });

        it('should create collector folder when collector is selected', async () => {
            (input as jest.Mock)
                .mockResolvedValueOnce('test-package')
                .mockResolvedValueOnce('1.0.0')
                .mockResolvedValueOnce('Description')
                .mockResolvedValueOnce('')
                .mockResolvedValueOnce('Author')
                .mockResolvedValueOnce('MIT');

            (checkbox as jest.Mock).mockResolvedValue(['collector']);
            (utils.generateReadme as jest.Mock).mockImplementation(() => {});
            (utils.generateCollectorFiles as jest.Mock).mockImplementation(() => {});
            (utils.printDirectoryTree as jest.Mock).mockImplementation(() => {});

            await handleInit();

            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir/test-package/collector', { recursive: true });
            expect(logger.info).toHaveBeenCalledWith('Created the integration package sub-folder: /test/dir/test-package/collector');
        });
    });
});
