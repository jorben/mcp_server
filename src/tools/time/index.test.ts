import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import timeTool from './index.js';
import { MCPMethodDefinition } from '../../types/mcp.js';

describe('Time Tool', () => {
  let methods: MCPMethodDefinition[];

  beforeAll(() => {
    methods = timeTool.getMethods();
  });

  it('should have correct metadata', () => {
    expect(timeTool.name).toBe('time');
    expect(timeTool.version).toBe('1.0.0');
    expect(timeTool.description).toContain('Time');
  });

  it('should have 3 methods', () => {
    expect(methods).toHaveLength(3);
    expect(methods.map(m => m.name)).toEqual(['get_current_time', 'convert_time', 'format_time']);
  });

  it('should expose input schema with parameter descriptions', () => {
    const convertMethod = methods.find(m => m.name === 'convert_time')!;
    expect(convertMethod.inputSchema).toHaveProperty('source_timezone');
    expect(convertMethod.inputSchema).toHaveProperty('target_timezone');
    expect(convertMethod.inputSchema).toHaveProperty('time');

    // Verify schema can be used with z.object
    const schema = z.object(convertMethod.inputSchema as z.ZodRawShape);
    const result = schema.safeParse({
      source_timezone: 'Etc/UTC',
      target_timezone: 'Asia/Shanghai',
      time: '12:00',
    });
    expect(result.success).toBe(true);
  });

  describe('get_current_time', () => {
    it('should get current time in UTC', async () => {
      const method = methods.find(m => m.name === 'get_current_time')!;
      const result = await method.handler({ timezone: 'Etc/UTC' }) as {
        timezone: string;
        datetime: string;
        iso: string;
        timestamp: number;
      };

      expect(result.timezone).toBe('Etc/UTC');
      expect(result.datetime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(result.iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(typeof result.timestamp).toBe('number');
    });

    it('should get current time in specific timezone', async () => {
      const method = methods.find(m => m.name === 'get_current_time')!;
      const result = await method.handler({ timezone: 'Asia/Shanghai' }) as {
        timezone: string;
        datetime: string;
      };

      expect(result.timezone).toBe('Asia/Shanghai');
      expect(result.datetime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should throw error for invalid timezone', async () => {
      const method = methods.find(m => m.name === 'get_current_time')!;
      await expect(method.handler({ timezone: 'Invalid/Timezone' }))
        .rejects.toThrow('Invalid timezone');
    });
  });

  describe('convert_time', () => {
    it('should convert time from UTC to Shanghai (UTC+8)', async () => {
      const method = methods.find(m => m.name === 'convert_time')!;
      const result = await method.handler({
        source_timezone: 'Etc/UTC',
        target_timezone: 'Asia/Shanghai',
        time: '12:00',
      }) as {
        source: { timezone: string; time: string };
        target: { timezone: string; time: string };
      };

      expect(result.source.timezone).toBe('Etc/UTC');
      expect(result.source.time).toBe('12:00');
      expect(result.target.timezone).toBe('Asia/Shanghai');
      expect(result.target.time).toBe('20:00'); // UTC+8
    });

    it('should convert time from Shanghai to UTC', async () => {
      const method = methods.find(m => m.name === 'convert_time')!;
      const result = await method.handler({
        source_timezone: 'Asia/Shanghai',
        target_timezone: 'Etc/UTC',
        time: '20:00',
      }) as {
        source: { timezone: string; time: string };
        target: { timezone: string; time: string };
      };

      expect(result.source.time).toBe('20:00');
      expect(result.target.time).toBe('12:00'); // UTC
    });

    it('should handle time conversion resulting in different date', async () => {
      const method = methods.find(m => m.name === 'convert_time')!;
      const result = await method.handler({
        source_timezone: 'Etc/UTC',
        target_timezone: 'Asia/Shanghai',
        time: '20:00',
      }) as {
        source: { timezone: string; time: string; date: string };
        target: { timezone: string; time: string; date: string };
      };

      // 20:00 UTC = 04:00 next day in Shanghai
      expect(result.target.time).toBe('04:00');
    });

    it('should convert between non-UTC timezones', async () => {
      const method = methods.find(m => m.name === 'convert_time')!;
      const result = await method.handler({
        source_timezone: 'America/New_York',
        target_timezone: 'Europe/London',
        time: '09:00',
      }) as {
        source: { timezone: string; time: string };
        target: { timezone: string; time: string };
      };

      expect(result.source.timezone).toBe('America/New_York');
      expect(result.target.timezone).toBe('Europe/London');
      // Result depends on DST, just verify format
      expect(result.target.time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should reject invalid time format via schema', async () => {
      const method = methods.find(m => m.name === 'convert_time')!;
      const schema = z.object(method.inputSchema as z.ZodRawShape);

      // Invalid format: not HH:MM
      const result1 = schema.safeParse({
        source_timezone: 'Etc/UTC',
        target_timezone: 'Asia/Shanghai',
        time: '9:00', // Missing leading zero
      });
      expect(result1.success).toBe(false);

      // Invalid format: has seconds
      const result2 = schema.safeParse({
        source_timezone: 'Etc/UTC',
        target_timezone: 'Asia/Shanghai',
        time: '09:00:00',
      });
      expect(result2.success).toBe(false);
    });

    it('should throw error for invalid timezone', async () => {
      const method = methods.find(m => m.name === 'convert_time')!;
      await expect(method.handler({
        source_timezone: 'Invalid/Timezone',
        target_timezone: 'Asia/Shanghai',
        time: '12:00',
      })).rejects.toThrow('Invalid timezone');
    });
  });

  describe('format_time', () => {
    it('should format timestamp to datetime string in UTC', async () => {
      const method = methods.find(m => m.name === 'format_time')!;
      // 2024-01-15 12:30:45 UTC
      const timestamp = Date.UTC(2024, 0, 15, 12, 30, 45);
      const result = await method.handler({
        timestamp,
        timezone: 'Etc/UTC',
      }) as {
        timestamp: number;
        timezone: string;
        formatted: string;
        iso: string;
      };

      expect(result.timestamp).toBe(timestamp);
      expect(result.timezone).toBe('Etc/UTC');
      expect(result.formatted).toBe('2024-01-15 12:30:45');
    });

    it('should format timestamp in Shanghai timezone (UTC+8)', async () => {
      const method = methods.find(m => m.name === 'format_time')!;
      // 2024-01-15 12:30:45 UTC
      const timestamp = Date.UTC(2024, 0, 15, 12, 30, 45);
      const result = await method.handler({
        timestamp,
        timezone: 'Asia/Shanghai',
      }) as {
        formatted: string;
      };

      // Shanghai is UTC+8, so 12:30:45 UTC = 20:30:45 Shanghai
      expect(result.formatted).toBe('2024-01-15 20:30:45');
    });

    it('should throw error for invalid timezone', async () => {
      const method = methods.find(m => m.name === 'format_time')!;
      await expect(method.handler({
        timestamp: Date.now(),
        timezone: 'Invalid/Timezone',
      })).rejects.toThrow('Invalid timezone');
    });

    it('should throw error for invalid timestamp', async () => {
      const method = methods.find(m => m.name === 'format_time')!;
      await expect(method.handler({
        timestamp: NaN,
        timezone: 'Etc/UTC',
      })).rejects.toThrow('Invalid timestamp');
    });
  });

  describe('healthCheck', () => {
    it('should return true', async () => {
      const result = await timeTool.healthCheck?.();
      expect(result).toBe(true);
    });
  });
});
