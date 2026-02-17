/**
 * Media processing configuration
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
  MAX_IMAGE_SIZE: 50 * 1024 * 1024,   // 50MB per image
  MAX_VIDEO_SIZE: 500 * 1024 * 1024,  // 500MB per video
  MAX_FILES: 20,                       // Max files per upload

  // Allowed MIME types
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ],

  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/webm',
    'video/quicktime',     // .mov
    'video/x-msvideo',     // .avi
    'video/x-matroska',    // .mkv
  ],

  // Video transcoding settings (H.264 for Pi 4 hardware decoding)
  VIDEO_CODEC: 'libx264',
  VIDEO_PRESET: 'ultrafast',  // fast encoding for Pi (larger file but quick)
  VIDEO_CRF: 23,              // quality (lower = better, 18-28 typical)
  VIDEO_MAX_WIDTH: 1280,
  VIDEO_MAX_HEIGHT: 720,
};
