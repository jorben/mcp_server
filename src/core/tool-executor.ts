import { z } from 'zod';
import { toolRegistry } from './tool-registry.js';
import { ToolExecutionResult, ZodShape } from '../types/mcp.js';
import { logger } from '../utils/logger.js';

/**
 * 将 shape 转换为 z.object 进行验证
 */
function createSchemaFromShape(shape: ZodShape): z.ZodObject<z.ZodRawShape> {
  return z.object(shape as z.ZodRawShape);
}

/**
 * 工具执行器 - 隔离执行工具方法，确保单个工具故障不影响其他工具
 */
export class ToolExecutor {
  private defaultTimeout: number;

  constructor(defaultTimeout = 30000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * 执行工具方法
   */
  async execute(
    toolName: string,
    methodName: string,
    params: unknown,
    timeout?: number,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取工具
      const tool = toolRegistry.getTool(toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool not found: ${toolName}`,
        };
      }

      // 获取方法
      const methods = tool.getMethods();
      const method = methods.find(m => m.name === methodName);
      if (!method) {
        return {
          success: false,
          error: `Method not found: ${toolName}.${methodName}`,
        };
      }

      // 验证参数 - 将 shape 转换为 z.object
      const schema = createSchemaFromShape(method.inputSchema);
      const parseResult = schema.safeParse(params);
      if (!parseResult.success) {
        return {
          success: false,
          error: `Invalid parameters: ${parseResult.error.message}`,
        };
      }

      // 执行方法（带超时保护）
      const result = await Promise.race([
        method.handler(parseResult.data),
        this.createTimeout(timeout ?? this.defaultTimeout),
      ]);

      const duration = Date.now() - startTime;
      logger.debug(`Executed ${toolName}.${methodName}`, { duration: `${duration}ms` });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`Execution failed: ${toolName}.${methodName}`, { error: errorMessage });

      // 标记工具为不健康（可选：根据错误类型决定）
      if (this.isCriticalError(error)) {
        toolRegistry.setHealthStatus(toolName, false);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 创建超时 Promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * 判断是否为严重错误
   */
  private isCriticalError(error: unknown): boolean {
    if (error instanceof Error) {
      // 超时不算严重错误
      if (error.message.includes('timeout')) {
        return false;
      }
      // 连接错误、资源不可用等算严重错误
      if (error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND')) {
        return true;
      }
    }
    return false;
  }
}

export const toolExecutor = new ToolExecutor();
