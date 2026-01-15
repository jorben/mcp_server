import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger.js';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('debug', () => {
    it('should log debug message with cyan color', () => {
      logger.debug('debug message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('[DEBUG]');
      expect(logOutput).toContain('debug message');
      expect(logOutput).toContain('\x1b[36m'); // cyan color
    });

    it('should log debug message with metadata', () => {
      logger.debug('debug message', { key: 'value' });
      
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('debug message');
      expect(logOutput).toContain('{"key":"value"}');
    });
  });

  describe('info', () => {
    it('should log info message with green color', () => {
      logger.info('info message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('info message');
      expect(logOutput).toContain('\x1b[32m'); // green color
    });

    it('should log info message with metadata', () => {
      logger.info('info message', { count: 42 });
      
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('info message');
      expect(logOutput).toContain('{"count":42}');
    });
  });

  describe('warn', () => {
    it('should log warn message with yellow color', () => {
      logger.warn('warn message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('warn message');
      expect(logOutput).toContain('\x1b[33m'); // yellow color
    });

    it('should log warn message with metadata', () => {
      logger.warn('warn message', { warning: true });
      
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('warn message');
      expect(logOutput).toContain('{"warning":true}');
    });
  });

  describe('error', () => {
    it('should log error message with red color', () => {
      logger.error('error message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('error message');
      expect(logOutput).toContain('\x1b[31m'); // red color
    });

    it('should log error message with error object', () => {
      const error = new Error('test error');
      logger.error('error message', error);
      
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('error message');
      // Error objects are serialized as JSON, message property is included
      expect(logOutput).toContain('message');
    });
  });

  describe('timestamp format', () => {
    it('should include ISO timestamp in log output', () => {
      logger.info('test message');
      
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      // ISO timestamp format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(logOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('log without metadata', () => {
    it('should not append extra content when no metadata provided', () => {
      logger.info('simple message');
      
      const logOutput = consoleSpy.mock.calls[0][0] as string;
      expect(logOutput).toContain('simple message');
      // Should end with the message and reset code, not with JSON
      expect(logOutput).not.toContain('{}');
    });
  });
});
