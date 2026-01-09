/**
 * 简单的终端日志工具
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const colors = {
  DEBUG: '\x1b[36m',  // cyan
  INFO: '\x1b[32m',   // green
  WARN: '\x1b[33m',   // yellow
  ERROR: '\x1b[31m',  // red
  RESET: '\x1b[0m',
};

function formatTime(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, message: string, meta?: unknown): void {
  const color = colors[level];
  const reset = colors.RESET;
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  console.log(`${color}[${formatTime()}] [${level}]${reset} ${message}${metaStr}`);
}

export const logger = {
  debug: (message: string, meta?: unknown) => log('DEBUG', message, meta),
  info: (message: string, meta?: unknown) => log('INFO', message, meta),
  warn: (message: string, meta?: unknown) => log('WARN', message, meta),
  error: (message: string, meta?: unknown) => log('ERROR', message, meta),
};
