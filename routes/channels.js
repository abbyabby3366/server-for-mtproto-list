const express = require('express');
const router = express.Router();
const { ChannelConfig } = require('../models');
const { verifyToken, apiKeyAuth } = require('../middleware');

// GET /channels - Consumer endpoint (protected by optional API_KEY)
router.get('/channels', apiKeyAuth, async (req, res) => {
  try {
    const config = await ChannelConfig.findOne();
    const channels = config ? config.channels : [];

    // Filter out disabled channels
    const activeChannels = channels
      .filter(c => c.disabled !== true)
      .map(c => ({
        category: c.category || 'General',
        title: c.title,
        link: c.link,
        avatar_url: c.avatar_url || '',
        description: c.description || ''
      }));

    // Optional query parameter ?grouped=true to receive channels grouped by category
    if (req.query.grouped === 'true') {
      const grouped = {};
      for (const channel of activeChannels) {
        const cat = channel.category;
        if (!grouped[cat]) {
          grouped[cat] = [];
        }
        grouped[cat].push({
          title: channel.title,
          link: channel.link,
          avatar_url: channel.avatar_url,
          description: channel.description
        });
      }
      return res.json(grouped);
    }

    res.json(activeChannels);
  } catch (error) {
    console.error('Error reading channels from DB:', error.message);
    res.status(500).json({ error: 'Failed to load channel list' });
  }
});

// POST /channels - Programmatic consumer update endpoint (protected by optional API_KEY)
router.post('/channels', apiKeyAuth, async (req, res) => {
  try {
    const channels = req.body;
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'Body must be a JSON array of channels' });
    }

    // Validate each channel has required fields
    for (const channel of channels) {
      if (!channel.title || !channel.link) {
        return res.status(400).json({
          error: 'Each channel must have title and link fields',
          invalid: channel
        });
      }
    }

    let config = await ChannelConfig.findOne();
    if (config) {
      config.channels = channels;
      await config.save();
    } else {
      config = new ChannelConfig({ channels, remarks: '' });
      await config.save();
    }

    res.json({ status: 'updated', count: channels.length });
  } catch (error) {
    console.error('Error updating channels in DB:', error.message);
    res.status(500).json({ error: 'Failed to update channel list' });
  }
});

// GET /api/channels - Admin UI endpoint (protected by JWT token)
router.get('/api/channels', verifyToken, async (req, res) => {
  try {
    const config = await ChannelConfig.findOne();
    res.json({
      channels: config ? config.channels : [],
      remarks: config ? config.remarks || '' : ''
    });
  } catch (error) {
    console.error('Error reading channels for UI:', error.message);
    res.status(500).json({ error: 'Failed to load channels' });
  }
});

// POST /api/channels - Admin UI update endpoint (protected by JWT token)
router.post('/api/channels', verifyToken, async (req, res) => {
  try {
    const { channels, remarks } = req.body;
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: 'channels must be an array' });
    }

    // Validate required fields
    for (const c of channels) {
      if (!c.title || !c.link) {
        return res.status(400).json({ error: 'Each channel must have title and link fields' });
      }
    }

    let config = await ChannelConfig.findOne();
    if (config) {
      config.channels = channels;
      if (remarks !== undefined) config.remarks = remarks;
      await config.save();
    } else {
      config = new ChannelConfig({ channels, remarks: remarks || '' });
      await config.save();
    }

    res.json({ status: 'updated', count: channels.length });
  } catch (error) {
    console.error('Error saving channels from UI:', error.message);
    res.status(500).json({ error: 'Failed to update channels' });
  }
});

// POST /api/channels/sync-avatars - Auto-fetch Telegram info (title, description, avatar) & upload to Linode S3
const { extractTelegramHandle, syncTelegramChannel } = require('../services/s3Service');

router.post('/api/channels/sync-avatars', verifyToken, async (req, res) => {
  try {
    let config = await ChannelConfig.findOne();
    if (!config || !config.channels || config.channels.length === 0) {
      return res.status(404).json({ error: 'No channels configured to sync' });
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let i = 0; i < config.channels.length; i++) {
      const channel = config.channels[i];
      const handle = extractTelegramHandle(channel.link);
      if (!handle) {
        failedCount++;
        errors.push({ title: channel.title, error: 'Invalid or missing Telegram handle' });
        continue;
      }

      try {
        console.log(`[Channel Sync] Syncing @${handle} (${channel.title})...`);
        const syncedData = await syncTelegramChannel(handle);

        // Overwrite title and description from Telegram metadata
        if (syncedData.title) {
          config.channels[i].title = syncedData.title;
        }
        if (typeof syncedData.description === 'string') {
          config.channels[i].description = syncedData.description;
        }
        if (syncedData.avatar_url) {
          config.channels[i].avatar_url = syncedData.avatar_url;
        }

        syncedCount++;
        console.log(`[Channel Sync] Successfully updated @${handle} (title: "${syncedData.title}")`);
      } catch (err) {
        failedCount++;
        errors.push({ title: channel.title, handle, error: err.message });
        console.warn(`[Channel Sync] Failed for @${handle}:`, err.message);
      }
    }

    await config.save();

    res.json({
      status: 'success',
      syncedCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      channels: config.channels
    });
  } catch (error) {
    console.error('Error syncing channels:', error.message);
    res.status(500).json({ error: 'Failed to sync channels: ' + error.message });
  }
});

// POST /api/channels/sync-single-avatar - Sync title, description & avatar for a single channel link
router.post('/api/channels/sync-single-avatar', verifyToken, async (req, res) => {
  try {
    const { link } = req.body;
    const handle = extractTelegramHandle(link);
    if (!handle) {
      return res.status(400).json({ error: 'Invalid Telegram link or handle' });
    }

    const syncedData = await syncTelegramChannel(handle);
    res.json({
      status: 'success',
      handle,
      title: syncedData.title,
      description: syncedData.description,
      avatar_url: syncedData.avatar_url
    });
  } catch (error) {
    console.error('Error syncing single channel:', error.message);
    res.status(500).json({ error: error.message || 'Failed to sync channel' });
  }
});

module.exports = router;
