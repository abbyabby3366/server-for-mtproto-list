require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Optional API key authentication
const apiKeyAuth = (req, res, next) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === '') {
    // No API key configured, allow all requests
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/**
 * GET /proxies
 * Returns the list of available MTProto proxies.
 * 
 * Response format:
 * [
 *   {
 *     "host": "1.2.3.4",
 *     "port": 443,
 *     "secret": "ee0123456789abcdef..."
 *   }
 * ]
 */
app.get('/proxies', apiKeyAuth, (req, res) => {
  try {
    const proxiesPath = path.join(__dirname, 'proxies.json');
    const proxiesData = fs.readFileSync(proxiesPath, 'utf-8');
    const proxies = JSON.parse(proxiesData);

    // Filter out any proxies marked as disabled
    const activeProxies = proxies.filter(p => p.disabled !== true);

    res.json(activeProxies);
  } catch (error) {
    console.error('Error reading proxies:', error.message);
    res.status(500).json({ error: 'Failed to load proxy list' });
  }
});

/**
 * GET /health
 * Health check endpoint for Render / load balancers.
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /transit-ips
 * Returns a list of active Transit Node IPs from local JSON.
 */
app.get('/transit-ips', (req, res) => {
  try {
    const ipsPath = path.join(__dirname, 'transit-ips.json');
    const ipsData = fs.readFileSync(ipsPath, 'utf-8');
    const ips = JSON.parse(ipsData);
    res.json(ips);
  } catch (error) {
    console.error('Error reading IPs:', error.message);
    res.status(500).json({ error: 'Failed to load IP list' });
  }
});

/**
 * GET /api/android/version
 * Returns version metadata for Android app self-update mechanism.
 */
app.get('/api/android/version', (req, res) => {
  try {
    const versionPath = path.join(__dirname, 'android-version.json');
    const versionData = fs.readFileSync(versionPath, 'utf-8');
    const version = JSON.parse(versionData);
    res.json(version);
  } catch (error) {
    console.error('Error reading version metadata:', error.message);
    res.status(500).json({ error: 'Failed to load version metadata' });
  }
});

/**
 * POST /proxies
 * Admin endpoint to update the proxy list.
 * Requires API_KEY to be set.
 */
app.post('/proxies', apiKeyAuth, (req, res) => {
  try {
    const proxies = req.body;
    if (!Array.isArray(proxies)) {
      return res.status(400).json({ error: 'Body must be a JSON array of proxies' });
    }

    // Validate each proxy has required fields
    for (const proxy of proxies) {
      if (!proxy.host || !proxy.port || !proxy.secret) {
        return res.status(400).json({
          error: 'Each proxy must have host, port, and secret fields',
          invalid: proxy
        });
      }
    }

    const proxiesPath = path.join(__dirname, 'proxies.json');
    fs.writeFileSync(proxiesPath, JSON.stringify(proxies, null, 2));

    res.json({ status: 'updated', count: proxies.length });
  } catch (error) {
    console.error('Error updating proxies:', error.message);
    res.status(500).json({ error: 'Failed to update proxy list' });
  }
});

/**
 * GET /
 * Root endpoint with basic info.
 */
app.get('/', (req, res) => {
  res.json({
    service: 'MTProto Proxy Pool Server',
    version: '1.0.0',
    endpoints: {
      'GET /proxies': 'Get list of available MTProto proxies',
      'POST /proxies': 'Update proxy list (requires API_KEY)',
      'GET /transit-ips': 'Get list of active Transit Node IPs',
      'GET /api/android/version': 'Get Android app version metadata',
      'GET /health': 'Health check'
    }
  });
});

app.listen(PORT, () => {
  console.log(`MTProto Proxy Pool Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key protection: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
});
