import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import calculatorTool from './index.js';
import { MCPMethodDefinition } from '../../types/mcp.js';

describe('Calculator Tool', () => {
  let methods: MCPMethodDefinition[];

  beforeAll(() => {
    methods = calculatorTool.getMethods();
  });

  it('should have correct metadata', () => {
    expect(calculatorTool.name).toBe('calculator');
    expect(calculatorTool.version).toBe('1.0.0');
    expect(calculatorTool.description).toContain('数学计算');
  });

  it('should have 4 methods', () => {
    expect(methods).toHaveLength(4);
    expect(methods.map(m => m.name)).toEqual(['add', 'subtract', 'multiply', 'divide']);
  });

  it('should expose input schema with parameter descriptions', () => {
    const addMethod = methods.find(m => m.name === 'add')!;
    expect(addMethod.inputSchema).toHaveProperty('a');
    expect(addMethod.inputSchema).toHaveProperty('b');

    // Verify schema can be used with z.object
    const schema = z.object(addMethod.inputSchema as z.ZodRawShape);
    const result = schema.safeParse({ a: 1, b: 2 });
    expect(result.success).toBe(true);
  });

  describe('add', () => {
    it('should add two positive numbers', async () => {
      const method = methods.find(m => m.name === 'add')!;
      const result = await method.handler({ a: 10, b: 5 });
      expect(result).toEqual({ result: 15 });
    });

    it('should add negative numbers', async () => {
      const method = methods.find(m => m.name === 'add')!;
      const result = await method.handler({ a: -10, b: -5 });
      expect(result).toEqual({ result: -15 });
    });

    it('should add decimal numbers', async () => {
      const method = methods.find(m => m.name === 'add')!;
      const result = await method.handler({ a: 0.1, b: 0.2 });
      expect((result as { result: number }).result).toBeCloseTo(0.3);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers', async () => {
      const method = methods.find(m => m.name === 'subtract')!;
      const result = await method.handler({ a: 10, b: 3 });
      expect(result).toEqual({ result: 7 });
    });

    it('should handle negative result', async () => {
      const method = methods.find(m => m.name === 'subtract')!;
      const result = await method.handler({ a: 3, b: 10 });
      expect(result).toEqual({ result: -7 });
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', async () => {
      const method = methods.find(m => m.name === 'multiply')!;
      const result = await method.handler({ a: 6, b: 7 });
      expect(result).toEqual({ result: 42 });
    });

    it('should handle zero', async () => {
      const method = methods.find(m => m.name === 'multiply')!;
      const result = await method.handler({ a: 100, b: 0 });
      expect(result).toEqual({ result: 0 });
    });

    it('should handle negative numbers', async () => {
      const method = methods.find(m => m.name === 'multiply')!;
      const result = await method.handler({ a: -3, b: 4 });
      expect(result).toEqual({ result: -12 });
    });
  });

  describe('divide', () => {
    it('should divide two numbers', async () => {
      const method = methods.find(m => m.name === 'divide')!;
      const result = await method.handler({ a: 20, b: 4 });
      expect(result).toEqual({ result: 5 });
    });

    it('should handle decimal result', async () => {
      const method = methods.find(m => m.name === 'divide')!;
      const result = await method.handler({ a: 10, b: 4 });
      expect(result).toEqual({ result: 2.5 });
    });

    it('should throw error when dividing by zero', async () => {
      const method = methods.find(m => m.name === 'divide')!;
      await expect(method.handler({ a: 10, b: 0 })).rejects.toThrow('除数不能为0');
    });
  });

  describe('healthCheck', () => {
    it('should return true', async () => {
      const result = await calculatorTool.healthCheck?.();
      expect(result).toBe(true);
    });
  });
});
