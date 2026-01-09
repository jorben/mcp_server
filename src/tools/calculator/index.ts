import { z } from 'zod';
import { MCPTool, MCPMethodDefinition } from '../../types/mcp.js';

/**
 * 计算器工具 - 提供基础数学运算
 */
const calculatorTool: MCPTool = {
  name: 'calculator',
  description: '数学计算工具，提供加减乘除等基础运算',
  version: '1.0.0',

  getMethods(): MCPMethodDefinition[] {
    return [
      {
        name: 'add',
        description: '加法运算：计算两个数的和',
        inputSchema: {
          a: z.number().describe('第一个数'),
          b: z.number().describe('第二个数'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          return { result: a + b };
        },
      },
      {
        name: 'subtract',
        description: '减法运算：计算两个数的差',
        inputSchema: {
          a: z.number().describe('被减数'),
          b: z.number().describe('减数'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          return { result: a - b };
        },
      },
      {
        name: 'multiply',
        description: '乘法运算：计算两个数的积',
        inputSchema: {
          a: z.number().describe('第一个数'),
          b: z.number().describe('第二个数'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          return { result: a * b };
        },
      },
      {
        name: 'divide',
        description: '除法运算：计算两个数的商',
        inputSchema: {
          a: z.number().describe('被除数'),
          b: z.number().describe('除数（不能为0）'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          if (b === 0) {
            throw new Error('除数不能为0');
          }
          return { result: a / b };
        },
      },
    ];
  },

  async initialize() {
    // 无需初始化
  },

  async healthCheck() {
    return true;
  },
};

export default calculatorTool;
