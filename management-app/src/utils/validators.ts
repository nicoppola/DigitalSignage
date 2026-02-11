/**
 * API response validation utilities
 * Ensures data returned from APIs has the expected structure and valid values
 */

interface FileListResponse {
  files: string[];
  processing: string[];
}

/**
 * Validate file list response from API
 * @param data - Response data to validate
 * @returns Validated file list
 * @throws {Error} If validation fails
 */
export const validateFileListResponse = (data: unknown): FileListResponse => {
  // Check response exists and is an object
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: expected object');
  }

  const responseData = data as Record<string, unknown>;

  // Check files property exists and is an array
  if (!Array.isArray(responseData.files)) {
    throw new Error('Invalid response: files must be an array');
  }

  // Filter out invalid entries (must be non-empty strings)
  const validFiles = responseData.files.filter(
    (file): file is string => typeof file === 'string' && file.length > 0 && file.length < 256
  );

  // Extract processing files (optional, defaults to empty array)
  const processing = Array.isArray(responseData.processing)
    ? responseData.processing.filter(
        (file): file is string => typeof file === 'string' && file.length > 0 && file.length < 256
      )
    : [];

  return { files: validFiles, processing };
};

interface ConfigResponse {
  secondsBetweenImages: number;
}

/**
 * Validate config response from API
 * @param data - Response data to validate
 * @returns Validated config
 * @throws {Error} If validation fails
 */
export const validateConfigResponse = (data: unknown): ConfigResponse => {
  // Check response exists and is an object
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid config response: expected object');
  }

  const responseData = data as Record<string, unknown>;

  // Extract and validate secondsBetweenImages
  const rawSeconds = responseData.secondsBetweenImages;

  // Must be a number
  const seconds = Number(rawSeconds);
  if (isNaN(seconds)) {
    throw new Error('Invalid secondsBetweenImages: must be a number');
  }

  // Must be non-negative
  if (seconds < 0) {
    throw new Error('Invalid secondsBetweenImages: must be non-negative');
  }

  // Must be reasonable (max 1 hour = 3600 seconds)
  if (seconds > 3600) {
    throw new Error('Invalid secondsBetweenImages: must be less than 3600');
  }

  return {
    secondsBetweenImages: seconds,
  };
};

interface UpdateCheckResponse {
  updatesAvailable: boolean;
}

/**
 * Validate update check response from API
 * @param data - Response data to validate
 * @returns Validated update status
 * @throws {Error} If validation fails
 */
export const validateUpdateCheckResponse = (data: unknown): UpdateCheckResponse => {
  // Check response exists and is an object
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid update check response: expected object');
  }

  const responseData = data as Record<string, unknown>;

  // updatesAvailable must be a boolean
  if (typeof responseData.updatesAvailable !== 'boolean') {
    throw new Error('Invalid updatesAvailable: must be a boolean');
  }

  return {
    updatesAvailable: responseData.updatesAvailable,
  };
};

interface UpdateResultResponse {
  success: boolean;
  message: string;
}

/**
 * Validate update result response from API
 * @param data - Response data to validate
 * @returns Validated update result
 * @throws {Error} If validation fails
 */
export const validateUpdateResultResponse = (data: unknown): UpdateResultResponse => {
  // Check response exists and is an object
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid update result response: expected object');
  }

  const responseData = data as Record<string, unknown>;

  // Validate success field (optional, defaults to true if not present)
  const success = responseData.success !== false;

  // Validate message field (optional)
  const message =
    typeof responseData.message === 'string' ? responseData.message : 'Update completed';

  return {
    success,
    message,
  };
};

interface DeleteFileResponse {
  success: boolean;
}

/**
 * Validate delete file response
 * @param data - Response data to validate
 * @returns Validated delete result
 */
export const validateDeleteFileResponse = (data: unknown): DeleteFileResponse => {
  // For delete, we just need to ensure it doesn't throw
  // Success is determined by HTTP status code
  return { success: true };
};
