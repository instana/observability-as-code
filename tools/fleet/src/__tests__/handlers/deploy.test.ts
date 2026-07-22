import axios from 'axios';
import { handleDeploy } from '../../handlers/deploy';

jest.mock('axios');
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
    isDebugEnabled: jest.fn(() => false)
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('handleDeploy', () => {
    const baseArgv = {
        server: 'localhost:8080',
        token: 'test-token',
        type: 'com.ibm.opentelemetrycollector',
        'configuration-id': 'bfuW0eeKTCWgL73t3zyzgA',
        tag: ['otel.attribute.entity.type=otel-collector'],
        debug: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.INSTANA_SERVER = 'localhost:8080';
        process.env.INSTANA_API_TOKEN = 'test-token';

        mockedAxios.create.mockReturnValue({
            post: jest.fn()
        } as any);
    });

    test('successfully sends deploy request with tags', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '123', status: 'accepted', message: 'queued' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = { ...baseArgv, tag: ['otel.attribute.entity.type=otel-collector'] };
        const result = await handleDeploy(argv);

        expect(postMock).toHaveBeenCalledTimes(1);
        const [url, body, config] = postMock.mock.calls[0];
        expect(url).toBe('http://localhost:8080/api/unified-agent-request');
        expect(body).toEqual({
            action: 'agent.component.deploy',
            type: 'com.ibm.opentelemetrycollector',
            tags: { 'otel.attribute.entity.type': 'otel-collector' },
            args: { configurationId: 'bfuW0eeKTCWgL73t3zyzgA' }
        });
        expect(config.headers['Authorization']).toBe('apiToken test-token');
        expect(config.headers['Content-Type']).toBe('application/json');
        expect(result).toEqual({ requestId: '123', status: 'accepted', message: 'queued' });
    });

    test('throws when no tags are provided', async () => {
        const argv = { ...baseArgv, tag: [] };
        await expect(handleDeploy(argv)).rejects.toThrow(
            'Missing required parameter: --tag (at least one tag is required)'
        );
    });

    test('successfully sends deploy request with a single tag', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '456', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = {
            ...baseArgv,
            tag: ['otel.attribute.entity.type=com.ibm.instana.agent.opentelemetrycollector']
        };

        const result = await handleDeploy(argv);

        expect(postMock).toHaveBeenCalledTimes(1);
        const [, body] = postMock.mock.calls[0];
        expect(body).toEqual({
            action: 'agent.component.deploy',
            type: 'com.ibm.opentelemetrycollector',
            tags: { 'otel.attribute.entity.type': 'com.ibm.instana.agent.opentelemetrycollector' },
            args: { configurationId: 'bfuW0eeKTCWgL73t3zyzgA' }
        });
        expect(result.requestId).toBe('456');
    });

    test('successfully sends deploy request with multiple tags', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '789', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = {
            ...baseArgv,
            tag: ['entity.type=otel-collector', 'region=us-east']
        };

        await handleDeploy(argv);

        const [, body] = postMock.mock.calls[0];
        expect(body.tags).toEqual({
            'entity.type': 'otel-collector',
            'region': 'us-east'
        });
    });

    test('configurationId goes inside args, not at top level', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '123', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        await handleDeploy(baseArgv);

        const [, body] = postMock.mock.calls[0];
        expect(body.args.configurationId).toBe('bfuW0eeKTCWgL73t3zyzgA');
        expect(body.configurationId).toBeUndefined();
    });

    test('uses environment variables when server/token not in argv', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '789', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = {
            type: baseArgv.type,
            'configuration-id': baseArgv['configuration-id'],
            tag: ['entity.type=otel-collector']
        };

        const result = await handleDeploy(argv);
        expect(result.requestId).toBe('789');
        expect(postMock).toHaveBeenCalled();
    });

    test('throws when server is missing from argv and env', async () => {
        delete process.env.INSTANA_SERVER;

        const argv = { token: 'test', type: baseArgv.type, 'configuration-id': baseArgv['configuration-id'] };
        await expect(handleDeploy(argv)).rejects.toThrow(
            'Missing server. Specify --server or set INSTANA_SERVER'
        );
    });

    test('throws when token is missing from argv and env', async () => {
        delete process.env.INSTANA_API_TOKEN;

        const argv = { server: 'localhost:8080', type: baseArgv.type, 'configuration-id': baseArgv['configuration-id'] };
        await expect(handleDeploy(argv)).rejects.toThrow(
            'Missing API token. Specify --token or set INSTANA_API_TOKEN'
        );
    });

    test('throws when configurationId is missing', async () => {
        const argv = { ...baseArgv, 'configuration-id': undefined };
        await expect(handleDeploy(argv)).rejects.toThrow(
            'Missing required parameter: --configuration-id'
        );
    });

    test('throws when type is missing', async () => {
        const argv = { ...baseArgv, type: undefined };
        await expect(handleDeploy(argv)).rejects.toThrow(
            'Missing required parameter: --type'
        );
    });

    test('throws when tag format is invalid (missing value)', async () => {
        const argv = { ...baseArgv, tag: ['invalidTag'] };
        await expect(handleDeploy(argv)).rejects.toThrow('Invalid tag format');
    });

    test('throws when tag format is invalid (missing key)', async () => {
        const argv = { ...baseArgv, tag: ['=value'] };
        await expect(handleDeploy(argv)).rejects.toThrow('Invalid tag format');
    });

    test('tag value can contain = character', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '999', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = { ...baseArgv, tag: ['key=val=ue'] };
        await handleDeploy(argv);

        const [, body] = postMock.mock.calls[0];
        expect(body.tags).toEqual({ key: 'val=ue' });
    });

    test('logs error and rethrows on HTTP error response', async () => {
        const axiosError = Object.assign(new Error('Bad Request'), {
            isAxiosError: true,
            response: { data: { message: 'bad request' } }
        });
        const postMock = jest.fn().mockRejectedValue(axiosError);
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleDeploy(baseArgv)).rejects.toThrow('Bad Request');
    });

    test('logs error and rethrows on network error', async () => {
        const networkError = Object.assign(new Error('Network Error'), {
            isAxiosError: true,
            response: undefined
        });
        const postMock = jest.fn().mockRejectedValue(networkError);
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleDeploy(baseArgv)).rejects.toThrow('Network Error');
    });

    test('logs error and rethrows on non-axios error', async () => {
        const plainError = new Error('Something unexpected');
        const postMock = jest.fn().mockRejectedValue(plainError);
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(false);

        await expect(handleDeploy(baseArgv)).rejects.toThrow('Something unexpected');
    });

    test('sets debug log level when debug flag is true', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '123', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        const logger = require('../../logger').default ?? require('../../logger');

        await handleDeploy({ ...baseArgv, debug: true });

        expect(logger.level).toBe('debug');
    });

    test('logs debug response when isDebugEnabled returns true', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '123', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        const logger = require('../../logger');
        logger.isDebugEnabled.mockReturnValue(true);

        await handleDeploy(baseArgv);

        expect(logger.debug).toHaveBeenCalledWith(
            JSON.stringify({ requestId: '123', status: 'accepted' }, null, 2)
        );
    });
});
