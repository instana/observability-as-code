import axios from 'axios';
import { parseTags, handleAxiosError, resolveConnection, sendAgentRequest } from '../utils';

jest.mock('axios');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
    isDebugEnabled: jest.fn(() => false)
}));
jest.mock('../validators', () => ({
    validateServerAddress: jest.fn()
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('parseTags', () => {
    it('parses a single key=value tag', () => {
        expect(parseTags(['entity.type=otel-collector'])).toEqual({
            'entity.type': 'otel-collector'
        });
    });

    it('parses multiple key=value tags', () => {
        expect(parseTags(['entity.type=otel-collector', 'region=us-east'])).toEqual({
            'entity.type': 'otel-collector',
            'region': 'us-east'
        });
    });

    it('allows = in the value', () => {
        expect(parseTags(['key=val=ue'])).toEqual({ key: 'val=ue' });
    });

    it('trims whitespace from keys and values', () => {
        expect(parseTags([' env = prod '])).toEqual({ env: 'prod' });
    });

    it('returns empty object for empty array input', () => {
        expect(parseTags([])).toEqual({});
    });

    it('throws on missing = separator', () => {
        expect(() => parseTags(['invalidTag'])).toThrow(
            'Invalid tag format: invalidTag. Expected key=value'
        );
    });

    it('throws on missing key', () => {
        expect(() => parseTags(['=value'])).toThrow(
            'Invalid tag format: =value. Expected key=value'
        );
    });

    it('throws on empty value (allowEmpty defaults to false)', () => {
        expect(() => parseTags(['key='])).toThrow(
            'Invalid tag format: key=. Expected key=value'
        );
    });
});

describe('parseTags (allowEmpty = true)', () => {
    it('parses a single key=value tag', () => {
        expect(parseTags(['team=sre'], true)).toEqual({ team: 'sre' });
    });

    it('parses multiple key=value tags', () => {
        expect(parseTags(['team=sre', 'region=us-east'], true)).toEqual({
            team: 'sre',
            region: 'us-east'
        });
    });

    it('allows empty value (key=) for tag deletion', () => {
        expect(parseTags(['team='], true)).toEqual({ team: '' });
    });

    it('allows = in the value', () => {
        expect(parseTags(['key=val=ue'], true)).toEqual({ key: 'val=ue' });
    });

    it('trims whitespace from keys', () => {
        expect(parseTags([' env = prod '], true)).toEqual({ env: 'prod' });
    });

    it('returns empty object for empty array input', () => {
        expect(parseTags([], true)).toEqual({});
    });

    it('throws when = separator is missing', () => {
        expect(() => parseTags(['invalidtag'], true)).toThrow(
            'Invalid tag format: invalidtag. Expected key=value or key= (to delete)'
        );
    });

    it('throws when key is empty', () => {
        expect(() => parseTags(['=value'], true)).toThrow(
            'Invalid tag format: =value. Expected key=value or key= (to delete)'
        );
    });

    it('treats whitespace-only value as empty (deletion)', () => {
        expect(parseTags(['team=   '], true)).toEqual({ team: '' });
    });

    it('mixes add/update and delete in one call', () => {
        expect(parseTags(['env=dev', 'abc=123', 'team='], true)).toEqual({
            env: 'dev',
            abc: '123',
            team: ''
        });
    });
});

describe('handleAxiosError', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('logs response data when axios error has a response', () => {
        const logger = require('../logger');
        const error = { response: { data: { message: 'bad request' } } };
        mockedAxios.isAxiosError.mockReturnValue(true);

        handleAxiosError(error, 'test context');

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed test context')
        );
    });

    it('logs error message when axios error has no response', () => {
        const logger = require('../logger');
        const error = { message: 'Network Error', response: undefined };
        mockedAxios.isAxiosError.mockReturnValue(true);

        handleAxiosError(error, 'test context');

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Network Error')
        );
    });

    it('logs string representation for non-axios errors', () => {
        const logger = require('../logger');
        const error = new Error('Something unexpected');
        mockedAxios.isAxiosError.mockReturnValue(false);

        handleAxiosError(error, 'test context');

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Something unexpected')
        );
    });
});

describe('resolveConnection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.INSTANA_SERVER = 'localhost:8080';
        process.env.INSTANA_API_TOKEN = 'test-token';
    });

    it('returns server, token and type from argv', () => {
        const result = resolveConnection({
            server: 'myserver.com',
            token: 'mytoken',
            type: 'com.ibm.instana.agent',
            debug: false
        });
        expect(result).toEqual({ server: 'myserver.com', token: 'mytoken', type: 'com.ibm.instana.agent' });
    });

    it('falls back to env vars for server and token', () => {
        const result = resolveConnection({ type: 'com.ibm.instana.agent' });
        expect(result.server).toBe('localhost:8080');
        expect(result.token).toBe('test-token');
    });

    it('throws when server is missing from argv and env', () => {
        delete process.env.INSTANA_SERVER;
        expect(() => resolveConnection({ token: 'x', type: 'y' }))
            .toThrow('Missing server. Specify --server or set INSTANA_SERVER');
    });

    it('throws when token is missing from argv and env', () => {
        delete process.env.INSTANA_API_TOKEN;
        expect(() => resolveConnection({ server: 'localhost', type: 'y' }))
            .toThrow('Missing API token. Specify --token or set INSTANA_API_TOKEN');
    });

    it('throws when type is missing', () => {
        expect(() => resolveConnection({ server: 'localhost', token: 'x' }))
            .toThrow('Missing required parameter: --type');
    });

    it('sets debug log level when debug flag is true', () => {
        const logger = require('../logger');
        resolveConnection({ server: 'localhost', token: 'x', type: 'y', debug: true });
        expect(logger.level).toBe('debug');
    });
});

