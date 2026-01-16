import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth.js';

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockReq = {
      path: '/api/test',
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('skip auth paths', () => {
    it('should skip auth for /health path', () => {
      mockReq = {
        path: '/health',
        headers: {},
      };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip auth for / root path', () => {
      mockReq = {
        path: '/',
        headers: {},
      };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('when AUTHORIZATION_KEY not configured', () => {
    it('should skip auth and call next', () => {
      delete process.env.AUTHORIZATION_KEY;
      mockReq = {
        path: '/api/test',
        headers: {},
      };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('when AUTHORIZATION_KEY is configured', () => {
    beforeEach(() => {
      process.env.AUTHORIZATION_KEY = 'test-secret-key';
    });

    it('should return 401 for missing Authorization header', () => {
      mockReq.headers = {};
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid Authorization format (no Bearer)', () => {
      mockReq.headers = { authorization: 'Basic token123' };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid Authorization format. Expected: Bearer <token>',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid Authorization format (only token)', () => {
      mockReq.headers = { authorization: 'token123' };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid Authorization format. Expected: Bearer <token>',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for empty Bearer token', () => {
      mockReq.headers = { authorization: 'Bearer' };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid token', () => {
      mockReq.headers = { authorization: 'Bearer wrong-token' };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next for valid token', () => {
      mockReq.headers = { authorization: 'Bearer test-secret-key' };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive Bearer keyword', () => {
      mockReq.headers = { authorization: 'bearer test-secret-key' };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      // 'bearer' (lowercase) should not match 'Bearer'
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      process.env.AUTHORIZATION_KEY = 'secret';
    });

    it('should handle token with extra spaces', () => {
      mockReq.headers = { authorization: 'Bearer  secret' };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Extra space means parts[1] is empty, parts[2] is 'secret'
      // So this should fail as parts.length !== 2
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle token with special characters', () => {
      process.env.AUTHORIZATION_KEY = 'key-with-special_chars.123';
      mockReq.headers = { authorization: 'Bearer key-with-special_chars.123' };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle very long token', () => {
      const longToken = 'a'.repeat(1000);
      process.env.AUTHORIZATION_KEY = longToken;
      mockReq.headers = { authorization: `Bearer ${longToken}` };
      
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
