/**
 * Centralized logging utility
 * Provides consistent logging across the application with timestamps
 * Can be easily extended to send logs to monitoring services
 */

type LogLevel = 'error' | 'warn' | 'info' | 'log';

const formatMessage = (level: LogLevel, message: string, error?: unknown): void => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  if (error) {
    console[level](prefix, message, error);
  } else {
    console[level](prefix, message);
  }
};

export const logger = {
  /**
   * Log error messages
   * @param message - Error description
   * @param error - Optional error object
   */
  error: (message: string, error?: unknown): void => {
    formatMessage('error', message, error);
  },

  /**
   * Log warning messages
   * @param message - Warning description
   */
  warn: (message: string): void => {
    formatMessage('warn', message);
  },

  /**
   * Log info messages
   * @param message - Info description
   */
  info: (message: string): void => {
    formatMessage('info', message);
  },

  /**
   * Log debug messages (only in development)
   * @param message - Debug description
   */
  debug: (message: string): void => {
    if (import.meta.env.DEV) {
      formatMessage('log', message);
    }
  }
};
