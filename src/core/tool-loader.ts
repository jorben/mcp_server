import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';
import { MCPToolModule } from '../types/mcp.js';
import { toolRegistry } from './tool-registry.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 工具加载器 - 动态加载 tools 目录下的所有工具
 */
export class ToolLoader {
  private toolsDir: string;

  constructor(toolsDir?: string) {
    this.toolsDir = toolsDir ?? path.resolve(__dirname, '../tools');
  }

  /**
   * 加载所有工具
   */
  async loadAll(): Promise<void> {
    logger.info(`Loading tools from: ${this.toolsDir}`);

    try {
      // 查找所有工具入口文件
      const pattern = path.join(this.toolsDir, '*/index.{ts,js}');
      const toolFiles = await glob(pattern, { windowsPathsNoEscape: true });

      logger.info(`Found ${toolFiles.length} tool(s)`);

      // 并行加载所有工具，单个失败不影响其他
      const results = await Promise.allSettled(
        toolFiles.map(file => this.loadTool(file)),
      );

      // 统计加载结果
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Tool loading complete: ${succeeded} succeeded, ${failed} failed`);
    } catch (error) {
      logger.error('Failed to load tools', error);
    }
  }

  /**
   * 加载单个工具
   */
  private async loadTool(filePath: string): Promise<void> {
    const toolName = path.basename(path.dirname(filePath));
    
    try {
      logger.debug(`Loading tool: ${toolName} from ${filePath}`);

      // 动态导入工具模块
      const moduleUrl = `file://${filePath}`;
      const module = await import(moduleUrl) as MCPToolModule;

      if (!module.default) {
        throw new Error(`Tool ${toolName} does not export default`);
      }

      const tool = module.default;

      // 验证工具接口
      if (!tool.name || !tool.getMethods) {
        throw new Error(`Tool ${toolName} does not implement MCPTool interface`);
      }

      // 注册工具
      await toolRegistry.register(tool);
    } catch (error) {
      logger.error(`Failed to load tool: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * 重新加载单个工具
   */
  async reloadTool(toolName: string): Promise<void> {
    const filePath = path.join(this.toolsDir, toolName, 'index.ts');
    
    // 先注销
    toolRegistry.unregister(toolName);
    
    // 重新加载
    await this.loadTool(filePath);
  }
}

export const toolLoader = new ToolLoader();
