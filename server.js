require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://desmondgiam_db_user:PCibd7pBM4XcOAHG@skywalker-tencent-clust.hr8apyw.mongodb.net/?appName=skywalker-tencent-cluster';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const loginTelemetrySchema = new mongoose.Schema({
  event: String,
  timestamp: Date,
  telegram_user: Object,
  device_info: Object,
  network_info: Object,
  app_context: Object
});
const LoginTelemetry = mongoose.model('LoginTelemetry', loginTelemetrySchema);

const networkTelemetrySchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  telegram_user: Object,
  original_ip: String,
  active_proxy_ip: String,
  timestamp: Date,
  network_usage: Object,
  last_updated: Date
});
const NetworkTelemetry = mongoose.model('NetworkTelemetry', networkTelemetrySchema);

const androidVersionSchema = new mongoose.Schema({
  versionCode: Number,
  versionName: String,
  downloadUrl: String,
  changelog: String,
  forceUpdate: Boolean
});
const AndroidVersion = mongoose.model('AndroidVersion', androidVersionSchema);

const transitIpsSchema = new mongoose.Schema({
  ips: [String]
});
const TransitIps = mongoose.model('TransitIps', transitIpsSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

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
 * Returns a list of active Transit Node IPs from MongoDB (falls back to local JSON).
 */
app.get('/transit-ips', async (req, res) => {
  try {
    const record = await TransitIps.findOne();
    if (record && record.ips && record.ips.length > 0) {
      return res.json(record.ips);
    }
    // Fallback to local JSON file
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
 * GET /api/transit-ips
 * Returns the transit IPs config for the UI.
 */
app.get('/api/transit-ips', async (req, res) => {
  try {
    const record = await TransitIps.findOne();
    if (record) {
      return res.json({ ips: record.ips });
    }
    // Fallback: read from local JSON and seed into DB
    const ipsPath = path.join(__dirname, 'transit-ips.json');
    if (fs.existsSync(ipsPath)) {
      const ipsData = fs.readFileSync(ipsPath, 'utf-8');
      const ips = JSON.parse(ipsData);
      const newRecord = new TransitIps({ ips });
      await newRecord.save();
      return res.json({ ips });
    }
    res.json({ ips: [] });
  } catch (error) {
    console.error('Error reading transit IPs:', error.message);
    res.status(500).json({ error: 'Failed to load transit IPs' });
  }
});

/**
 * POST /api/transit-ips
 * Updates the transit IPs list in MongoDB.
 */
app.post('/api/transit-ips', async (req, res) => {
  try {
    const { ips } = req.body;
    if (!Array.isArray(ips)) {
      return res.status(400).json({ error: 'ips must be an array of IP strings' });
    }
    // Filter out empty strings
    const cleanIps = ips.map(ip => ip.trim()).filter(ip => ip.length > 0);
    let record = await TransitIps.findOne();
    if (record) {
      record.ips = cleanIps;
      await record.save();
    } else {
      record = new TransitIps({ ips: cleanIps });
      await record.save();
    }
    res.json({ status: 'updated', count: cleanIps.length });
  } catch (error) {
    console.error('Error updating transit IPs:', error.message);
    res.status(500).json({ error: 'Failed to update transit IPs' });
  }
});

/**
 * GET /configs
 * Serves the configuration interface.
 */
app.get('/configs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'configs.html'));
});

/**
 * GET /api/android/version
 * Returns version metadata for Android app self-update mechanism.
 */
app.get('/api/android/version', async (req, res) => {
  try {
    const version = await AndroidVersion.findOne();
    if (version) {
      const { _id, __v, ...versionData } = version.toObject();
      res.json(versionData);
    } else {
      const versionPath = path.join(__dirname, 'android-version.json');
      if (fs.existsSync(versionPath)) {
        const versionData = fs.readFileSync(versionPath, 'utf-8');
        const localVersion = JSON.parse(versionData);
        res.json(localVersion);
      } else {
        res.status(404).json({ error: 'Version not found' });
      }
    }
  } catch (error) {
    console.error('Error reading version metadata:', error.message);
    res.status(500).json({ error: 'Failed to load version metadata' });
  }
});

/**
 * POST /api/android/version
 * Updates the version metadata for Android app self-update mechanism.
 */
app.post('/api/android/version', async (req, res) => {
  try {
    const payload = req.body;
    let version = await AndroidVersion.findOne();
    if (version) {
      if (payload.versionCode !== undefined) version.versionCode = payload.versionCode;
      if (payload.versionName !== undefined) version.versionName = payload.versionName;
      if (payload.downloadUrl !== undefined) version.downloadUrl = payload.downloadUrl;
      if (payload.changelog !== undefined) version.changelog = payload.changelog;
      if (payload.forceUpdate !== undefined) version.forceUpdate = payload.forceUpdate;
      await version.save();
    } else {
      version = new AndroidVersion(payload);
      await version.save();
    }
    res.json({ status: 'updated' });
  } catch (error) {
    console.error('Error updating version metadata:', error.message);
    res.status(500).json({ error: 'Failed to update version metadata' });
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

/**
 * POST /user-login-details
 */
app.post('/user-login-details', async (req, res) => {
  try {
    const payload = req.body;
    
    // Capture the original IP from the request headers (Render uses x-forwarded-for)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (payload.network_info) {
      payload.network_info.original_ip = clientIp ? clientIp.split(',')[0].trim() : 'Unknown';
    }

    const newRecord = new LoginTelemetry(payload);
    await newRecord.save();
    res.status(201).json({ status: 'recorded' });
  } catch (error) {
    console.error('Error recording login telemetry:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /network-usage
 */
app.post('/network-usage', async (req, res) => {
  try {
    const payload = req.body;
    const { user_id } = payload;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    payload.original_ip = clientIp ? clientIp.split(',')[0].trim() : 'Unknown';
    payload.last_updated = new Date();
    
    await NetworkTelemetry.findOneAndUpdate(
      { user_id },
      payload,
      { upsert: true, new: true }
    );
    res.status(200).json({ status: 'updated' });
  } catch (error) {
    console.error('Error updating network telemetry:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/telemetry/stats (for the frontend dashboard)
 */
app.get('/api/telemetry/stats', async (req, res) => {
  try {
    const logins = await LoginTelemetry.find().sort({ timestamp: -1 }).limit(100);
    const networkRaw = await NetworkTelemetry.find().sort({ last_updated: -1 }).lean();
    
    // Attach phone number from latest login to network data
    const network = await Promise.all(networkRaw.map(async (net) => {
      let phone = net.telegram_user?.phone_number;
      let fName = net.telegram_user?.first_name;
      let lName = net.telegram_user?.last_name;
      
      if (!phone && phone !== "") {
        const userLogin = await LoginTelemetry.findOne({ "telegram_user.user_id": net.user_id }).sort({ timestamp: -1 }).lean();
        phone = userLogin?.telegram_user?.phone_number || "";
        fName = userLogin?.telegram_user?.first_name || "Unknown";
        lName = userLogin?.telegram_user?.last_name || "";
      }
      
      return {
        ...net,
        phone_number: phone,
        first_name: fName || "Unknown",
        last_name: lName || ""
      };
    }));
    
    res.json({ logins, network });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/telemetry/logins
 */
app.delete('/api/telemetry/logins', async (req, res) => {
  try {
    await LoginTelemetry.deleteMany({});
    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/telemetry/network
 */
app.delete('/api/telemetry/network', async (req, res) => {
  try {
    await NetworkTelemetry.deleteMany({});
    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`MTProto Proxy Pool Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key protection: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
});
