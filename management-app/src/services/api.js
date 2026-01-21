/**
 * Centralized API service for all HTTP requests
 * All functions include credentials and consistent error handling
 */

import { API_ENDPOINTS, HTTP_STATUS, TIMEOUTS } from '../constants.ts';

const defaultOptions = {
  credentials: 'include',
};

/**
 * Helper function to handle fetch responses
 * @param {Response} response - Fetch API response
 * @returns {Promise<any>} Parsed JSON data
 * @throws {Error} If response is not ok
 */
async function handleResponse(response) {
  if (!response.ok) {
    const error = new Error(`HTTP error! status: ${response.status}`);
    error.response = response;
    throw error;
  }

  try {
    return await response.json();
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err.message}`);
  }
}

/**
 * Update Management API
 */
export const updateAPI = {
  /**
   * Check if updates are available
   * @returns {Promise<{updatesAvailable: boolean}>}
   */
  async checkForUpdates() {
    const response = await fetch(API_ENDPOINTS.CHECK_UPDATES, defaultOptions);
    return handleResponse(response);
  },

  /**
   * Perform self-update
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async performUpdate() {
    const response = await fetch(API_ENDPOINTS.SELF_UPDATE, {
      ...defaultOptions,
      method: 'POST',
    });
    return handleResponse(response);
  },
};

/**
 * Device Management API
 */
export const deviceAPI = {
  /**
   * Reboot the device
   * @returns {Promise<{message: string}>}
   */
  async reboot() {
    const response = await fetch(API_ENDPOINTS.REBOOT, {
      ...defaultOptions,
      method: 'POST',
    });
    return handleResponse(response);
  },
};

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * Login with username and password
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{success: boolean}>}
   */
  async login(username, password) {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  /**
   * Check authentication status by fetching protected resource
   * @returns {Promise<boolean>} True if authenticated
   */
  async checkAuth() {
    try {
      const response = await fetch(`${API_ENDPOINTS.CONFIG}?side=left`, defaultOptions);
      return response.ok;
    } catch {
      return false;
    }
  },
};

/**
 * Configuration API
 */
export const configAPI = {
  /**
   * Get configuration for a side
   * @param {string} side - 'left' or 'right'
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig(side) {
    const response = await fetch(`${API_ENDPOINTS.CONFIG}?side=${side}`, defaultOptions);
    return handleResponse(response);
  },

  /**
   * Update configuration
   * @param {string} side - 'left' or 'right'
   * @param {Object} config - Configuration object
   * @returns {Promise<{success: boolean}>}
   */
  async updateConfig(side, config) {
    const response = await fetch(API_ENDPOINTS.CONFIG, {
      ...defaultOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side, config }),
    });
    return handleResponse(response);
  },
};

/**
 * File Management API
 */
export const fileAPI = {
  /**
   * Get list of files for a side
   * @param {string} side - 'left' or 'right'
   * @returns {Promise<Array<string>>} Array of file names
   */
  async getFiles(side) {
    const response = await fetch(`${API_ENDPOINTS.FILES}?folder=${side}`, defaultOptions);
    return handleResponse(response);
  },

  /**
   * Delete a file
   * @param {string} side - 'left' or 'right'
   * @param {string} filename - Name of file to delete
   * @returns {Promise<{success: boolean}>}
   */
  async deleteFile(side, filename) {
    const response = await fetch(
      `${API_ENDPOINTS.FILES}?folder=${side}&filename=${encodeURIComponent(filename)}`,
      {
        ...defaultOptions,
        method: 'DELETE',
      }
    );
    return handleResponse(response);
  },

  /**
   * Upload files with progress tracking
   * Note: Uses XMLHttpRequest for progress events
   * @param {string} side - 'left' or 'right'
   * @param {FileList|Array<File>} files - Files to upload
   * @param {Function} onProgress - Progress callback (index, percent)
   * @returns {Promise<Array<{file: string, success: boolean, message: string}>>}
   */
  uploadFiles(side, files, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });

      const xhr = new XMLHttpRequest();

      // Set timeout to prevent hanging uploads
      xhr.timeout = TIMEOUTS.XHR_UPLOAD;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= HTTP_STATUS.OK_MIN && xhr.status < HTTP_STATUS.OK_MAX) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (err) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout - file took too long to upload'));
      });

      xhr.open('POST', `${API_ENDPOINTS.UPLOAD}?folder=${encodeURIComponent(side)}`);
      xhr.withCredentials = true; // Include credentials for auth
      xhr.send(formData);
    });
  },
};

/**
 * Combined API object for convenience
 */
const api = {
  ...updateAPI,
  ...deviceAPI,
  ...authAPI,
  ...configAPI,
  ...fileAPI,
};

export default api;
