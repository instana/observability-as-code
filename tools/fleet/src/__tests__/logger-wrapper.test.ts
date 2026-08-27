import { describe, expect, it } from '@jest/globals';

import { logFormat } from '../logger-wrapper';

describe('Logger Wrapper - logFormat Function', () => {
  it('should format log messages with all fields', () => {
    const result = logFormat.transform({
      level: 'info',
      message: 'Test message',
      label: 'instana-fleet',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('message');
  });

  it('should format error level messages', () => {
    const result = logFormat.transform({
      level: 'error',
      message: 'Error occurred',
      label: 'instana-fleet',
      timestamp: '2024-01-01T12:00:00.000Z',
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('message');
  });

  it('should format warn level messages', () => {
    const result = logFormat.transform({
      level: 'warn',
      message: 'Warning message',
      label: 'instana-fleet',
      timestamp: '2024-01-01T12:00:00.000Z',
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('message');
  });

  it('should format debug level messages', () => {
    const result = logFormat.transform({
      level: 'debug',
      message: 'Debug info',
      label: 'instana-fleet',
      timestamp: '2024-01-01T12:00:00.000Z',
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('message');
  });

  it('should handle empty messages', () => {
    const result = logFormat.transform({
      level: 'info',
      message: '',
      label: 'instana-fleet',
      timestamp: '2024-01-01T12:00:00.000Z',
    });

    expect(result).toBeDefined();
  });

  it('should handle messages with special characters', () => {
    const result = logFormat.transform({
      level: 'info',
      message: 'Special chars: !@#$%^&*()',
      label: 'instana-fleet',
      timestamp: '2024-01-01T12:00:00.000Z',
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('message');
  });

  it('should handle long messages', () => {
    const longMessage = 'A'.repeat(1000);
    const result = logFormat.transform({
      level: 'info',
      message: longMessage,
      label: 'instana-fleet',
      timestamp: '2024-01-01T12:00:00.000Z',
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('message');
  });

  it('should handle multiline messages', () => {
    const result = logFormat.transform({
      level: 'info',
      message: 'Line 1\nLine 2\nLine 3',
      label: 'instana-fleet',
      timestamp: '2024-01-01T12:00:00.000Z',
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('message');
  });
});
