/**
 * Image processing configuration
 * Adjust these values to match your display requirements
 */
module.exports = {
  // Target dimensions for landscape images
  LANDSCAPE_WIDTH: 1920,
  LANDSCAPE_HEIGHT: 1080,

  // Target dimensions for portrait images
  PORTRAIT_WIDTH: 1080,
  PORTRAIT_HEIGHT: 1920,

  // WebP compression quality (0-100)
  WEBP_QUALITY: 92,

  // Resize fit mode: 'inside', 'outside', 'cover', 'contain', 'fill'
  RESIZE_FIT: 'inside',

  // Upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB per file
  MAX_FILES: 20, // Max files per upload

  // Allowed MIME types
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
};
