import * as utils from '../../utils';
import * as validators from '../../validators';

import axios from 'axios';
import fs from 'fs';
import { handleExport } from '../../handlers/export';
import logger from '../../logger';
import path from 'path';

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('../../logger');
jest.mock('../../utils');
jest.mock('../../validators');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedUtils = utils as jest.Mocked<typeof utils>;
const mockedValidators = validators as jest.Mocked<typeof validators>;

describe('handleExport', () => {
    let mockAxiosInstance: any;
    let mockProcessExit: jest.SpyInstance;
    let mockFilterElementsBy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock filterElementsBy - default implementation returns all items when no conditions
        mockFilterElementsBy = jest.spyOn(utils, 'filterElementsBy').mockImplementation((items, conditions) => {
            if (conditions.length === 0) return items;
            return [];
        });
        
        // Mock axios.create to return a mock instance
        mockAxiosInstance = {
            get: jest.fn()
        };
        mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
        (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(false);
        
        // Mock logger methods
        mockedLogger.level = 'info';
        mockedLogger.info = jest.fn();
        mockedLogger.warn = jest.fn();
        mockedLogger.error = jest.fn();
        mockedLogger.debug = jest.fn();
        mockedLogger.isDebugEnabled = jest.fn().mockReturnValue(false);
        
        // Mock process.exit
        mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
            throw new Error(`process.exit(${code})`);
        }) as any);
        
        // Mock process.argv for parseIncludesFromArgv
        process.argv = ['node', 'script.js', 'export'];
    });

    afterEach(() => {
        mockProcessExit.mockRestore();
        mockFilterElementsBy.mockRestore();
    });

    describe('Include Type Validation', () => {
        it('should reject invalid include type "dashboards"', async () => {
            process.argv = ['node', 'script.js', 'export', '--include', 'type=dashboards'];
            
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedValidators.validateServerAddress = jest.fn();
            mockedValidators.validateIncludeTypes = jest.fn().mockImplementation(() => {
                throw new Error('Invalid --include type value(s): "dashboards". Valid types are: "dashboard", "event", "entity", "smart-alert", "all"');
            });

            await expect(handleExport(argv)).rejects.toThrow('process.exit(1)');
            expect(mockedLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Invalid --include type value(s): "dashboards"')
            );
        });

        it('should reject invalid include type "events"', async () => {
            process.argv = ['node', 'script.js', 'export', '--include', 'type=events'];
            
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedValidators.validateServerAddress = jest.fn();
            mockedValidators.validateIncludeTypes = jest.fn().mockImplementation(() => {
                throw new Error('Invalid --include type value(s): "events". Valid types are: "dashboard", "event", "entity", "smart-alert", "all"');
            });

            await expect(handleExport(argv)).rejects.toThrow('process.exit(1)');
            expect(mockedLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Invalid --include type value(s): "events"')
            );
        });

        it('should accept valid include type "dashboard"', async () => {
            process.argv = ['node', 'script.js', 'export', '--include', 'type=dashboard'];
            
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedValidators.validateServerAddress = jest.fn();
            mockedValidators.validateIncludeTypes = jest.fn();
            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.readdirSync = jest.fn().mockReturnValue([]);
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'dashboard', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([]);
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            expect(mockedValidators.validateIncludeTypes).toHaveBeenCalled();
        });
    });

    describe('Server Validation', () => {
        it('should reject server address with https:// protocol', async () => {
            const argv = {
                server: 'https://test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedValidators.validateServerAddress = jest.fn().mockImplementation(() => {
                throw new Error('Invalid server address: Do not include protocol (http:// or https://). Please use only the hostname, e.g., "example.com" instead of "https://test-server.com"');
            });

            await expect(handleExport(argv)).rejects.toThrow('process.exit(1)');
            expect(mockedLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Invalid server address: Do not include protocol')
            );
        });

        it('should reject server address with http:// protocol', async () => {
            const argv = {
                server: 'http://test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedValidators.validateServerAddress = jest.fn().mockImplementation(() => {
                throw new Error('Invalid server address: Do not include protocol (http:// or https://). Please use only the hostname, e.g., "example.com" instead of "http://test-server.com"');
            });

            await expect(handleExport(argv)).rejects.toThrow('process.exit(1)');
            expect(mockedLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Invalid server address: Do not include protocol')
            );
        });

        it('should accept valid server address without protocol', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedValidators.validateServerAddress = jest.fn();
            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.readdirSync = jest.fn().mockReturnValue([]);
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'all', conditions: [], explicitlyTyped: false }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([]);
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            expect(mockedValidators.validateServerAddress).toHaveBeenCalledWith('test-server.com');
        });
    });

    describe('Directory Validation', () => {
        it('should create export directory if it does not exist', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.readdirSync = jest.fn().mockReturnValue([]);
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'all', conditions: [], explicitlyTyped: false }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([]);
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/test/export', { recursive: true });
        });

        it('should exit if export folders contain JSON files', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedFs.readdirSync = jest.fn().mockReturnValue(['file.json']);

            await expect(handleExport(argv)).rejects.toThrow('process.exit(1)');
            expect(mockedLogger.error).toHaveBeenCalledWith('Cannot export: folder contains existing JSON files.');
        });

        it('should ignore hidden files like .DS_Store', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedFs.readdirSync = jest.fn().mockReturnValue(['.DS_Store', '.gitkeep']);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'all', conditions: [], explicitlyTyped: false }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([]);
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            // Should not error on hidden files
            expect(mockedLogger.error).not.toHaveBeenCalledWith(expect.stringContaining('Cannot export'));
        });

        it('should allow non-JSON files but warn about JSON files', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedFs.readdirSync = jest.fn().mockReturnValue(['.DS_Store', 'README.md', 'dashboard.json']);

            await expect(handleExport(argv)).rejects.toThrow('process.exit(1)');
            expect(mockedLogger.error).toHaveBeenCalledWith('Cannot export: folder contains existing JSON files.');
        });

        it('should proceed if export folders exist but are empty', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedFs.readdirSync = jest.fn().mockReturnValue([]);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'all', conditions: [], explicitlyTyped: false }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([]);
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            expect(mockedLogger.error).not.toHaveBeenCalledWith('Cannot export: folder is not empty.');
        });
    });

    describe('Debug Mode', () => {
        it('should enable debug logging when debug flag is set', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: true
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.readdirSync = jest.fn().mockReturnValue([]);
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'all', conditions: [], explicitlyTyped: false }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([]);
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            expect(mockedLogger.level).toBe('debug');
        });
    });

    describe('Dashboard Export', () => {
        it('should export dashboards successfully', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockDashboards = [
                { id: 'dash-1', title: 'Dashboard 1', ownerId: 'owner1', annotations: [] }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'dashboard', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'dash-1', title: 'dashboard-1' }
            ]);
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockDashboards }) // fetchDashboard (list)
                .mockResolvedValueOnce({ status: 200, data: { title: 'Dashboard 1' } }); // fetchDashboard (single)

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total dashboard(s) processed: 1');
            expect(mockedFs.writeFileSync).toHaveBeenCalled();
        });

        it('should filter dashboards by ID', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockDashboards = [
                { id: 'dash-1', title: 'Dashboard 1', ownerId: 'owner1', annotations: [] },
                { id: 'dash-2', title: 'Dashboard 2', ownerId: 'owner1', annotations: [] }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'dashboard', conditions: ['id=dash-1'], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'dash-1', title: 'dashboard-1' }
            ]);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockDashboards })
                .mockResolvedValueOnce({ status: 200, data: { title: 'Dashboard 1' } });

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total dashboard(s) processed: 1');
        });

        it('should log error when no dashboards found with explicit type', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'dashboard', conditions: ['title=NonExistent'], explicitlyTyped: true }
            ]);
            
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('No dashboard(s) found matching'));
        });

        it('should log debug when no dashboards found without explicit type', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'all', conditions: ['title=NonExistent'], explicitlyTyped: false }
            ]);
            
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('No dashboard(s) found matching'));
        });

        it('should handle dashboard export failure', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockDashboards = [
                { id: 'dash-1', title: 'Dashboard 1', ownerId: 'owner1', annotations: [] }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'dashboard', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'dash-1', title: 'dashboard-1' }
            ]);
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockDashboards })
                .mockRejectedValueOnce(new Error('API Error'));

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('not found or failed to export'));
        });
    });

    describe('Event Export', () => {
        it('should export events successfully', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEvents = [
                { id: 'event-1', name: 'Event 1' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'event', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'event-1', title: 'event-1' }
            ]);
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEvents }) // fetchEvent (list)
                .mockResolvedValueOnce({ status: 200, data: { name: 'Event 1' } }); // fetchEvent (single)

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total event(s) processed: 1');
            expect(mockedFs.writeFileSync).toHaveBeenCalled();
        });

        it('should filter events by ID', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEvents = [
                { id: 'event-1', name: 'Event 1' },
                { id: 'event-2', name: 'Event 2' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'event', conditions: ['id=event-1'], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'event-1', title: 'event-1' }
            ]);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEvents })
                .mockResolvedValueOnce({ status: 200, data: { name: 'Event 1' } });

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total event(s) processed: 1');
        });

        it('should handle event export failure', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEvents = [
                { id: 'event-1', name: 'Event 1' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'event', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'event-1', title: 'event-1' }
            ]);
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEvents })
                .mockRejectedValueOnce(new Error('API Error'));

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('not found or failed to export'));
        });
    });

    describe('Entity Export', () => {
        it('should export entities successfully', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEntities = [
                { id: 'entity-1', data: { label: 'Entity 1' } }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'entity', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'entity-1', title: 'entity-1' }
            ]);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('entity-1');
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEntities }) // fetchEntity (list)
                .mockResolvedValueOnce({ status: 200, data: { id: 'entity-1', data: { label: 'Entity 1', dashboards: [] } } }); // fetchEntity (single)

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total entities processed: 1');
            expect(mockedFs.writeFileSync).toHaveBeenCalled();
        });

        it('should export entity with dashboards', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEntities = [
                { id: 'entity-1', data: { label: 'Entity 1' } }
            ];

            const entityWithDashboards = {
                id: 'entity-1',
                data: {
                    label: 'Entity 1',
                    dashboards: [
                        { title: 'Entity Dashboard 1' },
                        { title: 'Entity Dashboard 2' }
                    ]
                }
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'entity', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'entity-1', title: 'entity-1' }
            ]);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('entity-1');
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEntities }) // fetchEntity (list)
                .mockResolvedValueOnce({ status: 200, data: entityWithDashboards }); // fetchEntity (single)

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total entities processed: 1');
            // Should write entity file + 2 dashboard files
            expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(3);
        });

        it('should filter entities by ID', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEntities = [
                { id: 'entity-1', data: { label: 'Entity 1' } },
                { id: 'entity-2', data: { label: 'Entity 2' } }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'entity', conditions: ['id=entity-1'], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'entity-1', title: 'entity-1' }
            ]);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('entity-1');
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEntities }) // fetchEntity (list)
                .mockResolvedValueOnce({ status: 200, data: { id: 'entity-1', data: { label: 'Entity 1', dashboards: [] } } }); // fetchEntity (single)

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total entities processed: 1');
        });

        it('should handle entity export failure', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEntities = [
                { id: 'entity-1', data: { label: 'Entity 1' } }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'entity', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'entity-1', title: 'entity-1' }
            ]);
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEntities })
                .mockRejectedValueOnce(new Error('API Error'));

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('not found or failed to export'));
        });
    });

    describe('Smart Alert Export', () => {
        it('should export smart alerts successfully', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockSmartAlerts = [
                { id: 'alert-1', name: 'Smart Alert 1' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'smart-alert', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'alert-1', title: 'smart-alert-1' }
            ]);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('smart-alert-1');
            mockFilterElementsBy.mockImplementation((items) => items);
            
            // Mock the 7 smart-alert endpoints returning data from first endpoint
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockSmartAlerts }) // mobile-app endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // application endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // infra endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // website endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // synthetics endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // service-levels endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // logs endpoint
                .mockResolvedValueOnce({ status: 200, data: { id: 'alert-1', name: 'Smart Alert 1' } }); // fetch single alert

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total smart alert(s) processed: 1');
            expect(mockedFs.writeFileSync).toHaveBeenCalled();
        });

        it('should filter smart alerts by ID', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockSmartAlerts = [
                { id: 'alert-1', name: 'Smart Alert 1' },
                { id: 'alert-2', name: 'Smart Alert 2' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'smart-alert', conditions: ['id=alert-1'], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'alert-1', title: 'smart-alert-1' }
            ]);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('smart-alert-1');
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockSmartAlerts }) // mobile-app endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // application endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // infra endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // website endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // synthetics endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // service-levels endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // logs endpoint
                .mockResolvedValueOnce({ status: 200, data: { id: 'alert-1', name: 'Smart Alert 1' } }); // fetch single alert

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total smart alert(s) processed: 1');
        });

        it('should handle smart alert export failure', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockSmartAlerts = [
                { id: 'alert-1', name: 'Smart Alert 1' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'smart-alert', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'alert-1', title: 'smart-alert-1' }
            ]);
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockSmartAlerts })
                .mockResolvedValueOnce({ status: 200, data: [] })
                .mockResolvedValueOnce({ status: 200, data: [] })
                .mockRejectedValueOnce(new Error('API Error'));

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('not found or failed to export'));
        });

        it('should aggregate smart alerts from multiple endpoints', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mobileAlerts = [{ id: 'alert-1', name: 'Mobile Alert' }];
            const appAlerts = [{ id: 'alert-2', name: 'App Alert' }];
            const infraAlerts = [{ id: 'alert-3', name: 'Infra Alert' }];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'smart-alert', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'alert-1', title: 'mobile-alert' },
                { id: 'alert-2', title: 'app-alert' },
                { id: 'alert-3', title: 'infra-alert' }
            ]);
            mockedUtils.sanitizeFileName = jest.fn()
                .mockReturnValueOnce('mobile-alert')
                .mockReturnValueOnce('app-alert')
                .mockReturnValueOnce('infra-alert');
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mobileAlerts }) // mobile-app endpoint
                .mockResolvedValueOnce({ status: 200, data: appAlerts }) // application endpoint
                .mockResolvedValueOnce({ status: 200, data: infraAlerts }) // infra endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // website endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // synthetics endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // service-levels endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // logs endpoint
                .mockResolvedValueOnce({ status: 200, data: { id: 'alert-1', name: 'Mobile Alert' } })
                .mockResolvedValueOnce({ status: 200, data: { id: 'alert-2', name: 'App Alert' } })
                .mockResolvedValueOnce({ status: 200, data: { id: 'alert-3', name: 'Infra Alert' } });

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total smart alert(s) processed: 3');
            expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(3);
        });

        it('should filter smart alerts by name', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockSmartAlerts = [
                { id: 'alert-1', name: 'Critical Alert' },
                { id: 'alert-2', name: 'Warning Alert' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'smart-alert', conditions: ['name=Critical'], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockImplementation((items) => items);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('critical-alert');
            mockFilterElementsBy.mockImplementation((items) =>
                items.filter((obj: any) => new RegExp('Critical', 'i').test(obj.name))
            );
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockSmartAlerts }) // mobile-app endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // application endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // infra endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // website endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // synthetics endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // service-levels endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // logs endpoint
                .mockResolvedValueOnce({ status: 200, data: { id: 'alert-1', name: 'Critical Alert' } }); // fetch single alert

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total smart alert(s) processed: 1');
        });

        it('should handle smart alert not found in any endpoint', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockSmartAlerts = [
                { id: 'alert-1', name: 'Smart Alert 1' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'smart-alert', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'alert-1', title: 'smart-alert-1' }
            ]);
            mockFilterElementsBy.mockImplementation((items) => items);
            
            // Mock all 3 endpoints returning data for list
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockSmartAlerts }) // mobile-app endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // application endpoint
                .mockResolvedValueOnce({ status: 200, data: [] }) // infra endpoint
                // Mock all 3 endpoints failing for single alert fetch
                .mockRejectedValueOnce(new Error('Not found'))
                .mockRejectedValueOnce(new Error('Not found'))
                .mockRejectedValueOnce(new Error('Not found'));

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('not found or failed to export'));
            expect(mockedLogger.info).toHaveBeenCalledWith('Total smart alert(s) processed: 0');
        });

        it('should handle partial endpoint failures when fetching all smart alerts', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mobileAlerts = [{ id: 'alert-1', name: 'Mobile Alert' }];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'smart-alert', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'alert-1', title: 'mobile-alert' }
            ]);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('mobile-alert');
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mobileAlerts }) // mobile-app endpoint succeeds
                .mockRejectedValueOnce(new Error('API Error')) // application endpoint fails
                .mockRejectedValueOnce(new Error('API Error')) // infra endpoint fails
                .mockRejectedValueOnce(new Error('API Error')) // website endpoint fails
                .mockRejectedValueOnce(new Error('API Error')) // synthetics endpoint fails
                .mockRejectedValueOnce(new Error('API Error')) // service-levels endpoint fails
                .mockRejectedValueOnce(new Error('API Error')) // logs endpoint fails
                .mockResolvedValueOnce({ status: 200, data: { id: 'alert-1', name: 'Mobile Alert' } }); // fetch single alert

            await handleExport(argv);

            // Should still process the alert from the successful endpoint
            expect(mockedLogger.info).toHaveBeenCalledWith('Total smart alert(s) processed: 1');
            expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
        });

        it('should try all endpoints when fetching single smart alert', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockSmartAlerts = [
                { id: 'alert-1', name: 'Smart Alert 1' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'smart-alert', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'alert-1', title: 'smart-alert-1' }
            ]);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('smart-alert-1');
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockSmartAlerts }) // mobile-app list
                .mockResolvedValueOnce({ status: 200, data: [] }) // application list
                .mockResolvedValueOnce({ status: 200, data: [] }) // infra list
                .mockResolvedValueOnce({ status: 200, data: [] }) // website list
                .mockResolvedValueOnce({ status: 200, data: [] }) // synthetics list
                .mockResolvedValueOnce({ status: 200, data: [] }) // service-levels list
                .mockResolvedValueOnce({ status: 200, data: [] }) // logs list
                // First six endpoints fail, seventh succeeds
                .mockRejectedValueOnce(new Error('Not found'))
                .mockRejectedValueOnce(new Error('Not found'))
                .mockRejectedValueOnce(new Error('Not found'))
                .mockRejectedValueOnce(new Error('Not found'))
                .mockRejectedValueOnce(new Error('Not found'))
                .mockRejectedValueOnce(new Error('Not found'))
                .mockResolvedValueOnce({ status: 200, data: { id: 'alert-1', name: 'Smart Alert 1' } });

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total smart alert(s) processed: 1');
            expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
        });
    });

    describe('Export All Types', () => {
        it('should export all types when type is "all"', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'all', conditions: [], explicitlyTyped: false }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([]);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('test');
            
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            // Should call get for dashboards, events, entities, and smart-alerts (7 endpoints for smart-alerts)
            expect(mockAxiosInstance.get).toHaveBeenCalledTimes(10);
            expect(mockedLogger.info).toHaveBeenCalledWith('Total dashboard(s) processed: 0');
            expect(mockedLogger.info).toHaveBeenCalledWith('Total event(s) processed: 0');
            expect(mockedLogger.info).toHaveBeenCalledWith('Total entities processed: 0');
            expect(mockedLogger.info).toHaveBeenCalledWith('Total smart alert(s) processed: 0');
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'dashboard', conditions: [], explicitlyTyped: true }
            ]);
            
            const apiError: any = new Error('API Error');
            apiError.response = {
                status: 500,
                data: { message: 'Internal Server Error' },
                headers: {}
            };
            (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);
            mockAxiosInstance.get.mockRejectedValue(apiError);

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to get'));
        });

        it('should log error when no elements are exported', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'all', conditions: [], explicitlyTyped: false }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([]);
            
            mockAxiosInstance.get.mockResolvedValue({ status: 200, data: [] });

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith('No elements were found or exported.');
        });

        it('should handle file write errors', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockDashboards = [
                { id: 'dash-1', title: 'Dashboard 1', ownerId: 'owner1', annotations: [] }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn().mockImplementation(() => {
                throw new Error('Write error');
            });
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'dashboard', conditions: [], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockReturnValue([
                { id: 'dash-1', title: 'dashboard-1' }
            ]);
            mockFilterElementsBy.mockImplementation((items) => items);
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockDashboards }) // fetchDashboard (list)
                .mockResolvedValueOnce({ status: 200, data: { title: 'Dashboard 1' } }); // fetchDashboard (single)

            await handleExport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error saving'), expect.anything());
        });
    });

    describe('Filtering Logic', () => {
        it('should filter dashboards by title', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockDashboards = [
                { id: 'dash-1', title: 'Production Dashboard', ownerId: 'owner1', annotations: [] },
                { id: 'dash-2', title: 'Test Dashboard', ownerId: 'owner1', annotations: [] }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'dashboard', conditions: ['title=Production'], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockImplementation((items) => items);
            mockFilterElementsBy.mockImplementation((items) =>
                items.filter((obj: any) => new RegExp('Production', 'i').test(obj.title))
            );
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockDashboards }) // fetchDashboard (list)
                .mockResolvedValueOnce({ status: 200, data: { title: 'Production Dashboard' } }); // fetchDashboard (single)

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total dashboard(s) processed: 1');
        });

        it('should filter events by name', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEvents = [
                { id: 'event-1', name: 'Critical Alert' },
                { id: 'event-2', name: 'Warning Alert' }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'event', conditions: ['name=Critical'], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockImplementation((items) => items);
            mockFilterElementsBy.mockImplementation((items) =>
                items.filter((obj: any) => new RegExp('Critical', 'i').test(obj.name))
            );
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEvents }) // fetchEvent (list)
                .mockResolvedValueOnce({ status: 200, data: { name: 'Critical Alert' } }); // fetchEvent (single)

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total event(s) processed: 1');
        });

        it('should filter entities by label', async () => {
            const argv = {
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/export',
                debug: false
            };

            const mockEntities = [
                { id: 'entity-1', data: { label: 'Database Entity' } },
                { id: 'entity-2', data: { label: 'Service Entity' } }
            ];

            mockedFs.existsSync = jest.fn().mockReturnValue(false);
            mockedFs.mkdirSync = jest.fn();
            mockedFs.writeFileSync = jest.fn();
            mockedUtils.parseIncludesFromArgv = jest.fn().mockReturnValue([
                { type: 'entity', conditions: ['label=Database'], explicitlyTyped: true }
            ]);
            mockedUtils.sanitizeTitles = jest.fn().mockImplementation((items) => items);
            mockedUtils.sanitizeFileName = jest.fn().mockReturnValue('database-entity');
            mockFilterElementsBy.mockImplementation((items) =>
                items.filter((obj: any) => new RegExp('Database', 'i').test(obj.data?.label ?? ''))
            );
            
            mockAxiosInstance.get
                .mockResolvedValueOnce({ status: 200, data: mockEntities }) // fetchEntity (list)
                .mockResolvedValueOnce({ status: 200, data: { id: 'entity-1', data: { label: 'Database Entity', dashboards: [] } } }); // fetchEntity (single)

            await handleExport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Total entities processed: 1');
        });
    });
});