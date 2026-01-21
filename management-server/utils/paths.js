const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const CONFIGS_DIR = path.join(__dirname, '..', 'configs');

/**
 * Sanitize folder and file names to prevent path traversal
 * @param {string} name - The name to sanitize
 * @returns {string} Sanitized name with only alphanumeric, dash, and underscore
 */
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '');
}

/**
 * Sanitize filename to prevent path traversal while allowing dots for extensions
 * @param {string} filename - The filename to sanitize
 * @returns {string} Sanitized filename with only alphanumeric, dash, underscore, and dot
 */
function sanitizeFilename(filename) {
  // Remove any path separators and parent directory references
  const basename = path.basename(filename);
  // Allow alphanumeric, dash, underscore, and dot (for extensions)
  return basename.replace(/[^a-zA-Z0-9-_.]/g, '');
}

/**
 * Get the config file path for a given side
 * @param {string} side - The side identifier (e.g., 'left', 'right')
 * @returns {string} Full path to the config file
 */
function getConfigPath(side) {
  const safeSide = sanitizeName(side);
  return path.join(CONFIGS_DIR, `config_${safeSide}.json`);
}

module.exports = {
  UPLOADS_DIR,
  CONFIGS_DIR,
  sanitizeName,
  sanitizeFilename,
  getConfigPath,
};
