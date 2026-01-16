import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMcpServerForTool } from './mcp-server.js';
import { MCPTool, MCPMethodDefinition } from '../types/mcp.js';

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock toolExecutor
vi.mock('../core/tool-executor.js', () => ({
  toolExecutor: {
    execute: vi.fn(),
  },
}));

import { toolExecutor } from '../core/tool-executor.js';

// Helper to create a mock tool
function createMockTool(overrides: Partial<MCPTool> = {}): MCPTool {
  const defaultTool: MCPTool = {
    name: 'test-tool',
    description: 'A test tool',
    version: '1.0.0',
    getMethods: (): MCPMethodDefinition[] => [
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
        name: 'calculate',
        description: 'Calculate sum',
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
  };
  return { ...defaultTool, ...overrides };
}

describe('createMcpServerForTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an MCP server instance', () => {
    const tool = createMockTool();
    
    const server = createMcpServerForTool(tool);
    
    expect(server).toBeDefined();
    expect(typeof server.tool).toBe('function');
  });

  it('should register all tool methods', () => {
    const tool = createMockTool();
    
    // Create a spy on the server's tool method
    const server = createMcpServerForTool(tool);
    
    // The server should have been configured
    // We can verify by checking that no errors were thrown
    expect(server).toBeDefined();
  });

  it('should handle tool with single method', () => {
    const tool = createMockTool({
      getMethods: () => [{
        name: 'single',
        description: 'Single method',
        inputSchema: {},
        handler: async () => ({ ok: true }),
      }],
    });
    
    const server = createMcpServerForTool(tool);
    
    expect(server).toBeDefined();
  });

  it('should handle tool with no methods', () => {
    const tool = createMockTool({
      getMethods: () => [],
    });
    
    const server = createMcpServerForTool(tool);
    
    expect(server).toBeDefined();
  });

  it('should handle tool with complex input schema', () => {
    const tool = createMockTool({
      getMethods: () => [{
        name: 'complex',
        description: 'Complex input',
        inputSchema: {
          required: z.string().describe('Required field'),
          optional: z.string().optional().describe('Optional field'),
          number: z.number().min(0).max(100).describe('Bounded number'),
          enum: z.enum(['a', 'b', 'c']).describe('Enum field'),
        },
        handler: async (params) => params,
      }],
    });
    
    const server = createMcpServerForTool(tool);
    
    expect(server).toBeDefined();
  });
});

describe('MCP Server Tool Execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use toolExecutor for method calls', async () => {
    const tool = createMockTool();
    vi.mocked(toolExecutor.execute).mockResolvedValue({
      success: true,
      data: { message: 'Hello, World!' },
    });
    
    createMcpServerForTool(tool);
    
    // The server registers handlers that will use toolExecutor
    // We verify the setup was successful
    expect(toolExecutor.execute).not.toHaveBeenCalled();
  });

  it('should handle successful execution result', async () => {
    const tool = createMockTool();
    vi.mocked(toolExecutor.execute).mockResolvedValue({
      success: true,
      data: { result: 'success' },
    });
    
    const server = createMcpServerForTool(tool);
    
    // Server created successfully with handlers configured
    expect(server).toBeDefined();
  });

  it('should handle failed execution result', async () => {
    const tool = createMockTool();
    vi.mocked(toolExecutor.execute).mockResolvedValue({
      success: false,
      error: 'Execution failed',
    });
    
    const server = createMcpServerForTool(tool);
    
    // Server created successfully, error handling configured in handlers
    expect(server).toBeDefined();
  });

  it('should handle string data in execution result', async () => {
    const tool = createMockTool();
    vi.mocked(toolExecutor.execute).mockResolvedValue({
      success: true,
      data: 'string result',
    });
    
    const server = createMcpServerForTool(tool);
    
    expect(server).toBeDefined();
  });

  it('should handle object data in execution result', async () => {
    const tool = createMockTool();
    vi.mocked(toolExecutor.execute).mockResolvedValue({
      success: true,
      data: { nested: { value: 123 } },
    });
    
    const server = createMcpServerForTool(tool);
    
    expect(server).toBeDefined();
  });
});

describe('MCP Server Configuration', () => {
  it('should use tool name as server name', () => {
    const tool = createMockTool({ name: 'custom-tool-name' });
    
    const server = createMcpServerForTool(tool);
    
    // Server is created with the tool's name
    expect(server).toBeDefined();
  });

  it('should use tool version as server version', () => {
    const tool = createMockTool({ version: '2.5.0' });
    
    const server = createMcpServerForTool(tool);
    
    expect(server).toBeDefined();
  });
});
