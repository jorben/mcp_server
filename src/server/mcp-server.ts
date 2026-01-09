import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCPTool } from '../types/mcp.js';
import { toolExecutor } from '../core/tool-executor.js';
import { logger } from '../utils/logger.js';

/**
 * 为单个工具创建独立的 MCP Server 实例
 */
export function createMcpServerForTool(tool: MCPTool): McpServer {
  const server = new McpServer({
    name: tool.name,
    version: tool.version,
  });

  // 注册该工具的所有方法
  const methods = tool.getMethods();

  for (const method of methods) {
    server.tool(
      method.name,
      method.description,
      method.inputSchema,
      async (params) => {
        logger.info(`Tool call: ${tool.name}.${method.name}`, { params });

        const result = await toolExecutor.execute(
          tool.name,
          method.name,
          params,
        );

        if (!result.success) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${result.error}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: typeof result.data === 'string'
                ? result.data
                : JSON.stringify(result.data, null, 2),
            },
          ],
        };
      },
    );

    logger.debug(`Registered method: ${tool.name}.${method.name}`);
  }

  logger.info(`Created MCP server for tool: ${tool.name}`, {
    methods: methods.map(m => m.name),
  });

  return server;
}
