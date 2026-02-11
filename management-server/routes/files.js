const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const sharp = require('sharp');
const { UPLOADS_DIR, sanitizeName, sanitizeFilename, getConfigPath } = require('../utils/paths');
const mediaConfig = require('../config/mediaConfig');
const { transcodeVideoFromDisk, isVideo, isImage } = require('../utils/videoProcessor');

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
    cb(null, `${Date.now()}-${file.originalname}`);
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
  const outputFileName = file.originalname.replace(/\.[^/.]+$/, '.webp');
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
  const outputFileName = file.originalname.replace(/\.[^/.]+$/, '.mp4');
  // Output to parent folder (not .processing)
  const finalDir = path.dirname(path.dirname(file.path));
  const outputPath = path.join(finalDir, outputFileName);

  // Transcode from temp file to final output (temp file is deleted by transcoder)
  await transcodeVideoFromDisk(file.path, outputPath, mediaConfig);

  return outputFileName;
}

// POST /api/upload - Upload and process media files
router.post('/upload', upload.array('media'), async (req, res) => {
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
        // Skip .processing folder
        if (file === '.processing') return null;
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

// DELETE /api/files - Delete a file
router.delete('/files', async (req, res) => {
  const folder = sanitizeName(req.query.folder || '');
  const filename = sanitizeFilename(req.query.filename || '');
  if (!folder || !filename) return res.status(400).json({ error: 'Folder and filename required' });

  const filePath = path.join(UPLOADS_DIR, folder, filename);

  try {
    await fsp.unlink(filePath);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete file' });
  }
});

module.exports = router;
