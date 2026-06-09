import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, Users, Download, Upload, Clock, Info, ArrowUpDown, ChevronRight } from 'lucide-react';

export const formatBytes = (bytes) => {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatTrafficWithCost = (bytes) => {
  if (bytes === undefined || bytes === null) return '0 B ($0.00)';
  const formattedTraffic = formatBytes(bytes);
  const tb = bytes / (1024 * 1024 * 1024 * 1024);
  const cost = tb * 90;
  const formattedCost = cost === 0 ? '$0.00' : (cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`);
  return `${formattedTraffic} (${formattedCost})`;
};

export const calculateCostOnly = (bytes) => {
  if (bytes === undefined || bytes === null) return '$0.00';
  const tb = bytes / (1024 * 1024 * 1024 * 1024);
  const cost = tb * 90;
  return cost === 0 ? '$0.00' : (cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`);
};

const Analytics = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isForegroundHovered, setIsForegroundHovered] = useState(false);
  const [isBackgroundHovered, setIsBackgroundHovered] = useState(false);

  const loadData = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const res = await authFetch(`/api/telemetry/daily-stats?timeframe=${timeframe}&t=${Date.now()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, authFetch]);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Translate timeframe text on the fly
  const getTimeRangeText = () => {
    if (!data?.timeRangeText) return t('Loading...');
    let rawText = data.timeRangeText;
    const match = rawText.match(/^(.+?)\s+(\(.*\))$/);
    if (match) {
      return `${t(match[1])} ${match[2]}`;
    }
    return t(rawText);
  };

  const getDisplayName = (user) => {
    if (user.telegram_user) {
      return `${user.telegram_user.first_name || ''} ${user.telegram_user.last_name || ''}`.trim() 
        || user.telegram_user.phone_number 
        || user.user_id;
    }
    return user.user_id;
  };

  return (
    <div>
      <div className="card" style={{ padding: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <BarChart3 size={20} color="#3498db" />
              {t('Network Statistics')}
            </h2>
            <span className="badge badge-info" style={{ padding: '4px 10px', fontSize: '11px' }}>
              {getTimeRangeText()}
            </span>
          </div>
          <div>
            <select 
              id="timeFilter" 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)} 
              className="form-control"
              style={{ width: 'auto', padding: '4px 10px' }}
            >
              <option value="last_15_mins">{t('Last 15 Mins')}</option>
              <option value="last_hour">{t('Last Hour')}</option>
              <option value="today">{t('Today')}</option>
              <option value="yesterday">{t('Yesterday')}</option>
              <option value="this_week">{t('This Week')}</option>
              <option value="all_time">{t('All Time')}</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0' }}>
            <span className="spinner" style={{ borderTopColor: '#3498db', width: '28px', height: '28px' }}></span>
            <span style={{ marginTop: '12px', color: '#64748b', fontWeight: 500 }}>{t('Loading...')}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Row 1: User count period statistics */}
            <div className="grid grid-cols-4" style={{ gap: '8px' }}>
              <div 
                className="card" 
                onClick={() => navigate(`/talkpro-users?foreground=true&timeframe=${timeframe}`)}
                onMouseEnter={() => setIsForegroundHovered(true)}
                onMouseLeave={() => setIsForegroundHovered(false)}
                style={{ 
                  borderLeft: '4px solid #2ecc71', 
                  margin: 0, 
                  padding: '8px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: isForegroundHovered ? 'translateY(-2px)' : 'none',
                  boxShadow: isForegroundHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
                  backgroundColor: isForegroundHovered ? '#f8fafc' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                      {data?.dailyActiveUsersForeground ?? 0}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {t('Users with at least one foreground ping')}
                      <ChevronRight size={10} style={{ opacity: 0.7 }} />
                    </div>
                  </div>
                  <Users size={14} color="#2ecc71" />
                </div>
              </div>

              <div 
                className="card" 
                onClick={() => navigate(`/talkpro-users?foreground=false&timeframe=${timeframe}`)}
                onMouseEnter={() => setIsBackgroundHovered(true)}
                onMouseLeave={() => setIsBackgroundHovered(false)}
                style={{ 
                  borderLeft: '4px solid #3498db', 
                  margin: 0, 
                  padding: '8px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: isBackgroundHovered ? 'translateY(-2px)' : 'none',
                  boxShadow: isBackgroundHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
                  backgroundColor: isBackgroundHovered ? '#f8fafc' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                      {data?.dailyActiveUsersBackground ?? 0}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {t('Users with strictly background pings only')}
                      <ChevronRight size={10} style={{ opacity: 0.7 }} />
                    </div>
                  </div>
                  <Users size={14} color="#3498db" />
                </div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid #e74c3c', margin: 0, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                      {data?.dailyActiveUsersNotApplicable ?? 0}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('Users using legacy app clients')}
                    </div>
                  </div>
                  <Users size={14} color="#e74c3c" />
                </div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid #95a5a6', margin: 0, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                      {data?.dailyNewUsers ?? 0}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('New Users (Period)')}
                    </div>
                  </div>
                  <Users size={14} color="#95a5a6" />
                </div>
              </div>
            </div>

            {/* Row 2: Average Traffic period statistics */}
            <div className="grid grid-cols-4" style={{ gap: '8px' }}>
              {/* Avg Upload */}
              <div className="card" style={{ borderLeft: '4px solid #f39c12', margin: 0, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {formatBytes(data?.avgDailySent)}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('Avg Upload / User (Period)')}
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 500, color: '#64748b', textTransform: 'none', marginTop: '1px' }}>
                        {t('out of {count} members').replace('{count}', data?.dailyActiveUsers ?? 0)}
                      </span>
                    </div>
                  </div>
                  <Upload size={14} color="#f39c12" />
                </div>
              </div>

              {/* Avg Upload Excluding Top 10 */}
              <div className="card" style={{ borderLeft: '4px solid #9b59b6', margin: 0, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {formatBytes(data?.avgDailySentExcludingTop10)}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('Avg Upload / User (Period) (Excl. Top 10)')}
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 500, color: '#64748b', textTransform: 'none', marginTop: '1px' }}>
                        {t('out of {count} members').replace('{count}', data?.dailyActiveUsersExcludingTop10 ?? 0)}
                      </span>
                    </div>
                  </div>
                  <Upload size={14} color="#9b59b6" />
                </div>
              </div>

              {/* Avg Download */}
              <div className="card" style={{ borderLeft: '4px solid #f39c12', margin: 0, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {formatBytes(data?.avgDailyReceived)}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('Avg Download / User (Period)')}
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 500, color: '#64748b', textTransform: 'none', marginTop: '1px' }}>
                        {t('out of {count} members').replace('{count}', data?.dailyActiveUsers ?? 0)}
                      </span>
                    </div>
                  </div>
                  <Download size={14} color="#f39c12" />
                </div>
              </div>

              {/* Avg Download Excluding Top 10 */}
              <div className="card" style={{ borderLeft: '4px solid #9b59b6', margin: 0, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {formatBytes(data?.avgDailyReceivedExcludingTop10)}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('Avg Download / User (Period) (Excl. Top 10)')}
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 500, color: '#64748b', textTransform: 'none', marginTop: '1px' }}>
                        {t('out of {count} members').replace('{count}', data?.dailyActiveUsersExcludingTop10 ?? 0)}
                      </span>
                    </div>
                  </div>
                  <Download size={14} color="#9b59b6" />
                </div>
              </div>
            </div>

            {/* Section: Traffic Cost Statistics */}
            <div style={{ marginTop: '2px', marginBottom: '2px', borderTop: '1px solid #f1f5f9', paddingTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('Estimated Cost')}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  (90USD / TB)
                </span>
              </div>
            </div>

            {/* Row 3: Traffic cost period statistics */}
            <div className="grid grid-cols-2" style={{ gap: '8px' }}>
              {/* Total Combined */}
              <div className="card" style={{ borderLeft: '4px solid #f39c12', margin: 0, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {formatTrafficWithCost(data?.totalDailyCombined ?? ((data?.avgDailySent ?? 0) * (data?.dailyActiveUsers ?? 0) + (data?.avgDailyReceived ?? 0) * (data?.dailyActiveUsers ?? 0)))}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('Total Combined Traffic (Period)')}
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 500, color: '#64748b', textTransform: 'none', marginTop: '1px' }}>
                        {t('out of {count} members').replace('{count}', data?.dailyActiveUsers ?? 0)}
                      </span>
                    </div>
                  </div>
                  <ArrowUpDown size={14} color="#f39c12" />
                </div>
              </div>

              {/* Total Combined Excluding Top 10 */}
              <div className="card" style={{ borderLeft: '4px solid #9b59b6', margin: 0, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {formatTrafficWithCost(data?.totalDailyCombinedExcludingTop10 ?? ((data?.avgDailySentExcludingTop10 ?? 0) * (data?.dailyActiveUsersExcludingTop10 ?? 0) + (data?.avgDailyReceivedExcludingTop10 ?? 0) * (data?.dailyActiveUsersExcludingTop10 ?? 0)))}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
                      {t('Total Combined Traffic (Period) (Excl. Top 10)')}
                      <span style={{ display: 'block', fontSize: '9px', fontWeight: 500, color: '#64748b', textTransform: 'none', marginTop: '1px' }}>
                        {t('out of {count} members').replace('{count}', data?.dailyActiveUsersExcludingTop10 ?? 0)}
                      </span>
                    </div>
                  </div>
                  <ArrowUpDown size={14} color="#9b59b6" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Clock size={20} color="#3498db" />
            <span>{t('Top 20 Users by Traffic')}</span>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              ({t('Includes VPN/Proxy')})
            </span>
          </h2>
          <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: '12px' }}>
            {getTimeRangeText()}
          </span>
        </div>
        <p className="card-subtitle" style={{ margin: 0, marginBottom: '10px' }}>{t('Real-time rankings calculated on the fly')}</p>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>{t('User')}</th>
                <th>{t('Traffic')}</th>
                <th>{t('Cost')}</th>
                <th>{t('Usage Days')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>
                    <span className="spinner" style={{ borderTopColor: '#3498db', width: '20px', height: '20px' }}></span>
                  </td>
                </tr>
              ) : !data?.topUsers || data.topUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    {t('No user data available yet.')}
                  </td>
                </tr>
              ) : (
                data.topUsers.map((user, index) => (
                  <tr key={user.user_id || index}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: index < 3 ? '#3498db' : '#f1f5f9', color: index < 3 ? '#ffffff' : '#475569', fontSize: '11.5px', fontWeight: 'bold', marginRight: '10px', flexShrink: 0 }}>
                          {index + 1}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#1e293b', fontWeight: 600 }}>{getDisplayName(user)}</span>
                          {user.telegram_user?.username && (
                            <span style={{ color: '#3498db', fontSize: '11px', fontWeight: 500, marginTop: '2px' }}>
                              @{user.telegram_user.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2980b9' }}>
                      {formatBytes(user.total_traffic)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e74c3c' }}>
                      {calculateCostOnly(user.total_traffic)}
                    </td>
                    <td style={{ color: '#475569', fontWeight: 500 }}>
                      {user.usage_days}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
export { Analytics };
