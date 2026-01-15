import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { MCPTool } from '../types/mcp.js';

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Create a simple in-memory registry for testing
const testTools = new Map<string, MCPTool>();
const testHealthStatus = new Map<string, boolean>();

vi.mock('./tool-registry.js', () => ({
  toolRegistry: {
    getTool: (name: string) => testTools.get(name),
    setHealthStatus: (name: string, status: boolean) => {
      if (testTools.has(name)) {
        testHealthStatus.set(name, status);
      }
    },
  },
}));

// Helper to create a mock tool
function createMockTool(overrides: Partial<MCPTool> = {}): MCPTool {
  return {
    name: 'test-tool',
    description: 'A test tool',
    version: '1.0.0',
    getMethods: () => [
      {
        name: 'greet',
        description: 'Greet someone',
        inputSchema: {
          name: z.string().describe('Name to greet'),
        },
        handler: async (params) => {
          const { name } = params as { name: string };
          return { message: `Hello, ${name}!` };
        },
      },
      {
        name: 'add',
        description: 'Add two numbers',
        inputSchema: {
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        },
        handler: async (params) => {
          const { a, b } = params as { a: number; b: number };
          return { result: a + b };
        },
      },
    ],
    ...overrides,
  };
}

// Helper to register a tool in the test registry
function registerTestTool(tool: MCPTool): void {
  testTools.set(tool.name, tool);
  testHealthStatus.set(tool.name, true);
}

// Helper to clear the test registry
function clearTestRegistry(): void {
  testTools.clear();
  testHealthStatus.clear();
}

// Import after mocks are set up
import { ToolExecutor } from './tool-executor.js';

describe('ToolExecutor', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    clearTestRegistry();
    executor = new ToolExecutor();
  });

  afterEach(() => {
    clearTestRegistry();
  });

  describe('execute', () => {
    it('should execute tool method successfully', async () => {
      const tool = createMockTool();
      registerTestTool(tool);
      
      const result = await executor.execute('test-tool', 'greet', { name: 'World' });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'Hello, World!' });
    });

    it('should return error for non-existent tool', async () => {
      const result = await executor.execute('non-existent', 'method', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool not found');
    });

    it('should return error for non-existent method', async () => {
      const tool = createMockTool();
      registerTestTool(tool);
      
      const result = await executor.execute('test-tool', 'non-existent', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Method not found');
    });

    it('should validate parameters with Zod schema', async () => {
      const tool = createMockTool();
      registerTestTool(tool);
      
      // Missing required parameter
      const result = await executor.execute('test-tool', 'greet', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');
    });

    it('should validate parameter types', async () => {
      const tool = createMockTool();
      registerTestTool(tool);
      
      // Wrong type for 'a' parameter
      const result = await executor.execute('test-tool', 'add', { a: 'not-a-number', b: 2 });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');
    });

    it('should execute method with multiple parameters', async () => {
      const tool = createMockTool();
      registerTestTool(tool);
      
      const result = await executor.execute('test-tool', 'add', { a: 5, b: 3 });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 8 });
    });

    it('should handle method that returns string', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'echo',
          description: 'Echo message',
          inputSchema: { message: z.string() },
          handler: async (params) => (params as { message: string }).message,
        }],
      });
      registerTestTool(tool);
      
      const result = await executor.execute('test-tool', 'echo', { message: 'test' });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should handle empty input schema', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'info',
          description: 'Get info',
          inputSchema: {},
          handler: async () => ({ version: '1.0.0' }),
        }],
      });
      registerTestTool(tool);
      
      const result = await executor.execute('test-tool', 'info', {});
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ version: '1.0.0' });
    });
  });

  describe('timeout handling', () => {
    it('should timeout for slow operations', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'slow',
          description: 'Slow operation',
          inputSchema: {},
          handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return { done: true };
          },
        }],
      });
      registerTestTool(tool);
      
      // Use a very short timeout
      const result = await executor.execute('test-tool', 'slow', {}, 50);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should complete before timeout', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'fast',
          description: 'Fast operation',
          inputSchema: {},
          handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return { done: true };
          },
        }],
      });
      registerTestTool(tool);
      
      const result = await executor.execute('test-tool', 'fast', {}, 1000);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ done: true });
    });

    it('should use default timeout when not specified', async () => {
      const shortTimeoutExecutor = new ToolExecutor(100);
      const tool = createMockTool({
        getMethods: () => [{
          name: 'slow',
          description: 'Slow operation',
          inputSchema: {},
          handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return { done: true };
          },
        }],
      });
      registerTestTool(tool);
      
      const result = await shortTimeoutExecutor.execute('test-tool', 'slow', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('error handling', () => {
    it('should catch and return handler errors', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'error',
          description: 'Throws error',
          inputSchema: {},
          handler: async () => {
            throw new Error('Handler error');
          },
        }],
      });
      registerTestTool(tool);
      
      const result = await executor.execute('test-tool', 'error', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler error');
    });

    it('should handle non-Error throws', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'throw-string',
          description: 'Throws string',
          inputSchema: {},
          handler: async () => {
            throw 'String error';
          },
        }],
      });
      registerTestTool(tool);
      
      const result = await executor.execute('test-tool', 'throw-string', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });

    it('should mark tool unhealthy for ECONNREFUSED error', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'connect',
          description: 'Connect to server',
          inputSchema: {},
          handler: async () => {
            const error = new Error('ECONNREFUSED');
            throw error;
          },
        }],
      });
      registerTestTool(tool);
      
      await executor.execute('test-tool', 'connect', {});
      
      expect(testHealthStatus.get('test-tool')).toBe(false);
    });

    it('should mark tool unhealthy for ENOTFOUND error', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'connect',
          description: 'Connect to server',
          inputSchema: {},
          handler: async () => {
            throw new Error('ENOTFOUND');
          },
        }],
      });
      registerTestTool(tool);
      
      await executor.execute('test-tool', 'connect', {});
      
      expect(testHealthStatus.get('test-tool')).toBe(false);
    });

    it('should not mark tool unhealthy for timeout error', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'slow',
          description: 'Slow operation',
          inputSchema: {},
          handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return {};
          },
        }],
      });
      registerTestTool(tool);
      
      await executor.execute('test-tool', 'slow', {}, 50);
      
      // Timeout should not mark as unhealthy
      expect(testHealthStatus.get('test-tool')).toBe(true);
    });

    it('should not mark tool unhealthy for regular handler errors', async () => {
      const tool = createMockTool({
        getMethods: () => [{
          name: 'error',
          description: 'Regular error',
          inputSchema: {},
          handler: async () => {
            throw new Error('Regular error');
          },
        }],
      });
      registerTestTool(tool);
      
      await executor.execute('test-tool', 'error', {});
      
      // Regular errors should not mark as unhealthy
      expect(testHealthStatus.get('test-tool')).toBe(true);
    });
  });
});
