import 'dotenv/config';
import { toolLoader } from './core/tool-loader.js';
import { createApp } from './server/app.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main(): Promise<void> {
  logger.info('Starting MCP Server...');

  // 1. 加载所有工具
  await toolLoader.loadAll();

  // 2. 创建 HTTP 应用（每个工具独立 endpoint）
  const app = createApp();

  // 3. 启动服务器
  app.listen(PORT, HOST, () => {
    logger.info(`MCP Server running at http://${HOST}:${PORT}`);
    logger.info(`Tool endpoints: http://${HOST}:${PORT}/mcp/{toolName}`);
    logger.info(`Health check: http://${HOST}:${PORT}/health`);
    logger.info(`Tools list: http://${HOST}:${PORT}/tools`);
  });
}

main().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
