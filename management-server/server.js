const express = require('express');
const session = require('express-session');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { UPLOADS_DIR, CONFIGS_DIR } = require('./utils/paths');
const { errorHandler } = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth');
const filesRoutes = require('./routes/files');
const configRoutes = require('./routes/config');
const systemRoutes = require('./routes/system');

const app = express();
const PORT = 4000;

// Middleware
app.use(compression({ level: 6, threshold: 1024 }));
app.use(cors({
  origin: 'http://localhost:4000',
  credentials: true,
}));
app.use(express.json());

// Ensure configs directory exists
if (!fs.existsSync(CONFIGS_DIR)) {
  fs.mkdirSync(CONFIGS_DIR, { recursive: true });
}

// Clean up stale .processing and .tmp files from previous runs
try {
  const folders = fs.readdirSync(UPLOADS_DIR).filter(f =>
    fs.statSync(path.join(UPLOADS_DIR, f)).isDirectory() && f !== '.processing'
  );
  for (const folder of folders) {
    // Remove .processing contents (incomplete uploads)
    const procDir = path.join(UPLOADS_DIR, folder, '.processing');
    if (fs.existsSync(procDir)) {
      const staleFiles = fs.readdirSync(procDir);
      for (const f of staleFiles) {
        fs.unlinkSync(path.join(procDir, f));
        console.log(`[Cleanup] Removed stale processing file: ${folder}/.processing/${f}`);
      }
    }
    // Remove .tmp files (incomplete transcodes)
    const folderPath = path.join(UPLOADS_DIR, folder);
    const tmpFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.tmp'));
    for (const f of tmpFiles) {
      fs.unlinkSync(path.join(folderPath, f));
      console.log(`[Cleanup] Removed stale temp file: ${folder}/${f}`);
    }
  }
} catch (e) {
  // uploads dir may not exist yet, that's fine
}

// Session middleware
app.use(session({
  secret: 'some-super-secret-key', // TODO: move to environment variable
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000, // 30 minutes
    httpOnly: true,
  }
}));

// Auth middleware
function requireLogin(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);

  // Allow localhost (IPv4 and IPv6)
  if (
    clientIp === '::1' ||
    clientIp === '127.0.0.1' ||
    clientIp === '::ffff:127.0.0.1'
  ) {
    console.log(`-- Skip Auth Localhost --`);
    return next();
  }

  if (req.session && req.session.user) {
    console.log(`-- Auth Verified --`);
    return next();
  }

  console.log(`-- Auth Failed ${clientIp} --`);
  res.status(401).json({ error: 'Unauthorized' });
}

// Public routes (no auth required)
app.use('/', authRoutes);

// Protected routes
app.use('/config', requireLogin, configRoutes);
app.use('/api', requireLogin, filesRoutes);
app.use('/api', requireLogin, systemRoutes);
app.use('/uploads', requireLogin, express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// Viewer routes - serve static files from viewer directory (no cache - files change directly)
app.use('/viewer', express.static(path.join(__dirname, '../viewer')));
app.get('/viewer', (req, res) => {
  res.sendFile(path.join(__dirname, '../viewer/viewer.html'));
});

// Serve React build (cache JS/CSS assets)
app.use(express.static(path.join(__dirname, '../management-app', 'dist'), { maxAge: '30d' }));

// React SPA fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../management-app', 'dist', 'index.html'));
});

// Error handling
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Allow long uploads (Node v20 defaults to 5min request timeout)
server.requestTimeout = 30 * 60 * 1000; // 30 minutes
server.timeout = 30 * 60 * 1000;
