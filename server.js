require('dotenv').config();
const dns = require('dns');
// Set public DNS servers to resolve MongoDB Atlas SRV records on Windows
dns.setServers(['8.8.8.8', '1.1.1.1']);

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
const { User, MtProxyConfig, WebProxyConfig, IosVersion, ChannelConfig } = require('./models');

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

// Initialize default web proxies if collection is empty
mongoose.connection.once('open', async () => {
  try {
    const count = await WebProxyConfig.countDocuments();
    if (count === 0) {
      await WebProxyConfig.create({
        proxies: [],
        remarks: ''
      });
      console.log('Initialized empty WebProxyConfig in DB');
    }
  } catch (err) {
    console.error('Error initializing WebProxyConfig:', err);
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

// Initialize default channels directly in MongoDB if collection is empty
const DEFAULT_CHANNELS = [
  { category: '搜索', title: '中文搜索', link: 'https://t.me/sousuozan', avatar_url: '', description: 'Telegram 中文超级索引与综合搜索导航', disabled: false },
  { category: '搜索', title: '极搜', link: 'https://t.me/jisou', avatar_url: '', description: '快速精准的电报群组与频道搜索引擎', disabled: false },
  { category: '影视', title: '电影频道', link: 'https://t.me/DYPD_3', avatar_url: '', description: '高清院线电影、经典大片分享与在线观影', disabled: false },
  { category: '影视', title: '影视剧场', link: 'https://t.me/YSJCduanju', avatar_url: '', description: '热门网络短剧、电视剧与影音综合资源', disabled: false },
  { category: '影视', title: 'netflix电视剧', link: 'https://t.me/haiwaiju', avatar_url: '', description: '精选 Netflix 网飞及海外热门美剧日韩剧', disabled: false },
  { category: '影视', title: '电视剧频道', link: 'https://t.me/dsju123', avatar_url: '', description: '最新热播连续剧更新与云盘高清资源下载', disabled: false },
  { category: '影视', title: '电影电视剧综艺', link: 'https://t.me/liwu12138', avatar_url: '', description: '影视综艺全网同步更新与夸克/百度网盘分享', disabled: false },
  { category: '动漫短剧', title: '动画仓库', link: 'https://t.me/AnimeNep', avatar_url: '', description: '海量日漫、国漫连载与经典动画高清合集', disabled: false },
  { category: '动漫短剧', title: '凡人修仙传', link: 'https://t.me/FanRenXiuXianZhuan_TRJ', avatar_url: '', description: '《凡人修仙传》动画每周同步更新与粉丝交流', disabled: false },
  { category: '动漫短剧', title: '仙逆', link: 'https://t.me/xianni2', avatar_url: '', description: '《仙逆》国漫动画最新剧集更新与讨论社区', disabled: false },
  { category: '动漫短剧', title: '斗破苍穹', link: 'https://t.me/TRJ_DPCQd', avatar_url: '', description: '《斗破苍穹》年番动画连载与精彩高能剪辑', disabled: false },
  { category: '动漫短剧', title: '动漫短剧', link: 'https://t.me/DuanJuDM', avatar_url: '', description: '精选爆款爽文短剧与热门动漫切片分享', disabled: false },
  { category: '漫画小说', title: '小说书源', link: 'https://t.me/iloveyuedu', avatar_url: '', description: '精选阅读书源、热门网络网文与电子书打包', disabled: false },
  { category: '漫画小说', title: '万卷书屋', link: 'https://t.me/wanjsw', avatar_url: '', description: '出版畅销书、经典文学与各类优质电子书分享', disabled: false },
  { category: '漫画小说', title: '桔梗书屋', link: 'https://t.me/JGBOOK', avatar_url: '', description: '精品网文小说、完结好书推荐与资源汇总', disabled: false },
  { category: '漫画小说', title: '网络小说', link: 'https://t.me/wanluoxiaoshuo', avatar_url: '', description: '热门完结及连载网文、修仙都市言情小说', disabled: false },
  { category: '音乐', title: '无损音乐', link: 'https://t.me/flac2', avatar_url: '', description: 'FLAC/Hi-Res 高解析度无损音乐与专辑下载', disabled: false },
  { category: '音乐', title: '一起听音乐', link: 'https://t.me/VmoMusic', avatar_url: '', description: '好听流行新歌、经典老歌推荐与音频分享', disabled: false },
  { category: '音乐', title: '音乐热歌榜', link: 'https://t.me/FLAC_HR', avatar_url: '', description: '全网各大音乐平台热门飙升榜与精选单曲', disabled: false },
  { category: '资源', title: 'ios破解软件', link: 'https://t.me/gekuGou', avatar_url: '', description: 'iOS 苹果免越狱应用、自签名与破解软件', disabled: false },
  { category: '资源', title: '安卓破解软件', link: 'https://t.me/inhut', avatar_url: '', description: 'Android 安卓去除广告、高级解锁版精品软件', disabled: false },
  { category: '资源', title: '资源分享社', link: 'https://t.me/qiuyuezt', avatar_url: '', description: '实用工具软件、网络资源与实用技巧分享', disabled: false },
  { category: '资源', title: '爱游戏分享社', link: 'https://t.me/aiyouxigongyifuzhu', avatar_url: '', description: '手机游戏、PC单机游戏与公益福利资源', disabled: false },
  { category: '新闻资讯', title: '风向旗快讯', link: 'https://t.me/xhqcankao', avatar_url: '', description: '突发事件全球要闻与时政动态即时播报', disabled: false },
  { category: '新闻资讯', title: '海客全球新闻', link: 'https://t.me/chiguabao789', avatar_url: '', description: '全球热点趣闻、吃瓜事件与国际动态', disabled: false },
  { category: '新闻资讯', title: '联合早报', link: 'https://t.me/zaobaosg', avatar_url: '', description: '新加坡联合早报官方新闻推送与深度观察', disabled: false },
  { category: '新闻资讯', title: '全球热点新闻', link: 'https://t.me/XWHSDNY', avatar_url: '', description: '24小时全球国际新闻、财经与科技资讯', disabled: false },
  { category: '新闻资讯', title: '华尔街日报', link: 'https://t.me/hejrb233', avatar_url: '', description: '华尔街日报中文资讯、商业与全球金融快讯', disabled: false },
  { category: '新闻资讯', title: 'BBC中文News', link: 'https://t.me/TBBCNEWS', avatar_url: '', description: 'BBC 中文广播新闻、国际热点与深度报道', disabled: false },
  { category: '新闻资讯', title: '纽约时报中文', link: 'https://t.me/nytimes_cn', avatar_url: '', description: '纽约时报中文网深度特稿、国际要闻与评论', disabled: false }
];

mongoose.connection.once('open', async () => {
  try {
    const count = await ChannelConfig.countDocuments();
    if (count === 0) {
      await ChannelConfig.create({
        channels: DEFAULT_CHANNELS,
        remarks: 'Initial Telegram Channels'
      });
      console.log(`Seeded ChannelConfig into MongoDB with ${DEFAULT_CHANNELS.length} channels`);
    }
  } catch (err) {
    console.error('Error seeding ChannelConfig:', err);
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
const webProxiesRouter = require('./routes/webProxies');
const channelsRouter = require('./routes/channels');

app.use('/', authRouter);
app.use('/', configsRouter);
app.use('/', telemetryRouter);
app.use('/', webProxiesRouter);
app.use('/', channelsRouter);

// Wildcard handler directs all other GET requests to the index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`MTProto Proxy Pool Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key protection: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
});
