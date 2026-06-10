const express = require('express');
const router = express.Router();
const {
  LoginTelemetry,
  NetworkTelemetry,
  NetworkDailyBucket
} = require('../models');
const { verifyToken } = require('../middleware');

// Cache config for client pings
const latestStateCache = new Map();
const CACHE_MAX_SIZE = 500;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper functions for /api/telemetry/daily-stats
function buildDailyStatsQuery(timeframe, now) {
  let query = {};
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

  return { query, startTime, endTime, timeRangeText };
}

function classifyActiveUsers(activeUsersStats) {
  let dailyActiveUsersForeground = 0;
  let dailyActiveUsersBackground = 0;
  let dailyActiveUsersNotApplicable = 0;

  activeUsersStats.forEach(u => {
    if (u.hasForeground === true) {
      dailyActiveUsersForeground++;
    } else if (u.hasBackground === true) {
      dailyActiveUsersBackground++;
    } else {
      dailyActiveUsersNotApplicable++;
    }
  });

  return {
    dailyActiveUsersForeground,
    dailyActiveUsersBackground,
    dailyActiveUsersNotApplicable
  };
}

async function calculateTopUsersAndUsageDays(periodUserTraffic, now) {
  let topUsers = [...periodUserTraffic].sort((a, b) => b.total_traffic - a.total_traffic).slice(0, 20);
  
  const topUserIds = topUsers.map(tu => tu.user_id).filter(Boolean);
  let topUsersFirstPings = [];
  if (topUserIds.length > 0) {
    topUsersFirstPings = await NetworkTelemetry.aggregate([
      { $match: { user_id: { $in: topUserIds } } },
      { $group: { _id: "$user_id", first_ping: { $min: "$last_updated" } } }
    ]).allowDiskUse(true);
  }

  return topUsers.map(tu => {
    const userFirstPing = topUsersFirstPings.find(fp => fp._id === tu.user_id);
    let usageDays = 0;
    if (userFirstPing && userFirstPing.first_ping) {
      const diffTime = Math.abs(now - new Date(userFirstPing.first_ping));
      usageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    }
    return { ...tu, usage_days: usageDays || 1 };
  });
}

// Helper functions for /api/telemetry/traffic-report
function buildTrafficReportQuery(timeframe, user_id, active_proxy_ip, now) {
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

  return query;
}

function getTrafficReportInterval(interval, timeframe) {
  if (interval) return interval;
  if (timeframe === 'last_15_mins' || timeframe === 'last_hour') {
    return '5m';
  } else if (timeframe === 'today' || timeframe === 'yesterday') {
    return '1h';
  }
  return '1d';
}

function calculateFallbackMobileWifiDeltas(ping, ds, dr) {
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
  return { dms, dmr, dws, dwr };
}

function getBucketKey(date, selectInterval) {
  if (selectInterval === '5m') {
    const minutes = date.getMinutes();
    const roundedMin = minutes - (minutes % 5);
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), roundedMin, 0, 0);
    return d.toISOString();
  } else if (selectInterval === '1h') {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), 0, 0, 0);
    return d.toISOString();
  } else {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    return d.toISOString();
  }
}

function updatePingMetrics(target, ds, dr, dms, dmr, dws, dwr, isFailed) {
  target.bytesSent += ds;
  target.bytesReceived += dr;
  target.mobileSent += dms;
  target.mobileReceived += dmr;
  target.wifiSent += dws;
  target.wifiReceived += dwr;
  target.totalPings += 1;
  if (isFailed) target.failedPings += 1;
}

function aggregateTrafficPings(pings, selectInterval) {
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

  for (const ping of pings) {
    const ds = ping.delta_sent || 0;
    const dr = ping.delta_received || 0;

    const { dms, dmr, dws, dwr } = calculateFallbackMobileWifiDeltas(ping, ds, dr);

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
    const bucketKey = getBucketKey(date, selectInterval);

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
    updatePingMetrics(timelineMap[bucketKey], ds, dr, dms, dmr, dws, dwr, isFailed);

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
      updatePingMetrics(userStats[uId], ds, dr, dms, dmr, dws, dwr, isFailed);
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
    updatePingMetrics(xrayStats[proxyIp], ds, dr, dms, dmr, dws, dwr, isFailed);
  }

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

  return {
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
  };
}

