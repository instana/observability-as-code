import * as validators from '../validators';

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('axios');
jest.mock('fs');
jest.mock('../logger');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('validators', () => {
    let errors: string[];
    let warnings: string[];
    let successMessages: string[];

    beforeEach(() => {
        errors = [];
        warnings = [];
        successMessages = [];
        jest.clearAllMocks();
    });

    describe('validatePackageJson', () => {
        it('should validate correct package name', async () => {
            const packageData = {
                name: '@instana-integration/test-package',
                version: '1.0.0',
                author: 'Test Author',
                license: 'MIT',
                description: 'Test description',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockResolvedValue({
                data: { 'dist-tags': { latest: '0.9.0' } }
            });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(successMessages).toContain('The package name is correctly defined.');
            expect(errors).toHaveLength(0);
        });

        it('should warn about invalid package name in non-strict mode', async () => {
            const packageData = {
                name: 'invalid-package-name',
                version: '1.0.0',
                author: 'Test Author',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(warnings.some(w => w.includes('does not align with the IBM package naming convention'))).toBe(true);
            expect(errors.some(e => e.includes('does not align with the IBM package naming convention'))).toBe(false);
        });

        it('should error about invalid package name in strict mode', async () => {
            const packageData = {
                name: 'invalid-package-name',
                version: '1.0.0',
                author: 'Test Author',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, true);

            expect(errors.some(e => e.includes('does not align with the IBM package naming convention'))).toBe(true);
        });

        it('should validate correct version format', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.2.3',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(successMessages).toContain('The package version format is valid and follows the correct format.');
        });

        it('should error on invalid version format', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.2',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(errors.some(e => e.includes('Invalid version'))).toBe(true);
        });

        it('should handle new package (404 from npm)', async () => {
            const packageData = {
                name: '@instana-integration/new-package',
                version: '1.0.0',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(successMessages.some(m => m.includes('not found on npm. This is a new package'))).toBe(true);
        });

        it('should validate version is greater than published version', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '2.0.0',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockResolvedValue({
                data: { 'dist-tags': { latest: '1.0.0' } }
            });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(successMessages.some(m => m.includes('greater than the currently published version'))).toBe(true);
        });

        it('should error when version equals published version', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.0.0',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockResolvedValue({
                data: { 'dist-tags': { latest: '1.0.0' } }
            });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(errors.some(e => e.includes('is the same as the currently published version'))).toBe(true);
        });

        it('should error when version is less than published version', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '0.9.0',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockResolvedValue({
                data: { 'dist-tags': { latest: '1.0.0' } }
            });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(errors.some(e => e.includes('must be greater than the currently published version'))).toBe(true);
        });

        it('should handle package with no published versions', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.0.0',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockResolvedValue({
                data: { 'dist-tags': {} }
            });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(successMessages.some(m => m.includes('has no published versions'))).toBe(true);
        });

        it('should validate all required fields are present', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.0.0',
                author: 'Test Author',
                license: 'MIT',
                description: 'Test description',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(successMessages.some(m => m.includes('name, version, author, license, description'))).toBe(true);
        });

        it('should error on missing required fields', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.0.0',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(errors.some(e => e.includes('missing required field(s)'))).toBe(true);
        });

        it('should warn on missing description', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.0.0',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(warnings.some(w => w.includes('description is missing'))).toBe(true);
        });

        it('should validate publishConfig.access is public', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.0.0',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(successMessages.some(m => m.includes('publishConfig.access'))).toBe(true);
        });

        it('should error when publishConfig.access is missing', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.0.0',
                author: 'Test',
                license: 'MIT'
            };

            mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(errors.some(e => e.includes('publishConfig.access'))).toBe(true);
        });

        it('should handle axios errors', async () => {
            const packageData = {
                name: '@instana-integration/test',
                version: '1.0.0',
                author: 'Test',
                license: 'MIT',
                publishConfig: { access: 'public' }
            };

            mockedAxios.get.mockRejectedValue({ message: 'Network error' });

            await validators.validatePackageJson(packageData, errors, warnings, successMessages, false);

            expect(errors.some(e => e.includes('Network error'))).toBe(true);
        });
    });

    describe('validateDashboardFiles', () => {
        it('should warn when no JSON files found', () => {
            mockedFs.readdirSync.mockReturnValue([]);

            validators.validateDashboardFiles('/test/dashboards', errors, warnings, successMessages);

            expect(warnings).toContain('No JSON files found in the dashboards folder.');
        });

        it('should validate dashboard with correct accessRules', () => {
            mockedFs.readdirSync.mockReturnValue(['dashboard1.json'] as any);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                accessRules: [
                    { accessType: 'READ_WRITE', relationType: 'GLOBAL', relatedId: '' }
                ]
            }));

            validators.validateDashboardFiles('/test/dashboards', errors, warnings, successMessages);

            expect(successMessages.some(m => m.includes('contains the required GLOBAL accessRule'))).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('should error when accessRules are missing', () => {
            mockedFs.readdirSync.mockReturnValue(['dashboard1.json'] as any);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

            validators.validateDashboardFiles('/test/dashboards', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('accessRules are missing'))).toBe(true);
        });

        it('should error when accessRules are empty array', () => {
            mockedFs.readdirSync.mockReturnValue(['dashboard1.json'] as any);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({ accessRules: [] }));

            validators.validateDashboardFiles('/test/dashboards', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('accessRules are missing'))).toBe(true);
        });

        it('should error when required accessRule is missing', () => {
            mockedFs.readdirSync.mockReturnValue(['dashboard1.json'] as any);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                accessRules: [
                    { accessType: 'READ', relationType: 'GLOBAL', relatedId: '' }
                ]
            }));

            validators.validateDashboardFiles('/test/dashboards', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('must include the required accessRule'))).toBe(true);
        });

        it('should skip validation for embedded dashboards', () => {
            const embeddedRefs = new Set(['dashboard1.json']);
            mockedFs.readdirSync.mockReturnValue(['dashboard1.json'] as any);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

            validators.validateDashboardFiles('/test/dashboards', errors, warnings, successMessages, embeddedRefs);

            expect(successMessages.some(m => m.includes('Skipping accessRule validation for entity dashboard'))).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('should handle JSON parse errors', () => {
            mockedFs.readdirSync.mockReturnValue(['dashboard1.json'] as any);
            mockedFs.readFileSync.mockReturnValue('invalid json');

            validators.validateDashboardFiles('/test/dashboards', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('Error validating file'))).toBe(true);
        });

        it('should ignore non-JSON files', () => {
            mockedFs.readdirSync.mockReturnValue(['dashboard1.json', 'readme.md'] as any);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                accessRules: [
                    { accessType: 'READ_WRITE', relationType: 'GLOBAL', relatedId: '' }
                ]
            }));

            validators.validateDashboardFiles('/test/dashboards', errors, warnings, successMessages);

            expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1);
        });
    });

    describe('getAllJsonFiles', () => {
        it('should return all JSON files in directory', () => {
            mockedFs.readdirSync.mockReturnValue(['file1.json', 'file2.json'] as any);
            mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

            const result = validators.getAllJsonFiles('/test');

            expect(result).toHaveLength(2);
            expect(result).toContain(path.join('/test', 'file1.json'));
        });

        it('should recursively search subdirectories', () => {
            mockedFs.readdirSync
                .mockReturnValueOnce(['subdir', 'file1.json'] as any)
                .mockReturnValueOnce(['file2.json'] as any);
            
            mockedFs.statSync
                .mockReturnValueOnce({ isDirectory: () => true } as any)
                .mockReturnValueOnce({ isDirectory: () => false } as any)
                .mockReturnValueOnce({ isDirectory: () => false } as any);

            const result = validators.getAllJsonFiles('/test');

            expect(result).toHaveLength(2);
        });

        it('should ignore non-JSON files', () => {
            mockedFs.readdirSync.mockReturnValue(['file1.json', 'file2.txt', 'file3.md'] as any);
            mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as any);

            const result = validators.getAllJsonFiles('/test');

            expect(result).toHaveLength(1);
            expect(result[0]).toContain('file1.json');
        });

        it('should handle empty directory', () => {
            mockedFs.readdirSync.mockReturnValue([]);

            const result = validators.getAllJsonFiles('/test');

            expect(result).toHaveLength(0);
        });
    });

    describe('validateEventFiles', () => {
        beforeEach(() => {
            mockedFs.readdirSync.mockReturnValue(['event1.json'] as any);
            mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
        });

        it('should warn when no JSON files found', () => {
            mockedFs.readdirSync.mockReturnValue([]);

            validators.validateEventFiles('/test/events', errors, warnings, successMessages);

            expect(warnings).toContain('No JSON files found in the events folder.');
        });

        it('should validate event with all required fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Event',
                entityType: 'service',
                rules: [{ condition: 'test' }]
            }));

            validators.validateEventFiles('/test/events', errors, warnings, successMessages);

            expect(successMessages.some(m => m.includes('name, entityType, rules'))).toBe(true);
            expect(successMessages.some(m => m.includes('correctly defined'))).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('should error on missing required fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Event'
            }));

            validators.validateEventFiles('/test/events', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s)'))).toBe(true);
        });

        it('should error on empty array fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Event',
                entityType: 'service',
                rules: []
            }));

            validators.validateEventFiles('/test/events', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s): rules'))).toBe(true);
        });

        it('should handle JSON parse errors', () => {
            mockedFs.readFileSync.mockReturnValue('invalid json');

            validators.validateEventFiles('/test/events', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('Error validating file'))).toBe(true);
        });

        it('should validate multiple event files', () => {
            mockedFs.readdirSync.mockReturnValue(['event1.json', 'event2.json'] as any);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Event',
                entityType: 'service',
                rules: [{ condition: 'test' }]
            }));

            validators.validateEventFiles('/test/events', errors, warnings, successMessages);

            expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2);
        });
    });

    describe('validateEntityFiles', () => {
        beforeEach(() => {
            mockedFs.readdirSync.mockReturnValue(['entity1.json'] as any);
            mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
        });

        it('should warn when no JSON files found', () => {
            mockedFs.readdirSync.mockReturnValue([]);

            validators.validateEntityFiles('/test/entities', errors, warnings, successMessages);

            expect(warnings).toContain('No JSON files found in the entities folder.');
        });

        it('should validate entity with all required fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                data: {
                    label: 'Test Entity',
                    identifiers: ['id1'],
                    tagFilterExpression: { type: 'EXPRESSION' }
                }
            }));

            validators.validateEntityFiles('/test/entities', errors, warnings, successMessages);

            expect(successMessages.some(m => m.includes('label, identifiers, tagFilterExpression'))).toBe(true);
            expect(successMessages.some(m => m.includes('correctly defined'))).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('should error when data object is missing', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

            validators.validateEntityFiles('/test/entities', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('Missing or invalid \'data\' object'))).toBe(true);
        });

        it('should error when data object is empty', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({ data: {} }));

            validators.validateEntityFiles('/test/entities', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('Missing or invalid \'data\' object'))).toBe(true);
        });

        it('should error on missing required fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                data: {
                    label: 'Test Entity'
                }
            }));

            validators.validateEntityFiles('/test/entities', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s)'))).toBe(true);
        });

        it('should error on empty array fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                data: {
                    label: 'Test Entity',
                    identifiers: [],
                    tagFilterExpression: { type: 'EXPRESSION' }
                }
            }));

            validators.validateEntityFiles('/test/entities', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s): identifiers'))).toBe(true);
        });

        it('should error on empty object fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                data: {
                    label: 'Test Entity',
                    identifiers: ['id1'],
                    tagFilterExpression: {}
                }
            }));

            validators.validateEntityFiles('/test/entities', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s): tagFilterExpression'))).toBe(true);
        });

        it('should handle JSON parse errors', () => {
            mockedFs.readFileSync.mockReturnValue('invalid json');

            validators.validateEntityFiles('/test/entities', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('Error validating file'))).toBe(true);
        });
    });

    describe('getEntityDashboardRefs', () => {
        beforeEach(() => {
            mockedFs.existsSync.mockReturnValue(true); // Default: directory exists
            mockedFs.readdirSync.mockReturnValue(['entity1.json'] as any);
            mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
        });

        it('should extract dashboard references from entities', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                data: {
                    dashboards: [
                        { reference: 'dashboard1.json' },
                        { reference: 'dashboard2.json' }
                    ]
                }
            }));

            const result = validators.getEntityDashboardRefs('/test/entities');

            expect(result.size).toBe(2);
            expect(result.has('dashboard1.json')).toBe(true);
            expect(result.has('dashboard2.json')).toBe(true);
        });

        it('should handle entities without dashboards', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                data: {}
            }));

            const result = validators.getEntityDashboardRefs('/test/entities');

            expect(result.size).toBe(0);
        });

        it('should handle dashboards without reference field', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                data: {
                    dashboards: [
                        { name: 'dashboard1' }
                    ]
                }
            }));

            const result = validators.getEntityDashboardRefs('/test/entities');

            expect(result.size).toBe(0);
        });

        it('should return empty set when entities directory does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false);

            const result = validators.getEntityDashboardRefs('/test/entities');

            expect(result.size).toBe(0);
            expect(mockedFs.readdirSync).not.toHaveBeenCalled();
        });

        it('should silently ignore parse errors', () => {
            mockedFs.readFileSync.mockReturnValue('invalid json');

            const result = validators.getEntityDashboardRefs('/test/entities');

            expect(result.size).toBe(0);
        });

        it('should handle multiple entity files', () => {
            mockedFs.readdirSync.mockReturnValue(['entity1.json', 'entity2.json'] as any);
            mockedFs.readFileSync
                .mockReturnValueOnce(JSON.stringify({
                    data: { dashboards: [{ reference: 'dashboard1.json' }] }
                }))
                .mockReturnValueOnce(JSON.stringify({
                    data: { dashboards: [{ reference: 'dashboard2.json' }] }
                }));

            const result = validators.getEntityDashboardRefs('/test/entities');

            expect(result.size).toBe(2);
        });
    });

    describe('validateReadmeContent', () => {
        it('should validate README with all required sections', () => {
            const readmeContent = `
# @instana-integration/test
## Dashboards
## Metrics
## Semantic Conventions
## Resource Attributes
## Events
## Entities
## Smart Alerts
            `;
            mockedFs.existsSync.mockReturnValue(true);

            validators.validateReadmeContent(readmeContent, '@instana-integration/test', '/test', errors, warnings, successMessages);

            expect(successMessages).toContain('README.md contains all required sections.');
            expect(errors).toHaveLength(0);
        });

        it('should error on missing required sections', () => {
            const readmeContent = `
# @instana-integration/test
## Metrics
            `;
            mockedFs.existsSync.mockReturnValue(true);

            validators.validateReadmeContent(readmeContent, '@instana-integration/test', '/test', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required sections'))).toBe(true);
        });

        it('should not require Dashboards section when dashboards folder does not exist', () => {
            const readmeContent = `
# @instana-integration/test
## Metrics
## Semantic Conventions
## Resource Attributes
## Events
## Entities
## Smart Alerts
            `;
            mockedFs.existsSync.mockImplementation((path: any) => {
                // Only dashboards folder doesn't exist, but entities and smart-alerts do
                return !path.includes('dashboards');
            });

            validators.validateReadmeContent(readmeContent, '@instana-integration/test', '/test', errors, warnings, successMessages);

            expect(successMessages).toContain('README.md contains all required sections.');
        });

        it('should not require Events section when events folder does not exist', () => {
            const readmeContent = `
# @instana-integration/test
## Dashboards
## Metrics
## Semantic Conventions
## Resource Attributes
## Entities
## Smart Alerts
            `;
            mockedFs.existsSync.mockImplementation((path: any) => {
                // Only events folder doesn't exist, but dashboards, entities and smart-alerts do
                return !path.includes('events');
            });

            validators.validateReadmeContent(readmeContent, '@instana-integration/test', '/test', errors, warnings, successMessages);

            expect(successMessages).toContain('README.md contains all required sections.');
        });

  it('should not require Entities section when entities folder does not exist', () => {
            const readmeContent = `
# @instana-integration/test
## Dashboards
## Metrics
## Semantic Conventions
## Resource Attributes
## Events
## Smart Alerts
            `;
            mockedFs.existsSync.mockImplementation((path: any) => {
                // Only entities folder doesn't exist, but dashboards, events and smart-alerts do
                return !path.includes('entities');
            });

            validators.validateReadmeContent(readmeContent, '@instana-integration/test', '/test', errors, warnings, successMessages);

            expect(successMessages).toContain('README.md contains all required sections.');
        });

  it('should not require Smart Alerts section when smart-alerts folder does not exist', () => {
            const readmeContent = `
# @instana-integration/test
## Dashboards
## Metrics
## Semantic Conventions
## Resource Attributes
## Events
## Entities
            `;
            mockedFs.existsSync.mockImplementation((path: any) => {
                // Only smart-alerts folder doesn't exist, but dashboards, events and entities do
                return !path.includes('smart-alerts');
            });

            validators.validateReadmeContent(readmeContent, '@instana-integration/test', '/test', errors, warnings, successMessages);

            expect(successMessages).toContain('README.md contains all required sections.');
        });

        it('should handle case-insensitive section matching', () => {
            const readmeContent = `
# @instana-integration/test
## dashboards
## METRICS
## semantic conventions
## Resource Attributes
## events
## entities
## Smart Alerts
            `;
            mockedFs.existsSync.mockReturnValue(true);

            validators.validateReadmeContent(readmeContent, '@instana-integration/test', '/test', errors, warnings, successMessages);

            expect(successMessages).toContain('README.md contains all required sections.');
        });

        it('should handle different heading levels', () => {
            const readmeContent = `
# @instana-integration/test
### Dashboards
#### Metrics
##### Semantic Conventions
###### Resource Attributes
## Events
## Entities
## Smart Alerts
            `;
            mockedFs.existsSync.mockReturnValue(true);

            validators.validateReadmeContent(readmeContent, '@instana-integration/test', '/test', errors, warnings, successMessages);

            expect(successMessages).toContain('README.md contains all required sections.');
        });
    });

    describe('validateSmartAlertFiles', () => {
        beforeEach(() => {
            mockedFs.readdirSync.mockReturnValue(['alert1.json'] as any);
            mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as any);
        });

        it('should warn when no JSON files found', () => {
            mockedFs.readdirSync.mockReturnValue([]);

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(warnings).toContain('No JSON files found in the smart-alerts folder.');
        });

        it('should validate infra alert with all required fields and rule+threshold', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                timeThreshold: 600,
                rule: 'entity.type:host',
                threshold: 0.8
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(successMessages.some(m => m.includes('name, granularity, timeThreshold, rule + threshold'))).toBe(true);
            expect(successMessages.some(m => m.includes('correctly defined'))).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('should validate infra alert with all required fields and rules array', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                timeThreshold: 600,
                rules: [
                    { severity: 5, threshold: 0.8 },
                    { severity: 10, threshold: 0.9 }
                ]
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(successMessages.some(m => m.includes('name, granularity, timeThreshold, rules[]'))).toBe(true);
            expect(successMessages.some(m => m.includes('correctly defined'))).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('should error on missing required fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert'
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s)'))).toBe(true);
            expect(errors.some(e => e.includes('granularity'))).toBe(true);
            expect(errors.some(e => e.includes('timeThreshold'))).toBe(true);
        });

        it('should error when neither rule+threshold nor rules array is present', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                timeThreshold: 600
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('rule + threshold OR rules[]'))).toBe(true);
            expect(errors.some(e => e.includes('not correctly defined'))).toBe(true);
        });

        it('should error when rule is present but threshold is missing', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                timeThreshold: 600,
                rule: 'entity.type:host'
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('rule + threshold OR rules[]'))).toBe(true);
        });

        it('should error when threshold is present but rule is missing', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                timeThreshold: 600,
                threshold: 0.8
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('rule + threshold OR rules[]'))).toBe(true);
        });

        it('should error when rules array is empty', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                timeThreshold: 600,
                rules: []
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('rule + threshold OR rules[]'))).toBe(true);
        });

        it('should error on empty string fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: '',
                granularity: 300,
                timeThreshold: 600,
                rule: 'entity.type:host',
                threshold: 0.8
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s)') && e.includes('name'))).toBe(true);
            expect(errors.some(e => e.includes('not correctly defined'))).toBe(true);
        });

        it('should error on null fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: null,
                timeThreshold: 600,
                rule: 'entity.type:host',
                threshold: 0.8
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s)') && e.includes('granularity'))).toBe(true);
            expect(errors.some(e => e.includes('not correctly defined'))).toBe(true);
        });

        it('should error on undefined fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                rule: 'entity.type:host',
                threshold: 0.8
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('missing required field(s)') && e.includes('timeThreshold'))).toBe(true);
            expect(errors.some(e => e.includes('not correctly defined'))).toBe(true);
        });

        it('should handle JSON parse errors', () => {
            mockedFs.readFileSync.mockReturnValue('invalid json');

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('Error validating file'))).toBe(true);
        });

        it('should handle non-Error exceptions', () => {
            mockedFs.readFileSync.mockImplementation(() => {
                throw 'String error';
            });

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(errors.some(e => e.includes('Error validating file'))).toBe(true);
            expect(errors.some(e => e.includes('String error'))).toBe(true);
        });

        it('should validate multiple infra alert files', () => {
            mockedFs.readdirSync.mockReturnValue(['alert1.json', 'alert2.json'] as any);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                timeThreshold: 600,
                rule: 'entity.type:host',
                threshold: 0.8
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2);
        });

        it('should accept zero as valid value for numeric fields', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 0,
                timeThreshold: 0,
                rule: 'entity.type:host',
                threshold: 0
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(successMessages.some(m => m.includes('correctly defined'))).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('should validate both rule+threshold and rules array can coexist', () => {
            mockedFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'Test Alert',
                granularity: 300,
                timeThreshold: 600,
                rule: 'entity.type:host',
                threshold: 0.8,
                rules: [{ severity: 5, threshold: 0.9 }]
            }));

            validators.validateSmartAlertFiles('/test/smart-alerts', errors, warnings, successMessages);

            expect(successMessages.some(m => m.includes('correctly defined'))).toBe(true);
            expect(errors).toHaveLength(0);
        });
    });
});