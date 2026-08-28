import { describe, expect, it } from '@jest/globals';

import { logFormat } from '../logger-wrapper';

// Winston's printf transform stores the final formatted string on Symbol.for('message')
const FORMATTED = Symbol.for('message');

describe('logFormat', () => {
    it('produces the expected format: timestamp [label] level: message', () => {
        const result = logFormat.transform({
            level: 'info',
            message: 'Test message',
            label: 'instana-integration',
            timestamp: '2024-01-01T00:00:00.000Z',
        }) as any;

        expect(result[FORMATTED]).toBe('2024-01-01T00:00:00.000Z [instana-integration] info: Test message');
    });

    it('formats error level correctly', () => {
        const result = logFormat.transform({
            level: 'error',
            message: 'Error occurred',
            label: 'instana-integration',
            timestamp: '2024-01-01T12:00:00.000Z',
        }) as any;

        expect(result[FORMATTED]).toBe('2024-01-01T12:00:00.000Z [instana-integration] error: Error occurred');
    });

    it('formats warn level correctly', () => {
        const result = logFormat.transform({
            level: 'warn',
            message: 'Warning message',
            label: 'instana-integration',
            timestamp: '2024-01-01T12:00:00.000Z',
        }) as any;

        expect(result[FORMATTED]).toBe('2024-01-01T12:00:00.000Z [instana-integration] warn: Warning message');
    });

    it('formats debug level correctly', () => {
        const result = logFormat.transform({
            level: 'debug',
            message: 'Debug info',
            label: 'instana-integration',
            timestamp: '2024-01-01T12:00:00.000Z',
        }) as any;

        expect(result[FORMATTED]).toBe('2024-01-01T12:00:00.000Z [instana-integration] debug: Debug info');
    });

    it('handles empty message', () => {
        const result = logFormat.transform({
            level: 'info',
            message: '',
            label: 'instana-integration',
            timestamp: '2024-01-01T12:00:00.000Z',
        }) as any;

        expect(result[FORMATTED]).toBe('2024-01-01T12:00:00.000Z [instana-integration] info: ');
    });

    it('handles message with special characters', () => {
        const result = logFormat.transform({
            level: 'info',
            message: 'Special chars: !@#$%^&*()',
            label: 'instana-integration',
            timestamp: '2024-01-01T12:00:00.000Z',
        }) as any;

        expect(result[FORMATTED]).toBe('2024-01-01T12:00:00.000Z [instana-integration] info: Special chars: !@#$%^&*()');
    });

    it('handles multiline message', () => {
        const result = logFormat.transform({
            level: 'info',
            message: 'Line 1\nLine 2\nLine 3',
            label: 'instana-integration',
            timestamp: '2024-01-01T12:00:00.000Z',
        }) as any;

        expect(result[FORMATTED]).toBe('2024-01-01T12:00:00.000Z [instana-integration] info: Line 1\nLine 2\nLine 3');
    });
});
