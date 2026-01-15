import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock toolRegistry with inline implementation
vi.mock('./tool-registry.js', () => ({
  toolRegistry: {
    register: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockReturnValue(true),
  },
}));

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

// Import after mocks
import { ToolLoader } from './tool-loader.js';
import { toolRegistry } from './tool-registry.js';
import { glob } from 'glob';

describe('ToolLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should use default tools directory when not specified', () => {
      const loader = new ToolLoader();
      expect(loader).toBeInstanceOf(ToolLoader);
    });

    it('should use custom tools directory when specified', () => {
      const customDir = '/custom/tools/dir';
      const loader = new ToolLoader(customDir);
      expect(loader).toBeInstanceOf(ToolLoader);
    });
  });

  describe('loadAll', () => {
    it('should find and load tools from directory', async () => {
      const toolsDir = path.resolve(__dirname, '../tools');
      const loader = new ToolLoader(toolsDir);
      
      // Mock glob to return actual tool path
      const echoToolPath = path.join(toolsDir, 'echo/index.ts');
      vi.mocked(glob).mockResolvedValue([echoToolPath]);
      
      await loader.loadAll();
      
      expect(glob).toHaveBeenCalled();
    });

    it('should handle no tools found', async () => {
      const loader = new ToolLoader('/empty/dir');
      vi.mocked(glob).mockResolvedValue([]);
      
      await loader.loadAll();
      
      expect(toolRegistry.register).not.toHaveBeenCalled();
    });

    it('should handle glob error gracefully', async () => {
      const loader = new ToolLoader('/invalid/path');
      vi.mocked(glob).mockRejectedValue(new Error('Glob error'));
      
      // Should not throw
      await loader.loadAll();
      
      expect(toolRegistry.register).not.toHaveBeenCalled();
    });
  });

  describe('reloadTool', () => {
    it('should unregister tool before reloading', async () => {
      const toolsDir = path.resolve(__dirname, '../tools');
      const loader = new ToolLoader(toolsDir);
      
      // This will fail because the import will fail, but unregister should be called
      try {
        await loader.reloadTool('test-tool');
      } catch {
        // Expected to fail
      }
      
      expect(toolRegistry.unregister).toHaveBeenCalledWith('test-tool');
    });
  });
});

describe('ToolLoader with real tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call glob with correct pattern', async () => {
    const toolsDir = '/test/tools';
    const loader = new ToolLoader(toolsDir);
    
    vi.mocked(glob).mockResolvedValue([]);
    
    await loader.loadAll();
    
    expect(glob).toHaveBeenCalledWith(
      expect.stringContaining('/test/tools'),
      expect.any(Object),
    );
  });
});
