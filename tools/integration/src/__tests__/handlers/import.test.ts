import * as validators from '../../validators';

import axios from 'axios';
import fs from 'fs';
import { globSync } from 'glob';
import { handleImport } from '../../handlers/import';
import logger from '../../logger';
import path from 'path';

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('glob');
jest.mock('../../logger');
jest.mock('../../validators');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedGlobSync = globSync as jest.MockedFunction<typeof globSync>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedValidators = validators as jest.Mocked<typeof validators>;

describe('handleImport', () => {
    let mockAxiosInstance: any;
    let mockProcessExit: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock axios.create to return a mock instance
        mockAxiosInstance = {
            post: jest.fn(),
            get: jest.fn(),
            put: jest.fn()
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
    });

    afterEach(() => {
        mockProcessExit.mockRestore();
    });

    describe('Basic Import Functionality', () => {
        it('should import dashboards successfully', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/dashboards/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Start to import'));
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                'https://test-server.com/api/custom-dashboard',
                expect.any(Object),
                expect.any(Object)
            );
            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
        });

        it('should import events successfully', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'events/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/events/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                name: 'Test Event'
            }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });

            await handleImport(argv);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                'https://test-server.com/api/events/settings/event-specifications/custom',
                expect.any(Object),
                expect.any(Object)
            );
            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
        });

        it('should import entities successfully', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'entities/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/entities/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                data: {
                    label: 'Test Entity'
                },
                id: 'test-id',
                version: 1,
                created: 123456
            }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });

            await handleImport(argv);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                'https://test-server.com/api/custom-entitytypes',
                expect.objectContaining({ label: 'Test Entity' }),
                expect.any(Object)
            );
            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
        });

		      it('should import infrastructure smart alerts successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/infra-alert.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Infrastructure Smart Alert',
		              rule: {
		                  entityType: 'kubernetesCluster',
		                  metricName: 'test.metric'
		              },
		              threshold: { value: 10 },
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected infrastructure smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/infra-alert-configs',
		              expect.objectContaining({ name: 'Test Infrastructure Smart Alert' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should import application smart alerts successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/app-alert.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Application Smart Alert',
		              applicationId: 'app-123',
		              rule: {
		                  metricName: 'test.metric'
		              },
		              threshold: { value: 10 },
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected application smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/application-alert-configs',
		              expect.objectContaining({ name: 'Test Application Smart Alert' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should import application smart alerts with applications array successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/app-alert-multi.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Application Smart Alert Multi',
		              applications: [{ applicationId: 'app-123' }, { applicationId: 'app-456' }],
		              rule: {
		                  metricName: 'test.metric'
		              },
		              threshold: { value: 10 },
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected application smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/application-alert-configs',
		              expect.objectContaining({ name: 'Test Application Smart Alert Multi' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should import mobile app smart alerts successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/mobile-alert.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Mobile App Smart Alert',
		              mobileAppId: 'mobile-123',
		              rule: {
		                  metricName: 'test.metric'
		              },
		              threshold: { value: 10 },
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected mobile app smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/mobile-app-alert-configs',
		              expect.objectContaining({ name: 'Test Mobile App Smart Alert' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should import infrastructure smart alerts with rules array successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/infra-alert-multi.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Infrastructure Smart Alert Multi',
		              rules: [
		                  {
		                      rule: {
		                          entityType: 'kubernetesCluster',
		                          metricName: 'test.metric1'
		                      }
		                  },
		                  {
		                      rule: {
		                          entityType: 'host',
		                          metricName: 'test.metric2'
		                      }
		                  }
		              ],
		              threshold: { value: 10 },
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected infrastructure smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/infra-alert-configs',
		              expect.objectContaining({ name: 'Test Infrastructure Smart Alert Multi' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should import website smart alerts successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/website-alert.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Website Smart Alert',
		              websiteId: 'website-123',
		              rule: {
		                  metricName: 'test.metric'
		              },
		              threshold: { value: 10 },
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected website smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/website-alert-configs',
		              expect.objectContaining({ name: 'Test Website Smart Alert' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should import synthetics smart alerts successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/synthetics-alert.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Synthetics Smart Alert',
		              syntheticTestIds: ['test-123', 'test-456'],
		              rule: {
		                  metricName: 'test.metric'
		              },
		              threshold: { value: 10 },
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected synthetics smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/global-alert-configs/synthetics',
		              expect.objectContaining({ name: 'Test Synthetics Smart Alert' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should import service level smart alerts successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/slo-alert.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Service Level Smart Alert',
		              sloIds: ['slo-123', 'slo-456'],
		              rule: {
		                  metricName: 'test.metric'
		              },
		              threshold: { value: 10 },
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected service levels smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/global-alert-configs/service-levels',
		              expect.objectContaining({ name: 'Test Service Level Smart Alert' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should import logs smart alerts successfully', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/logs-alert.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Test Logs Smart Alert',
		              rules: [
		                  {
		                      rule: {
		                          aggregation: 'P99',
		                          alertType: 'threshold',
		                          metricName: 'test.metric'
		                      },
		                      thresholdOperator: '<',
		                      thresholds: { value: 10 }
		                  }
		              ],
		              granularity: 60000,
		              timeThreshold: { type: 'violationsInSequence' }
		          }));

		          mockAxiosInstance.post.mockResolvedValue({ status: 200 });

		          await handleImport(argv);

		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Detected logs smart alert'));
		          expect(mockAxiosInstance.post).toHaveBeenCalledWith(
		              'https://test-server.com/api/events/settings/global-alert-configs/logs',
		              expect.objectContaining({ name: 'Test Logs Smart Alert' }),
		              expect.any(Object)
		          );
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
		      });

		      it('should handle smart alert type detection failure', async () => {
		          const argv = {
		              package: '/test/package',
		              server: 'test-server.com',
		              token: 'test-token',
		              location: '/test/location',
		              include: 'smart-alerts/**/*.json',
		              debug: false
		          };

		          mockedFs.existsSync = jest.fn().mockReturnValue(true);
		          mockedGlobSync.mockReturnValue(['/test/package/smart-alerts/unknown-alert.json']);
		          mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
		              name: 'Unknown Smart Alert',
		              // Missing all identifying fields
		              threshold: { value: 10 }
		          }));

		          await handleImport(argv);

		          expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Unable to determine smart alert type'));
		          expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Total files: 1 | Failed to import: 1'));
		      });
    });

    describe('Debug Mode', () => {
        it('should enable debug logging when debug flag is set', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: true
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue([]);

            await handleImport(argv);

            expect(mockedLogger.level).toBe('debug');
        });
    });

    describe('Package Path Resolution', () => {
        it('should use package path directly if it exists', async () => {
            const argv = {
                package: '/existing/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                debug: false
            };

            mockedFs.existsSync = jest.fn()
                .mockReturnValueOnce(true) // package path exists
                .mockReturnValueOnce(true); // entities path exists
            mockedGlobSync.mockReturnValue([]);
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedFs.existsSync).toHaveBeenCalledWith('/existing/package');
        });

        it('should resolve package from node_modules if path does not exist', async () => {
            const argv = {
                package: '@scope/package-name',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                debug: false
            };

            mockedFs.existsSync = jest.fn()
                .mockReturnValueOnce(false) // package path doesn't exist
                .mockReturnValueOnce(true); // entities path exists
            mockedGlobSync.mockReturnValue([]);
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            // Should try to find in node_modules
            expect(mockedFs.existsSync).toHaveBeenCalledWith('@scope/package-name');
        });

        it('should handle missing entities folder gracefully when importing all', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                debug: false
            };

            mockedFs.existsSync = jest.fn()
                .mockReturnValueOnce(true)  // package path exists
                .mockReturnValueOnce(false); // entities path does NOT exist
            mockedGlobSync.mockReturnValue([]);
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            // Should log warning about missing entities folder
            expect(mockedLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining("No 'entities' folder found")
            );
            // Should NOT crash and complete successfully
            expect(mockedGlobSync).toHaveBeenCalled();
        });
    });

    describe('Parameter Substitution', () => {
        it('should replace template parameters in JSON files', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                set: ['title=My Dashboard', 'owner.name=John'],
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/dashboards/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: '{{title}}',
                owner: { name: '{{owner.name}}' },
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    title: 'My Dashboard',
                    owner: { name: 'John' }
                }),
                expect.any(Object)
            );
        });
    });

    describe('Dashboard Access Rules', () => {
        it('should add global access rule if missing', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/dashboards/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: []
            }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith('Added the missing global access rule.');
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    accessRules: expect.arrayContaining([
                        expect.objectContaining({
                            accessType: 'READ_WRITE',
                            relationType: 'GLOBAL'
                        })
                    ])
                }),
                expect.any(Object)
            );
        });

        it('should not add global access rule if already exists', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/dashboards/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.info).not.toHaveBeenCalledWith('Added the missing global access rule.');
        });
    });

    describe('Entity Dashboard References', () => {
        it('should resolve dashboard references in entities', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'entities/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/entities/test.json']);
            mockedFs.readFileSync = jest.fn()
                .mockReturnValueOnce(JSON.stringify({
                    data: {
                        label: 'Test Entity',
                        dashboards: [{ reference: 'dashboard.json' }]
                    },
                    id: 'test-id',
                    version: 1,
                    created: 123456
                }))
                .mockReturnValueOnce(JSON.stringify({ title: 'Referenced Dashboard' }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Resolving entity dashboard references'));
            expect(mockAxiosInstance.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    dashboards: [{ title: 'Referenced Dashboard' }]
                }),
                expect.any(Object)
            );
        });

        it('should handle missing dashboard reference file', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'entities/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn()
                .mockReturnValueOnce(true) // package exists
                .mockReturnValueOnce(false); // dashboard reference doesn't exist
            mockedGlobSync.mockReturnValue(['/test/package/entities/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                data: {
                    label: 'Test Entity',
                    dashboards: [{ reference: 'missing.json' }]
                },
                id: 'test-id',
                version: 1,
                created: 123456
            }));

            await handleImport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to resolve entity dashboards'));
        });

        it('should skip entity dashboards when importing dashboards', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue([
                '/test/package/dashboards/regular.json',
                '/test/package/dashboards/entity_dashboard.json'
            ]);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set(['entity_dashboard.json']));

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Skipping entity dashboard'));
            expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1); // Only regular dashboard
        });
    });

    describe('Entity Conflict Handling', () => {
        it('should handle 409 conflict and skip if entity data is same', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'entities/**/*.json',
                debug: false
            };

            const entityData = {
                data: { label: 'Test Entity', field: 'value' },
                id: 'test-id',
                version: 1,
                created: 123456
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/entities/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(entityData));
            
            const conflictError: any = new Error('Conflict');
            conflictError.response = {
                status: 409,
                data: { conflictingEntityId: 'existing-id' }
            };
            (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);
            mockAxiosInstance.post.mockRejectedValue(conflictError);
            
            // Mock GET to return existing entity with same data
            mockAxiosInstance.get.mockResolvedValue({
                status: 200,
                data: {
                    id: 'existing-id',
                    version: 1,
                    created: 123456,
                    label: 'Test Entity',
                    field: 'value'
                }
            });

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('already exists with the same data'));
            expect(mockAxiosInstance.put).not.toHaveBeenCalled();
        });

        it('should handle 409 conflict and update if entity data is different', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'entities/**/*.json',
                debug: false
            };

            const entityData = {
                data: { label: 'Test Entity', field: 'new-value' },
                id: 'test-id',
                version: 1,
                created: 123456
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/entities/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(entityData));
            
            const conflictError: any = new Error('Conflict');
            conflictError.response = {
                status: 409,
                data: { conflictingEntityId: 'existing-id' }
            };
            (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);
            mockAxiosInstance.post.mockRejectedValue(conflictError);
            
            // Mock GET to return existing entity with different data
            mockAxiosInstance.get.mockResolvedValue({
                status: 200,
                data: {
                    id: 'existing-id',
                    version: 1,
                    created: 123456,
                    label: 'Test Entity',
                    field: 'old-value'
                }
            });
            
            mockAxiosInstance.put.mockResolvedValue({ status: 200 });

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('data is different. Updating'));
            expect(mockAxiosInstance.put).toHaveBeenCalledWith(
                'https://test-server.com/api/custom-entitytypes/existing-id',
                expect.objectContaining({ label: 'Test Entity', field: 'new-value' }),
                expect.any(Object)
            );
        });

        it('should handle 409 conflict when entity cannot be found', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'entities/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/entities/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                data: { label: 'Test Entity' },
                id: 'test-id',
                version: 1,
                created: 123456
            }));
            
            const conflictError: any = new Error('Conflict');
            conflictError.response = {
                status: 409,
                data: {}
            };
            (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);
            mockAxiosInstance.post.mockRejectedValue(conflictError);
            
            // Mock GET to return empty list
            mockAxiosInstance.get.mockResolvedValue({
                status: 200,
                data: []
            });

            await handleImport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('could not be found for comparison'));
        });
    });

    describe('Error Handling', () => {
        it('should handle no files found', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue([]);
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No files found'));
        });

        it('should handle JSON parse errors', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/dashboards/invalid.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue('{ invalid json }');
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
        });

        it('should handle API errors', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/dashboards/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            const apiError: any = new Error('API Error');
            apiError.response = {
                status: 500,
                data: { message: 'Internal Server Error' },
                headers: {}
            };
            (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);
            mockAxiosInstance.post.mockRejectedValue(apiError);
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to apply'));
            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Failed to import: 1'));
        });

        it('should handle non-axios errors', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue(['/test/package/dashboards/test.json']);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            mockAxiosInstance.post.mockRejectedValue(new Error('Unknown error'));
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to apply'));
        });
    });

    describe('Default Import (No Include Pattern)', () => {
        it('should import all types when no include pattern specified', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue([]);
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            // Should attempt to import dashboards, events, and entities
            expect(mockedGlobSync).toHaveBeenCalledWith(expect.stringContaining('dashboards'));
            expect(mockedGlobSync).toHaveBeenCalledWith(expect.stringContaining('events'));
            expect(mockedGlobSync).toHaveBeenCalledWith(expect.stringContaining('entities'));
        });
    });

    describe('Summary Reporting', () => {
        it('should report only successes when all imports succeed', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue([
                '/test/package/dashboards/test1.json',
                '/test/package/dashboards/test2.json'
            ]);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            mockAxiosInstance.post.mockResolvedValue({ status: 200 });
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Total files: 2 | Successfully imported: 2'));
        });

        it('should report only failures when all imports fail', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue([
                '/test/package/dashboards/test1.json',
                '/test/package/dashboards/test2.json'
            ]);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Total files: 2 | Failed to import: 2'));
        });

        it('should report both successes and failures when mixed', async () => {
            const argv = {
                package: '/test/package',
                server: 'test-server.com',
                token: 'test-token',
                location: '/test/location',
                include: 'dashboards/**/*.json',
                debug: false
            };

            mockedFs.existsSync = jest.fn().mockReturnValue(true);
            mockedGlobSync.mockReturnValue([
                '/test/package/dashboards/test1.json',
                '/test/package/dashboards/test2.json'
            ]);
            mockedFs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
                title: 'Test Dashboard',
                accessRules: [{ accessType: 'READ_WRITE', relationType: 'GLOBAL' }]
            }));
            
            mockAxiosInstance.post
                .mockResolvedValueOnce({ status: 200 })
                .mockRejectedValueOnce(new Error('API Error'));
            mockedValidators.getEntityDashboardRefs = jest.fn().mockReturnValue(new Set());

            await handleImport(argv);

            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Total files: 2'));
            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Successfully imported: 1'));
            expect(mockedLogger.info).toHaveBeenCalledWith(expect.stringContaining('Failed: 1'));
        });
    });
});