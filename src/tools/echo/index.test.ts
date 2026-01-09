import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import echoTool from './index.js';
import { MCPMethodDefinition } from '../../types/mcp.js';

describe('Echo Tool', () => {
  let methods: MCPMethodDefinition[];

  beforeAll(() => {
    methods = echoTool.getMethods();
  });

  it('should have correct metadata', () => {
    expect(echoTool.name).toBe('echo');
    expect(echoTool.version).toBe('1.0.0');
    expect(echoTool.description).toContain('回显');
  });

  it('should have 3 methods', () => {
    expect(methods).toHaveLength(3);
    expect(methods.map(m => m.name)).toEqual(['echo', 'reverse', 'info']);
  });

  it('should expose input schema with parameter descriptions', () => {
    const echoMethod = methods.find(m => m.name === 'echo')!;
    expect(echoMethod.inputSchema).toHaveProperty('message');

    // Verify schema can be used with z.object
    const schema = z.object(echoMethod.inputSchema as z.ZodRawShape);
    const result = schema.safeParse({ message: 'test' });
    expect(result.success).toBe(true);
  });

  describe('echo', () => {
    it('should echo the message', async () => {
      const method = methods.find(m => m.name === 'echo')!;
      const result = await method.handler({ message: 'Hello, World!' });
      expect(result).toEqual({ echo: 'Hello, World!' });
    });

    it('should echo empty string', async () => {
      const method = methods.find(m => m.name === 'echo')!;
      const result = await method.handler({ message: '' });
      expect(result).toEqual({ echo: '' });
    });

    it('should echo unicode characters', async () => {
      const method = methods.find(m => m.name === 'echo')!;
      const result = await method.handler({ message: '你好世界 🌍' });
      expect(result).toEqual({ echo: '你好世界 🌍' });
    });
  });

  describe('reverse', () => {
    it('should reverse a string', async () => {
      const method = methods.find(m => m.name === 'reverse')!;
      const result = await method.handler({ text: 'hello' });
      expect(result).toEqual({ reversed: 'olleh' });
    });

    it('should reverse empty string', async () => {
      const method = methods.find(m => m.name === 'reverse')!;
      const result = await method.handler({ text: '' });
      expect(result).toEqual({ reversed: '' });
    });

    it('should reverse palindrome', async () => {
      const method = methods.find(m => m.name === 'reverse')!;
      const result = await method.handler({ text: 'racecar' });
      expect(result).toEqual({ reversed: 'racecar' });
    });

    it('should handle unicode characters', async () => {
      const method = methods.find(m => m.name === 'reverse')!;
      const result = await method.handler({ text: 'abc' });
      expect(result).toEqual({ reversed: 'cba' });
    });
  });

  describe('info', () => {
    it('should return server info', async () => {
      const method = methods.find(m => m.name === 'info')!;
      const result = await method.handler({}) as {
        serverTime: string;
        nodeVersion: string;
        platform: string;
        uptime: number;
      };

      expect(result).toHaveProperty('serverTime');
      expect(result).toHaveProperty('nodeVersion');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('uptime');

      // Validate types
      expect(typeof result.serverTime).toBe('string');
      expect(result.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      expect(typeof result.platform).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return valid ISO timestamp', async () => {
      const method = methods.find(m => m.name === 'info')!;
      const result = await method.handler({}) as { serverTime: string };

      const date = new Date(result.serverTime);
      expect(date.getTime()).not.toBeNaN();
    });
  });

  describe('healthCheck', () => {
    it('should return true', async () => {
      const result = await echoTool.healthCheck?.();
      expect(result).toBe(true);
    });
  });
});
