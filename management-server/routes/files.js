const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const sharp = require('sharp');
const { UPLOADS_DIR, sanitizeName, sanitizeFilename, getConfigPath } = require('../utils/paths');
const mediaConfig = require('../config/mediaConfig');
const { transcodeVideoFromDisk, generateThumbnail, isVideo, isImage } = require('../utils/videoProcessor');
const { setProgress, getProgress, clearProgress, getAllProgress } = require('../utils/progressTracker');

const router = express.Router();

// Combine allowed types for multer filter
const ALLOWED_MIME_TYPES = [
  ...mediaConfig.ALLOWED_IMAGE_TYPES,
  ...mediaConfig.ALLOWED_VIDEO_TYPES,
];

// Use larger limit for videos
const MAX_FILE_SIZE = Math.max(mediaConfig.MAX_IMAGE_SIZE, mediaConfig.MAX_VIDEO_SIZE);

// Use disk storage - save to .processing subfolder during upload/transcoding
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.query.folder && req.query.folder.trim() !== '' ? req.query.folder.trim() : '';
    // Save to .processing subfolder so incomplete files don't appear in listings
    const processingPath = folder
      ? path.join(UPLOADS_DIR, folder, '.processing')
      : path.join(UPLOADS_DIR, '.processing');
    fs.mkdirSync(processingPath, { recursive: true });
    cb(null, processingPath);
  },
  filename: (req, file, cb) => {
    const safeFilename = sanitizeFilename(file.originalname);
    cb(null, `${Date.now()}-${safeFilename}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: mediaConfig.MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  },
});

// Process a single image file (reads from .processing, outputs to parent folder)
async function processImage(file) {
  const outputFileName = sanitizeFilename(file.originalname).replace(/\.[^/.]+$/, '.webp');
  // Output to parent folder (not .processing)
  const finalDir = path.dirname(path.dirname(file.path));
  const outputPath = path.join(finalDir, outputFileName);

  const image = sharp(file.path).rotate();
  const meta = await image.metadata();
  const isPortrait = meta.height > meta.width;

  await image
    .resize(
      isPortrait ? mediaConfig.PORTRAIT_WIDTH : mediaConfig.LANDSCAPE_WIDTH,
      isPortrait ? mediaConfig.PORTRAIT_HEIGHT : mediaConfig.LANDSCAPE_HEIGHT,
      {
        fit: mediaConfig.RESIZE_FIT,
        kernel: sharp.kernel.lanczos3,
      }
    )
    .webp({ quality: mediaConfig.WEBP_QUALITY })
    .toFile(outputPath);

  // Remove the temp file (ignore if already gone)
  try {
    await fsp.unlink(file.path);
  } catch (e) {
    // File may already be deleted, ignore
  }

  return outputFileName;
}

// Process a single video file (transcode to H.264 for Pi hardware decoding)
async function processVideo(file) {
  const outputFileName = sanitizeFilename(file.originalname).replace(/\.[^/.]+$/, '.mp4');
  const thumbnailFileName = sanitizeFilename(file.originalname).replace(/\.[^/.]+$/, '.thumb.jpg');
  // Output to parent folder (not .processing)
  const finalDir = path.dirname(path.dirname(file.path));
  const outputPath = path.join(finalDir, outputFileName);
  const thumbnailPath = path.join(finalDir, thumbnailFileName);

  // Track progress for this file
  setProgress(outputFileName, 0, 'transcoding');

  // Transcode from temp file to final output (temp file is deleted by transcoder)
  await transcodeVideoFromDisk(file.path, outputPath, mediaConfig, (percent) => {
    setProgress(outputFileName, percent, 'transcoding');
  });

  // Generate thumbnail from the transcoded video
  setProgress(outputFileName, 100, 'thumbnail');
  try {
    await generateThumbnail(outputPath, thumbnailPath);
  } catch (err) {
    console.warn(`[Upload] Could not generate thumbnail for ${outputFileName}:`, err.message);
    // Continue without thumbnail - not a fatal error
  }

  // Clear progress when done
  clearProgress(outputFileName);

  return outputFileName;
}

// Helper to format file size
function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

// POST /api/upload - Upload and process media files
router.post('/upload', (req, res, next) => {
  upload.array('media')(req, res, (err) => {
    if (err) {
      // Handle multer errors (file too large, etc.)
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxSize = formatFileSize(MAX_FILE_SIZE);
        return res.status(413).json({
          error: 'File too large',
          message: `File exceeds maximum size of ${maxSize}`,
          code: 'FILE_TOO_LARGE'
        });
      }
      if (err.message === 'Only image and video files are allowed') {
        return res.status(400).json({
          error: 'Invalid file type',
          message: err.message,
          code: 'INVALID_FILE_TYPE'
        });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    // Process files sequentially to avoid overloading Pi CPU
    const processedFiles = [];
    for (const file of req.files) {
      if (isVideo(file.mimetype)) {
        processedFiles.push(await processVideo(file));
      } else if (isImage(file.mimetype)) {
        processedFiles.push(await processImage(file));
      } else {
        throw new Error(`Unsupported file type: ${file.mimetype}`);
      }
    }

    res.json({
      message: 'Files uploaded and processed successfully',
      files: processedFiles
    });
  } catch (err) {
    console.error('Media processing failed:', err);
    res.status(500).json({ error: 'Failed to process media files' });
  }
});

// Apply saved file order to disk files
function applyFileOrder(diskFiles, savedOrder) {
  if (!savedOrder || savedOrder.length === 0) {
    return diskFiles;
  }

  const diskSet = new Set(diskFiles);
  const orderedFiles = [];

  // Add files in saved order (if they still exist on disk)
  for (const file of savedOrder) {
    if (diskSet.has(file)) {
      orderedFiles.push(file);
      diskSet.delete(file);
    }
  }

  // Append new files not in saved order
  for (const file of diskFiles) {
    if (diskSet.has(file)) {
      orderedFiles.push(file);
    }
  }

  return orderedFiles;
}

// GET /api/files - List files in a folder
router.get('/files', async (req, res) => {
  const folder = sanitizeName(req.query.folder || '');
  if (!folder) return res.status(400).json({ error: 'Folder name required' });

  const folderPath = path.join(UPLOADS_DIR, folder);
  const configPath = getConfigPath(folder);

  try {
    const files = await fsp.readdir(folderPath);

    const fileChecks = await Promise.all(
      files.map(async (file) => {
        // Skip .processing folder and thumbnail files
        if (file === '.processing' || file.endsWith('.thumb.jpg')) return null;
        const fullPath = path.join(folderPath, file);
        const stat = await fsp.stat(fullPath);
        return stat.isFile() ? file : null;
      })
    );
    const onlyFiles = fileChecks.filter(Boolean);

    // Try to read config for file order
    let orderedFiles = onlyFiles;
    try {
      const configData = await fsp.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);

      if (config.fileOrder && Array.isArray(config.fileOrder)) {
        orderedFiles = applyFileOrder(onlyFiles, config.fileOrder);
      }
    } catch (configErr) {
      // Config doesn't exist or is invalid - use disk order
    }

    // Check for files currently being processed
    let processing = [];
    try {
      const processingPath = path.join(folderPath, '.processing');
      const processingFiles = await fsp.readdir(processingPath);
      processing = processingFiles.map(f => {
        // Extract original filename from "timestamp-originalname"
        const match = f.match(/^\d+-(.+)$/);
        return match ? match[1].replace(/\.[^/.]+$/, '') : f;
      });
    } catch (e) {
      // .processing folder doesn't exist, that's fine
    }

    res.json({ files: orderedFiles, processing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not read folder' });
  }
});

// GET /api/processing-progress - Get transcoding progress for all files
router.get('/processing-progress', (req, res) => {
  res.json(getAllProgress());
});

// DELETE /api/files - Delete a file
router.delete('/files', async (req, res) => {
  const folder = sanitizeName(req.query.folder || '');
  const filename = sanitizeFilename(req.query.filename || '');
  if (!folder || !filename) return res.status(400).json({ error: 'Folder and filename required' });

  const filePath = path.join(UPLOADS_DIR, folder, filename);
  const configPath = getConfigPath(folder);

  try {
    await fsp.unlink(filePath);

    // Also delete thumbnail if it exists (for videos)
    if (filename.endsWith('.mp4')) {
      const thumbnailPath = filePath.replace(/\.mp4$/, '.thumb.jpg');
      try {
        await fsp.unlink(thumbnailPath);
      } catch (e) {
        // Thumbnail may not exist, ignore
      }
    }

    // Clean up config references to deleted file
    try {
      const configData = await fsp.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      let configChanged = false;

      // Remove from fullscreenMedia
      if (config.fullscreenMedia && Array.isArray(config.fullscreenMedia)) {
        const idx = config.fullscreenMedia.indexOf(filename);
        if (idx !== -1) {
          config.fullscreenMedia.splice(idx, 1);
          configChanged = true;
        }
      }

      // Remove from fileOrder
      if (config.fileOrder && Array.isArray(config.fileOrder)) {
        const idx = config.fileOrder.indexOf(filename);
        if (idx !== -1) {
          config.fileOrder.splice(idx, 1);
          configChanged = true;
        }
      }

      if (configChanged) {
        await fsp.writeFile(configPath, JSON.stringify(config, null, 2));
      }
    } catch (e) {
      // Config doesn't exist or couldn't be updated - not critical
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete file' });
  }
});

module.exports = router;
