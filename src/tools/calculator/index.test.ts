import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import calculatorTool from './index.js';
import { MCPMethodDefinition } from '../../types/mcp.js';

describe('Calculator Tool', () => {
  let methods: MCPMethodDefinition[];
  let evaluateMethod: MCPMethodDefinition;

  beforeAll(() => {
    methods = calculatorTool.getMethods();
    evaluateMethod = methods.find(m => m.name === 'evaluate')!;
  });

  it('should have correct metadata', () => {
    expect(calculatorTool.name).toBe('calculator');
    expect(calculatorTool.version).toBe('2.0.0');
    expect(calculatorTool.description).toContain('calculator');
  });

  it('should have 1 method', () => {
    expect(methods).toHaveLength(1);
    expect(methods.map(m => m.name)).toEqual(['evaluate']);
  });

  it('should expose input schema with parameter descriptions', () => {
    expect(evaluateMethod.inputSchema).toHaveProperty('expression');

    // Verify schema can be used with z.object
    const schema = z.object(evaluateMethod.inputSchema as z.ZodRawShape);
    const result = schema.safeParse({ expression: '1 + 2' });
    expect(result.success).toBe(true);
  });

  describe('basic arithmetic', () => {
    it('should evaluate addition', async () => {
      const result = await evaluateMethod.handler({ expression: '2 + 3' });
      expect(result).toEqual({ expression: '2 + 3', result: 5 });
    });

    it('should evaluate subtraction', async () => {
      const result = await evaluateMethod.handler({ expression: '10 - 4' });
      expect(result).toEqual({ expression: '10 - 4', result: 6 });
    });

    it('should evaluate multiplication', async () => {
      const result = await evaluateMethod.handler({ expression: '6 * 7' });
      expect(result).toEqual({ expression: '6 * 7', result: 42 });
    });

    it('should evaluate division', async () => {
      const result = await evaluateMethod.handler({ expression: '20 / 4' });
      expect(result).toEqual({ expression: '20 / 4', result: 5 });
    });

    it('should evaluate floor division', async () => {
      const result = await evaluateMethod.handler({ expression: '17 // 5' });
      expect(result).toEqual({ expression: '17 // 5', result: 3 });
    });

    it('should evaluate modulo', async () => {
      const result = await evaluateMethod.handler({ expression: '17 % 5' });
      expect(result).toEqual({ expression: '17 % 5', result: 2 });
    });

    it('should evaluate power with **', async () => {
      const result = await evaluateMethod.handler({ expression: '2 ** 10' });
      expect(result).toEqual({ expression: '2 ** 10', result: 1024 });
    });

    it('should evaluate power with ^', async () => {
      const result = await evaluateMethod.handler({ expression: '2^10' });
      expect(result).toEqual({ expression: '2^10', result: 1024 });
    });
  });

  describe('operator precedence', () => {
    it('should respect operator precedence', async () => {
      const result = await evaluateMethod.handler({ expression: '2 + 3 * 4' });
      expect(result).toEqual({ expression: '2 + 3 * 4', result: 14 });
    });

    it('should handle parentheses', async () => {
      const result = await evaluateMethod.handler({ expression: '(2 + 3) * 4' });
      expect(result).toEqual({ expression: '(2 + 3) * 4', result: 20 });
    });

    it('should handle nested parentheses', async () => {
      const result = await evaluateMethod.handler({ expression: '((2 + 3) * (4 - 1))' });
      expect(result).toEqual({ expression: '((2 + 3) * (4 - 1))', result: 15 });
    });

    it('should handle power right associativity', async () => {
      const result = await evaluateMethod.handler({ expression: '2 ** 3 ** 2' });
      // 2^(3^2) = 2^9 = 512
      expect(result).toEqual({ expression: '2 ** 3 ** 2', result: 512 });
    });
  });

  describe('unary operators', () => {
    it('should handle unary minus', async () => {
      const result = await evaluateMethod.handler({ expression: '-5' });
      expect(result).toEqual({ expression: '-5', result: -5 });
    });

    it('should handle unary minus in expression', async () => {
      const result = await evaluateMethod.handler({ expression: '3 + -2' });
      expect(result).toEqual({ expression: '3 + -2', result: 1 });
    });

    it('should handle double negative', async () => {
      const result = await evaluateMethod.handler({ expression: '--5' });
      expect(result).toEqual({ expression: '--5', result: 5 });
    });
  });

  describe('constants', () => {
    it('should evaluate pi', async () => {
      const result = await evaluateMethod.handler({ expression: 'pi' }) as { result: number };
      expect(result.result).toBeCloseTo(Math.PI);
    });

    it('should evaluate e', async () => {
      const result = await evaluateMethod.handler({ expression: 'e' }) as { result: number };
      expect(result.result).toBeCloseTo(Math.E);
    });

    it('should evaluate expression with pi', async () => {
      const result = await evaluateMethod.handler({ expression: '2 * pi' }) as { result: number };
      expect(result.result).toBeCloseTo(2 * Math.PI);
    });

    it('should handle implicit multiplication with constants', async () => {
      const result = await evaluateMethod.handler({ expression: '2pi' }) as { result: number };
      expect(result.result).toBeCloseTo(2 * Math.PI);
    });
  });

  describe('functions', () => {
    it('should evaluate sqrt', async () => {
      const result = await evaluateMethod.handler({ expression: 'sqrt(16)' });
      expect(result).toEqual({ expression: 'sqrt(16)', result: 4 });
    });

    it('should evaluate abs', async () => {
      const result = await evaluateMethod.handler({ expression: 'abs(-5)' });
      expect(result).toEqual({ expression: 'abs(-5)', result: 5 });
    });

    it('should evaluate sin', async () => {
      const result = await evaluateMethod.handler({ expression: 'sin(0)' });
      expect(result).toEqual({ expression: 'sin(0)', result: 0 });
    });

    it('should evaluate cos', async () => {
      const result = await evaluateMethod.handler({ expression: 'cos(0)' });
      expect(result).toEqual({ expression: 'cos(0)', result: 1 });
    });

    it('should evaluate log', async () => {
      const result = await evaluateMethod.handler({ expression: 'log(e)' }) as { result: number };
      expect(result.result).toBeCloseTo(1);
    });

    it('should evaluate pow function', async () => {
      const result = await evaluateMethod.handler({ expression: 'pow(2, 8)' });
      expect(result).toEqual({ expression: 'pow(2, 8)', result: 256 });
    });

    it('should evaluate min function', async () => {
      const result = await evaluateMethod.handler({ expression: 'min(3, 1, 4, 1, 5)' });
      expect(result).toEqual({ expression: 'min(3, 1, 4, 1, 5)', result: 1 });
    });

    it('should evaluate max function', async () => {
      const result = await evaluateMethod.handler({ expression: 'max(3, 1, 4, 1, 5)' });
      expect(result).toEqual({ expression: 'max(3, 1, 4, 1, 5)', result: 5 });
    });

    it('should evaluate nested functions', async () => {
      const result = await evaluateMethod.handler({ expression: 'sqrt(abs(-16))' });
      expect(result).toEqual({ expression: 'sqrt(abs(-16))', result: 4 });
    });
  });

  describe('operator replacements', () => {
    it('should replace × with *', async () => {
      const result = await evaluateMethod.handler({ expression: '3 × 4' });
      expect(result).toEqual({ expression: '3 × 4', result: 12 });
    });

    it('should replace ÷ with /', async () => {
      const result = await evaluateMethod.handler({ expression: '12 ÷ 3' });
      expect(result).toEqual({ expression: '12 ÷ 3', result: 4 });
    });
  });

  describe('complex expressions', () => {
    it('should evaluate complex expression', async () => {
      const result = await evaluateMethod.handler({ expression: '(3 + 5) * 2 - 10 / 2' }) as { result: number };
      expect(result.result).toBe(11);
    });

    it('should evaluate expression with functions and operators', async () => {
      const result = await evaluateMethod.handler({ expression: 'sqrt(16) + 2^3' }) as { result: number };
      expect(result.result).toBe(12);
    });

    it('should evaluate decimal numbers', async () => {
      const result = await evaluateMethod.handler({ expression: '0.1 + 0.2' }) as { result: number };
      expect(result.result).toBeCloseTo(0.3);
    });
  });

  describe('error handling', () => {
    it('should throw error for division by zero', async () => {
      await expect(evaluateMethod.handler({ expression: '1 / 0' }))
        .rejects.toThrow('Division by zero');
    });

    it('should throw error for unknown function', async () => {
      await expect(evaluateMethod.handler({ expression: 'unknown(5)' }))
        .rejects.toThrow('Unknown function');
    });

    it('should throw error for unknown identifier', async () => {
      await expect(evaluateMethod.handler({ expression: 'xyz + 1' }))
        .rejects.toThrow('Unknown identifier');
    });

    it('should throw error for invalid expression', async () => {
      await expect(evaluateMethod.handler({ expression: '2 +' }))
        .rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return true', async () => {
      const result = await calculatorTool.healthCheck?.();
      expect(result).toBe(true);
    });
  });
});
