const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const { CONFIGS_DIR } = require('./utils/paths');
const { errorHandler } = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth');
const filesRoutes = require('./routes/files');
const configRoutes = require('./routes/config');
const systemRoutes = require('./routes/system');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors({
  origin: 'http://localhost:4000',
  credentials: true,
}));
app.use(express.json());

// Ensure configs directory exists
if (!fs.existsSync(CONFIGS_DIR)) {
  fs.mkdirSync(CONFIGS_DIR, { recursive: true });
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
app.use('/uploads', requireLogin, express.static(path.join(__dirname, 'uploads')));

// Viewer route
app.get('/viewer', (req, res) => {
  res.sendFile(path.join(__dirname, '../viewer/viewer.html'));
});

// Serve React build
app.use(express.static(path.join(__dirname, '../management-app', 'dist')));

// React SPA fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../management-app', 'dist', 'index.html'));
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
