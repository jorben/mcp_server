# MCP Server

一个统一的 MCP（Model Context Protocol）服务器，支持可插拔工具。每个工具拥有独立的端点，允许客户端选择性地添加特定工具。
[English](./README.md)

## 特性

- **统一端点 + 路径路由**：每个工具拥有独立的 MCP 端点（`/mcp/{toolName}`）
- **松散耦合的工具**：工具从 `src/tools/` 目录独立加载
- **故障隔离**：单个工具故障不影响其他工具（超时保护 + 错误处理）
- **StreamableHTTP 传输**：现代 MCP 传输协议
- **Bearer Token 认证**：安全的 API 访问
- **Docker 支持**：支持容器化部署

## 项目结构

```
mcp_server/
├── src/
│   ├── index.ts                    # 入口文件
│   ├── core/
│   │   ├── tool-registry.ts        # 工具注册中心
│   │   ├── tool-loader.ts          # 动态工具加载器
│   │   └── tool-executor.ts        # 隔离执行器（超时 + 错误处理）
│   ├── server/
│   │   ├── app.ts                  # Express + StreamableHTTP
│   │   └── mcp-server.ts           # MCP Server 实例
│   ├── middleware/
│   │   └── auth.ts                 # Bearer Token 认证
│   ├── tools/                      # 松散耦合的工具目录
│   │   ├── calculator/index.ts     # 计算器工具（add/subtract/multiply/divide）
│   │   ├── echo/index.ts           # 回显工具（echo/reverse/info）
│   │   └── time/index.ts           # 时间工具（get_current_time/convert_time/format_time）
│   ├── types/mcp.ts                # 类型定义
│   └── utils/logger.ts             # 终端日志
├── Dockerfile                      # 多阶段构建
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 创建 .env 文件
echo "AUTHORIZATION_KEY=your-secret-key" > .env

# 启动开发服务器
npm run dev
```

### Docker 部署

```bash
# 使用 docker-compose 构建并运行
docker-compose up -d --build

# 或手动构建
docker build -t mcp-server .
docker run -e AUTHORIZATION_KEY=your-secret-key -p 3000:3000 mcp-server
```

## API 端点

| 端点              | 方法   | 说明                         |
| ----------------- | ------ | ---------------------------- |
| `/mcp/{toolName}` | POST   | 特定工具的 MCP JSON-RPC 请求 |
| `/mcp/{toolName}` | GET    | SSE 连接（需要 session-id）  |
| `/mcp/{toolName}` | DELETE | 关闭 session                 |
| `/health`         | GET    | 健康检查                     |
| `/tools`          | GET    | 列出所有可用工具及其端点     |

## 可用工具

### Calculator（`/mcp/calculator`）

数学计算器，提供基础算术运算。

| 方法       | 说明           | 参数                     |
| ---------- | -------------- | ------------------------ |
| `add`      | 计算两个数的和 | `a`: number, `b`: number |
| `subtract` | 计算两个数的差 | `a`: number, `b`: number |
| `multiply` | 计算两个数的积 | `a`: number, `b`: number |
| `divide`   | 计算两个数的商 | `a`: number, `b`: number |

### Echo（`/mcp/echo`）

回显工具，用于测试和调试。

| 方法      | 说明             | 参数              |
| --------- | ---------------- | ----------------- |
| `echo`    | 回显输入的消息   | `message`: string |
| `reverse` | 反转输入的字符串 | `text`: string    |
| `info`    | 获取服务器信息   | -                 |

### Time（`/mcp/time`）

时间工具，用于时区转换和格式化。

| 方法               | 说明                       | 参数                                                                         |
| ------------------ | -------------------------- | ---------------------------------------------------------------------------- |
| `get_current_time` | 获取指定时区的当前时间     | `timezone`: string（默认："Etc/UTC"）                                        |
| `convert_time`     | 在时区之间转换时间         | `source_timezone`: string, `target_timezone`: string, `time`: string (HH:MM) |
| `format_time`      | 将时间戳转换为格式化字符串 | `timestamp`: number (毫秒), `timezone`: string                               |

## 客户端配置

### Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）：

```json
{
  "mcpServers": {
    "calculator": {
      "url": "http://localhost:3000/mcp/calculator",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer your-secret-key"
      }
    },
    "time": {
      "url": "http://localhost:3000/mcp/time",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer your-secret-key"
      }
    }
  }
}
```

### Cursor / VS Code

在项目根目录创建 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "calculator": {
      "url": "http://localhost:3000/mcp/calculator",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer your-secret-key"
      }
    }
  }
}
```

### 编程方式调用（Node.js）

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({
  name: "my-client",
  version: "1.0.0",
});

const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3000/mcp/calculator"),
  {
    requestInit: {
      headers: {
        Authorization: "Bearer your-secret-key",
      },
    },
  }
);

await client.connect(transport);

// 列出可用工具
const tools = await client.listTools();
console.log(tools);

// 调用工具
const result = await client.callTool({
  name: "add",
  arguments: { a: 10, b: 5 },
});
console.log(result);
```

## 添加新工具

1. 在 `src/tools/` 下创建新目录：

```
src/tools/my-tool/
└── index.ts
```

2. 实现 `MCPTool` 接口：

```typescript
import { z } from "zod";
import { MCPTool, MCPMethodDefinition } from "../../types/mcp.js";

const myTool: MCPTool = {
  name: "my-tool",
  description: "Description of my tool",
  version: "1.0.0",

  getMethods(): MCPMethodDefinition[] {
    return [
      {
        name: "my-method",
        description: "Description of my method",
        inputSchema: {
          param1: z.string().describe("Parameter description"),
        },
        handler: async (params) => {
          const { param1 } = params as { param1: string };
          return { result: param1 };
        },
      },
    ];
  },

  async initialize() {
    // 初始化逻辑
  },

  async healthCheck() {
    return true;
  },
};

export default myTool;
```

3. 工具会在服务器启动时自动加载。

## 脚本命令

```bash
npm run dev        # 启动开发服务器（热重载）
npm run build      # 构建生产版本
npm start          # 启动生产服务器
npm test           # 运行测试
npm run lint       # 检查代码风格
npm run lint:fix   # 自动修复代码风格问题
```

## 许可证

MIT
