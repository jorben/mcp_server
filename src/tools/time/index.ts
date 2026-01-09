import { z } from 'zod';
import { MCPTool, MCPMethodDefinition } from '../../types/mcp.js';

/**
 * Time Tool - Provides timezone conversion and time formatting
 */
const timeTool: MCPTool = {
  name: 'time',
  description: 'Time tool providing current time retrieval, timezone conversion, and time formatting',
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

          // Parse time
          const [hours, minutes] = time.split(':').map(Number);
          if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error('Invalid time value');
          }

          // Validate timezones
          validateTimezone(source_timezone);
          validateTimezone(target_timezone);

          // Use today's date as reference
          const today = new Date();
          const year = today.getFullYear();
          const month = today.getMonth();
          const day = today.getDate();

          // Create a base time point (using UTC)
          const baseDate = new Date(Date.UTC(year, month, day, hours, minutes, 0));

          // Get source timezone offset
          const sourceOffset = getTimezoneOffsetMinutes(source_timezone, baseDate);

          // Calculate UTC time: source time - source offset = UTC time
          const utcTime = new Date(baseDate.getTime() - sourceOffset * 60000);

          // Format to target timezone
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
    // No initialization required
  },

  async healthCheck() {
    // Verify timezone functionality is available
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'Etc/UTC' }).format(new Date());
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Validate if timezone is valid
 */
function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

/**
 * Format date to string in specified timezone
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
 * Get timezone offset in minutes relative to UTC
 */
function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });

  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);

  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

export default timeTool;
