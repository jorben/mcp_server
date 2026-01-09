import { z } from 'zod';
import { MCPTool, MCPMethodDefinition } from '../../types/mcp.js';

/**
 * 时间工具 - 提供时区转换和时间格式化功能
 */
const timeTool: MCPTool = {
  name: 'time',
  description: '时间工具，提供获取当前时间、时区转换和时间格式化功能',
  version: '1.0.0',

  getMethods(): MCPMethodDefinition[] {
    return [
      {
        name: 'get_current_time',
        description: 'Get current time in a specific timezone',
        inputSchema: {
          timezone: z.string()
            .default('Etc/UTC')
            .describe('IANA timezone name (e.g., "America/New_York", "Europe/London"). Defaults to "Etc/UTC"'),
        },
        handler: async (params) => {
          const { timezone = 'Etc/UTC' } = params as { timezone?: string };

          try {
            const now = new Date();
            const formatted = formatDateInTimezone(now, timezone);

            return {
              timezone,
              datetime: formatted,
              iso: now.toISOString(),
              timestamp: now.getTime(),
            };
          } catch {
            throw new Error(`Invalid timezone: ${timezone}`);
          }
        },
      },
      {
        name: 'convert_time',
        description: 'Convert time between timezones',
        inputSchema: {
          source_timezone: z.string().describe('Source IANA timezone name (e.g., "America/New_York")'),
          target_timezone: z.string().describe('Target IANA timezone name (e.g., "Europe/London")'),
          time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').describe('Time in 24-hour format (HH:MM)'),
        },
        handler: async (params) => {
          const { source_timezone, target_timezone, time } = params as {
            source_timezone: string;
            target_timezone: string;
            time: string;
          };

          // 解析时间
          const [hours, minutes] = time.split(':').map(Number);
          if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error('Invalid time value');
          }

          // 验证时区有效性
          validateTimezone(source_timezone);
          validateTimezone(target_timezone);

          // 使用今天的日期作为基准
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const day = today.getDate();

          // 创建一个基准时间点（使用 UTC）
          const baseDate = new Date(Date.UTC(year, month, day, hours, minutes, 0));

          // 获取源时区的偏移量
          const sourceOffset = getTimezoneOffsetMinutes(source_timezone, baseDate);

          // 计算 UTC 时间：源时区时间 - 源时区偏移 = UTC 时间
          const utcTime = new Date(baseDate.getTime() - sourceOffset * 60000);

          // 格式化为目标时区
          const targetFormatted = formatDateInTimezone(utcTime, target_timezone);
          const [targetDate, targetTime] = targetFormatted.split(' ');

          const sourceDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          return {
            source: {
              timezone: source_timezone,
              time,
              date: sourceDate,
            },
            target: {
              timezone: target_timezone,
              time: targetTime.slice(0, 5), // HH:MM
              date: targetDate,
            },
          };
        },
      },
      {
        name: 'format_time',
        description: 'Convert timestamp to formatted datetime string (YYYY-MM-DD HH:MM:SS)',
        inputSchema: {
          timestamp: z.number().describe('Unix timestamp in milliseconds'),
          timezone: z.string()
            .default('Etc/UTC')
            .describe('IANA timezone name (e.g., "Asia/Shanghai"). Defaults to "Etc/UTC"'),
        },
        handler: async (params) => {
          const { timestamp, timezone = 'Etc/UTC' } = params as { timestamp: number; timezone?: string };

          const date = new Date(timestamp);

          if (isNaN(date.getTime())) {
            throw new Error('Invalid timestamp');
          }

          try {
            const formatted = formatDateInTimezone(date, timezone);

            return {
              timestamp,
              timezone,
              formatted,
              iso: date.toISOString(),
            };
          } catch {
            throw new Error(`Invalid timezone: ${timezone}`);
          }
        },
      },
    ];
  },

  async initialize() {
    // 无需初始化
  },

  async healthCheck() {
    // 验证时区功能可用
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'Etc/UTC' }).format(new Date());
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * 验证时区是否有效
 */
function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

/**
 * 格式化日期为指定时区的字符串
 */
function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value ?? '';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

/**
 * 获取指定时区相对于 UTC 的偏移量（分钟）
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });

  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);

  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

export default timeTool;
