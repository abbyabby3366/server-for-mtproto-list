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

const transitIpsSchema = new mongoose.Schema({
  ips: [String],
  remarks: String
});
const TransitIps = mongoose.model('TransitIps', transitIpsSchema);

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

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
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
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
    
    // --- Daily Bucket Logic ---
    const todayStr = new Date().toISOString().split('T')[0]; // e.g. "2026-05-09"
    
    // Get existing latest state to calculate delta
    const existing = await NetworkTelemetry.findOne({ user_id }).sort({ last_updated: -1 });
    
    // If payload doesn't include active_proxy_ip, check active_connection.ip, then fallback to existing
    let finalProxyIp = payload.active_proxy_ip || payload.active_connection?.ip || existing?.active_proxy_ip;
    payload.active_proxy_ip = finalProxyIp;
    
    let deltaSent = payload.network_usage?.total_bytes_sent || 0;
    let deltaReceived = payload.network_usage?.total_bytes_received || 0;
    
    if (existing && existing.network_usage) {
       const oldSent = existing.network_usage.total_bytes_sent || 0;
       const oldRecv = existing.network_usage.total_bytes_received || 0;
       
       if (deltaSent >= oldSent) deltaSent = deltaSent - oldSent;
       if (deltaReceived >= oldRecv) deltaReceived = deltaReceived - oldRecv;
    }
    
    payload.delta_sent = deltaSent;
    payload.delta_received = deltaReceived;

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
    
    // Attach phone number from latest login to network data
    const network = await Promise.all(networkRaw.map(async (net) => {
      let phone = net.telegram_user?.phone_number;
      let fName = net.telegram_user?.first_name;
      let lName = net.telegram_user?.last_name;
      let proxyIp = net.active_proxy_ip || net.active_connection?.ip || 'Unknown';
      
      // We only fallback name/phone to LoginTelemetry, NOT the proxy IP.
      if (!phone && phone !== "") {
        const userLogin = await LoginTelemetry.findOne({ "telegram_user.user_id": net.user_id }).sort({ timestamp: -1 }).lean();
        phone = phone || userLogin?.telegram_user?.phone_number || "";
        fName = fName || userLogin?.telegram_user?.first_name || "Unknown";
        lName = lName || userLogin?.telegram_user?.last_name || "";
      }
      
      return {
        ...net,
        active_proxy_ip: proxyIp,
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
 * GET /api/telemetry/all-buckets
 * Fetches all daily buckets sorted chronologically
 */
app.get('/api/telemetry/all-buckets', verifyToken, async (req, res) => {
  try {
    const buckets = await NetworkDailyBucket.find().sort({ date: -1, last_updated: -1 }).limit(1000).lean();
    
    const populated = await Promise.all(buckets.map(async (b) => {
       let phone = b.telegram_user?.phone_number;
       
       if (!phone) {
          const userLogin = await LoginTelemetry.findOne({ "telegram_user.user_id": b.user_id }).sort({ timestamp: -1 }).lean();
          b.telegram_user = b.telegram_user || {};
          b.telegram_user.phone_number = userLogin?.telegram_user?.phone_number || "";
          b.telegram_user.first_name = userLogin?.telegram_user?.first_name || "Unknown";
          b.telegram_user.last_name = userLogin?.telegram_user?.last_name || "";
       }
       return b;
    }));
    
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
    let dailyNewUsers = 0;

    if (timeframe === 'all_time') {
      const allUsers = await NetworkTelemetry.distinct("user_id");
      dailyActiveUsers = allUsers.length;
    } else {
      const activeRaw = await NetworkTelemetry.distinct("user_id", query);
      dailyActiveUsers = activeRaw.length;
    }

    const totalUsersRaw = await NetworkTelemetry.distinct("user_id");
    const totalUsers = totalUsersRaw.length;

    const firstPings = await NetworkTelemetry.aggregate([
      { $group: { _id: "$user_id", first_ping: { $min: "$last_updated" } } }
    ]);
    
    if (timeframe === 'all_time') {
      dailyNewUsers = totalUsers;
    } else {
      dailyNewUsers = firstPings.filter(u => u.first_ping && u.first_ping >= startTime && u.first_ping < endTime).length;
    }

    const statsRaw = await NetworkTelemetry.aggregate([
      { $group: {
          _id: "$user_id",
          total_sent: { $sum: "$delta_sent" },
          total_received: { $sum: "$delta_received" },
          telegram_user: { $first: "$telegram_user" }
      }}
    ]);

    let sumTotalSent = 0;
    let sumTotalReceived = 0;
    const userTrafficMap = {};

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

    let periodStatsRaw;
    if (timeframe === 'all_time') {
      periodStatsRaw = statsRaw.map(s => ({
          _id: s._id,
          today_sent: s.total_sent,
          today_received: s.total_received
      }));
    } else {
      periodStatsRaw = await NetworkTelemetry.aggregate([
        { $match: query },
        { $group: {
            _id: "$user_id",
            today_sent: { $sum: "$delta_sent" },
            today_received: { $sum: "$delta_received" }
        }}
      ]);
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
    
    let topUsers = Object.values(userTrafficMap).sort((a, b) => b.total_traffic - a.total_traffic).slice(0, 20);
    
    topUsers = topUsers.map(tu => {
       const userFirstPing = firstPings.find(fp => fp._id === tu.user_id);
       let usageDays = 0;
       if (userFirstPing && userFirstPing.first_ping) {
           const diffTime = Math.abs(new Date() - new Date(userFirstPing.first_ping));
           usageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       }
       return { ...tu, usage_days: usageDays || 1 };
    });
    
    res.json({
      dailyActiveUsers,
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
    const statsRaw = await NetworkTelemetry.aggregate(pipeline);

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

app.listen(PORT, () => {
  console.log(`MTProto Proxy Pool Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key protection: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
});
