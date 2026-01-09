import { z } from 'zod';

/**
 * Zod shape 类型 - MCP SDK 期望的参数格式
 */
export type ZodShape = Record<string, z.ZodTypeAny>;

/**
 * MCP 工具方法定义
 */
export interface MCPMethodDefinition {
  name: string;
  description: string;
  /** 参数 schema shape，例如 { a: z.number(), b: z.string() } */
  inputSchema: ZodShape;
  handler: (params: unknown) => Promise<unknown>;
}

/**
 * MCP 工具接口 - 所有工具必须实现此接口
 */
export interface MCPTool {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具版本 */
  version: string;
  /** 获取所有方法定义 */
  getMethods(): MCPMethodDefinition[];
  /** 初始化工具 */
  initialize?(): Promise<void>;
  /** 健康检查 */
  healthCheck?(): Promise<boolean>;
}

/**
 * 工具模块导出格式
 */
export interface MCPToolModule {
  default: MCPTool;
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * 工具状态
 */
export interface ToolStatus {
  name: string;
  version: string;
  healthy: boolean;
  methods: string[];
}
