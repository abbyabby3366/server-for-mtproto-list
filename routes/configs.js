const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
  MtProxyConfig,
  TransitIps,
  AndroidVersion,
  AndroidVersionLog,
  IosVersion,
  IosVersionLog,
  ExternalRedirectLog,
  ExternalRedirectConfig
} = require('../models');
const { verifyToken, apiKeyAuth } = require('../middleware');

// GET /proxies
router.get('/proxies', apiKeyAuth, async (req, res) => {
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

// GET /transit-ips
router.get('/transit-ips', async (req, res) => {
  try {
    const record = await TransitIps.findOne();
    if (record && record.ips && record.ips.length > 0) {
      return res.json(record.ips);
    }
    // Fallback to local JSON file
    const ipsPath = path.join(__dirname, '..', 'transit-ips.json');
    const ipsData = fs.readFileSync(ipsPath, 'utf-8');
    const ips = JSON.parse(ipsData);
    res.json(ips);
  } catch (error) {
    console.error('Error reading IPs:', error.message);
    res.status(500).json({ error: 'Failed to load IP list' });
  }
});

// GET /api/transit-ips
router.get('/api/transit-ips', verifyToken, async (req, res) => {
  try {
    const record = await TransitIps.findOne();
    if (record) {
      return res.json({ ips: record.ips, remarks: record.remarks || '' });
    }
    // Fallback: read from local JSON and seed into DB
    const ipsPath = path.join(__dirname, '..', 'transit-ips.json');
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

// POST /api/transit-ips
router.post('/api/transit-ips', verifyToken, async (req, res) => {
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

// GET /api/proxies
router.get('/api/proxies', verifyToken, async (req, res) => {
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

// POST /api/proxies
router.post('/api/proxies', verifyToken, async (req, res) => {
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

// GET /api/platform
router.get('/api/platform', verifyToken, (req, res) => {
  res.json({ platform: (process.env.PLATFORM || 'android').toLowerCase() });
});

// GET /api/android/version
router.get('/api/android/version', async (req, res) => {
  try {
    const version = await AndroidVersion.findOne();
    if (version) {
      const { _id, __v, ...versionData } = version.toObject();
      res.json(versionData);
    } else {
      const versionPath = path.join(__dirname, '..', 'android-version.json');
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

const fieldsToCheck = ['versionCode', 'versionName', 'downloadUrl', 'changelog', 'forceUpdate'];

function getVersionFields(payload, isAndroid) {
  if (isAndroid) {
    return {
      versionCode: payload.versionCode,
      versionName: payload.versionName,
      downloadUrl: payload.downloadUrl,
      changelog: payload.changelog,
      forceUpdate: payload.forceUpdate
    };
  }
  
  const getField = (snakeKey, camelKey) => {
    if (payload[snakeKey] !== undefined) return payload[snakeKey];
    if (payload[camelKey] !== undefined) return payload[camelKey];
    return undefined;
  };

  return {
    versionCode: getField('version_code', 'versionCode'),
    versionName: getField('version', 'versionName'),
    downloadUrl: getField('file_url', 'downloadUrl'),
    changelog: getField('changelog', 'changelog'),
    forceUpdate: getField('force_update', 'forceUpdate')
  };
}

function buildNewConfig(prevObj, mappedPayload) {
  if (prevObj) {
    return {
      versionCode: mappedPayload.versionCode !== undefined ? mappedPayload.versionCode : prevObj.versionCode,
      versionName: mappedPayload.versionName !== undefined ? mappedPayload.versionName : prevObj.versionName,
      downloadUrl: mappedPayload.downloadUrl !== undefined ? mappedPayload.downloadUrl : prevObj.downloadUrl,
      changelog: mappedPayload.changelog !== undefined ? mappedPayload.changelog : prevObj.changelog,
      forceUpdate: mappedPayload.forceUpdate !== undefined ? mappedPayload.forceUpdate : prevObj.forceUpdate
    };
  }
  return {
    versionCode: mappedPayload.versionCode !== undefined ? mappedPayload.versionCode : 0,
    versionName: mappedPayload.versionName || '',
    downloadUrl: mappedPayload.downloadUrl || '',
    changelog: mappedPayload.changelog || '',
    forceUpdate: mappedPayload.forceUpdate !== undefined ? !!mappedPayload.forceUpdate : false
  };
}

async function checkAndLogVersionChanges(LogModel, user, prevObj, newObj) {
  const changedFields = [];
  fieldsToCheck.forEach(field => {
    const prevVal = prevObj ? prevObj[field] : undefined;
    const newVal = newObj[field];
    if (prevVal !== newVal) {
      changedFields.push(field);
    }
  });

  if (changedFields.length > 0) {
    const logEntry = new LogModel({
      user: {
        username: user.username,
        role: user.role
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
}

function updateVersionDocument(doc, mappedPayload) {
  if (mappedPayload.versionCode !== undefined) doc.versionCode = mappedPayload.versionCode;
  if (mappedPayload.versionName !== undefined) doc.versionName = mappedPayload.versionName;
  if (mappedPayload.downloadUrl !== undefined) doc.downloadUrl = mappedPayload.downloadUrl;
  if (mappedPayload.changelog !== undefined) doc.changelog = mappedPayload.changelog;
  if (mappedPayload.forceUpdate !== undefined) doc.forceUpdate = mappedPayload.forceUpdate;
}

// POST /api/android/version
router.post('/api/android/version', verifyToken, async (req, res) => {
  try {
    const mapped = getVersionFields(req.body, true);
    let version = await AndroidVersion.findOne();
    
    const prevObj = version ? version.toObject() : null;
    const newObj = buildNewConfig(prevObj, mapped);

    await checkAndLogVersionChanges(AndroidVersionLog, req.user, prevObj, newObj);

    if (version) {
      updateVersionDocument(version, mapped);
      await version.save();
    } else {
      version = new AndroidVersion(newObj);
      await version.save();
    }
    res.json({ status: 'updated' });
  } catch (error) {
    console.error('Error updating version metadata:', error.message);
    res.status(500).json({ error: 'Failed to update version metadata' });
  }
});

// GET /api/android/version/logs
router.get('/api/android/version/logs', verifyToken, async (req, res) => {
  try {
    const logs = await AndroidVersionLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching version logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/ios/version
router.get('/api/ios/version', async (req, res) => {
  try {
    const version = await IosVersion.findOne();
    if (version) {
      const obj = version.toObject();
      res.json({
        version: obj.versionName || '',
        version_code: obj.versionCode || 0,
        file_url: obj.downloadUrl || '',
        changelog: obj.changelog || '',
        force_update: obj.forceUpdate || false
      });
    } else {
      res.status(404).json({ error: 'iOS version configuration not found in MongoDB' });
    }
  } catch (error) {
    console.error('Error reading iOS version metadata:', error.message);
    res.status(500).json({ error: 'Failed to load version metadata' });
  }
});

// POST /api/ios/version
router.post('/api/ios/version', verifyToken, async (req, res) => {
  try {
    const mapped = getVersionFields(req.body, false);
    let version = await IosVersion.findOne();
    
    const prevObj = version ? version.toObject() : null;
    const newObj = buildNewConfig(prevObj, mapped);

    await checkAndLogVersionChanges(IosVersionLog, req.user, prevObj, newObj);

    if (version) {
      updateVersionDocument(version, mapped);
      await version.save();
    } else {
      version = new IosVersion(newObj);
      await version.save();
    }
    res.json({ status: 'updated' });
  } catch (error) {
    console.error('Error updating iOS version metadata:', error.message);
    res.status(500).json({ error: 'Failed to update iOS version metadata' });
  }
});

// GET /api/ios/version/logs
router.get('/api/ios/version/logs', verifyToken, async (req, res) => {
  try {
    const logs = await IosVersionLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching iOS version logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/external-redirects
router.post('/api/external-redirects', verifyToken, async (req, res) => {
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

// GET /api/external-redirects/logs
router.get('/api/external-redirects/logs', verifyToken, async (req, res) => {
  try {
    const logs = await ExternalRedirectLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching external redirect logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/external-redirect-config
router.get('/api/external-redirect-config', verifyToken, async (req, res) => {
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

// POST /api/external-redirect-config
router.post('/api/external-redirect-config', verifyToken, async (req, res) => {
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

// POST /proxies
router.post('/proxies', apiKeyAuth, async (req, res) => {
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

module.exports = router;
