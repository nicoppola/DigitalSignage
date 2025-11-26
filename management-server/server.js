const express = require('express')
const session = require('express-session');
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const sharp = require('sharp')
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
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
//   next();
// });


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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);

  // Allow localhost (IPv4 and IPv6)
  if (
    clientIp === '::1' ||     // IPv6 localhost
    clientIp === '127.0.0.1' || // IPv4 localhost
    clientIp === '::ffff:127.0.0.1' // IPv4 mapped IPv6 localhost
  ) {
    console.log(`-- Skip Auth Localhost --`);
    return next(); // skip auth for localhost
  }

  if (req.session && req.session.user) {
    console.log(`-- Auth Verified --`);
    return next();
  }

  console.log(`-- Auth Failed ${clientIp} --`);

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

const upload = multer({ storage: multer.memoryStorage() }); // <-- use memory storage

app.post('/api/upload', upload.array('images'), async (req, res) => {
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
      // Resize & convert to WebP (adjust width/height for your display)
      const outputFileName = file.originalname.replace(/\.[^/.]+$/, '.webp'); // convert to .webp
      const outputPath = path.join(uploadPath, outputFileName);

      // Load & auto-rotate based on EXIF
      const image = sharp(file.buffer).rotate();

      // Get metadata
      const meta = await image.metadata();

      const isPortrait = meta.height > meta.width;

      await image
        .resize(
          isPortrait ? 1080 : 1920,   // width
          isPortrait ? 1920 : 1080,   // height
          {
            fit: "inside",
            kernel: sharp.kernel.lanczos3,
          }
        )
        .webp({ quality: 92 })
        .toFile(outputPath);
    }) // <-- closes map()
  ); // <-- closes Promise.all()

    res.json({ 
      message: 'Files uploaded and optimized successfully', 
      files: req.files.map(f => f.originalname.replace(/\.[^/.]+$/, '.webp')) 
    });
  } catch (err) {
    console.error('Image processing failed:', err);
    res.status(500).json({ error: 'Failed to process images' });
  }
});

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


const simpleGit = require('simple-git');
const { exec } = require('child_process');
const git = simpleGit(__dirname);

app.post('/api/self-update', async (req, res) => {
  try {
    await git.fetch();

    // Get local and remote commit hashes
    const local = await git.revparse(['HEAD']);
    const remote = await git.revparse(['origin/main']);

    if (local === remote) {
      return res.json({ updated: false, message: 'Already up to date.' });
    }

    // Pull latest changes
    await git.pull('origin', 'main');

    // Run npm install
    exec('npm install', { cwd: __dirname }, (err, stdout, stderr) => {
      if (err) {
        console.error('npm install failed:', stderr);
        return res.status(500).json({ error: 'npm install failed' });
      }

      console.log(stdout);
      res.json({ updated: true, message: 'Updated successfully, rebooting server... \nRefresh page after a few seconds' });

      // Exit process so a process manager (systemd) restarts it
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed.' });
  }
});

app.get('/api/check-updates', async (req, res) => {
  try {
    await git.fetch(); // get latest info from remote

    const local = (await git.revparse(['HEAD'])).trim();
    const remote = (await git.revparse(['origin/main'])).trim();
  
    console.log(local)
    console.log(remote)

    if (local === remote) {
      return res.json({ updatesAvailable: false, message: 'You are up to date.' });
    } else {
      return res.json({ updatesAvailable: true, message: 'Updates are available.' });
    }
  } catch (err) {
    console.error('Git check failed:', err);
    return res.status(500).json({ error: 'Could not check for updates.' });
  }
});

app.post('/api/reboot', (req, res) => {
  try {
    // Confirm action
    console.log("Reboot requested by user:", req.session.user);

    // Send immediate response to frontend
    res.json({ message: "Rebooting the Pi..." });

    // Delay a second to ensure response is sent
    setTimeout(() => {
      exec('sudo reboot', (err, stdout, stderr) => {
        if (err) {
          console.error('Reboot failed:', stderr);
        }
      });
    }, 1000);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reboot." });
  }
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

