import express, { Request, Response, Router } from 'express';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toolRegistry } from '../core/tool-registry.js';
import { createMcpServerForTool } from './mcp-server.js';
import { authMiddleware } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

// 存储每个工具的 MCP Server 和 transports
interface ToolServerContext {
  mcpServer: McpServer;
  transports: Map<string, StreamableHTTPServerTransport>;
}

const toolServers = new Map<string, ToolServerContext>();

/**
 * 为单个工具创建路由
 */
function createToolRouter(toolName: string, context: ToolServerContext): Router {
  const router = Router();
  const { mcpServer, transports } = context;

  /**
   * POST - 处理 JSON-RPC 请求
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      let sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport) {
        sessionId = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId!,
          onsessioninitialized: (id) => {
            logger.info(`[${toolName}] Session initialized: ${id}`);
          },
        });

        transports.set(sessionId, transport);
        await mcpServer.connect(transport);

        logger.info(`[${toolName}] New session: ${sessionId}`);
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error(`[${toolName}] Request error`, error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  });

  /**
   * GET - 处理 SSE 连接
   */
  router.get('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId) {
      res.status(400).json({ error: 'Missing mcp-session-id header' });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await transport.handleRequest(req, res);
  });

  /**
   * DELETE - 关闭 session
   */
  router.delete('/', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId) {
      res.status(400).json({ error: 'Missing mcp-session-id header' });
      return;
    }

    const transport = transports.get(sessionId);
    if (transport) {
      await transport.close();
      transports.delete(sessionId);
      logger.info(`[${toolName}] Session closed: ${sessionId}`);
    }

    res.status(204).send();
  });

  return router;
}

/**
 * 创建 Express 应用
 */
export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  // Bearer Token 认证中间件
  app.use(authMiddleware);

  // 为每个工具创建独立的 MCP endpoint
  const tools = toolRegistry.getHealthyTools();

  for (const tool of tools) {
    const mcpServer = createMcpServerForTool(tool);
    const context: ToolServerContext = {
      mcpServer,
      transports: new Map(),
    };

    toolServers.set(tool.name, context);

    // 注册路由: /mcp/{toolName}
    const router = createToolRouter(tool.name, context);
    app.use(`/mcp/${tool.name}`, router);

    logger.info(`Registered endpoint: /mcp/${tool.name}`);
  }

  /**
   * 健康检查端点
   */
  app.get('/health', (_req: Request, res: Response) => {
    const status = toolRegistry.getAllToolStatus();
    const allHealthy = status.every(t => t.healthy);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      tools: status,
    });
  });

  /**
   * 工具列表端点 - 显示所有可用的 MCP endpoints
   */
  app.get('/tools', (req: Request, res: Response) => {
    const host = req.headers.host ?? 'localhost:3000';
    const protocol = req.protocol;
    const tools = toolRegistry.getAllToolStatus().map(tool => ({
      ...tool,
      endpoint: `${protocol}://${host}/mcp/${tool.name}`,
    }));

    res.json({ tools });
  });

  /**
   * 根路径 - 显示帮助信息
   */
  app.get('/', (_req: Request, res: Response) => {
    const tools = toolRegistry.getAllToolStatus();
    res.json({
      name: 'MCP Server',
      version: '1.0.0',
      description: 'Unified MCP Server with per-tool endpoints',
      endpoints: {
        tools: '/tools',
        health: '/health',
        mcp: tools.map(t => `/mcp/${t.name}`),
      },
    });
  });

  return app;
}
