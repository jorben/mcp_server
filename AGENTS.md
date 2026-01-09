# AGENTS.md - MCP Server Development Guide

This document provides guidelines and commands for agents working on this codebase.

## Project Overview

This is a TypeScript-based MCP (Model Context Protocol) server with a pluggable tool architecture. The server uses Express for HTTP endpoints and Zod for schema validation.

## Build Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Development with hot reload
npm run dev

# Run linting
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run a single test file
npx vitest run src/tools/echo/index.test.ts

# Run tests matching a pattern
npx vitest run -t "echo"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `AUTHORIZATION_KEY` | - | Bearer token for API authentication (optional) |

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2022
- Module: NodeNext
- Strict mode enabled
- Explicit return types: Off (optional, but recommended for public APIs)
- Use `unknown` instead of `any` when type is uncertain

### Naming Conventions

- **Variables/Functions**: camelCase (`toolRegistry`, `getAllTools`)
- **Classes**: PascalCase (`ToolRegistry`, `MCPTool`)
- **Constants**: SCREAMING_SNAKE_CASE for config values
- **Files**: kebab-case for general files, index.ts for directory entry points
- **Interfaces**: Prefix with `MCP` for domain types (`MCPTool`, `MCPMethodDefinition`)

### Imports

- Use `.js` extension in imports even for TypeScript files (required for NodeNext module resolution)
- Group imports in this order: external dependencies, internal modules
- Use named exports for utilities and classes
- Use default exports for tool modules

```typescript
import { z } from 'zod';
import { MCPTool } from '../../types/mcp.js';
```

### Error Handling

- Always use `try/catch` for async operations
- Propagate errors after logging with context
- Use `process.exit(1)` for unrecoverable startup errors
- Log errors with structured metadata using the `logger` utility

```typescript
async function initializeTool(): Promise<void> {
  try {
    await tool.initialize();
  } catch (error) {
    logger.error('Failed to initialize tool', { toolName: tool.name, error });
    throw error;
  }
}
```

### Tool Development Pattern

All tools must implement the `MCPTool` interface and be exported as default:

```typescript
import { z } from 'zod';
import { MCPTool, MCPMethodDefinition } from '../../types/mcp.js';

const myTool: MCPTool = {
  name: 'myTool',
  description: 'Description of the tool',
  version: '1.0.0',

  getMethods(): MCPMethodDefinition[] {
    return [
      {
        name: 'methodName',
        description: 'What this method does',
        inputSchema: {
          param: z.string().describe('Parameter description'),
        },
        handler: async (params) => {
          const { param } = params as { param: string };
          return { result: param };
        },
      },
    ];
  },

  async initialize() {},
  async healthCheck() { return true; },
};

export default myTool;
```

### Zod Schemas

- Use Zod for all input validation
- Always add `.describe()` to schema fields for MCP documentation
- Place schemas inline within method definitions
- Use `as` casting sparingly and only when type is certain

### Logging

- Use the `logger` utility instead of `console.log` directly
- Include contextual metadata as second argument
- Log at appropriate levels: debug, info, warn, error

### Code Organization

- `src/core/`: Core framework (registry, loader, executor)
- `src/tools/`: Tool implementations (each in its own directory)
- `src/types/`: TypeScript interfaces and types
- `src/utils/`: Utility functions
- `src/server/`: HTTP server setup
- `src/middleware/`: Express middleware

### Linting Rules

- Unused variables: Error (except `_` prefix)
- Explicit return types: Off (optional)
- `any` type: Warning (avoid when possible)
- Semicolons: Required
- Quotes: Single quotes preferred
- Commas: Trailing commas required in multiline

### Git Workflow

- Create feature branches from main
- Run `npm run lint` and `npm test` before committing
- Use conventional commit messages
- Don't commit the `dist/` or `node_modules/` directories
