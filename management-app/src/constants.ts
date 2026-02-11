/**
 * Application-wide constants
 * Centralized configuration values for easy maintenance and documentation
 */

/**
 * API endpoint URLs
 */
export const API_ENDPOINTS = {
  CHECK_UPDATES: '/api/check-updates',
  SELF_UPDATE: '/api/self-update',
  REBOOT: '/api/reboot',
  LOGIN: '/login',
  CONFIG: '/config',
  FILES: '/api/files',
  UPLOAD: '/api/upload',
} as const;

export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];

/**
 * Timeout values in milliseconds
 */
export const TIMEOUTS = {
  // XHR upload timeout for large files
  XHR_UPLOAD: 600000, // 10 minutes

  // Status message display durations
  STATUS_MESSAGE_SHORT: 2000,   // 2 seconds - for quick confirmations
  UPDATE_SUCCESS: 3500,          // 3.5 seconds - for update success messages
  UPDATE_ERROR: 5000,            // 5 seconds - for error messages (longer to read)
} as const;

export type TimeoutKey = keyof typeof TIMEOUTS;

/**
 * Default values
 */
export const DEFAULTS = {
  FOLDER_NAME: 'default-folder',
  SECONDS_BETWEEN_IMAGES: 5,
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  OK_MIN: 200,
  OK_MAX: 300,
} as const;
