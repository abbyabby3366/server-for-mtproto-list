const mongoose = require('mongoose');

// Schemas & Models
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
networkTelemetrySchema.index({ active_proxy_ip: 1, last_updated: -1 });
networkTelemetrySchema.index({ 'device_info.is_in_foreground': 1, last_updated: -1 });
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

const iosVersionSchema = new mongoose.Schema({
  versionCode: Number,
  versionName: String,
  downloadUrl: String,
  changelog: String,
  forceUpdate: Boolean
});
const IosVersion = mongoose.model('IosVersion', iosVersionSchema);

const iosVersionLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  user: {
    username: String,
    role: String
  },
  previousConfig: Object,
  newConfig: Object,
  changedFields: [String]
});
const IosVersionLog = mongoose.model('IosVersionLog', iosVersionLogSchema);

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

const userThrottleSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  throttle_enabled: { type: Boolean, default: false },
  download_kbps: { type: Number, default: 250 },
  upload_kbps: { type: Number, default: 250 },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: String, default: '' },
  // Denormalized user info for admin display
  first_name: { type: String, default: '' },
  last_name: { type: String, default: '' },
  phone_number: { type: String, default: '' },
  username: { type: String, default: '' }
});
const UserThrottle = mongoose.model('UserThrottle', userThrottleSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' }
});
const User = mongoose.model('User', userSchema);

module.exports = {
  LoginTelemetry,
  NetworkTelemetry,
  NetworkDailyBucket,
  AndroidVersion,
  AndroidVersionLog,
  IosVersion,
  IosVersionLog,
  ExternalRedirectLog,
  TransitIps,
  MtProxyConfig,
  ExternalRedirectConfig,
  UserThrottle,
  User
};
