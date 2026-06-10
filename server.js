require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
const platform = (process.env.PLATFORM || 'android').toLowerCase();
const MONGODB_URI = process.env.MONGODB_URI || 
  (platform === 'ios' ? process.env.MONGODB_URI_IOS : process.env.MONGODB_URI_ANDROID) || 
  'mongodb+srv://desmondgiam_db_user:PCibd7pBM4XcOAHG@skywalker-tencent-clust.hr8apyw.mongodb.net/?appName=skywalker-tencent-cluster';

mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000
})
  .then(() => console.log(`Connected to MongoDB (${platform.toUpperCase()})`))
  .catch(err => console.error('MongoDB connection error:', err));

// Import Models
const { User, MtProxyConfig, IosVersion } = require('./models');

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

// Initialize default iOS version config if collection is empty
mongoose.connection.once('open', async () => {
  try {
    const count = await IosVersion.countDocuments();
    if (count === 0) {
      await IosVersion.create({
        versionCode: 100,
        versionName: '1.0.0',
        downloadUrl: 'https://apps.apple.com/app/id123456789',
        changelog: 'Initial release',
        forceUpdate: false
      });
      console.log('Seeded IosVersion with default configuration');
    }
  } catch (err) {
    console.error('Error seeding IosVersion:', err);
  }
});

// Middleware setup
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount modular routers
const authRouter = require('./routes/auth');
const configsRouter = require('./routes/configs');
const telemetryRouter = require('./routes/telemetry');

app.use('/', authRouter);
app.use('/', configsRouter);
app.use('/', telemetryRouter);

// Wildcard handler directs all other GET requests to the index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MTProto Proxy Pool Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key protection: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
});
