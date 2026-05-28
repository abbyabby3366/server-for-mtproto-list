require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
}, { strict: false });
loginTelemetrySchema.index({ 'telegram_user.user_id': 1, timestamp: -1 });
const LoginTelemetry = mongoose.model('LoginTelemetry', loginTelemetrySchema);

const networkTelemetrySchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  telegram_user: Object,
  original_ip: String,
  active_proxy_ip: String,
  timestamp: Date,
  network_usage: Object,
  last_updated: Date
}, { strict: false });
networkTelemetrySchema.index({ last_updated: -1 });
networkTelemetrySchema.index({ user_id: 1, last_updated: -1 });
const NetworkTelemetry = mongoose.model('NetworkTelemetry', networkTelemetrySchema);

const networkDailyBucketSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  date: { type: String, required: true },
  telegram_user: Object,
  original_ip: String,
  active_proxy_ip: String,
  total_bytes_sent: { type: Number, default: 0 },
  total_bytes_received: { type: Number, default: 0 },
  last_updated: Date
}, { strict: false });
networkDailyBucketSchema.index({ user_id: 1, date: 1 }, { unique: true });
const NetworkDailyBucket = mongoose.model('NetworkDailyBucket', networkDailyBucketSchema);



const androidVersionSchema = new mongoose.Schema({
  versionCode: Number,
  versionName: String,
  downloadUrl: String,
  changelog: String,
  forceUpdate: Boolean
});
const AndroidVersion = mongoose.model('AndroidVersion', androidVersionSchema);

const androidVersionLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  user: {
    username: String,
    role: String
  },
  previousConfig: Object,
  newConfig: Object,
  changedFields: [String]
});
const AndroidVersionLog = mongoose.model('AndroidVersionLog', androidVersionLogSchema);

const externalRedirectLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  user: {
    username: String,
    role: String
  },
  downloadUrl: String,
  token: String,
  domains: [String],
  results: [Object]
});
const ExternalRedirectLog = mongoose.model('ExternalRedirectLog', externalRedirectLogSchema);

const transitIpsSchema = new mongoose.Schema({
  ips: [String],
  remarks: String
});
const TransitIps = mongoose.model('TransitIps', transitIpsSchema);

const mtProxyConfigSchema = new mongoose.Schema({
  proxies: [
    {
      host: String,
      port: Number,
      secret: String,
      disabled: Boolean
    }
  ],
  remarks: String
});
const MtProxyConfig = mongoose.model('MtProxyConfig', mtProxyConfigSchema);

const externalRedirectConfigSchema = new mongoose.Schema({
  token: String,
  downloadUrl: String
});
const ExternalRedirectConfig = mongoose.model('ExternalRedirectConfig', externalRedirectConfigSchema);


const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' }
});
const User = mongoose.model('User', userSchema);

// Initialize default admin if no users exist
mongoose.connection.once('open', async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({ username: 'admin', password: hashedPassword, role: 'admin' });
      console.log('Created default admin user: admin / admin123');
    }
  } catch (err) {
    console.error('Error initializing default admin:', err);
  }
});

