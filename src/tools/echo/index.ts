import { z } from 'zod';
import { MCPTool, MCPMethodDefinition } from '../../types/mcp.js';

/**
 * Echo Tool - For testing and debugging
 */
const echoTool: MCPTool = {
  name: 'echo',
  description: 'Echo tool for testing and debugging',
  version: '1.0.0',

  getMethods(): MCPMethodDefinition[] {
    return [
      {
        name: 'echo',
        description: 'Echo back the input message',
        inputSchema: {
          message: z.string().describe('Message to echo'),
        },
        handler: async (params) => {
          const { message } = params as { message: string };
          return { echo: message };
        },
      },
      {
        name: 'reverse',
        description: 'Reverse the input string',
        inputSchema: {
          text: z.string().describe('Text to reverse'),
        },
        handler: async (params) => {
          const { text } = params as { text: string };
          return { reversed: text.split('').reverse().join('') };
        },
      },
      {
        name: 'info',
        description: 'Get server information',
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
    // No initialization required
  },

  async healthCheck() {
    return true;
  },
};

export default echoTool;
