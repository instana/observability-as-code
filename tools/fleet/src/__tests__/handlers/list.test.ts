import axios from 'axios';
import { handleList } from '../../handlers/list';

jest.mock('axios');
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
    isDebugEnabled: jest.fn(() => false)
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('handleList', () => {
    const baseArgv = {
        server: 'localhost:8080',
        token: 'test-token',
        type: 'com.ibm.instana.customcollector',
        debug: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.INSTANA_SERVER = 'localhost:8080';
        process.env.INSTANA_API_TOKEN = 'test-token';

        mockedAxios.create.mockReturnValue({
            get: jest.fn()
        } as any);
    });

    test('successfully lists configurations', async () => {
        const getMock = jest.fn().mockResolvedValue({
            data: [{ id: 'cfg-1', name: 'my-config' }]
        });
        mockedAxios.create.mockReturnValue({ get: getMock } as any);

        const result = await handleList(baseArgv);

        expect(getMock).toHaveBeenCalledTimes(1);
        const [url, config] = getMock.mock.calls[0];
        expect(url).toBe('https://localhost:8080/api/fleet/configurations');
        expect(config.params).toEqual({ type: 'com.ibm.instana.customcollector' });
        expect(config.headers['Authorization']).toBe('apiToken test-token');
        expect(result).toEqual([{ id: 'cfg-1', name: 'my-config' }]);
    });

    test('uses environment variables when server/token not in argv', async () => {
        const getMock = jest.fn().mockResolvedValue({
            data: [{ id: 'cfg-2' }]
        });
        mockedAxios.create.mockReturnValue({ get: getMock } as any);

        const argv = { type: baseArgv.type, debug: false };
        const result = await handleList(argv);

        expect(result).toEqual([{ id: 'cfg-2' }]);
        expect(getMock).toHaveBeenCalled();
    });

    test('throws when server is missing from argv and env', async () => {
        delete process.env.INSTANA_SERVER;

        const argv = { token: 'test-token', type: baseArgv.type };
        await expect(handleList(argv)).rejects.toThrow(
            'Missing server. Specify --server or set INSTANA_SERVER'
        );
    });

    test('throws when token is missing from argv and env', async () => {
        delete process.env.INSTANA_API_TOKEN;

        const argv = { server: 'localhost:8080', type: baseArgv.type };
        await expect(handleList(argv)).rejects.toThrow(
            'Missing API token. Specify --token or set INSTANA_API_TOKEN'
        );
    });

    test('throws when type is missing', async () => {
        const argv = { ...baseArgv, type: undefined };
        await expect(handleList(argv)).rejects.toThrow(
            'Missing required parameter: --type'
        );
    });

    test('sets debug log level when debug flag is true', async () => {
        const getMock = jest.fn().mockResolvedValue({ data: [] });
        mockedAxios.create.mockReturnValue({ get: getMock } as any);
        const logger = require('../../logger');

        await handleList({ ...baseArgv, debug: true });

        expect(logger.level).toBe('debug');
    });

    test('logs debug response when isDebugEnabled returns true', async () => {
        const getMock = jest.fn().mockResolvedValue({ data: [{ id: 'cfg-1' }] });
        mockedAxios.create.mockReturnValue({ get: getMock } as any);
        const logger = require('../../logger');
        logger.isDebugEnabled.mockReturnValue(true);

        await handleList(baseArgv);

        expect(logger.debug).toHaveBeenCalledWith(
            JSON.stringify([{ id: 'cfg-1' }], null, 2)
        );
        expect(logger.info).not.toHaveBeenCalledWith(
            JSON.stringify([{ id: 'cfg-1' }], null, 2)
        );
    });

    test('logs info response when isDebugEnabled returns false', async () => {
        const getMock = jest.fn().mockResolvedValue({ data: [{ id: 'cfg-1' }] });
        mockedAxios.create.mockReturnValue({ get: getMock } as any);
        const logger = require('../../logger');
        logger.isDebugEnabled.mockReturnValue(false);

        await handleList(baseArgv);

        expect(logger.info).toHaveBeenCalledWith(
            JSON.stringify([{ id: 'cfg-1' }], null, 2)
        );
        expect(logger.debug).not.toHaveBeenCalled();
    });

    test('logs error and rethrows on HTTP error response', async () => {
        const axiosError = Object.assign(new Error('Bad Request'), {
            isAxiosError: true,
            response: { data: { message: 'bad request' } }
        });
        const getMock = jest.fn().mockRejectedValue(axiosError);
        mockedAxios.create.mockReturnValue({ get: getMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleList(baseArgv)).rejects.toThrow('Bad Request');
    });

    test('logs error and rethrows on network error', async () => {
        const networkError = Object.assign(new Error('Network Error'), {
            isAxiosError: true,
            response: undefined
        });
        const getMock = jest.fn().mockRejectedValue(networkError);
        mockedAxios.create.mockReturnValue({ get: getMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(true);

        await expect(handleList(baseArgv)).rejects.toThrow('Network Error');
    });

    test('logs error and rethrows on non-axios error', async () => {
        const plainError = new Error('Something unexpected');
        const getMock = jest.fn().mockRejectedValue(plainError);
        mockedAxios.create.mockReturnValue({ get: getMock } as any);
        mockedAxios.isAxiosError.mockReturnValue(false);

        await expect(handleList(baseArgv)).rejects.toThrow('Something unexpected');
    });
});
