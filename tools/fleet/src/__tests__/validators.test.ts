import { validateServerAddress } from '../validators';

describe('validateServerAddress', () => {
    it('should accept valid server addresses without protocol', () => {
        expect(() => validateServerAddress('example.com')).not.toThrow();
        expect(() => validateServerAddress('api.example.com')).not.toThrow();
        expect(() => validateServerAddress('192.168.1.1')).not.toThrow();
        expect(() => validateServerAddress('localhost')).not.toThrow();
        expect(() => validateServerAddress('example.com:8080')).not.toThrow();
        expect(() => validateServerAddress('9.30.211.80:8080')).not.toThrow();
        expect(() => validateServerAddress('api.example.com:443')).not.toThrow();
    });

    it('should reject server addresses with http:// protocol', () => {
        expect(() => validateServerAddress('http://example.com')).toThrow(
            'Invalid server address: Do not include protocol (http:// or https://). Please use only the hostname.'
        );
    });

    it('should reject server addresses with https:// protocol', () => {
        expect(() => validateServerAddress('https://example.com')).toThrow(
            'Invalid server address: Do not include protocol (http:// or https://). Please use only the hostname.'
        );
    });

    it('should reject server addresses with https:// protocol and port', () => {
        expect(() => validateServerAddress('https://example.com:8080')).toThrow(
            'Invalid server address: Do not include protocol (http:// or https://). Please use only the hostname.'
        );
    });

    it('should reject server addresses with other protocols', () => {
        expect(() => validateServerAddress('ftp://example.com')).toThrow(
            'Invalid server address: Protocol prefix detected. Please use only the hostname.'
        );
    });

    it('should handle server addresses with whitespace', () => {
        expect(() => validateServerAddress('  https://example.com  ')).toThrow(
            'Invalid server address: Do not include protocol (http:// or https://). Please use only the hostname.'
        );
    });

    it('should reject empty server address', () => {
        expect(() => validateServerAddress('')).toThrow(
            'Server address is required and must be a string'
        );
    });

    it('should reject null or undefined server address', () => {
        expect(() => validateServerAddress(null as any)).toThrow(
            'Server address is required and must be a string'
        );
        expect(() => validateServerAddress(undefined as any)).toThrow(
            'Server address is required and must be a string'
        );
    });

    it('should reject non-string server address', () => {
        expect(() => validateServerAddress(123 as any)).toThrow(
            'Server address is required and must be a string'
        );
        expect(() => validateServerAddress({} as any)).toThrow(
            'Server address is required and must be a string'
        );
    });
});
