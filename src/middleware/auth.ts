import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Bearer Token 认证中间件
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 跳过健康检查和根路径
  if (req.path === '/health' || req.path === '/') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const expectedKey = process.env.AUTHORIZATION_KEY;

  // 检查是否配置了授权密钥
  if (!expectedKey) {
    logger.warn('AUTHORIZATION_KEY not configured, skipping auth');
    next();
    return;
  }

  // 检查 Authorization header
  if (!authHeader) {
    logger.warn('Missing Authorization header', { path: req.path });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header',
    });
    return;
  }

  // 验证 Bearer token 格式
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn('Invalid Authorization format', { path: req.path });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization format. Expected: Bearer <token>',
    });
    return;
  }

  const token = parts[1];

  // 验证 token
  if (token !== expectedKey) {
    logger.warn('Invalid token', { path: req.path });
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid token',
    });
    return;
  }

  next();
}
