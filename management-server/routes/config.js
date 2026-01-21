const express = require('express');
const fsp = require('fs').promises;
const { getConfigPath } = require('../utils/paths');

const router = express.Router();

// GET /config?side=someSide
router.get('/', async (req, res) => {
  const side = req.query.side;
  if (!side) return res.status(400).json({ error: 'Missing side parameter' });

  const configPath = getConfigPath(side);

  try {
    const data = await fsp.readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    res.json(config);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.json({});
    }
    console.error('Error reading config:', err);
    res.status(500).json({ error: 'Could not read config' });
  }
});

// POST /config with JSON { side: "someSide", config: { ... } }
router.post('/', async (req, res) => {
  const { side, config } = req.body;

  if (!side || !config || typeof config !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid side/config in body' });
  }

  const configPath = getConfigPath(side);

  try {
    await fsp.writeFile(configPath, JSON.stringify(config, null, 2));
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Error saving config:', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

module.exports = router;
