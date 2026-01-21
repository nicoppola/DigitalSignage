const express = require('express');
const { validateUser } = require('../users');

const router = express.Router();

// Login route
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (validateUser(username, password)) {
    req.session.user = username;
    res.json({ status: 'ok' });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ status: 'logged out' });
  });
});

module.exports = router;
