const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const cors = require('cors')

const app = express()
const PORT = 4000

app.use(cors())

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Helper: sanitize folder and file names to prevent path traversal
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // If folder query param exists and is not empty, use uploads/folder, else uploads/
    const folder = req.query.folder && req.query.folder.trim() !== '' ? req.query.folder.trim() : ''
    const uploadPath = folder 
      ? path.join(__dirname, 'uploads', folder) 
      : path.join(__dirname, 'uploads')

    fs.mkdirSync(uploadPath, { recursive: true })
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage })

app.post('/api/upload', upload.array('images'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' })
  }

  res.json({ message: 'Files uploaded successfully', files: req.files.map(f => f.filename) })
})

// GET /api/files?folder=folderName
app.get('/api/files', (req, res) => {
  const folder = sanitizeName(req.query.folder || '');
  if (!folder) return res.status(400).json({ error: 'Folder name required' });

  const folderPath = path.join(UPLOADS_DIR, folder);
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Could not read folder' });
    }

    // Return only files (filter out directories)
    const onlyFiles = files.filter(file => {
      const fullPath = path.join(folderPath, file);
      return fs.statSync(fullPath).isFile();
    });

    res.json({ files: onlyFiles });
  });
});

// DELETE /api/files?folder=folderName&filename=fileName
app.delete('/api/files', (req, res) => {
  const folder = sanitizeName(req.query.folder || '');
  const filename = req.query.filename || '';
  if (!folder || !filename) return res.status(400).json({ error: 'Folder and filename required' });

  const filePath = path.join(UPLOADS_DIR, folder, filename);

  fs.unlink(filePath, err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Could not delete file' });
    }

    res.json({ success: true });
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
