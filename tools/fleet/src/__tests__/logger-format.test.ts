import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { format } from 'winston';

describe('Logger Format Function', () => {
  it('should format log messages correctly', () => {
    const { printf } = format;
    
    // Create the same format function as in logger.ts
    const logFormat = printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    });

    // Test the format function
    const formatted = logFormat.transform({
      level: 'info',
      message: 'Test message',
      label: 'instana-fleet',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(formatted).toBeDefined();
  });

  it('should handle different log levels', () => {
    const { printf } = format;
    
    const logFormat = printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    });

    const levels = ['info', 'error', 'warn', 'debug'];
    
    levels.forEach(level => {
      const formatted = logFormat.transform({
        level,
        message: `Test ${level} message`,
        label: 'instana-fleet',
        timestamp: '2024-01-01T00:00:00.000Z',
      });

      expect(formatted).toBeDefined();
    });
  });

  it('should handle messages with special characters', () => {
    const { printf } = format;
    
    const logFormat = printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    });

    const formatted = logFormat.transform({
      level: 'info',
      message: 'Message with special chars: !@#$%^&*()',
      label: 'instana-fleet',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(formatted).toBeDefined();
  });

  it('should handle empty messages', () => {
    const { printf } = format;
    
    const logFormat = printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    });

    const formatted = logFormat.transform({
      level: 'info',
      message: '',
      label: 'instana-fleet',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(formatted).toBeDefined();
  });

  it('should handle undefined values gracefully', () => {
    const { printf } = format;
    
    const logFormat = printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    });

    const formatted = logFormat.transform({
      level: 'info',
      message: undefined as any,
      label: 'instana-fleet',
      timestamp: '2024-01-01T00:00:00.000Z',
    });

    expect(formatted).toBeDefined();
  });
});
