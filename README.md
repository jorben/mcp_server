# MCP Server

A unified MCP (Model Context Protocol) server with pluggable tools. Each tool has an independent endpoint, allowing clients to selectively add specific tools.

[中文文档](./README_zh.md)

## Features

- **Unified Endpoint with Path Routing**: Each tool has its own MCP endpoint (`/mcp/{toolName}`)
- **Loosely Coupled Tools**: Tools are independently loaded from `src/tools/` directory
- **Fault Isolation**: Individual tool failures don't affect other tools (timeout protection + error handling)
- **StreamableHTTP Transport**: Modern MCP transport protocol
- **Bearer Token Authentication**: Secure API access
- **Docker Support**: Ready for containerized deployment

## Project Structure

```
mcp_server/
├── src/
│   ├── index.ts                    # Entry point
│   ├── core/
│   │   ├── tool-registry.ts        # Tool registry
│   │   ├── tool-loader.ts          # Dynamic tool loader
│   │   └── tool-executor.ts        # Isolated executor (timeout + error handling)
│   ├── server/
│   │   ├── app.ts                  # Express + StreamableHTTP
│   │   └── mcp-server.ts           # MCP Server instance
│   ├── middleware/
│   │   └── auth.ts                 # Bearer token authentication
│   ├── tools/                      # Loosely coupled tools directory
│   │   ├── calculator/index.ts     # Calculator tool (add/subtract/multiply/divide)
│   │   ├── echo/index.ts           # Echo tool (echo/reverse/info)
│   │   └── time/index.ts           # Time tool (get_current_time/convert_time/format_time)
│   ├── types/mcp.ts                # Type definitions
│   └── utils/logger.ts             # Terminal logger
├── Dockerfile                      # Multi-stage build
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Create .env file
echo "AUTHORIZATION_KEY=your-secret-key" > .env

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build and run with docker-compose
docker-compose up -d --build

# Or build manually
docker build -t mcp-server .
docker run -e AUTHORIZATION_KEY=your-secret-key -p 3000:3000 mcp-server
```

## API Endpoints

| Endpoint          | Method | Description                                  |
| ----------------- | ------ | -------------------------------------------- |
| `/mcp/{toolName}` | POST   | MCP JSON-RPC request for specific tool       |
| `/mcp/{toolName}` | GET    | SSE connection (requires session-id)         |
| `/mcp/{toolName}` | DELETE | Close session                                |
| `/health`         | GET    | Health check                                 |
| `/tools`          | GET    | List all available tools and their endpoints |

## Available Tools

### Calculator (`/mcp/calculator`)

Math expression evaluator supporting various operators and functions.

| Method     | Description                    | Parameters             |
| ---------- | ------------------------------ | ---------------------- |
| `evaluate` | Evaluate a math expression     | `expression`: string   |

**Supported Operators:**
- Arithmetic: `+`, `-`, `*`, `/`
- Floor Division: `//`
- Modulo: `%`
- Power: `**` or `^`

**Supported Constants:** `pi`, `e`

**Supported Functions:** `sin`, `cos`, `tan`, `sqrt`, `abs`, `log`, `log10`, `exp`, `floor`, `ceil`, `round`, `pow`, `min`, `max`

**Examples:**
```
2 + 3 * 4        → 14
(2 + 3) * 4      → 20
2^10             → 1024
sqrt(16)         → 4
2 * pi           → 6.283...
sin(0)           → 0
pow(2, 8)        → 256
17 // 5          → 3
17 % 5           → 2
```

### Echo (`/mcp/echo`)

Echo tool for testing and debugging.

| Method    | Description                 | Parameters        |
| --------- | --------------------------- | ----------------- |
| `echo`    | Echo back the input message | `message`: string |
| `reverse` | Reverse the input string    | `text`: string    |
| `info`    | Get server information      | -                 |

### Time (`/mcp/time`)

Time tool for timezone conversion and formatting.

| Method             | Description                             | Parameters                                                                   |
| ------------------ | --------------------------------------- | ---------------------------------------------------------------------------- |
| `get_current_time` | Get current time in a specific timezone | `timezone`: string (default: "Etc/UTC")                                      |
| `convert_time`     | Convert time between timezones          | `source_timezone`: string, `target_timezone`: string, `time`: string (HH:MM) |
| `format_time`      | Convert timestamp to formatted string   | `timestamp`: number (ms), `timezone`: string                                 |

## Client Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

Create `.cursor/mcp.json` in project root:

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

### Programmatic Usage (Node.js)

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

// List available tools
const tools = await client.listTools();
console.log(tools);

// Call a tool
const result = await client.callTool({
  name: "add",
  arguments: { a: 10, b: 5 },
});
console.log(result);
```

## Adding New Tools

1. Create a new directory under `src/tools/`:

```
src/tools/my-tool/
└── index.ts
```

2. Implement the `MCPTool` interface:

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
    // Initialization logic
  },

  async healthCheck() {
    return true;
  },
};

export default myTool;
```

3. The tool will be automatically loaded on server startup.

## Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build for production
npm start          # Start production server
npm test           # Run tests
npm run lint       # Check code style
npm run lint:fix   # Auto-fix code style issues
```

## License

MIT
