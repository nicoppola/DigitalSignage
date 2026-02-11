const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const sharp = require('sharp');
const { UPLOADS_DIR, sanitizeName, sanitizeFilename, getConfigPath } = require('../utils/paths');
const mediaConfig = require('../config/mediaConfig');
const { isVideo, isImage } = require('../utils/videoProcessor');

const router = express.Router();

// Combine allowed types for multer filter
const ALLOWED_MIME_TYPES = [
  ...mediaConfig.ALLOWED_IMAGE_TYPES,
  ...mediaConfig.ALLOWED_VIDEO_TYPES,
];

// Use larger limit for videos
const MAX_FILE_SIZE = Math.max(mediaConfig.MAX_IMAGE_SIZE, mediaConfig.MAX_VIDEO_SIZE);

// Use disk storage to stream files directly to disk (avoids memory issues on Pi)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.query.folder && req.query.folder.trim() !== '' ? req.query.folder.trim() : '';
    const uploadPath = folder ? path.join(UPLOADS_DIR, folder) : UPLOADS_DIR;
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Use original name for videos, temp name for images (will be renamed after processing)
    if (isVideo(file.mimetype)) {
      cb(null, file.originalname);
    } else {
      cb(null, `temp-${Date.now()}-${file.originalname}`);
    }
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

// Process a single image file (reads from disk, outputs to disk)
async function processImage(file) {
  const outputFileName = file.originalname.replace(/\.[^/.]+$/, '.webp');
  const outputPath = path.join(path.dirname(file.path), outputFileName);

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

  // Remove the temp file
  await fsp.unlink(file.path);

  return outputFileName;
}

// POST /api/upload - Upload and process media files
router.post('/upload', upload.array('media'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  try {
    // Videos are already saved to disk by multer (no processing needed)
    // Images need processing (resize + convert to webp)
    const processedFiles = await Promise.all(req.files.map(async (file) => {
      if (isVideo(file.mimetype)) {
        // Video already saved directly to disk - just return the filename
        return file.filename;
      } else if (isImage(file.mimetype)) {
        return await processImage(file);
      } else {
        throw new Error(`Unsupported file type: ${file.mimetype}`);
      }
    }));

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

    res.json({ files: orderedFiles });
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