describe('sendAgentRequest', () => {
    const baseArgv = {
        server: 'localhost:8080',
        token: 'test-token',
        type: 'com.ibm.opentelemetrycollector',
        tag: ['entity.type=otel-collector'],
        debug: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.INSTANA_SERVER = 'localhost:8080';
        process.env.INSTANA_API_TOKEN = 'test-token';
        mockedAxios.create.mockReturnValue({ post: jest.fn() } as any);
    });

    it('sends correct request body without configurationId (restart)', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '1', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        await sendAgentRequest('agent.restart', baseArgv);

        const [url, body] = postMock.mock.calls[0];
        expect(url).toBe('http://localhost:8080/api/unified-agent-request');
        expect(body).toEqual({
            action: 'agent.restart',
            type: 'com.ibm.opentelemetrycollector',
            tags: { 'entity.type': 'otel-collector' }
        });
        expect(body.args).toBeUndefined();
    });

    it('sends correct request body with configurationId (deploy/update)', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '2', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        await sendAgentRequest('agent.component.deploy', baseArgv, 'cfg-123');

        const [, body] = postMock.mock.calls[0];
        expect(body.action).toBe('agent.component.deploy');
        expect(body.args).toEqual({ configurationId: 'cfg-123' });
    });

    it('sends tagsToApply in args.tags for tag-set', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '3', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        await sendAgentRequest('agent.tag.set', baseArgv, undefined, { team: 'sre', env: '' });

        const [, body] = postMock.mock.calls[0];
        expect(body.action).toBe('agent.tag.set');
        expect(body.args).toEqual({ tags: { team: 'sre', env: '' } });
        expect(body.args.configurationId).toBeUndefined();
    });

    it('sends both configurationId and tagsToApply in args when both provided', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '4', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        await sendAgentRequest('agent.test', baseArgv, 'cfg-abc', { team: 'sre' });

        const [, body] = postMock.mock.calls[0];
        expect(body.args).toEqual({ configurationId: 'cfg-abc', tags: { team: 'sre' } });
    });

    it('omits args entirely when neither configurationId nor tagsToApply are provided', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '5', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        await sendAgentRequest('agent.restart', baseArgv);

        const [, body] = postMock.mock.calls[0];
        expect(body.args).toBeUndefined();
    });

    it('sets Authorization header correctly', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '3', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        await sendAgentRequest('agent.restart', baseArgv);

        const [, , config] = postMock.mock.calls[0];
        expect(config.headers['Authorization']).toBe('apiToken test-token');
        expect(config.headers['Content-Type']).toBe('application/json');
    });

    it('throws when server is missing', async () => {
        delete process.env.INSTANA_SERVER;
        await expect(sendAgentRequest('agent.restart', { token: 'x', type: 'y', tag: ['a=b'] }))
            .rejects.toThrow('Missing server. Specify --server or set INSTANA_SERVER');
    });

    it('throws when token is missing', async () => {
        delete process.env.INSTANA_API_TOKEN;
        await expect(sendAgentRequest('agent.restart', { server: 'localhost', type: 'y', tag: ['a=b'] }))
            .rejects.toThrow('Missing API token. Specify --token or set INSTANA_API_TOKEN');
    });

    it('throws when type is missing', async () => {
        await expect(sendAgentRequest('agent.restart', { ...baseArgv, type: undefined }))
            .rejects.toThrow('Missing required parameter: --type');
    });

    it('throws when no tags provided', async () => {
        await expect(sendAgentRequest('agent.restart', { ...baseArgv, tag: [] }))
            .rejects.toThrow('Missing required parameter: --tag (at least one tag is required)');
    });

    it('sets debug log level when debug flag is true', async () => {
        const postMock = jest.fn().mockResolvedValue({ data: { requestId: '1', status: 'accepted' } });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        const logger = require('../logger');

        await sendAgentRequest('agent.restart', { ...baseArgv, debug: true });

        expect(logger.level).toBe('debug');
    });

    it('logs debug response when isDebugEnabled returns true', async () => {
        const postMock = jest.fn().mockResolvedValue({ data: { requestId: '1', status: 'accepted' } });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        const logger = require('../logger');
        logger.isDebugEnabled.mockReturnValue(true);

        await sendAgentRequest('agent.restart', baseArgv);

        expect(logger.debug).toHaveBeenCalledWith(
            JSON.stringify({ requestId: '1', status: 'accepted' }, null, 2)
        );
    });

    it('rethrows on HTTP error', async () => {
        const axiosError = Object.assign(new Error('Bad Request'), {
            isAxiosError: true,
            response: { data: { message: 'bad' } }
        });
        mockedAxios.create.mockReturnValue({ post: jest.fn().mockRejectedValue(axiosError) } as any);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(sendAgentRequest('agent.restart', baseArgv)).rejects.toThrow('Bad Request');
    });

    it('rethrows on non-axios error', async () => {
        const plainError = new Error('Unexpected');
        mockedAxios.create.mockReturnValue({ post: jest.fn().mockRejectedValue(plainError) } as any);
        mockedAxios.isAxiosError.mockReturnValue(false);

        await expect(sendAgentRequest('agent.restart', baseArgv)).rejects.toThrow('Unexpected');
    });

    it('uses environment variables when server/token not in argv', async () => {
        const postMock = jest.fn().mockResolvedValue({ data: { requestId: '9', status: 'accepted' } });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const result = await sendAgentRequest('agent.restart', { type: baseArgv.type, tag: baseArgv.tag });
        expect(result.requestId).toBe('9');
    });
});
