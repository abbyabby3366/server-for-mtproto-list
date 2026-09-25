const express = require('express');
const router = express.Router();
const { WebProxyConfig } = require('../models');
const { verifyToken, apiKeyAuth } = require('../middleware');

// GET /web-proxies - Public/API consumer endpoint (protected by optional API_KEY)
router.get('/web-proxies', apiKeyAuth, async (req, res) => {
  try {
    const config = await WebProxyConfig.findOne();
    const proxies = config ? config.proxies : [];

    // Filter out any proxies marked as disabled
    const activeProxies = proxies
      .filter(p => p.disabled !== true)
      .map(p => {
        const item = {
          type: p.type || 'socks5',
          host: p.host,
          port: Number(p.port)
        };
        if (p.username) item.username = p.username;
        if (p.password) item.password = p.password;
        return item;
      });

    res.json(activeProxies);
  } catch (error) {
    console.error('Error reading web proxies from DB:', error.message);
    res.status(500).json({ error: 'Failed to load web proxy list' });
  }
});

// POST /web-proxies - Programmatic update endpoint (protected by optional API_KEY)
router.post('/web-proxies', apiKeyAuth, async (req, res) => {
  try {
    const proxies = req.body;
    if (!Array.isArray(proxies)) {
      return res.status(400).json({ error: 'Body must be a JSON array of web proxies' });
    }

    // Validate each proxy has required fields
    for (const proxy of proxies) {
      if (!proxy.host || !proxy.port) {
        return res.status(400).json({
          error: 'Each proxy must have host and port fields',
          invalid: proxy
        });
      }
    }

    let config = await WebProxyConfig.findOne();
    if (config) {
      config.proxies = proxies;
      await config.save();
    } else {
      config = new WebProxyConfig({ proxies, remarks: '' });
      await config.save();
    }

    res.json({ status: 'updated', count: proxies.length });
  } catch (error) {
    console.error('Error updating web proxies in DB:', error.message);
    res.status(500).json({ error: 'Failed to update web proxy list' });
  }
});

// GET /api/web-proxies - Admin UI endpoint (protected by JWT token)
router.get('/api/web-proxies', verifyToken, async (req, res) => {
  try {
    const config = await WebProxyConfig.findOne();
    res.json({
      proxies: config ? config.proxies : [],
      remarks: config ? config.remarks || '' : ''
    });
  } catch (error) {
    console.error('Error reading web proxies for UI:', error.message);
    res.status(500).json({ error: 'Failed to load web proxies' });
  }
});

// POST /api/web-proxies - Admin UI update endpoint (protected by JWT token)
router.post('/api/web-proxies', verifyToken, async (req, res) => {
  try {
    const { proxies, remarks } = req.body;
    if (!Array.isArray(proxies)) {
      return res.status(400).json({ error: 'proxies must be an array' });
    }

    // Validate required fields
    for (const p of proxies) {
      if (!p.host || !p.port) {
        return res.status(400).json({ error: 'Each proxy must have host and port fields' });
      }
    }

    let config = await WebProxyConfig.findOne();
    if (config) {
      config.proxies = proxies;
      if (remarks !== undefined) config.remarks = remarks;
      await config.save();
    } else {
      config = new WebProxyConfig({ proxies, remarks: remarks || '' });
      await config.save();
    }

    res.json({ status: 'updated', count: proxies.length });
  } catch (error) {
    console.error('Error saving web proxies from UI:', error.message);
    res.status(500).json({ error: 'Failed to update web proxies' });
  }
});

module.exports = router;
