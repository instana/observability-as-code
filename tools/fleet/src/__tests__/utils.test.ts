import axios from 'axios';
import { parseTags, handleAxiosError } from '../utils';

jest.mock('axios');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
    isDebugEnabled: jest.fn(() => false)
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('parseTags', () => {
    it('returns undefined for an empty array', () => {
        expect(parseTags([])).toBeUndefined();
    });

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

    it('throws on missing value', () => {
        expect(() => parseTags(['invalidTag'])).toThrow(
            'Invalid tag format: invalidTag. Expected key=value'
        );
    });

    it('throws on missing key', () => {
        expect(() => parseTags(['=value'])).toThrow(
            'Invalid tag format: =value. Expected key=value'
        );
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
