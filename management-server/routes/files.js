const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const sharp = require('sharp');
const { UPLOADS_DIR, sanitizeName, sanitizeFilename } = require('../utils/paths');
const imageConfig = require('../config/imageConfig');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: imageConfig.MAX_FILE_SIZE,
    files: imageConfig.MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    if (imageConfig.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// POST /api/upload - Upload and process images
router.post('/upload', upload.array('images'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const folder = req.query.folder && req.query.folder.trim() !== '' ? req.query.folder.trim() : '';
  const uploadPath = folder
    ? path.join(UPLOADS_DIR, folder)
    : UPLOADS_DIR;

  fs.mkdirSync(uploadPath, { recursive: true });

  try {
    await Promise.all(req.files.map(async (file) => {
      const outputFileName = file.originalname.replace(/\.[^/.]+$/, '.webp');
      const outputPath = path.join(uploadPath, outputFileName);

      const image = sharp(file.buffer).rotate();
      const meta = await image.metadata();
      const isPortrait = meta.height > meta.width;

      await image
        .resize(
          isPortrait ? imageConfig.PORTRAIT_WIDTH : imageConfig.LANDSCAPE_WIDTH,
          isPortrait ? imageConfig.PORTRAIT_HEIGHT : imageConfig.LANDSCAPE_HEIGHT,
          {
            fit: imageConfig.RESIZE_FIT,
            kernel: sharp.kernel.lanczos3,
          }
        )
        .webp({ quality: imageConfig.WEBP_QUALITY })
        .toFile(outputPath);
    }));

    res.json({
      message: 'Files uploaded and optimized successfully',
      files: req.files.map(f => f.originalname.replace(/\.[^/.]+$/, '.webp'))
    });
  } catch (err) {
    console.error('Image processing failed:', err);
    res.status(500).json({ error: 'Failed to process images' });
  }
});

// GET /api/files - List files in a folder
router.get('/files', async (req, res) => {
  const folder = sanitizeName(req.query.folder || '');
  if (!folder) return res.status(400).json({ error: 'Folder name required' });

  const folderPath = path.join(UPLOADS_DIR, folder);

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

    res.json({ files: onlyFiles });
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
