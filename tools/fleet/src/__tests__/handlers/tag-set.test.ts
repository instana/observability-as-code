import axios from 'axios';
import { handleTag } from '../../handlers/tag-set';

jest.mock('axios');
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
    isDebugEnabled: jest.fn(() => false)
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('handleTag', () => {
    const baseArgv = {
        server: 'localhost:8080',
        token: 'test-token',
        type: 'com.ibm.instana.customcollector',
        tags: ['team=sre'],
        tag: ['env=staging'],
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

    test('successfully sends tag-set request with a single tag to apply', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '123', status: 'accepted', message: 'Request accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const result = await handleTag(baseArgv);

        expect(postMock).toHaveBeenCalledTimes(1);
        const [url, body, config] = postMock.mock.calls[0];
        expect(url).toBe('http://localhost:8080/api/unified-agent-request');
        expect(body).toEqual({
            action: 'agent.tag.set',
            type: 'com.ibm.instana.customcollector',
            tags: { 'env': 'staging' },
            args: { tags: { 'team': 'sre' } }
        });
        expect(config.headers['Authorization']).toBe('apiToken test-token');
        expect(config.headers['Content-Type']).toBe('application/json');
        expect(result).toEqual({ requestId: '123', status: 'accepted', message: 'Request accepted' });
    });

    test('sends multiple tags to apply', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '456', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = { ...baseArgv, tags: ['team=sre', 'region=us-east', 'abc=123'] };
        await handleTag(argv);

        const [, body] = postMock.mock.calls[0];
        expect(body.args.tags).toEqual({ team: 'sre', region: 'us-east', abc: '123' });
    });

    test('sends empty value for tag deletion (team=)', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '789', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = { ...baseArgv, tags: ['team='] };
        await handleTag(argv);

        const [, body] = postMock.mock.calls[0];
        expect(body.args.tags).toEqual({ team: '' });
    });

    test('mixes add/update and delete tags in one call', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '999', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = { ...baseArgv, tags: ['env=dev', 'abc=123', 'team='] };
        await handleTag(argv);

        const [, body] = postMock.mock.calls[0];
        expect(body.args.tags).toEqual({ env: 'dev', abc: '123', team: '' });
    });

    test('selector tags go into top-level tags, not args', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '111', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = { ...baseArgv, tag: ['otel.attribute.service.instance.id=otel-demo.fyre.ibm.com'] };
        await handleTag(argv);

        const [, body] = postMock.mock.calls[0];
        expect(body.tags).toEqual({ 'otel.attribute.service.instance.id': 'otel-demo.fyre.ibm.com' });
        expect(body.args.tags).toEqual({ team: 'sre' });
        expect(body.configurationId).toBeUndefined();
    });

    test('action is agent.tag.set', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '222', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        await handleTag(baseArgv);

        const [, body] = postMock.mock.calls[0];
        expect(body.action).toBe('agent.tag.set');
    });

    test('uses environment variables when server/token not in argv', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '333', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);

        const argv = { type: baseArgv.type, tags: ['team=sre'], tag: ['env=staging'] };
        const result = await handleTag(argv);

        expect(result.requestId).toBe('333');
        expect(postMock).toHaveBeenCalled();
    });

    test('throws when no positional tags are provided', async () => {
        const argv = { ...baseArgv, tags: [] };
        await expect(handleTag(argv)).rejects.toThrow(
            'Missing required positional argument: at least one key=value pair is required'
        );
    });

    test('throws when positional tag is missing = separator', async () => {
        const argv = { ...baseArgv, tags: ['invalidtag'] };
        await expect(handleTag(argv)).rejects.toThrow(
            'Invalid tag format: invalidtag. Expected key=value or key= (to delete)'
        );
    });

    test('throws when positional tag has no key', async () => {
        const argv = { ...baseArgv, tags: ['=value'] };
        await expect(handleTag(argv)).rejects.toThrow(
            'Invalid tag format: =value. Expected key=value or key= (to delete)'
        );
    });

    test('throws when selector --tag is missing', async () => {
        const argv = { ...baseArgv, tag: [] };
        await expect(handleTag(argv)).rejects.toThrow(
            'Missing required parameter: --tag (at least one tag is required)'
        );
    });

    test('throws when server is missing from argv and env', async () => {
        delete process.env.INSTANA_SERVER;

        const argv = { token: 'test-token', type: baseArgv.type, tags: ['team=sre'], tag: ['env=staging'] };
        await expect(handleTag(argv)).rejects.toThrow(
            'Missing server. Specify --server or set INSTANA_SERVER'
        );
    });

    test('throws when token is missing from argv and env', async () => {
        delete process.env.INSTANA_API_TOKEN;

        const argv = { server: 'localhost:8080', type: baseArgv.type, tags: ['team=sre'], tag: ['env=staging'] };
        await expect(handleTag(argv)).rejects.toThrow(
            'Missing API token. Specify --token or set INSTANA_API_TOKEN'
        );
    });

    test('throws when type is missing', async () => {
        const argv = { ...baseArgv, type: undefined };
        await expect(handleTag(argv)).rejects.toThrow(
            'Missing required parameter: --type'
        );
    });

    test('sets debug log level when debug flag is true', async () => {
        const postMock = jest.fn().mockResolvedValue({
            data: { requestId: '123', status: 'accepted' }
        });
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        const logger = require('../../logger');

        await handleTag({ ...baseArgv, debug: true });

        expect(logger.level).toBe('debug');
    });

    test('logs error and rethrows on HTTP error response', async () => {
        const axiosError = Object.assign(new Error('Bad Request'), {
            isAxiosError: true,
            response: { data: { message: 'bad request' } }
        });
        const postMock = jest.fn().mockRejectedValue(axiosError);
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleTag(baseArgv)).rejects.toThrow('Bad Request');
    });

    test('logs error and rethrows on network error', async () => {
        const networkError = Object.assign(new Error('Network Error'), {
            isAxiosError: true,
            response: undefined
        });
        const postMock = jest.fn().mockRejectedValue(networkError);
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleTag(baseArgv)).rejects.toThrow('Network Error');
    });

    test('logs error and rethrows on non-axios error', async () => {
        const plainError = new Error('Something unexpected');
        const postMock = jest.fn().mockRejectedValue(plainError);
        mockedAxios.create.mockReturnValue({ post: postMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(false);

        await expect(handleTag(baseArgv)).rejects.toThrow('Something unexpected');
    });
});
