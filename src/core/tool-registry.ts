import { MCPTool, ToolStatus } from '../types/mcp.js';
import { logger } from '../utils/logger.js';

/**
 * 工具注册中心 - 管理所有 MCP 工具的注册和查询
 */
export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private healthStatus: Map<string, boolean> = new Map();

  /**
   * 注册工具
   */
  async register(tool: MCPTool): Promise<void> {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool ${tool.name} already registered, replacing...`);
    }

    try {
      // 初始化工具
      if (tool.initialize) {
        await tool.initialize();
      }
      
      this.tools.set(tool.name, tool);
      this.healthStatus.set(tool.name, true);
      
      logger.info(`Tool registered: ${tool.name}`, {
        version: tool.version,
        methods: tool.getMethods().map(m => m.name),
      });
    } catch (error) {
      logger.error(`Failed to register tool: ${tool.name}`, error);
      this.healthStatus.set(tool.name, false);
      throw error;
    }
  }

  /**
   * 注销工具
   */
  unregister(toolName: string): boolean {
    const result = this.tools.delete(toolName);
    this.healthStatus.delete(toolName);
    if (result) {
      logger.info(`Tool unregistered: ${toolName}`);
    }
    return result;
  }

  /**
   * 获取工具
   */
  getTool(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * 获取所有工具
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取所有健康的工具
   */
  getHealthyTools(): MCPTool[] {
    return this.getAllTools().filter(tool => 
      this.healthStatus.get(tool.name) === true,
    );
  }

  /**
   * 获取工具状态
   */
  getToolStatus(toolName: string): ToolStatus | undefined {
    const tool = this.tools.get(toolName);
    if (!tool) return undefined;

    return {
      name: tool.name,
      version: tool.version,
      healthy: this.healthStatus.get(toolName) ?? false,
      methods: tool.getMethods().map(m => m.name),
    };
  }

  /**
   * 获取所有工具状态
   */
  getAllToolStatus(): ToolStatus[] {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      version: tool.version,
      healthy: this.healthStatus.get(tool.name) ?? false,
      methods: tool.getMethods().map(m => m.name),
    }));
  }

  /**
   * 更新工具健康状态
   */
  setHealthStatus(toolName: string, healthy: boolean): void {
    if (this.tools.has(toolName)) {
      this.healthStatus.set(toolName, healthy);
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<void> {
    for (const [name, tool] of this.tools) {
      try {
        if (tool.healthCheck) {
          const healthy = await tool.healthCheck();
          this.healthStatus.set(name, healthy);
        }
      } catch (error) {
        logger.error(`Health check failed for tool: ${name}`, error);
        this.healthStatus.set(name, false);
      }
    }
  }
}

// 单例导出
export const toolRegistry = new ToolRegistry();