// POST /user-login-details
router.post('/user-login-details', async (req, res) => {
  try {
    const payload = req.body;
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

// POST /network-usage
router.post('/network-usage', async (req, res) => {
  try {
    const payload = req.body;
    const { user_id } = payload;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    payload.original_ip = clientIp ? clientIp.split(',')[0].trim() : 'Unknown';
    payload.last_updated = new Date();
    
    let existing = null;
    const cached = latestStateCache.get(user_id);
    if (cached && (Date.now() - cached._cachedAt) < CACHE_TTL_MS) {
      existing = cached;
    } else {
      existing = await NetworkTelemetry.findOne({ user_id }).sort({ last_updated: -1 }).lean();
    }
    
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

    latestStateCache.set(user_id, {
      network_usage: payload.network_usage,
      active_proxy_ip: payload.active_proxy_ip,
      _cachedAt: Date.now()
    });
    if (latestStateCache.size > CACHE_MAX_SIZE) {
      const firstKey = latestStateCache.keys().next().value;
      latestStateCache.delete(firstKey);
    }
    
    res.status(200).json({ status: 'updated' });
  } catch (error) {
    console.error('Error updating network telemetry:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/telemetry/stats
router.get('/api/telemetry/stats', verifyToken, async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const logins = await LoginTelemetry.find().sort({ timestamp: -1 }).limit(5000).lean();
    const networkRaw = await NetworkTelemetry.find().sort({ last_updated: -1 }).limit(5000).lean();
    
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

// GET /api/telemetry/logins
router.get('/api/telemetry/logins', verifyToken, async (req, res) => {
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

// DELETE /api/telemetry/logins
router.delete('/api/telemetry/logins', verifyToken, async (req, res) => {
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

// DELETE /api/telemetry/network
router.delete('/api/telemetry/network', verifyToken, async (req, res) => {
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

    const result = await NetworkTelemetry.deleteMany(query);
    console.log(`Deleted ${result.deletedCount} network records (range: ${range})`);
    res.json({ status: 'deleted', count: result.deletedCount, range });
  } catch (error) {
    console.error('Delete Network Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/telemetry/flush-network
router.post('/api/telemetry/flush-network', verifyToken, async (req, res) => {
  try {
    const rawDays = req.body.days ?? req.query.days ?? process.env.DATA_RETENTION_DAYS ?? 7;
    let days = parseInt(rawDays);
    if (isNaN(days) || days <= 0) {
      days = 7;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const latestPerUser = await NetworkTelemetry.aggregate([
      { $group: { _id: '$user_id', latestId: { $max: '$_id' } } }
    ]);
    const keepIds = latestPerUser.map(u => u.latestId).filter(Boolean);

    const result = await NetworkTelemetry.deleteMany({
      last_updated: { $lt: cutoff },
      _id: { $nin: keepIds }
    });

    console.log(`[ManualFlush] Deleted ${result.deletedCount} old NetworkTelemetry records (older than ${days} days, keeping latest per user)`);
    res.json({ status: 'flushed', deletedCount: result.deletedCount, days });
  } catch (error) {
    console.error('[ManualFlush] Error during flush:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/telemetry/network-pings
router.get('/api/telemetry/network-pings', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.toLowerCase().trim() : '';
    const foreground = req.query.foreground;

    if (!search) {
      const query = {};
      if (foreground === 'true') {
        query.$or = [
          { 'device_info.is_in_foreground': true },
          { is_foreground: true },
          { isForeground: true }
        ];
      } else if (foreground === 'false') {
        query.$and = [
          { 'device_info.is_in_foreground': { $ne: true } },
          { is_foreground: { $ne: true } },
          { isForeground: { $ne: true } }
        ];
      } else if (foreground === 'na') {
        query.$and = [
          { 'device_info.is_in_foreground': { $exists: false } },
          { is_foreground: { $exists: false } },
          { isForeground: { $exists: false } }
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

    const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const numericSearch = parseInt(search);
    if (!isNaN(numericSearch)) {
      localMatch.$or.push({ user_id: numericSearch });
    }

    const matchQuery = { $and: [ localMatch ] };
    if (foreground === 'true') {
      matchQuery.$and.push({
        $or: [
          { 'device_info.is_in_foreground': true },
          { is_foreground: true },
          { isForeground: true }
        ]
      });
    } else if (foreground === 'false') {
      matchQuery.$and.push({
        $and: [
          { 'device_info.is_in_foreground': { $ne: true } },
          { is_foreground: { $ne: true } },
          { isForeground: { $ne: true } }
        ]
      });
    } else if (foreground === 'na') {
      matchQuery.$and.push({
        $and: [
          { 'device_info.is_in_foreground': { $exists: false } },
          { is_foreground: { $exists: false } },
          { isForeground: { $exists: false } }
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

// GET /api/telemetry/network-users
router.get('/api/telemetry/network-users', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.toLowerCase().trim() : '';
    const foreground = req.query.foreground;
    const sortBy = req.query.sort || 'last_updated';
    const timeframe = req.query.timeframe || 'all_time';

    let timeframeQuery = {};
    if (timeframe !== 'all_time') {
      const now = new Date();
      let startTime, endTime;
      if (timeframe === 'today') {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
        timeframeQuery = { last_updated: { $gte: startTime, $lt: endTime } };
      } else if (timeframe === 'yesterday') {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
        timeframeQuery = { last_updated: { $gte: startTime, $lt: endTime } };
      } else if (timeframe === 'this_week') {
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        timeframeQuery = { last_updated: { $gte: startTime, $lt: endTime } };
      } else if (timeframe === 'last_15_mins') {
        startTime = new Date(now.getTime() - 15 * 60 * 1000);
        endTime = now;
        timeframeQuery = { last_updated: { $gte: startTime, $lte: endTime } };
      } else if (timeframe === 'last_hour') {
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        endTime = now;
        timeframeQuery = { last_updated: { $gte: startTime, $lte: endTime } };
      }
    }

    let pipeline = [];
    if (Object.keys(timeframeQuery).length > 0) {
      pipeline.push({ $match: timeframeQuery });
    }

    pipeline.push({ $sort: { last_updated: -1 } });
    pipeline.push({
      $group: {
        _id: "$user_id",
        doc: { $first: "$$ROOT" },
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
      }
    });
    pipeline.push({
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$doc",
            {
              hasForeground: "$hasForeground",
              hasBackground: "$hasBackground"
            }
          ]
        }
      }
    });

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
      matchFilters.push({ hasForeground: true });
    } else if (foreground === 'false') {
      matchFilters.push({
        hasForeground: false,
        hasBackground: true
      });
    } else if (foreground === 'na') {
      matchFilters.push({
        hasForeground: false,
        hasBackground: false
      });
    }

    if (matchFilters.length > 0) {
      pipeline.push({ $match: { $and: matchFilters } });
    }

    if (sortBy === 'firstLoginTime') {
      pipeline.push({
        $lookup: {
          from: "logintelemetries",
          let: { uid: "$user_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$uid", "$telegram_user.user_id"] } } },
            { $project: { timestamp: 1 } },
            { $sort: { timestamp: 1 } },
            { $limit: 1 }
          ],
          as: "firstLogin"
        }
      });
      pipeline.push({
        $addFields: {
          firstLoginTime: {
            $cond: {
              if: { $gt: [{ $size: "$firstLogin" }, 0] },
              then: { $arrayElemAt: ["$firstLogin.timestamp", 0] },
              else: null
            }
          }
        }
      });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: sortBy === 'firstLoginTime' ? { firstLoginTime: -1, last_updated: -1 } : { last_updated: -1 } },
          { $skip: skip },
          { $limit: limit }
        ]
      }
    });

    const results = await NetworkTelemetry.aggregate(pipeline);
    const total = results[0].metadata[0] ? results[0].metadata[0].total : 0;
    const rawDocs = results[0].data;

    const userIds = [...new Set(rawDocs.map(d => d.user_id).filter(Boolean))];
    const loginLookup = {};
    const firstLoginLookup = {};
    const todayTrafficLookup = {};

    if (userIds.length > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [logins, firstLogins, todayTraffic] = await Promise.all([
        LoginTelemetry.aggregate([
          { $match: { 'telegram_user.user_id': { $in: userIds } } },
          { $sort: { timestamp: -1 } },
          { $group: { _id: '$telegram_user.user_id', doc: { $first: '$telegram_user' } } }
        ]),
        LoginTelemetry.aggregate([
          { $match: { 'telegram_user.user_id': { $in: userIds } } },
          { $sort: { timestamp: 1 } },
          { $group: { _id: '$telegram_user.user_id', firstLoginTime: { $first: '$timestamp' } } }
        ]),
        NetworkTelemetry.aggregate([
          { 
            $match: { 
              user_id: { $in: userIds },
              last_updated: { $gte: todayStart }
            } 
          },
          {
            $group: {
              _id: "$user_id",
              todaySent: { $sum: "$delta_sent" },
              todayReceived: { $sum: "$delta_received" }
            }
          }
        ])
      ]);

      logins.forEach(l => { loginLookup[l._id] = l.doc; });
      firstLogins.forEach(fl => { firstLoginLookup[fl._id] = fl.firstLoginTime; });
      todayTraffic.forEach(t => {
        todayTrafficLookup[t._id] = {
          sent: t.todaySent || 0,
          received: t.todayReceived || 0
        };
      });
    }

    const mappedData = rawDocs.map(net => {
      const login = loginLookup[net.user_id] || {};
      const firstLoginTime = net.firstLoginTime || firstLoginLookup[net.user_id] || null;
      const todayT = todayTrafficLookup[net.user_id] || { sent: 0, received: 0 };
      return {
        ...net,
        active_proxy_ip: net.active_proxy_ip || net.active_connection?.ip || 'Unknown',
        phone_number: net.telegram_user?.phone_number || login.phone_number || '',
        first_name: net.telegram_user?.first_name || login.first_name || 'Unknown',
        last_name: net.telegram_user?.last_name || login.last_name || '',
        username: net.telegram_user?.username || login.username || '',
        first_login_time: firstLoginTime,
        today_sent: todayT.sent,
        today_received: todayT.received
      };
    });

    res.json({ total, data: mappedData });
  } catch (error) {
    console.error('Users Pagination Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/telemetry/all-buckets
router.get('/api/telemetry/all-buckets', verifyToken, async (req, res) => {
  try {
    const buckets = await NetworkDailyBucket.find().sort({ date: -1, last_updated: -1 }).limit(1000).lean();
    
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

// GET /api/telemetry/daily-stats
router.get('/api/telemetry/daily-stats', verifyToken, async (req, res) => {
  try {
    const { timeframe = 'today' } = req.query;
    const now = new Date();
    
    const { query, startTime, endTime, timeRangeText } = buildDailyStatsQuery(timeframe, now);

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

    const {
      dailyActiveUsersForeground,
      dailyActiveUsersBackground,
      dailyActiveUsersNotApplicable
    } = classifyActiveUsers(activeUsersStats);

    const dailyActiveUsersTotal = activeUsersStats.length;
    const dailyActiveUsers = dailyActiveUsersTotal;

    const totalUsersAgg = await NetworkTelemetry.aggregate([
      { $group: { _id: "$user_id" } },
      { $count: "total" }
    ]);
    const totalUsers = totalUsersAgg[0]?.total || 0;

    let dailyNewUsers = 0;
    if (timeframe === 'all_time') {
      dailyNewUsers = totalUsers;
    } else {
      const activeUserIds = activeUsersStats.map(u => u._id).filter(Boolean);
      const existingUserIds = await NetworkTelemetry.distinct("user_id", {
        user_id: { $in: activeUserIds },
        last_updated: { $lt: startTime }
      });
      dailyNewUsers = activeUserIds.length - existingUserIds.length;
    }

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
      const [totalStats, periodStats] = await Promise.all([
        NetworkTelemetry.aggregate([
          { $group: {
              _id: null,
              total_sent: { $sum: "$delta_sent" },
              total_received: { $sum: "$delta_received" }
          }}
        ]).allowDiskUse(true),
        NetworkTelemetry.aggregate([
          { $match: query },
          { $group: {
              _id: "$user_id",
              today_sent: { $sum: "$delta_sent" },
              today_received: { $sum: "$delta_received" },
              telegram_user: { $first: "$telegram_user" }
          }}
        ]).allowDiskUse(true)
      ]);
      if (totalStats.length > 0) {
        sumTotalSent = totalStats[0].total_sent || 0;
        sumTotalReceived = totalStats[0].total_received || 0;
      }

      periodStatsRaw = periodStats;
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

    const sortedPeriodStats = [...periodStatsRaw].sort((a, b) => {
      const usageA = (a.today_sent || 0) + (a.today_received || 0);
      const usageB = (b.today_sent || 0) + (b.today_received || 0);
      return usageB - usageA;
    });

    const remainingStatsExcludingTop10 = sortedPeriodStats.slice(10);
    let sumDailySentExcludingTop10 = 0;
    let sumDailyReceivedExcludingTop10 = 0;
    remainingStatsExcludingTop10.forEach(userStat => {
      sumDailySentExcludingTop10 += userStat.today_sent || 0;
      sumDailyReceivedExcludingTop10 += userStat.today_received || 0;
    });

    const dailyActiveUsersExcludingTop10 = remainingStatsExcludingTop10.length;
    const avgDailySentExcludingTop10 = dailyActiveUsersExcludingTop10 ? (sumDailySentExcludingTop10 / dailyActiveUsersExcludingTop10) : 0;
    const avgDailyReceivedExcludingTop10 = dailyActiveUsersExcludingTop10 ? (sumDailyReceivedExcludingTop10 / dailyActiveUsersExcludingTop10) : 0;
    
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

    const topUsers = await calculateTopUsersAndUsageDays(periodUserTraffic, now);
    
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
      avgDailySentExcludingTop10,
      avgDailyReceivedExcludingTop10,
      avgDailyCombined: avgDailySent + avgDailyReceived,
      avgDailyCombinedExcludingTop10: avgDailySentExcludingTop10 + avgDailyReceivedExcludingTop10,
      totalDailyCombined: sumDailySent + sumDailyReceived,
      totalDailyCombinedExcludingTop10: sumDailySentExcludingTop10 + sumDailyReceivedExcludingTop10,
      dailyActiveUsersExcludingTop10,
      topUsers,
      timeRangeText
    });
  } catch (error) {
    console.error('Daily Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/telemetry/traffic-report
router.get('/api/telemetry/traffic-report', verifyToken, async (req, res) => {
  try {
    const { timeframe = 'all_time', interval, user_id, active_proxy_ip } = req.query;
    const now = new Date();
    
    const query = buildTrafficReportQuery(timeframe, user_id, active_proxy_ip, now);
    const selectInterval = getTrafficReportInterval(interval, timeframe);

    let pings = await NetworkTelemetry.find(query)
      .sort({ last_updated: -1 })
      .limit(25000)
      .lean();
    pings.reverse();

    const stats = aggregateTrafficPings(pings, selectInterval);

    res.json(stats);
  } catch (error) {
    console.error('Traffic Report Endpoint Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/telemetry/xray-stats
router.get('/api/telemetry/xray-stats', verifyToken, async (req, res) => {
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
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
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
    } else {
      timeRangeText = "All Time";
    }

    let pipeline = [];
    if (req.query.latestPing === 'true') {
      pipeline = [
        { $match: query },
        { $sort: { last_updated: -1 } },
        { $limit: 15000 },
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

module.exports = router;
