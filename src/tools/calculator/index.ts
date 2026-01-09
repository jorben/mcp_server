import { z } from 'zod';
import { MCPTool, MCPMethodDefinition } from '../../types/mcp.js';

/**
 * Calculator Tool - Provides basic math operations
 */
const calculatorTool: MCPTool = {
  name: 'calculator',
  description: 'Math calculator tool providing basic arithmetic operations',
  version: '1.0.0',

  getMethods(): MCPMethodDefinition[] {
    return [
      {
        name: 'add',
        description: 'Addition: Calculate the sum of two numbers',
        inputSchema: {
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          return { result: a + b };
        },
      },
      {
        name: 'subtract',
        description: 'Subtraction: Calculate the difference of two numbers',
        inputSchema: {
          a: z.number().describe('Minuend'),
          b: z.number().describe('Subtrahend'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          return { result: a - b };
        },
      },
      {
        name: 'multiply',
        description: 'Multiplication: Calculate the product of two numbers',
        inputSchema: {
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          return { result: a * b };
        },
      },
      {
        name: 'divide',
        description: 'Division: Calculate the quotient of two numbers',
        inputSchema: {
          a: z.number().describe('Dividend'),
          b: z.number().describe('Divisor (cannot be 0)'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          if (b === 0) {
            throw new Error('Division by zero is not allowed');
          }
          return { result: a / b };
        },
      },
    ];
  },

  async initialize() {
    // No initialization required
  },

  async healthCheck() {
    return true;
  },
};

export default calculatorTool;