// Initialize default proxies if collection is empty
mongoose.connection.once('open', async () => {
  try {
    const count = await MtProxyConfig.countDocuments();
    if (count === 0) {
      let initialProxies = [];
      const proxiesPath = path.join(__dirname, 'proxies.json');
      if (fs.existsSync(proxiesPath)) {
        const proxiesData = fs.readFileSync(proxiesPath, 'utf-8');
        try {
          initialProxies = JSON.parse(proxiesData);
        } catch (e) {
          console.error('Error parsing initial proxies.json:', e.message);
        }
      }
      
      let initialRemarks = '';
      const remarksPath = path.join(__dirname, 'proxies-remarks.txt');
      if (fs.existsSync(remarksPath)) {
        initialRemarks = fs.readFileSync(remarksPath, 'utf-8');
      }

      await MtProxyConfig.create({
        proxies: initialProxies,
        remarks: initialRemarks
      });
      console.log('Seeded MtProxyConfig from proxies.json');
    }
  } catch (err) {
    console.error('Error seeding MtProxyConfig:', err);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Authentication Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_change_me_in_env';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Requires admin role' });
  }
};

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
app.get('/proxies', apiKeyAuth, async (req, res) => {
  try {
    const config = await MtProxyConfig.findOne();
    const proxies = config ? config.proxies : [];

    // Filter out any proxies marked as disabled
    const activeProxies = proxies.filter(p => p.disabled !== true).map(p => ({
      host: p.host,
      port: p.port,
      secret: p.secret
    }));

    res.json(activeProxies);
  } catch (error) {
    console.error('Error reading proxies from DB:', error.message);
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

// --- Auth Endpoints ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_change_me_in_env';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '30d';
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );
    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- User Management Endpoints (Admin Only) ---
app.get('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Prevent deleting oneself
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/api/users/:id/password', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
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
app.get('/api/transit-ips', verifyToken, async (req, res) => {
  try {
    const record = await TransitIps.findOne();
    if (record) {
      return res.json({ ips: record.ips, remarks: record.remarks || '' });
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
app.post('/api/transit-ips', verifyToken, async (req, res) => {
  try {
    const { ips, remarks } = req.body;
    if (!Array.isArray(ips)) {
      return res.status(400).json({ error: 'ips must be an array of IP strings' });
    }
    // Filter out empty strings
    const cleanIps = ips.map(ip => ip.trim()).filter(ip => ip.length > 0);
    let record = await TransitIps.findOne();
    if (record) {
      record.ips = cleanIps;
      if (remarks !== undefined) record.remarks = remarks;
      await record.save();
    } else {
      record = new TransitIps({ ips: cleanIps, remarks: remarks || '' });
      await record.save();
    }
    res.json({ status: 'updated', count: cleanIps.length });
  } catch (error) {
    console.error('Error updating transit IPs:', error.message);
    res.status(500).json({ error: 'Failed to update transit IPs' });
  }
});

// --- Proxy Management Endpoints for UI ---
/**
 * GET /api/proxies
 * Returns the proxy list and remarks for the UI.
 */
app.get('/api/proxies', verifyToken, async (req, res) => {
  try {
    const config = await MtProxyConfig.findOne();
    res.json({
      proxies: config ? config.proxies : [],
      remarks: config ? config.remarks || '' : ''
    });
  } catch (error) {
    console.error('Error reading proxies for UI:', error.message);
    res.status(500).json({ error: 'Failed to load proxies' });
  }
});

/**
 * POST /api/proxies
 * Updates the proxies and remarks in MongoDB.
 */
app.post('/api/proxies', verifyToken, async (req, res) => {
  try {
    const { proxies, remarks } = req.body;
    if (!Array.isArray(proxies)) {
      return res.status(400).json({ error: 'proxies must be an array' });
    }
    
    // Validate required fields
    for (const p of proxies) {
      if (!p.host || !p.port || !p.secret) {
        return res.status(400).json({ error: 'Each proxy must have host, port, and secret fields' });
      }
    }
    
    let config = await MtProxyConfig.findOne();
    if (config) {
      config.proxies = proxies;
      if (remarks !== undefined) config.remarks = remarks;
      await config.save();
    } else {
      config = new MtProxyConfig({ proxies, remarks: remarks || '' });
      await config.save();
    }
    
    res.json({ status: 'updated', count: proxies.length });
  } catch (error) {
    console.error('Error saving proxies from UI:', error.message);
    res.status(500).json({ error: 'Failed to update proxies' });
  }
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
app.post('/api/android/version', verifyToken, async (req, res) => {
  try {
    const payload = req.body;
    let version = await AndroidVersion.findOne();
    
    const fieldsToCheck = ['versionCode', 'versionName', 'downloadUrl', 'changelog', 'forceUpdate'];
    let prevObj = null;
    let newObj = {};

    if (version) {
      prevObj = version.toObject();
      newObj = {
        versionCode: payload.versionCode !== undefined ? payload.versionCode : prevObj.versionCode,
        versionName: payload.versionName !== undefined ? payload.versionName : prevObj.versionName,
        downloadUrl: payload.downloadUrl !== undefined ? payload.downloadUrl : prevObj.downloadUrl,
        changelog: payload.changelog !== undefined ? payload.changelog : prevObj.changelog,
        forceUpdate: payload.forceUpdate !== undefined ? payload.forceUpdate : prevObj.forceUpdate
      };
    } else {
      newObj = {
        versionCode: payload.versionCode || 0,
        versionName: payload.versionName || '',
        downloadUrl: payload.downloadUrl || '',
        changelog: payload.changelog || '',
        forceUpdate: !!payload.forceUpdate
      };
    }

    const changedFields = [];
    fieldsToCheck.forEach(field => {
      const prevVal = prevObj ? prevObj[field] : undefined;
      const newVal = newObj[field];
      if (prevVal !== newVal) {
        changedFields.push(field);
      }
    });

    if (changedFields.length > 0) {
      const logEntry = new AndroidVersionLog({
        user: {
          username: req.user.username,
          role: req.user.role
        },
        previousConfig: prevObj ? {
          versionCode: prevObj.versionCode,
          versionName: prevObj.versionName,
          downloadUrl: prevObj.downloadUrl,
          changelog: prevObj.changelog,
          forceUpdate: prevObj.forceUpdate
        } : null,
        newConfig: newObj,
        changedFields
      });
      await logEntry.save();
    }

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
 * GET /api/android/version/logs
 * Returns historical changelogs for Android app version configuration.
 */
app.get('/api/android/version/logs', verifyToken, async (req, res) => {
  try {
    const logs = await AndroidVersionLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching version logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/external-redirects
 * Updates the external download URLs on specified domains.
 */
app.post('/api/external-redirects', verifyToken, async (req, res) => {
  try {
    const { downloadUrl, token, domains } = req.body;
    if (!downloadUrl || !token || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const results = [];
    for (const domain of domains) {
      try {
        const response = await fetch(`https://${domain}/admin/download`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ download_url: downloadUrl })
        });
        
        if (response.ok) {
          results.push({ domain, status: 'success' });
        } else {
          const text = await response.text();
          results.push({ domain, status: 'error', error: `HTTP ${response.status}: ${text}` });
        }
      } catch (err) {
        results.push({ domain, status: 'error', error: err.message });
      }
    }

    try {
      const logEntry = new ExternalRedirectLog({
        user: {
          username: req.user.username,
          role: req.user.role
        },
        downloadUrl,
        token,
        domains,
        results
      });
      await logEntry.save();
    } catch (logErr) {
      console.error('Error saving external redirect log:', logErr);
    }

    res.json({ results });
  } catch (error) {
    console.error('Error updating external redirects:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/external-redirects/logs
 * Returns historical changelogs for External Redirect configuration.
 */
app.get('/api/external-redirects/logs', verifyToken, async (req, res) => {
  try {
    const logs = await ExternalRedirectLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching external redirect logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/external-redirect-config', verifyToken, async (req, res) => {
  try {
    let config = await ExternalRedirectConfig.findOne();
    if (!config) {
      return res.json({ 
        token: '5157593d8b028bd6fb684767d8127dc89780d2d8377edf555c153e3878b9e5dc',
        downloadUrl: ''
      });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

app.post('/api/external-redirect-config', verifyToken, async (req, res) => {
  try {
    const { token, downloadUrl } = req.body;
    let config = await ExternalRedirectConfig.findOne();
    if (config) {
      if (token !== undefined) config.token = token;
      if (downloadUrl !== undefined) config.downloadUrl = downloadUrl;
      await config.save();
    } else {
      config = new ExternalRedirectConfig({ token, downloadUrl });
      await config.save();
    }
    res.json({ status: 'saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

/**
 * POST /proxies
 * Admin endpoint to update the proxy list.
 * Requires API_KEY to be set.
 */
app.post('/proxies', apiKeyAuth, async (req, res) => {
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

    let config = await MtProxyConfig.findOne();
    if (config) {
      config.proxies = proxies;
      await config.save();
    } else {
      config = new MtProxyConfig({ proxies, remarks: '' });
      await config.save();
    }

    res.json({ status: 'updated', count: proxies.length });
  } catch (error) {
    console.error('Error updating proxies in DB:', error.message);
    res.status(500).json({ error: 'Failed to update proxy list' });
  }
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
    
    // --- Daily Bucket Logic ---
    const todayStr = new Date().toISOString().split('T')[0]; // e.g. "2026-05-09"
    
    // Get existing latest state to calculate delta
    const existing = await NetworkTelemetry.findOne({ user_id }).sort({ last_updated: -1 });
    
    // If payload doesn't include active_proxy_ip, check active_connection.ip, then fallback to existing
    let finalProxyIp = payload.active_proxy_ip || payload.active_connection?.ip || existing?.active_proxy_ip;
    payload.active_proxy_ip = finalProxyIp;
    
    let deltaSent = payload.network_usage?.total_bytes_sent || 0;
    let deltaReceived = payload.network_usage?.total_bytes_received || 0;
    let deltaMobileSent = payload.network_usage?.mobile_bytes_sent || 0;
    let deltaMobileReceived = payload.network_usage?.mobile_bytes_received || 0;
    let deltaWifiSent = payload.network_usage?.wifi_bytes_sent || 0;
    let deltaWifiReceived = payload.network_usage?.wifi_bytes_received || 0;
    
    if (existing && existing.network_usage) {
       const oldSent = existing.network_usage.total_bytes_sent || 0;
       const oldRecv = existing.network_usage.total_bytes_received || 0;
       const oldMobileSent = existing.network_usage.mobile_bytes_sent || 0;
       const oldMobileRecv = existing.network_usage.mobile_bytes_received || 0;
       const oldWifiSent = existing.network_usage.wifi_bytes_sent || 0;
       const oldWifiRecv = existing.network_usage.wifi_bytes_received || 0;
       
       if (deltaSent >= oldSent) deltaSent = deltaSent - oldSent;
       if (deltaReceived >= oldRecv) deltaReceived = deltaReceived - oldRecv;
       if (deltaMobileSent >= oldMobileSent) deltaMobileSent = deltaMobileSent - oldMobileSent;
       if (deltaMobileReceived >= oldMobileRecv) deltaMobileReceived = deltaMobileReceived - oldMobileRecv;
       if (deltaWifiSent >= oldWifiSent) deltaWifiSent = deltaWifiSent - oldWifiSent;
       if (deltaWifiReceived >= oldWifiRecv) deltaWifiReceived = deltaWifiReceived - oldWifiRecv;
    }
    
    payload.delta_sent = deltaSent;
    payload.delta_received = deltaReceived;
    payload.delta_mobile_sent = deltaMobileSent;
    payload.delta_mobile_received = deltaMobileReceived;
    payload.delta_wifi_sent = deltaWifiSent;
    payload.delta_wifi_received = deltaWifiReceived;

    delete payload._id;
    delete payload.__v;
    await NetworkTelemetry.create(payload);
    
    res.status(200).json({ status: 'updated' });
  } catch (error) {
    console.error('Error updating network telemetry:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/telemetry/stats (for the frontend dashboard)
 */
app.get('/api/telemetry/stats', verifyToken, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const logins = await LoginTelemetry.find().sort({ timestamp: -1 }).limit(5000);
    const networkRaw = await NetworkTelemetry.find().sort({ last_updated: -1 }).limit(5000).lean();
    
    // Batch lookup latest logins for the network raw user IDs to avoid N+1 queries
    const userIds = [...new Set(networkRaw.map(net => net.user_id).filter(Boolean))];
    const loginLookup = {};
    if (userIds.length > 0) {
      const loginsData = await LoginTelemetry.aggregate([
        { $match: { 'telegram_user.user_id': { $in: userIds } } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$telegram_user.user_id', doc: { $first: '$telegram_user' } } }
      ]);
      loginsData.forEach(l => { loginLookup[l._id] = l.doc; });
    }

    const network = networkRaw.map((net) => {
      let phone = net.telegram_user?.phone_number;
      let fName = net.telegram_user?.first_name;
      let lName = net.telegram_user?.last_name;
      let proxyIp = net.active_proxy_ip || net.active_connection?.ip || 'Unknown';
      
      // We only fallback name/phone to LoginTelemetry, NOT the proxy IP.
      if (!phone && phone !== "") {
        const userLogin = loginLookup[net.user_id] || {};
        phone = phone || userLogin?.phone_number || "";
        fName = fName || userLogin?.first_name || "Unknown";
        lName = lName || userLogin?.last_name || "";
      }
      
      return {
        ...net,
        active_proxy_ip: proxyIp,
        phone_number: phone,
        first_name: fName || "Unknown",
        last_name: lName || ""
      };
    });
    
    const uniqueUsersCount = await NetworkTelemetry.distinct('user_id');
    const totalUniqueUsers = uniqueUsersCount.filter(Boolean).length;
    
    res.json({ logins, network, totalUniqueUsers });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/telemetry/logins
 * Server-side paginated and searched endpoint for Recent Logins
 */
app.get('/api/telemetry/logins', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.toLowerCase().trim() : '';

    if (!search) {
      const [total, rawDocs] = await Promise.all([
        LoginTelemetry.countDocuments(),
        LoginTelemetry.find()
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);
      return res.json({ total, data: rawDocs });
    }

    // Search path
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const numericSearch = parseInt(search);
    const searchMatch = {
      $or: [
        { 'telegram_user.first_name': { $regex: safeSearch, $options: 'i' } },
        { 'telegram_user.last_name': { $regex: safeSearch, $options: 'i' } },
        { 'telegram_user.phone_number': { $regex: safeSearch, $options: 'i' } },
        { 'telegram_user.username': { $regex: safeSearch, $options: 'i' } },
        { 'network_info.original_ip': { $regex: safeSearch, $options: 'i' } },
        { 'network_info.active_proxy_ip': { $regex: safeSearch, $options: 'i' } },
        { 'device_info.manufacturer': { $regex: safeSearch, $options: 'i' } },
        { 'device_info.model': { $regex: safeSearch, $options: 'i' } },
        { 'app_context.apk_version': { $regex: safeSearch, $options: 'i' } }
      ]
    };
    if (!isNaN(numericSearch)) {
      searchMatch.$or.push({ 'telegram_user.user_id': numericSearch });
    }

    const pipeline = [
      { $match: searchMatch },
      { $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: { timestamp: -1 } },
          { $skip: skip },
          { $limit: limit }
        ]
      }}
    ];

    const results = await LoginTelemetry.aggregate(pipeline);
    const total = results[0].metadata[0] ? results[0].metadata[0].total : 0;
    res.json({ total, data: results[0].data });
  } catch (error) {
    console.error('Logins Pagination Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/telemetry/logins
 * Deletes login telemetry records based on a date range.
 */
app.delete('/api/telemetry/logins', verifyToken, async (req, res) => {
  try {
    const range = req.query.range || 'all';
    let query = {};
    const now = new Date();

    if (range === 'yesterday') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 1);
      cutoff.setHours(0, 0, 0, 0);
      query = { timestamp: { $lt: cutoff } };
    } else if (range === 'week') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      query = { timestamp: { $lt: cutoff } };
    } else if (range === 'month') {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
      cutoff.setHours(0, 0, 0, 0);
      query = { timestamp: { $lt: cutoff } };
    }

    const result = await LoginTelemetry.deleteMany(query);
    console.log(`Deleted ${result.deletedCount} login records (range: ${range})`);
    res.json({ status: 'deleted', count: result.deletedCount, range });
  } catch (error) {
    console.error('Delete Logins Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/**
 * DELETE /api/telemetry/network
 * Deletes network telemetry records based on a date range.
 * Query params: range = 'all' | 'yesterday' | 'week' | 'month'
 */
app.delete('/api/telemetry/network', verifyToken, async (req, res) => {
  try {
    const range = req.query.range || 'all';
    let query = {};
    const now = new Date();

    if (range === 'yesterday') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 1);
      cutoff.setHours(0, 0, 0, 0);
      query = { last_updated: { $lt: cutoff } };
    } else if (range === 'week') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
      query = { last_updated: { $lt: cutoff } };
    } else if (range === 'month') {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
      cutoff.setHours(0, 0, 0, 0);
      query = { last_updated: { $lt: cutoff } };
    }
    // 'all' => empty query = delete everything

    const result = await NetworkTelemetry.deleteMany(query);
    console.log(`Deleted ${result.deletedCount} network records (range: ${range})`);
    res.json({ status: 'deleted', count: result.deletedCount, range });
  } catch (error) {
    console.error('Delete Network Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/telemetry/network-pings
 * Server-side paginated and searched endpoint for All Pings
 */
app.get('/api/telemetry/network-pings', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.toLowerCase().trim() : '';
    const foreground = req.query.foreground;

    // === FAST PATH: No search — use simple find + paginate, then enrich only the page ===
    if (!search) {
      const query = {};
      if (foreground === 'true') {
        query.$or = [
          { delta_sent: { $gt: 0 } },
          { delta_received: { $gt: 0 } }
        ];
      } else if (foreground === 'false') {
        query.$and = [
          { $or: [ { delta_sent: { $exists: false } }, { delta_sent: { $lte: 0 } } ] },
          { $or: [ { delta_received: { $exists: false } }, { delta_received: { $lte: 0 } } ] }
        ];
      }

      const [total, rawDocs] = await Promise.all([
        NetworkTelemetry.countDocuments(query),
        NetworkTelemetry.find(query)
          .sort({ last_updated: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);

      // Enrich only the paginated results with login data
      const userIds = [...new Set(rawDocs.map(d => d.user_id).filter(Boolean))];
      const loginLookup = {};
      if (userIds.length > 0) {
        const logins = await LoginTelemetry.aggregate([
          { $match: { 'telegram_user.user_id': { $in: userIds } } },
          { $sort: { timestamp: -1 } },
          { $group: { _id: '$telegram_user.user_id', doc: { $first: '$telegram_user' } } }
        ]);
        logins.forEach(l => { loginLookup[l._id] = l.doc; });
      }

      const mappedData = rawDocs.map(net => {
        const login = loginLookup[net.user_id] || {};
        return {
          ...net,
          active_proxy_ip: net.active_proxy_ip || net.active_connection?.ip || 'Unknown',
          phone_number: net.telegram_user?.phone_number || login.phone_number || '',
          first_name: net.telegram_user?.first_name || login.first_name || 'Unknown',
          last_name: net.telegram_user?.last_name || login.last_name || '',
          username: net.telegram_user?.username || login.username || ''
        };
      });

      return res.json({ total, data: mappedData });
    }

    // === SEARCH PATH: Must use aggregation for cross-field search ===
    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // First, try to match on local fields (fast, no $lookup needed)
    const localMatch = {
      $or: [
        { user_id: { $regex: safeSearch, $options: 'i' } },
        { original_ip: { $regex: safeSearch, $options: 'i' } },
        { active_proxy_ip: { $regex: safeSearch, $options: 'i' } },
        { apk_version: { $regex: safeSearch, $options: 'i' } },
        { 'telegram_user.phone_number': { $regex: safeSearch, $options: 'i' } },
        { 'telegram_user.first_name': { $regex: safeSearch, $options: 'i' } },
        { 'telegram_user.last_name': { $regex: safeSearch, $options: 'i' } },
        { 'telegram_user.username': { $regex: safeSearch, $options: 'i' } }
      ]
    };

    // Check if user_id is numeric for exact match
    const numericSearch = parseInt(search);
    if (!isNaN(numericSearch)) {
      localMatch.$or.push({ user_id: numericSearch });
    }

    const matchQuery = { $and: [ localMatch ] };
    if (foreground === 'true') {
      matchQuery.$and.push({
        $or: [
          { delta_sent: { $gt: 0 } },
          { delta_received: { $gt: 0 } }
        ]
      });
    } else if (foreground === 'false') {
      matchQuery.$and.push({
        $and: [
          { $or: [ { delta_sent: { $exists: false } }, { delta_sent: { $lte: 0 } } ] },
          { $or: [ { delta_received: { $exists: false } }, { delta_received: { $lte: 0 } } ] }
        ]
      });
    }

    let pipeline = [
      { $match: matchQuery },
      { $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: { last_updated: -1 } },
          { $skip: skip },
          { $limit: limit }
        ]
      }}
    ];

    const results = await NetworkTelemetry.aggregate(pipeline);
    const total = results[0].metadata[0] ? results[0].metadata[0].total : 0;
    const rawDocs = results[0].data;

    // Enrich only the paginated results
    const userIds = [...new Set(rawDocs.map(d => d.user_id).filter(Boolean))];
    const loginLookup = {};
    if (userIds.length > 0) {
      const logins = await LoginTelemetry.aggregate([
        { $match: { 'telegram_user.user_id': { $in: userIds } } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$telegram_user.user_id', doc: { $first: '$telegram_user' } } }
      ]);
      logins.forEach(l => { loginLookup[l._id] = l.doc; });
    }

    const mappedData = rawDocs.map(net => {
      const login = loginLookup[net.user_id] || {};
      return {
        ...net,
        active_proxy_ip: net.active_proxy_ip || net.active_connection?.ip || 'Unknown',
        phone_number: net.telegram_user?.phone_number || login.phone_number || '',
        first_name: net.telegram_user?.first_name || login.first_name || 'Unknown',
        last_name: net.telegram_user?.last_name || login.last_name || '',
        username: net.telegram_user?.username || login.username || ''
      };
    });

    res.json({ total, data: mappedData });
  } catch (error) {
    console.error('Pings Pagination Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/telemetry/network-users
 * Server-side paginated and searched endpoint for Unique Users
 */
app.get('/api/telemetry/network-users', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.toLowerCase().trim() : '';
    const foreground = req.query.foreground;

    let pipeline = [];

    // 1. Group by user_id to get unique users, taking the latest record
    pipeline.push({ $sort: { last_updated: -1 } });
    pipeline.push({
      $group: {
        _id: "$user_id",
        doc: { $first: "$$ROOT" }
      }
    });
    pipeline.push({ $replaceRoot: { newRoot: "$doc" } });

    // 2. Search & Foreground filter on local fields BEFORE any $lookup
    const matchFilters = [];
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const numericSearch = parseInt(search);
      const searchMatch = {
        $or: [
          { original_ip: { $regex: safeSearch, $options: 'i' } },
          { active_proxy_ip: { $regex: safeSearch, $options: 'i' } },
          { apk_version: { $regex: safeSearch, $options: 'i' } },
          { 'telegram_user.phone_number': { $regex: safeSearch, $options: 'i' } },
          { 'telegram_user.first_name': { $regex: safeSearch, $options: 'i' } },
          { 'telegram_user.last_name': { $regex: safeSearch, $options: 'i' } },
          { 'telegram_user.username': { $regex: safeSearch, $options: 'i' } }
        ]
      };
      if (!isNaN(numericSearch)) {
        searchMatch.$or.push({ user_id: numericSearch });
      }
      matchFilters.push(searchMatch);
    }

    if (foreground === 'true') {
      matchFilters.push({
        $or: [
          { delta_sent: { $gt: 0 } },
          { delta_received: { $gt: 0 } }
        ]
      });
    } else if (foreground === 'false') {
      matchFilters.push({
        $and: [
          { $or: [ { delta_sent: { $exists: false } }, { delta_sent: { $lte: 0 } } ] },
          { $or: [ { delta_received: { $exists: false } }, { delta_received: { $lte: 0 } } ] }
        ]
      });
    }

    if (matchFilters.length > 0) {
      pipeline.push({ $match: { $and: matchFilters } });
    }

    // 3. Facet: count + paginate FIRST, then enrich
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: { last_updated: -1 } },
          { $skip: skip },
          { $limit: limit }
        ]
      }
    });

    const results = await NetworkTelemetry.aggregate(pipeline);
    const total = results[0].metadata[0] ? results[0].metadata[0].total : 0;
    const rawDocs = results[0].data;

    // 4. Batch-enrich only the paginated results with login data
    const userIds = [...new Set(rawDocs.map(d => d.user_id).filter(Boolean))];
    const loginLookup = {};
    if (userIds.length > 0) {
      const logins = await LoginTelemetry.aggregate([
        { $match: { 'telegram_user.user_id': { $in: userIds } } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$telegram_user.user_id', doc: { $first: '$telegram_user' } } }
      ]);
      logins.forEach(l => { loginLookup[l._id] = l.doc; });
    }

    const mappedData = rawDocs.map(net => {
      const login = loginLookup[net.user_id] || {};
      return {
        ...net,
        active_proxy_ip: net.active_proxy_ip || net.active_connection?.ip || 'Unknown',
        phone_number: net.telegram_user?.phone_number || login.phone_number || '',
        first_name: net.telegram_user?.first_name || login.first_name || 'Unknown',
        last_name: net.telegram_user?.last_name || login.last_name || '',
        username: net.telegram_user?.username || login.username || ''
      };
    });

    res.json({ total, data: mappedData });
  } catch (error) {
    console.error('Users Pagination Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/telemetry/all-buckets
 * Fetches all daily buckets sorted chronologically
 */
app.get('/api/telemetry/all-buckets', verifyToken, async (req, res) => {
  try {
    const buckets = await NetworkDailyBucket.find().sort({ date: -1, last_updated: -1 }).limit(1000).lean();
    
    // Batch lookup latest logins for the bucket user IDs to avoid N+1 queries
    const userIds = [...new Set(buckets.map(b => b.user_id).filter(Boolean))];
    const loginLookup = {};
    if (userIds.length > 0) {
      const loginsData = await LoginTelemetry.aggregate([
        { $match: { 'telegram_user.user_id': { $in: userIds } } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$telegram_user.user_id', doc: { $first: '$telegram_user' } } }
      ]);
      loginsData.forEach(l => { loginLookup[l._id] = l.doc; });
    }

    const populated = buckets.map((b) => {
       let phone = b.telegram_user?.phone_number;
       
       if (!phone) {
          const userLogin = loginLookup[b.user_id] || {};
          b.telegram_user = b.telegram_user || {};
          b.telegram_user.phone_number = userLogin?.phone_number || "";
          b.telegram_user.first_name = userLogin?.first_name || "Unknown";
          b.telegram_user.last_name = userLogin?.last_name || "";
       }
       return b;
    });
    
    res.json(populated);
  } catch (error) {
    console.error('All Buckets Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



/**
 * GET /api/telemetry/daily-stats
 * Returns the aggregated statistics required for analytics
 */
app.get('/api/telemetry/daily-stats', verifyToken, async (req, res) => {
  try {
    const { timeframe = 'today' } = req.query;
    let query = {};
    const now = new Date();
    let startTime, endTime;
    let timeRangeText = "";

    if (timeframe === 'today') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      query.last_updated = { $gte: startTime, $lt: endTime };
      timeRangeText = `Today (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else if (timeframe === 'yesterday') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      query.last_updated = { $gte: startTime, $lt: endTime };
      timeRangeText = `Yesterday (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else if (timeframe === 'this_week') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Sunday
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      query.last_updated = { $gte: startTime, $lt: endTime };
      timeRangeText = `This Week (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else if (timeframe === 'last_15_mins') {
      startTime = new Date(now.getTime() - 15 * 60 * 1000);
      endTime = now;
      query.last_updated = { $gte: startTime, $lte: endTime };
      timeRangeText = `Last 15 Mins (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else if (timeframe === 'last_hour') {
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      endTime = now;
      query.last_updated = { $gte: startTime, $lte: endTime };
      timeRangeText = `Last Hour (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else { // all_time
      timeRangeText = "All Time";
    }

    let dailyActiveUsers = 0;
    let dailyActiveUsersTotal = 0;
    let dailyActiveUsersForeground = 0;
    let dailyActiveUsersBackground = 0;
    let dailyActiveUsersNotApplicable = 0;
    let dailyNewUsers = 0;

    let activeUsersStats;
    if (timeframe === 'all_time') {
      activeUsersStats = await NetworkTelemetry.aggregate([
        { $group: {
            _id: "$user_id",
            hasForeground: { $max: {
              $cond: [
                { $or: [
                  { $eq: ["$device_info.is_in_foreground", true] },
                  { $eq: ["$is_foreground", true] },
                  { $eq: ["$isForeground", true] }
                ] },
                true,
                false
              ]
            } },
            hasBackground: { $max: {
              $cond: [
                { $or: [
                  { $eq: ["$device_info.is_in_foreground", false] },
                  { $eq: ["$is_foreground", false] },
                  { $eq: ["$isForeground", false] }
                ] },
                true,
                false
              ]
            } }
        }}
      ]).allowDiskUse(true);
    } else {
      activeUsersStats = await NetworkTelemetry.aggregate([
        { $match: query },
        { $group: {
            _id: "$user_id",
            hasForeground: { $max: {
              $cond: [
                { $or: [
                  { $eq: ["$device_info.is_in_foreground", true] },
                  { $eq: ["$is_foreground", true] },
                  { $eq: ["$isForeground", true] }
                ] },
                true,
                false
              ]
            } },
            hasBackground: { $max: {
              $cond: [
                { $or: [
                  { $eq: ["$device_info.is_in_foreground", false] },
                  { $eq: ["$is_foreground", false] },
                  { $eq: ["$isForeground", false] }
                ] },
                true,
                false
              ]
            } }
        }}
      ]).allowDiskUse(true);
    }

    activeUsersStats.forEach(u => {
      if (u.hasForeground === true) {
        dailyActiveUsersForeground++;
      } else if (u.hasBackground === true) {
        dailyActiveUsersBackground++;
      } else {
        dailyActiveUsersNotApplicable++;
      }
    });

    dailyActiveUsersTotal = activeUsersStats.length;
    // Retain dailyActiveUsers for backward compatibility and averages
    dailyActiveUsers = dailyActiveUsersTotal;

    const totalUsersRaw = await NetworkTelemetry.distinct("user_id");
    const totalUsers = totalUsersRaw.length;

    // OPTIMIZED: Eliminate heavy aggregation of the entire collection to find first pings for all users
    if (timeframe === 'all_time') {
      dailyNewUsers = totalUsers;
    } else {
      // Find all active user IDs in the timeframe, then check which ones had NO pings before the timeframe start.
      const activeUserIds = activeUsersStats.map(u => u._id).filter(Boolean);
      const existingUserIds = await NetworkTelemetry.distinct("user_id", {
        user_id: { $in: activeUserIds },
        last_updated: { $lt: startTime }
      });
      dailyNewUsers = activeUserIds.length - existingUserIds.length;
    }

    // OPTIMIZED: If timeframe !== 'all_time', we only need the overall total sum of sent/received bytes.
    // We only perform the heavy group-by-user aggregation for all_time queries.
    let periodStatsRaw;
    let sumTotalSent = 0;
    let sumTotalReceived = 0;
    const userTrafficMap = {};

    if (timeframe === 'all_time') {
      const statsRaw = await NetworkTelemetry.aggregate([
        { $group: {
            _id: "$user_id",
            total_sent: { $sum: "$delta_sent" },
            total_received: { $sum: "$delta_received" },
            telegram_user: { $first: "$telegram_user" }
        }}
      ]).allowDiskUse(true);
      statsRaw.forEach(userStat => {
        const sent = userStat.total_sent || 0;
        const recv = userStat.total_received || 0;
        sumTotalSent += sent;
        sumTotalReceived += recv;
        
        userTrafficMap[userStat._id] = {
          user_id: userStat._id,
          telegram_user: userStat.telegram_user,
          total_traffic: sent + recv
        };
      });

      periodStatsRaw = statsRaw.map(s => ({
          _id: s._id,
          today_sent: s.total_sent,
          today_received: s.total_received
      }));
    } else {
      const totalStats = await NetworkTelemetry.aggregate([
        { $group: {
            _id: null,
            total_sent: { $sum: "$delta_sent" },
            total_received: { $sum: "$delta_received" }
        }}
      ]).allowDiskUse(true);
      if (totalStats.length > 0) {
        sumTotalSent = totalStats[0].total_sent || 0;
        sumTotalReceived = totalStats[0].total_received || 0;
      }

      periodStatsRaw = await NetworkTelemetry.aggregate([
        { $match: query },
        { $group: {
            _id: "$user_id",
            today_sent: { $sum: "$delta_sent" },
            today_received: { $sum: "$delta_received" },
            telegram_user: { $first: "$telegram_user" }
        }}
      ]).allowDiskUse(true);
    }

    let sumDailySent = 0;
    let sumDailyReceived = 0;

    periodStatsRaw.forEach(userStat => {
      sumDailySent += userStat.today_sent || 0;
      sumDailyReceived += userStat.today_received || 0;
    });

    const avgTotalSent = totalUsers ? (sumTotalSent / totalUsers) : 0;
    const avgTotalReceived = totalUsers ? (sumTotalReceived / totalUsers) : 0;
    const avgDailySent = dailyActiveUsers ? (sumDailySent / dailyActiveUsers) : 0;
    const avgDailyReceived = dailyActiveUsers ? (sumDailyReceived / dailyActiveUsers) : 0;
    
    let periodUserTraffic = [];
    if (timeframe === 'all_time') {
      periodUserTraffic = Object.values(userTrafficMap);
    } else {
      periodUserTraffic = periodStatsRaw.map(u => ({
        user_id: u._id,
        telegram_user: u.telegram_user,
        total_traffic: (u.today_sent || 0) + (u.today_received || 0)
      }));
    }

    let topUsers = periodUserTraffic.sort((a, b) => b.total_traffic - a.total_traffic).slice(0, 20);
    
    // OPTIMIZED: Query first pings ONLY for the top 20 users
    const topUserIds = topUsers.map(tu => tu.user_id).filter(Boolean);
    let topUsersFirstPings = [];
    if (topUserIds.length > 0) {
      topUsersFirstPings = await NetworkTelemetry.aggregate([
        { $match: { user_id: { $in: topUserIds } } },
        { $group: { _id: "$user_id", first_ping: { $min: "$last_updated" } } }
      ]).allowDiskUse(true);
    }

    topUsers = topUsers.map(tu => {
       const userFirstPing = topUsersFirstPings.find(fp => fp._id === tu.user_id);
       let usageDays = 0;
       if (userFirstPing && userFirstPing.first_ping) {
           const diffTime = Math.abs(new Date() - new Date(userFirstPing.first_ping));
           usageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       }
       return { ...tu, usage_days: usageDays || 1 };
    });
    
    res.json({
      dailyActiveUsers,
      dailyActiveUsersForeground,
      dailyActiveUsersBackground,
      dailyActiveUsersNotApplicable,
      dailyActiveUsersTotal,
      dailyNewUsers,
      totalUsers,
      avgTotalSent,
      avgTotalReceived,
      avgDailySent,
      avgDailyReceived,
      topUsers,
      timeRangeText
    });
  } catch (error) {
    console.error('Daily Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/telemetry/traffic-report
 * Returns time-series aggregated stats and summaries for custom reporting
 */
app.get('/api/telemetry/traffic-report', verifyToken, async (req, res) => {
  try {
    const { timeframe = 'all_time', interval, user_id, active_proxy_ip } = req.query;
    const now = new Date();
    let startTime, endTime;
    let query = {};

    if (timeframe === 'last_15_mins') {
      startTime = new Date(now.getTime() - 15 * 60 * 1000);
      endTime = now;
      query.last_updated = { $gte: startTime, $lte: endTime };
    } else if (timeframe === 'last_hour') {
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      endTime = now;
      query.last_updated = { $gte: startTime, $lte: endTime };
    } else if (timeframe === 'today') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      query.last_updated = { $gte: startTime, $lt: endTime };
    } else if (timeframe === 'yesterday') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      query.last_updated = { $gte: startTime, $lt: endTime };
    } else if (timeframe === 'this_week') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Sunday
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      query.last_updated = { $gte: startTime, $lt: endTime };
    }

    if (user_id) {
      query.user_id = parseInt(user_id);
    }
    if (active_proxy_ip) {
      query.active_proxy_ip = active_proxy_ip;
    }

    let selectInterval = interval;
    if (!selectInterval) {
      if (timeframe === 'last_15_mins' || timeframe === 'last_hour') {
        selectInterval = '5m';
      } else if (timeframe === 'today' || timeframe === 'yesterday') {
        selectInterval = '1h';
      } else {
        selectInterval = '1d';
      }
    }

    let pings = await NetworkTelemetry.find(query)
      .sort({ last_updated: -1 })
      .limit(25000)
      .lean();
    pings.reverse(); // Restore chronological order for bucketing

    let totalBytesSent = 0;
    let totalBytesReceived = 0;
    let totalMobileSent = 0;
    let totalMobileReceived = 0;
    let totalWifiSent = 0;
    let totalWifiReceived = 0;
    let totalPings = 0;
    let failedPings = 0;

    const userStats = {};
    const xrayStats = {};
    const timelineMap = {};

    pings.forEach(ping => {
      const ds = ping.delta_sent || 0;
      const dr = ping.delta_received || 0;

      let dms = ping.delta_mobile_sent || 0;
      let dmr = ping.delta_mobile_received || 0;
      let dws = ping.delta_wifi_sent || 0;
      let dwr = ping.delta_wifi_received || 0;

      if (dms === 0 && dmr === 0 && dws === 0 && dwr === 0) {
        const mobileTotal = (ping.network_usage?.mobile_bytes_sent || 0) + (ping.network_usage?.mobile_bytes_received || 0);
        const wifiTotal = (ping.network_usage?.wifi_bytes_sent || 0) + (ping.network_usage?.wifi_bytes_received || 0);
        const total = mobileTotal + wifiTotal;
        if (total > 0) {
          dms = Math.round(ds * (ping.network_usage?.mobile_bytes_sent || 0) / total);
          dmr = Math.round(dr * (ping.network_usage?.mobile_bytes_received || 0) / total);
          dws = ds - dms;
          dwr = dr - dmr;
        } else {
          dws = ds;
          dwr = dr;
        }
      }

      const pingMs = ping.active_connection?.telegram_ping_ms;
      const connType = ping.active_connection?.type;
      const isFailed = (pingMs === -1) && (connType !== 'VPN');

      totalBytesSent += ds;
      totalBytesReceived += dr;
      totalMobileSent += dms;
      totalMobileReceived += dmr;
      totalWifiSent += dws;
      totalWifiReceived += dwr;
      totalPings += 1;
      if (isFailed) failedPings += 1;

      const date = new Date(ping.last_updated);
      let bucketKey;
      if (selectInterval === '5m') {
        const minutes = date.getMinutes();
        const roundedMin = minutes - (minutes % 5);
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), roundedMin, 0, 0);
        bucketKey = d.toISOString();
      } else if (selectInterval === '1h') {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0, 0);
        bucketKey = d.toISOString();
      } else {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        bucketKey = d.toISOString();
      }

      if (!timelineMap[bucketKey]) {
        timelineMap[bucketKey] = {
          timestamp: bucketKey,
          bytesSent: 0,
          bytesReceived: 0,
          mobileSent: 0,
          mobileReceived: 0,
          wifiSent: 0,
          wifiReceived: 0,
          totalPings: 0,
          failedPings: 0
        };
      }
      timelineMap[bucketKey].bytesSent += ds;
      timelineMap[bucketKey].bytesReceived += dr;
      timelineMap[bucketKey].mobileSent += dms;
      timelineMap[bucketKey].mobileReceived += dmr;
      timelineMap[bucketKey].wifiSent += dws;
      timelineMap[bucketKey].wifiReceived += dwr;
      timelineMap[bucketKey].totalPings += 1;
      if (isFailed) timelineMap[bucketKey].failedPings += 1;

      const uId = ping.user_id;
      if (uId) {
        if (!userStats[uId]) {
          userStats[uId] = {
            user_id: uId,
            first_name: ping.first_name || ping.telegram_user?.first_name || '',
            last_name: ping.last_name || ping.telegram_user?.last_name || '',
            phone_number: ping.phone_number || ping.telegram_user?.phone_number || '',
            username: ping.username || ping.telegram_user?.username || '',
            bytesSent: 0,
            bytesReceived: 0,
            mobileSent: 0,
            mobileReceived: 0,
            wifiSent: 0,
            wifiReceived: 0,
            totalPings: 0,
            failedPings: 0
          };
        }
        userStats[uId].bytesSent += ds;
        userStats[uId].bytesReceived += dr;
        userStats[uId].mobileSent += dms;
        userStats[uId].mobileReceived += dmr;
        userStats[uId].wifiSent += dws;
        userStats[uId].wifiReceived += dwr;
        userStats[uId].totalPings += 1;
        if (isFailed) userStats[uId].failedPings += 1;
      }

      const proxyIp = ping.active_proxy_ip || 'Unknown';
      if (!xrayStats[proxyIp]) {
        xrayStats[proxyIp] = {
          active_proxy_ip: proxyIp,
          bytesSent: 0,
          bytesReceived: 0,
          mobileSent: 0,
          mobileReceived: 0,
          wifiSent: 0,
          wifiReceived: 0,
          totalPings: 0,
          failedPings: 0
        };
      }
      xrayStats[proxyIp].bytesSent += ds;
      xrayStats[proxyIp].bytesReceived += dr;
      xrayStats[proxyIp].mobileSent += dms;
      xrayStats[proxyIp].mobileReceived += dmr;
      xrayStats[proxyIp].wifiSent += dws;
      xrayStats[proxyIp].wifiReceived += dwr;
      xrayStats[proxyIp].totalPings += 1;
      if (isFailed) xrayStats[proxyIp].failedPings += 1;
    });

    const aggregateTimeline = Object.values(timelineMap).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(bucket => {
      const d = new Date(bucket.timestamp);
      let timeLabel = "";
      if (selectInterval === '5m' || selectInterval === '1h') {
        timeLabel = d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: false });
      } else {
        timeLabel = d.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
      }
      return { ...bucket, timeLabel };
    });

    const users = Object.values(userStats).sort((a, b) => (b.bytesSent + b.bytesReceived) - (a.bytesSent + a.bytesReceived));
    const xrayIps = Object.values(xrayStats).sort((a, b) => (b.bytesSent + b.bytesReceived) - (a.bytesSent + a.bytesReceived));

    res.json({
      summary: {
        totalBytesSent,
        totalBytesReceived,
        totalMobileSent,
        totalMobileReceived,
        totalWifiSent,
        totalWifiReceived,
        totalPings,
        failedPings,
        pingSuccessRate: totalPings ? parseFloat(((totalPings - failedPings) / totalPings * 100).toFixed(2)) : 100
      },
      aggregateTimeline,
      users,
      xrayIps
    });
  } catch (error) {
    console.error('Traffic Report Endpoint Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/**
 * GET /api/telemetry/xray-stats
 * Returns Xray Proxy stats filtered by timeframe
 */
app.get('/api/telemetry/xray-stats', verifyToken, async (req, res) => {
  try {
    const { timeframe = 'today' } = req.query;
    let query = {};
    const now = new Date();
    let startTime, endTime;
    let timeRangeText = "";

    if (timeframe === 'today') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      query.last_updated = { $gte: startTime, $lt: endTime };
      timeRangeText = `Today (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else if (timeframe === 'yesterday') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      query.last_updated = { $gte: startTime, $lt: endTime };
      timeRangeText = `Yesterday (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else if (timeframe === 'this_week') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Sunday
      endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      query.last_updated = { $gte: startTime, $lt: endTime };
      timeRangeText = `This Week (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else if (timeframe === 'last_15_mins') {
      startTime = new Date(now.getTime() - 15 * 60 * 1000);
      endTime = now;
      query.last_updated = { $gte: startTime, $lte: endTime };
      timeRangeText = `Last 15 Mins (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else if (timeframe === 'last_hour') {
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      endTime = now;
      query.last_updated = { $gte: startTime, $lte: endTime };
      timeRangeText = `Last Hour (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`;
    } else { // all_time
      timeRangeText = "All Time";
    }

    let pipeline = [];
    if (req.query.latestPing === 'true') {
      pipeline = [
        { $match: query },
        { $sort: { last_updated: -1 } },
        { $limit: 15000 }, // OPTIMIZED: Scan only latest 15,000 records using index, avoiding massive table sorts
        { $group: {
            _id: "$user_id",
            doc: { $first: "$$ROOT" }
        }},
        { $replaceRoot: { newRoot: "$doc" } },
        { $group: {
            _id: { 
              proxy: { $ifNull: ["$active_proxy_ip", "$active_connection.ip"] }, 
              user: "$user_id" 
            },
            total_sent: { $sum: "$delta_sent" },
            total_received: { $sum: "$delta_received" },
            user_data: { $first: "$telegram_user" }
        }},
        { $group: {
            _id: "$_id.proxy",
            total_sent: { $sum: "$total_sent" },
            total_received: { $sum: "$total_received" },
            user_ids: { $addToSet: "$_id.user" },
            users_data: { $push: { id: "$_id.user", user: "$user_data" } }
        }}
      ];
    } else {
      pipeline = [
        { $match: query },
        { $group: {
            _id: { 
              proxy: { $ifNull: ["$active_proxy_ip", "$active_connection.ip"] }, 
              user: "$user_id" 
            },
            total_sent: { $sum: "$delta_sent" },
            total_received: { $sum: "$delta_received" },
            user_data: { $first: "$telegram_user" }
        }},
        { $group: {
            _id: "$_id.proxy",
            total_sent: { $sum: "$total_sent" },
            total_received: { $sum: "$total_received" },
            user_ids: { $addToSet: "$_id.user" },
            users_data: { $push: { id: "$_id.user", user: "$user_data" } }
        }}
      ];
    }
    const statsRaw = await NetworkTelemetry.aggregate(pipeline).allowDiskUse(true);

    const results = statsRaw.map(st => {
      const uniqueUsersMap = {};
      st.users_data.forEach(u => {
         if (!uniqueUsersMap[u.id] && u.user) {
            uniqueUsersMap[u.id] = u.user;
         }
      });
      
      const usersList = Object.entries(uniqueUsersMap).map(([id, u]) => {
        return {
          id: id,
          name: `${u.first_name || 'Unknown'} ${u.last_name || ''}`.trim() || u.phone_number || 'Unknown'
        };
      });

      return {
        ip: st._id || 'Unknown',
        userCount: st.user_ids.length,
        totalSent: st.total_sent,
        totalReceived: st.total_received,
        users: usersList
      };
    });

    results.sort((a, b) => b.userCount - a.userCount);
    res.json({ timeRangeText, results });
  } catch (error) {
    console.error('Xray Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/telemetry/logins
 */
app.delete('/api/telemetry/logins', verifyToken, async (req, res) => {
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
app.delete('/api/telemetry/network', verifyToken, async (req, res) => {
  try {
    await NetworkTelemetry.deleteMany({});
    await NetworkDailyBucket.deleteMany({});
    res.json({ status: 'deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Wildcard handler directs all other GET requests to the index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MTProto Proxy Pool Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key protection: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
});
