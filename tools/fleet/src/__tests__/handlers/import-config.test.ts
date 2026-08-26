import axios from 'axios';
import fs from 'fs';
import { globSync } from 'glob';
import { handleImport } from '../../handlers/import-config';

jest.mock('axios');
jest.mock('glob');
jest.mock('fs');
jest.mock('../../logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
    isDebugEnabled: jest.fn(() => false)
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGlobSync = globSync as jest.MockedFunction<typeof globSync>;
const mockedFs = fs as jest.Mocked<typeof fs>;

const logger = require('../../logger');

const BASE_ARGV = {
    server: 'example.instana.com',
    token: 'test-token',
    type: 'com.ibm.instana.agent',
    include: 'agent-folder/**/*.yaml',
    'config-name': 'my-agent-config',
    'config-version': '1.0.0',
    debug: false
};

const FAKE_FILE_CONTENT = Buffer.from('config: value\n');

describe('handleImport', () => {
    let getMock: jest.Mock;
    let postMock: jest.Mock;
    let putMock: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.INSTANA_SERVER = BASE_ARGV.server;
        process.env.INSTANA_API_TOKEN = BASE_ARGV.token;

        getMock = jest.fn();
        postMock = jest.fn();
        putMock = jest.fn();
        mockedAxios.create.mockReturnValue({ get: getMock, post: postMock, put: putMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(false);

        (mockedFs.readFileSync as jest.Mock).mockReturnValue(FAKE_FILE_CONTENT);
    });

    // ── Create (POST) ─────────────────────────────────────────────────────────

    test('POSTs a new configuration when none exists', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml', 'agent-folder/config2.yaml'] as any);
        getMock.mockResolvedValue({ data: [] });
        postMock.mockResolvedValue({ status: 200 });

        await handleImport(BASE_ARGV);

        expect(postMock).toHaveBeenCalledTimes(1);
        const [url, body, opts] = postMock.mock.calls[0];
        expect(url).toBe('https://example.instana.com/api/fleet/configurations');
        expect(body.name).toBe('my-agent-config');
        expect(body.type).toBe('com.ibm.instana.agent');
        expect(body.version).toBe('1.0.0');
        expect(body.configuration.files).toHaveLength(2);
        expect(body.configuration.files[0].name).toBe('config1.yaml');
        expect(body.configuration.files[0].data).toBe(FAKE_FILE_CONTENT.toString('base64'));
        expect(opts.headers['Authorization']).toBe('apiToken test-token');
        expect(opts.headers['Content-Type']).toBe('application/json');
    });

    test('uses --config-name as the exact configuration name', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        getMock.mockResolvedValue({ data: [] });
        postMock.mockResolvedValue({ status: 200 });

        await handleImport({ ...BASE_ARGV, 'config-name': 'myExactName' });

        const [, body] = postMock.mock.calls[0];
        expect(body.name).toBe('myExactName');
    });

    test('uses --config-version in the POST payload', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        getMock.mockResolvedValue({ data: [] });
        postMock.mockResolvedValue({ status: 200 });

        await handleImport({ ...BASE_ARGV, 'config-version': '2.0.0' });

        const [, body] = postMock.mock.calls[0];
        expect(body.version).toBe('2.0.0');
    });

    // ── Update (PUT) ──────────────────────────────────────────────────────────

    test('PUTs and merges when existing config has a different file', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const existing = {
            configuration_id: 'existing-id-123',
            name: 'my-agent-config',
            configuration: { files: [{ name: 'old-file.yaml', data: 'b2xkLWRhdGE=' }] }
        };
        getMock.mockResolvedValue({ data: [existing] });
        putMock.mockResolvedValue({ status: 200 });

        await handleImport(BASE_ARGV);

        expect(putMock).toHaveBeenCalledTimes(1);
        const [url, body] = putMock.mock.calls[0];
        expect(url).toBe('https://example.instana.com/api/fleet/configurations/existing-id-123');
        expect(body.configuration.files).toHaveLength(2);
        expect(body.configuration.files.map((f: any) => f.name)).toContain('old-file.yaml');
        expect(body.configuration.files.map((f: any) => f.name)).toContain('config1.yaml');
    });

    test('replaces existing file with same name on PUT when content differs', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const existing = {
            configuration_id: 'id-abc',
            name: 'my-agent-config',
            configuration: { files: [{ name: 'config1.yaml', data: 'b2xkLWRhdGE=' }] }
        };
        getMock.mockResolvedValue({ data: [existing] });
        putMock.mockResolvedValue({ status: 200 });

        await handleImport(BASE_ARGV);

        const [, body] = putMock.mock.calls[0];
        expect(body.configuration.files).toHaveLength(1);
        expect(body.configuration.files[0].data).toBe(FAKE_FILE_CONTENT.toString('base64'));
    });

    test('skips PUT when all file content is identical', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const sameData = FAKE_FILE_CONTENT.toString('base64');
        const existing = {
            configuration_id: 'id-abc',
            name: 'my-agent-config',
            configuration: { files: [{ name: 'config1.yaml', data: sameData }] }
        };
        getMock.mockResolvedValue({ data: [existing] });

        await handleImport(BASE_ARGV);

        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
    });

    test('warns when backend auto-increments version instead of using requested version', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const existing = {
            configuration_id: 'id-abc',
            name: 'my-agent-config',
            configuration: { files: [{ name: 'other.yaml', data: 'ZGF0YQ==' }] }
        };
        getMock.mockResolvedValue({ data: [existing] });
        putMock.mockResolvedValue({
            status: 200,
            data: { configuration_version: '1.0.1' }  // backend ignored 1.0.0, auto-incremented
        });

        await handleImport(BASE_ARGV);  // BASE_ARGV has config-version: '1.0.0'

        expect(logger.warn).toHaveBeenCalledWith(
            `Configuration version "1.0.0" already exists. Auto-incremented to "1.0.1".`
        );
    });

    test('does not warn when backend version matches requested version', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const existing = {
            configuration_id: 'id-abc',
            name: 'my-agent-config',
            configuration: { files: [{ name: 'other.yaml', data: 'ZGF0YQ==' }] }
        };
        getMock.mockResolvedValue({ data: [existing] });
        putMock.mockResolvedValue({
            status: 200,
            data: { configuration_version: '1.0.0' }  // backend respected the version
        });

        await handleImport(BASE_ARGV);

        expect(logger.warn).not.toHaveBeenCalled();
    });

    test('uses --config-version in the PUT payload', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const existing = {
            configuration_id: 'id-abc',
            name: 'my-agent-config',
            configuration: { files: [{ name: 'other.yaml', data: 'ZGF0YQ==' }] }
        };
        getMock.mockResolvedValue({ data: [existing] });
        putMock.mockResolvedValue({ status: 200 });

        await handleImport({ ...BASE_ARGV, 'config-version': '1.2.3' });

        const [, body] = putMock.mock.calls[0];
        expect(body.version).toBe('1.2.3');
    });

    // ── Fail fast — multiple folders ──────────────────────────────────────────

    test('throws when --include matches multiple folders', async () => {
        mockedGlobSync.mockReturnValue([
            'root/agent1/config1.yaml',
            'root/agent2/config1.yaml'
        ] as any);

        await expect(handleImport(BASE_ARGV)).rejects.toThrow(
            'Only single-folder import is supported'
        );
        expect(getMock).not.toHaveBeenCalled();
    });

    test('error message for multiple folders includes folder names', async () => {
        mockedGlobSync.mockReturnValue([
            'root/agent1/config1.yaml',
            'root/agent2/config1.yaml'
        ] as any);

        await expect(handleImport(BASE_ARGV)).rejects.toThrow('agent1');
    });

    // ── Flags / connection ────────────────────────────────────────────────────

    test('uses INSTANA_SERVER and INSTANA_API_TOKEN env vars when flags omitted', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        getMock.mockResolvedValue({ data: [] });
        postMock.mockResolvedValue({ status: 200 });

        const argv = { type: 'com.ibm.instana.agent', include: 'agent-folder/**/*.yaml', 'config-name': 'myConfig', 'config-version': '1.0.0', debug: false };
        await handleImport(argv);

        const [, , opts] = postMock.mock.calls[0];
        expect(opts.headers['Authorization']).toBe('apiToken test-token');
    });

    test('throws when server is missing from argv and env', async () => {
        delete process.env.INSTANA_SERVER;
        const argv = { token: 'tok', type: 'com.ibm.instana.agent', include: 'x/**/*.yaml', 'config-name': 'c', 'config-version': '1.0.0', debug: false };
        await expect(handleImport(argv)).rejects.toThrow('Missing server');
    });

    test('throws when token is missing from argv and env', async () => {
        delete process.env.INSTANA_API_TOKEN;
        const argv = { server: 'example.com', type: 'com.ibm.instana.agent', include: 'x/**/*.yaml', 'config-name': 'c', 'config-version': '1.0.0', debug: false };
        await expect(handleImport(argv)).rejects.toThrow('Missing API token');
    });

    test('throws when type is missing', async () => {
        const argv = { ...BASE_ARGV, type: undefined };
        await expect(handleImport(argv)).rejects.toThrow('Missing required parameter: --type');
    });

    test('throws when no files match pattern', async () => {
        mockedGlobSync.mockReturnValue([] as any);
        await expect(handleImport(BASE_ARGV)).rejects.toThrow('No files matched pattern');
    });

    // ── Error handling ────────────────────────────────────────────────────────

    test('throws and logs when GET fails', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const axiosError = Object.assign(new Error('Unauthorized'), {
            isAxiosError: true,
            response: { status: 401, data: { message: 'unauthorized' } }
        });
        getMock.mockRejectedValue(axiosError);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleImport(BASE_ARGV)).rejects.toThrow('Unauthorized');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('fetch existing configurations'));
    });

    test('throws and logs when POST fails', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        getMock.mockResolvedValue({ data: [] });
        const axiosError = Object.assign(new Error('Bad Request'), {
            isAxiosError: true,
            response: { status: 400, data: { message: 'invalid payload' } }
        });
        postMock.mockRejectedValue(axiosError);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleImport(BASE_ARGV)).rejects.toThrow('Bad Request');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('create configuration "my-agent-config"'));
    });

    test('throws and logs when PUT fails', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const existing = {
            configuration_id: 'id-abc',
            name: 'my-agent-config',
            configuration: { files: [{ name: 'other.yaml', data: 'ZGF0YQ==' }] }
        };
        getMock.mockResolvedValue({ data: [existing] });
        const axiosError = Object.assign(new Error('Server Error'), {
            isAxiosError: true,
            response: { status: 500, data: { message: 'internal error' } }
        });
        putMock.mockRejectedValue(axiosError);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleImport(BASE_ARGV)).rejects.toThrow('Server Error');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('update configuration "my-agent-config"'));
    });

    test('throws and logs on non-axios POST error', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        getMock.mockResolvedValue({ data: [] });
        postMock.mockRejectedValue(new Error('Unexpected failure'));
        mockedAxios.isAxiosError.mockReturnValue(false);

        await expect(handleImport(BASE_ARGV)).rejects.toThrow('Unexpected failure');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('create configuration "my-agent-config"'));
    });

    // ── API contract ──────────────────────────────────────────────────────────

    test('GET includes type as a query param', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        getMock.mockResolvedValue({ data: [] });
        postMock.mockResolvedValue({ status: 200 });

        await handleImport(BASE_ARGV);

        const [, getOpts] = getMock.mock.calls[0];
        expect(getOpts.params).toEqual({ type: 'com.ibm.instana.agent' });
    });

    test('PUT URL includes the configuration_id from the existing record', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        const existing = {
            configuration_id: 'the-real-id',
            name: 'my-agent-config',
            configuration: { files: [{ name: 'other.yaml', data: 'ZGF0YQ==' }] }
        };
        getMock.mockResolvedValue({ data: [existing] });
        putMock.mockResolvedValue({ status: 200 });

        await handleImport(BASE_ARGV);

        const [url] = putMock.mock.calls[0];
        expect(url).toBe('https://example.instana.com/api/fleet/configurations/the-real-id');
    });

    test('handles list response with .items wrapper', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        getMock.mockResolvedValue({ data: { items: [] } });
        postMock.mockResolvedValue({ status: 200 });

        await handleImport(BASE_ARGV);

        expect(postMock).toHaveBeenCalledTimes(1);
    });

    test('handles list response with bare array (no .items wrapper)', async () => {
        mockedGlobSync.mockReturnValue(['agent-folder/config1.yaml'] as any);
        getMock.mockResolvedValue({ data: [] });
        postMock.mockResolvedValue({ status: 200 });

        await handleImport(BASE_ARGV);

        expect(postMock).toHaveBeenCalledTimes(1);
    });
});
