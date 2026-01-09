import { z } from 'zod';
import { MCPTool, MCPMethodDefinition } from '../../types/mcp.js';

/**
 * Echo 工具 - 用于测试和调试
 */
const echoTool: MCPTool = {
  name: 'echo',
  description: '回显工具，用于测试和调试',
  version: '1.0.0',

  getMethods(): MCPMethodDefinition[] {
    return [
      {
        name: 'echo',
        description: '回显输入的消息',
        inputSchema: {
          message: z.string().describe('要回显的消息'),
        },
        handler: async (params) => {
          const { message } = params as { message: string };
          return { echo: message };
        },
      },
      {
        name: 'reverse',
        description: '反转输入的字符串',
        inputSchema: {
          text: z.string().describe('要反转的文本'),
        },
        handler: async (params) => {
          const { text } = params as { text: string };
          return { reversed: text.split('').reverse().join('') };
        },
      },
      {
        name: 'info',
        description: '获取服务器信息',
        inputSchema: {},
        handler: async () => {
          return {
            serverTime: new Date().toISOString(),
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime(),
          };
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

export default echoTool;
