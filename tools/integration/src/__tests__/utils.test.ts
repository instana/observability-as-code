import * as child_process from 'child_process';
import * as utils from '../utils';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import fs from 'fs';
import logger from '../logger';
import path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('../logger');
jest.mock('child_process');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedExecSync = child_process.execSync as jest.MockedFunction<typeof child_process.execSync>;

describe('Utils Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sanitizeFileName', () => {
        it('should sanitize file names with special characters', () => {
            expect(utils.sanitizeFileName('My File@Name#123')).toBe('my_file_name_123');
        });

        it('should convert to lowercase', () => {
            expect(utils.sanitizeFileName('UPPERCASE')).toBe('uppercase');
        });

        it('should handle empty strings', () => {
            expect(utils.sanitizeFileName('')).toBe('untitled');
        });

        it('should preserve hyphens and underscores', () => {
            expect(utils.sanitizeFileName('my-file_name')).toBe('my-file_name');
        });

        it('should handle spaces', () => {
            expect(utils.sanitizeFileName('my file name')).toBe('my_file_name');
        });

        it('should handle special characters', () => {
            expect(utils.sanitizeFileName('file!@#$%^&*()name')).toBe('file__________name');
        });

        it('should handle null input', () => {
            expect(utils.sanitizeFileName(null as any)).toBe('untitled');
        });

        it('should handle undefined input', () => {
            expect(utils.sanitizeFileName(undefined as any)).toBe('untitled');
        });
    });

    describe('getValueByKeyFromArray', () => {
        it('should extract value from key=value pair', () => {
            const array = ['name=test', 'type=dashboard', 'id=123'];
            expect(utils.getValueByKeyFromArray(array, 'name')).toBe('test');
            expect(utils.getValueByKeyFromArray(array, 'type')).toBe('dashboard');
            expect(utils.getValueByKeyFromArray(array, 'id')).toBe('123');
        });

        it('should return undefined for non-existent key', () => {
            const array = ['name=test', 'type=dashboard'];
            expect(utils.getValueByKeyFromArray(array, 'missing')).toBeUndefined();
        });

        it('should handle empty array', () => {
            expect(utils.getValueByKeyFromArray([], 'key')).toBeUndefined();
        });

        it('should handle values with equals signs', () => {
            const array = ['url=http://example.com?param=value'];
            expect(utils.getValueByKeyFromArray(array, 'url')).toBe('http://example.com?param=value');
        });
    });

    describe('parseIncludeItem', () => {
        it('should parse space-separated items', () => {
            expect(utils.parseIncludeItem('item1 item2 item3')).toEqual(['item1', 'item2', 'item3']);
        });

        it('should handle quoted strings with spaces', () => {
            expect(utils.parseIncludeItem('item1 "item with spaces" item3')).toEqual([
                'item1',
                'item with spaces',
                'item3',
            ]);
        });

        it('should handle empty string', () => {
            expect(utils.parseIncludeItem('')).toEqual([]);
        });

        it('should handle single item', () => {
            expect(utils.parseIncludeItem('single')).toEqual(['single']);
        });

        it('should handle multiple spaces', () => {
            expect(utils.parseIncludeItem('item1    item2')).toEqual(['item1', 'item2']);
        });

        it('should handle nested quotes', () => {
            expect(utils.parseIncludeItem('"quoted item" normal')).toEqual(['quoted item', 'normal']);
        });
    });

    describe('sanitizeTitles', () => {
        it('should sanitize titles and handle duplicates', () => {
            const objects = [
                { id: '1', title: 'Test Dashboard' },
                { id: '2', title: 'Test Dashboard' },
                { id: '3', title: 'Another Dashboard' },
            ];

            const result = utils.sanitizeTitles(objects, 'dashboard');
            expect(result[0].title).toBe('test_dashboard');
            expect(result[1].title).toBe('test_dashboard_2');
            expect(result[2].title).toBe('another_dashboard');
        });

        it('should use fallback when title is missing', () => {
            const objects = [{ id: '123', name: 'MyName' }];
            const result = utils.sanitizeTitles(objects, 'dashboard');
            expect(result[0]).toHaveProperty('title', 'myname');
        });

        it('should use id-based fallback when both title and name are missing', () => {
            const objects = [{ id: '123' }];
            const result = utils.sanitizeTitles(objects, 'dashboard');
            expect(result[0]).toHaveProperty('title', 'dashboard-123');
        });

        it('should handle empty array', () => {
            const result = utils.sanitizeTitles([], 'dashboard');
            expect(result).toEqual([]);
        });

        it('should handle multiple duplicates', () => {
            const objects = [
                { id: '1', title: 'Same' },
                { id: '2', title: 'Same' },
                { id: '3', title: 'Same' },
                { id: '4', title: 'Same' },
            ];

            const result = utils.sanitizeTitles(objects, 'item');
            expect(result[0].title).toBe('same');
            expect(result[1].title).toBe('same_2');
            expect(result[2].title).toBe('same_3');
            expect(result[3].title).toBe('same_4');
        });
    });

    describe('isPrivatePackage', () => {
        it('should return true for private packages', () => {
            expect(utils.isPrivatePackage({ private: true })).toBe(true);
        });

        it('should return false for public packages', () => {
            expect(utils.isPrivatePackage({ private: false })).toBe(false);
        });

        it('should return false when private field is missing', () => {
            expect(utils.isPrivatePackage({})).toBe(false);
        });

        it('should return false for non-boolean private values', () => {
            expect(utils.isPrivatePackage({ private: 'true' })).toBe(false);
            expect(utils.isPrivatePackage({ private: 1 })).toBe(false);
        });
    });

    describe('pathExists', () => {
        it('should return true when path exists', () => {
            mockedFs.existsSync.mockReturnValue(true);
            expect(utils.pathExists('/test/path')).toBe(true);
        });

        it('should return false when path does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false);
            expect(utils.pathExists('/test/path')).toBe(false);
        });

        it('should return false when fs.existsSync throws error', () => {
            mockedFs.existsSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });
            expect(utils.pathExists('/test/path')).toBe(false);
        });
    });

    describe('readPackageJson', () => {
        it('should read and parse valid package.json', () => {
            const packageData = { name: 'test-package', version: '1.0.0' };
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(packageData));

            const result = utils.readPackageJson('/test/path');
            expect(result).toEqual(packageData);
        });

        it('should return null for invalid JSON', () => {
            mockedFs.readFileSync.mockReturnValue('invalid json');

            const result = utils.readPackageJson('/test/path');
            expect(result).toBeNull();
        });

        it('should return null when file does not exist', () => {
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            const result = utils.readPackageJson('/test/path');
            expect(result).toBeNull();
        });
    });

    describe('readReadmeFile', () => {
        it('should read README.md when it exists', () => {
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue('# README content');

            const result = utils.readReadmeFile('/test/path');
            expect(result).toBe('# README content');
        });

        it('should return null when README.md does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false);

            const result = utils.readReadmeFile('/test/path');
            expect(result).toBeNull();
        });

        it('should return null when read fails', () => {
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('Read error');
            });

            const result = utils.readReadmeFile('/test/path');
            expect(result).toBeNull();
        });
    });

    describe('isUserLoggedIn', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should return true when npmrc contains auth token', async () => {
            process.env.HOME = '/home/user';
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue('//registry.npmjs.org/:_authToken=test-token');

            const result = await utils.isUserLoggedIn();
            expect(result).toBe(true);
        });

        it('should return false when npmrc does not contain auth token', async () => {
            process.env.HOME = '/home/user';
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue('some other content');

            const result = await utils.isUserLoggedIn();
            expect(result).toBe(false);
        });

        it('should return false when npmrc does not exist', async () => {
            process.env.HOME = '/home/user';
            mockedFs.existsSync.mockReturnValue(false);

            const result = await utils.isUserLoggedIn();
            expect(result).toBe(false);
        });
    });

    describe('parseIncludesFromArgv', () => {
        it('should parse include with explicit type and conditions', () => {
            const argv = ['--include', 'type=dashboard', 'name=test'];
            const result = utils.parseIncludesFromArgv(argv);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('dashboard');
            expect(result[0].conditions).toEqual(['name=test']);
            expect(result[0].explicitlyTyped).toBe(true);
        });

        it('should parse include without type (defaults to all)', () => {
            const argv = ['--include', 'name=test'];
            const result = utils.parseIncludesFromArgv(argv);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('all');
            expect(result[0].conditions).toEqual(['name=test']);
            expect(result[0].explicitlyTyped).toBe(false);
        });

        it('should parse multiple include clauses', () => {
            const argv = ['--include', 'type=dashboard', '--include', 'type=event'];
            const result = utils.parseIncludesFromArgv(argv);

            expect(result).toHaveLength(2);
            expect(result[0].type).toBe('dashboard');
            expect(result[1].type).toBe('event');
        });

        it('should handle empty conditions', () => {
            const argv = ['--include', 'type=dashboard'];
            const result = utils.parseIncludesFromArgv(argv);

            expect(result[0].conditions).toEqual([]);
        });

        it('should default to all when no includes provided', () => {
            const argv = ['other', 'args'];
            const result = utils.parseIncludesFromArgv(argv);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('all');
            expect(result[0].conditions).toEqual([]);
            expect(result[0].explicitlyTyped).toBe(false);
        });

        it('should parse multiple conditions for single include', () => {
            const argv = ['--include', 'type=dashboard', 'title=test', 'id=123'];
            const result = utils.parseIncludesFromArgv(argv);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('dashboard');
            expect(result[0].conditions).toEqual(['title=test', 'id=123']);
            expect(result[0].explicitlyTyped).toBe(true);
        });

        it('should stop collecting tokens at next flag', () => {
            const argv = ['--include', 'type=dashboard', 'title=test', '--server', 'example.com'];
            const result = utils.parseIncludesFromArgv(argv);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('dashboard');
            expect(result[0].conditions).toEqual(['title=test']);
        });

        it('should handle -F alias', () => {
            const argv = ['-F', 'type=event', 'name=test'];
            const result = utils.parseIncludesFromArgv(argv);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('event');
            expect(result[0].conditions).toEqual(['name=test']);
        });
    });

    describe('printDirectoryTree', () => {
        it('should print directory tree structure', () => {
            mockedFs.readdirSync
                .mockReturnValueOnce(['file1.txt', 'subdir'] as any)
                .mockReturnValueOnce([]);
            mockedFs.statSync
                .mockReturnValueOnce({ isDirectory: () => false } as any)
                .mockReturnValueOnce({ isDirectory: () => true } as any);

            // Just verify it doesn't throw
            expect(() => utils.printDirectoryTree('/test', 'root')).not.toThrow();
        });
    });

    describe('generateReadme', () => {
        it('should generate README with dashboards section', () => {
            utils.generateReadme('/test/path', '@instana-integration/test', ['dashboards']);

            expect(mockedFs.writeFileSync).toHaveBeenCalled();
            const content = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(content).toContain('# @instana-integration/test');
            expect(content).toContain('## Dashboards');
        });

        it('should generate README with events section', () => {
            utils.generateReadme('/test/path', '@instana-integration/test', ['events']);

            const content = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(content).toContain('## Events');
        });

        it('should generate README with entities section', () => {
            utils.generateReadme('/test/path', '@instana-integration/test', ['entities']);

            const content = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(content).toContain('## Entities');
        });

		it('should generate README with smart-alerts section', () => {
			utils.generateReadme('/test/path', '@instana-integration/test', ['smart-alerts']);

		    const content = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
		    expect(content).toContain('## Smart Alerts');
		 });

		 it('should generate README with all sections', () => {
		 	utils.generateReadme('/test/path', '@instana-integration/test', ['dashboards', 'events', 'entities', 'smart-alerts']);

            const content = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
            expect(content).toContain('## Dashboards');
            expect(content).toContain('## Events');
            expect(content).toContain('## Entities');
            expect(content).toContain('## Metrics');
            expect(content).toContain('## Smart Alerts');
            expect(content).toContain('## Installation and Usage');
        });
    });

    describe('filterElementsBy', () => {
        it('should filter by title', () => {
            const objects = [
                { id: '1', title: 'Production Dashboard', ownerId: 'user1', annotations: [] },
                { id: '2', title: 'Test Dashboard', ownerId: 'user1', annotations: [] },
                { id: '3', title: 'Development Dashboard', ownerId: 'user2', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['title=Production']);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        it('should filter by name', () => {
            const objects = [
                { id: '1', name: 'Critical Alert', ownerId: 'user1', annotations: [] },
                { id: '2', name: 'Warning Alert', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['name=Critical']);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        it('should filter by label in data object', () => {
            const objects = [
                { id: '1', data: { label: 'Database Entity' } },
                { id: '2', data: { label: 'Service Entity' } }
            ];

            const result = utils.filterElementsBy(objects, ['label=Database']);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        it('should filter by ownerId', () => {
            const objects = [
                { id: '1', title: 'Dashboard 1', ownerId: 'user1', annotations: [] },
                { id: '2', title: 'Dashboard 2', ownerId: 'user2', annotations: [] },
                { id: '3', title: 'Dashboard 3', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['ownerid=user1']);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('1');
            expect(result[1].id).toBe('3');
        });

        it('should filter by annotation', () => {
            const objects = [
                { id: '1', title: 'Dashboard 1', ownerId: 'user1', annotations: ['prod', 'critical'] },
                { id: '2', title: 'Dashboard 2', ownerId: 'user1', annotations: ['dev'] },
                { id: '3', title: 'Dashboard 3', ownerId: 'user1', annotations: ['prod'] }
            ];

            const result = utils.filterElementsBy(objects, ['annotation=prod']);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('1');
            expect(result[1].id).toBe('3');
        });

        it('should filter by id', () => {
            const objects = [
                { id: 'dash-1', title: 'Dashboard 1', ownerId: 'user1', annotations: [] },
                { id: 'dash-2', title: 'Dashboard 2', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['id=dash-1']);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('dash-1');
        });

        it('should handle multiple conditions (AND logic)', () => {
            const objects = [
                { id: '1', title: 'Production Dashboard', ownerId: 'user1', annotations: ['prod'] },
                { id: '2', title: 'Production Alert', ownerId: 'user2', annotations: ['prod'] },
                { id: '3', title: 'Test Dashboard', ownerId: 'user1', annotations: ['test'] }
            ];

            const result = utils.filterElementsBy(objects, ['title=Production', 'ownerid=user1']);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        it('should handle case-insensitive matching', () => {
            const objects = [
                { id: '1', title: 'PRODUCTION Dashboard', ownerId: 'user1', annotations: [] },
                { id: '2', title: 'production alert', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['title=production']);
            expect(result).toHaveLength(2);
        });

        it('should handle quoted values', () => {
            const objects = [
                { id: '1', title: 'My Dashboard', ownerId: 'user1', annotations: [] },
                { id: '2', title: 'Your Dashboard', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['title="My Dashboard"']);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        it('should return empty array when no matches', () => {
            const objects = [
                { id: '1', title: 'Dashboard 1', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['title=NonExistent']);
            expect(result).toHaveLength(0);
        });

        it('should return all objects when no conditions', () => {
            const objects = [
                { id: '1', title: 'Dashboard 1', ownerId: 'user1', annotations: [] },
                { id: '2', title: 'Dashboard 2', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, []);
            expect(result).toHaveLength(2);
        });

        it('should handle objects with missing properties', () => {
            const objects = [
                { id: '1', ownerId: 'user1', annotations: [] },
                { id: '2', title: 'Dashboard 2', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['title=Dashboard']);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('2');
        });

        it('should match title, name, or label with same condition', () => {
            const objects = [
                { id: '1', title: 'Test Item', ownerId: 'user1', annotations: [] },
                { id: '2', name: 'Test Item', ownerId: 'user1', annotations: [] },
                { id: '3', data: { label: 'Test Item' } }
            ];

            const result = utils.filterElementsBy(objects, ['title=Test']);
            expect(result).toHaveLength(3);
        });

        it('should handle empty objects array', () => {
            const result = utils.filterElementsBy([], ['title=test']);
            expect(result).toHaveLength(0);
        });

        it('should handle unknown filter keys', () => {
            const objects = [
                { id: '1', title: 'Dashboard 1', ownerId: 'user1', annotations: [] }
            ];

            const result = utils.filterElementsBy(objects, ['unknown=value']);
            expect(result).toHaveLength(0);
        });

    describe('generateCollectorFiles', () => {
        beforeEach(() => {
            // Mock fs.readFileSync to return template content
            (mockedFs.readFileSync as jest.Mock).mockImplementation((filePath: any) => {
                if (filePath.includes('Containerfile')) {
                    return 'FROM python:3.9\nCOPY {{COLLECTOR_NAME}}_collector.py /app/';
                }
                if (filePath.includes('collector.py')) {
                    return 'print("{{COLLECTOR_NAME}} collector")';
                }
                if (filePath.includes('requirements.txt')) {
                    return 'requests==2.28.0';
                }
                if (filePath.includes('config.json')) {
                    return '{"extension_id": "{{PACKAGE_NAME}}"}';
                }
                return '';
            });
            
            // Mock fs.mkdirSync
            (mockedFs.mkdirSync as jest.Mock).mockImplementation(() => {});
        });

        it('should create all 4 collector files with content', () => {
            const packagePath = '/test/package';
            const packageName = '@instana-integration/test';
            const configTypes = ['collector'];

            utils.generateCollectorFiles(packagePath, packageName, configTypes);

            // Verify all 4 files were created with some content
            expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(4);
            
            const calls = (mockedFs.writeFileSync as jest.Mock).mock.calls;
            calls.forEach((call: any) => {
                expect(call[1]).toBeTruthy(); // Has content
                expect(call[1].length).toBeGreaterThan(0); // Content is not empty
            });
        });

        it('should create Containerfile', () => {
            utils.generateCollectorFiles('/test/package', '@instana-integration/test', ['collector']);

            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('Containerfile'),
                expect.any(String)
            );
        });

        it('should create Python collector file with normalized name', () => {
            utils.generateCollectorFiles('/test/package', '@instana-integration/my-test', ['collector']);

            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('my-test_collector.py'),
                expect.any(String)
            );
        });

        it('should create requirements.txt', () => {
            utils.generateCollectorFiles('/test/package', '@instana-integration/test', ['collector']);

            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('requirements.txt'),
                expect.any(String)
            );
        });

        it('should create config.json under collector/config', () => {
            utils.generateCollectorFiles('/test/package', '@instana-integration/test', ['collector']);

            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('collector/config/config.json'),
                expect.any(String)
            );
        });

        it('should normalize package name by replacing slashes with underscores', () => {
            utils.generateCollectorFiles('/test/package', '@instana-integration/sub/package/name', ['collector']);

            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('sub_package_name_collector.py'),
                expect.any(String)
            );
        });

        it('should handle package names without @instana-integration prefix', () => {
            utils.generateCollectorFiles('/test/package', 'custom-package', ['collector']);

            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('custom-package_collector.py'),
                expect.any(String)
            );
        });

        it('should replace {{PACKAGE_NAME}} placeholder in config.json', () => {
            const packageName = '@instana-integration/my-test';
            utils.generateCollectorFiles('/test/package', packageName, ['collector']);

            // Find the config.json write call
            const calls = (mockedFs.writeFileSync as jest.Mock).mock.calls;
            const configCall = calls.find((call: any) => call[0].includes('collector/config/config.json'));
            
            expect(configCall).toBeDefined();
            if (configCall) {
                expect(configCall[1]).toContain('my-test');
                expect(configCall[1]).not.toContain('{{PACKAGE_NAME}}');
            }
        });

        it('should replace {{COLLECTOR_NAME}} placeholder in collector.py', () => {
            const packageName = '@instana-integration/my-test';
            utils.generateCollectorFiles('/test/package', packageName, ['collector']);

            const calls = (mockedFs.writeFileSync as jest.Mock).mock.calls;
            const collectorCall = calls.find((call: any) => call[0].includes('my-test_collector.py'));

            expect(collectorCall).toBeDefined();
            if (collectorCall) {
                expect(collectorCall[1]).toContain('my-test');
                expect(collectorCall[1]).not.toContain('{{COLLECTOR_NAME}}');
            }
        });
    });
    });

    describe('detectContainerRuntime', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return docker when docker is available', () => {
            mockedExecSync.mockReturnValue(Buffer.from('Docker version 20.10.0'));

            const result = utils.detectContainerRuntime();

            expect(result).toBe('docker');
            expect(mockedExecSync).toHaveBeenCalledWith('docker version', expect.objectContaining({ stdio: 'pipe' }));
        });

        it('should return podman when docker is not available but podman is', () => {
            mockedExecSync
                .mockImplementationOnce(() => { throw new Error('docker not found'); })
                .mockReturnValueOnce(Buffer.from('podman version 4.0.0'));

            const result = utils.detectContainerRuntime();

            expect(result).toBe('podman');
            expect(mockedExecSync).toHaveBeenCalledWith('docker version', expect.any(Object));
            expect(mockedExecSync).toHaveBeenCalledWith('podman version', expect.any(Object));
        });

        it('should throw when neither docker nor podman is available', () => {
            mockedExecSync.mockImplementation(() => { throw new Error('command not found'); });

            expect(() => utils.detectContainerRuntime()).toThrow('No container runtime detected');
        });

        it('should prefer docker over podman when both are available', () => {
            mockedExecSync.mockReturnValue(Buffer.from('Docker version 20.10.0'));

            const result = utils.detectContainerRuntime();

            expect(result).toBe('docker');
            // Should not have tried podman
            expect(mockedExecSync).toHaveBeenCalledTimes(1);
        });

        it('should include install instructions in the error message', () => {
            mockedExecSync.mockImplementation(() => { throw new Error('command not found'); });

            expect(() => utils.detectContainerRuntime()).toThrow('Docker: https://docs.docker.com/get-docker/');
        });
    });
});
