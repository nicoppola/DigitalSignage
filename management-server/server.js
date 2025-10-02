const express = require('express')
const session = require('express-session');
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const { validateUser } = require('./users');

const app = express()
const PORT = 4000

app.use(cors({
  origin: 'http://localhost:4000',
  credentials: true,
}))
app.use(express.json());

const USERS = require('./users');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CONFIGS_DIR = path.join(__dirname, 'configs');
// Helper to get config path by side
const getConfigPath = (side) => {
  const safeSide = side.replace(/[^a-zA-Z0-9-_]/g, '');
  return path.join(CONFIGS_DIR, `config_${safeSide}.json`);
};
if (!fs.existsSync(CONFIGS_DIR)) {
  fs.mkdirSync(CONFIGS_DIR, { recursive: true });
}

// log all calls
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});


// Setup session middleware
app.use(session({
  secret: 'some-super-secret-key', // change this to a strong secret
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000, // 30 minutes session
    httpOnly: true,
    // secure: true, // enable if using HTTPS
  }
}));

// Middleware to protect routes
function requireLogin(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;

  // Allow localhost (IPv4 and IPv6)
  if (
    clientIp === '::1' ||     // IPv6 localhost
    clientIp === '127.0.0.1' || // IPv4 localhost
    clientIp === '::ffff:127.0.0.1' // IPv4 mapped IPv6 localhost
  ) {
    return next(); // skip auth for localhost
  }

  if (req.session && req.session.user) {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized' });
}

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (validateUser(username, password)) {
    req.session.user = username;
    res.json({ status: 'ok' });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Logout route
app.post('/logout', requireLogin, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ status: 'logged out' });
  });
});

// Protect your config and other APIs:
app.use('/config', requireLogin);
app.use('/api', requireLogin);
app.use('/uploads', requireLogin);





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

app.get('/viewer', (req, res) => {
  res.sendFile(path.join(__dirname, '../viewer/viewer.html'));
});

// GET /config?side=someSide
app.get('/config', (req, res) => {
  const side = req.query.side;
  if (!side) return res.status(400).json({ error: 'Missing side parameter' });

  const configPath = getConfigPath(side);

  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.json({});
      }
      console.error('Error reading config:', err);
      return res.status(500).json({ error: 'Could not read config' });
    }

    try {
      const config = JSON.parse(data);
      res.json(config);
    } catch (parseErr) {
      console.error('Error parsing config:', parseErr);
      res.status(500).json({ error: 'Invalid config format' });
    }
  });
});

// POST /config with JSON { side: "someSide", config: { ... } }
app.post('/config', (req, res) => {
  const { side, config } = req.body;

  if (!side || !config || typeof config !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid side/config in body' });
  }

  const configPath = getConfigPath(side);

  fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => {
    if (err) {
      console.error('Error saving config:', err);
      return res.status(500).json({ error: 'Failed to save config' });
    }
    res.json({ status: 'ok' });
  });
});



// Serve React build static files
app.use(express.static(path.join(__dirname, '../management-app', 'dist')));

// React SPA fallback — serve index.html on unmatched routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../management-app', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
