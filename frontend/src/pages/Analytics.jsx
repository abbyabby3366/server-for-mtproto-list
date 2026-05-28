import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, Users, Download, Upload, Clock, Info } from 'lucide-react';

export const formatBytes = (bytes) => {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Analytics = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <BarChart3 size={20} color="#3498db" />
              {t('Network Statistics')}
            </h2>
            <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: '12px' }}>
              {getTimeRangeText()}
            </span>
          </div>
          <div>
            <select 
              id="timeFilter" 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)} 
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
            <span className="spinner" style={{ borderTopColor: '#3498db', width: '32px', height: '32px' }}></span>
            <span style={{ marginTop: '16px', color: '#64748b', fontWeight: 500 }}>{t('Loading...')}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Row 1: User count period statistics */}
            <div className="grid grid-cols-4" style={{ gap: '12px' }}>
              <div className="card" style={{ borderLeft: '4px solid #2ecc71', margin: 0, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                      {data?.dailyActiveUsersForeground ?? 0}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                      {t('Users with at least one foreground ping')}
                    </div>
                  </div>
                  <Users size={16} color="#2ecc71" />
                </div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid #3498db', margin: 0, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                      {data?.dailyActiveUsersBackground ?? 0}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                      {t('Users with strictly background pings only')}
                    </div>
                  </div>
                  <Users size={16} color="#3498db" />
                </div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid #f39c12', margin: 0, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                      {data?.dailyActiveUsersNotApplicable ?? 0}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                      {t('Users using legacy app clients')}
                    </div>
                  </div>
                  <Users size={16} color="#f39c12" />
                </div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid #95a5a6', margin: 0, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                      {data?.dailyNewUsers ?? 0}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                      {t('New Users (Period)')}
                    </div>
                  </div>
                  <Users size={16} color="#95a5a6" />
                </div>
              </div>
            </div>

            {/* Row 2: Traffic period statistics */}
            <div className="grid grid-cols-2" style={{ gap: '12px' }}>
              <div className="card" style={{ borderLeft: '4px solid #f39c12', margin: 0, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {formatBytes(data?.avgDailySent)}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                      {t('Avg Upload / User (Period)')}
                    </div>
                  </div>
                  <Upload size={16} color="#f39c12" />
                </div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid #f39c12', margin: 0, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {formatBytes(data?.avgDailyReceived)}
                    </div>
                    <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                      {t('Avg Download / User (Period)')}
                    </div>
                  </div>
                  <Download size={16} color="#f39c12" />
                </div>
              </div>
            </div>

            {/* Row 3: All-time Total Users at the absolute bottom */}
            <div className="card" style={{ borderLeft: '4px solid #3498db', margin: 0, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
                    {data?.totalUsers ?? 0}
                  </div>
                  <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
                    {t('Total Users (All-time)')}
                  </div>
                </div>
                <Users size={16} color="#3498db" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
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
                <th>{t('Usage Days')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '24px' }}>
                    <span className="spinner" style={{ borderTopColor: '#3498db', width: '20px', height: '20px' }}></span>
                  </td>
                </tr>
              ) : !data?.topUsers || data.topUsers.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
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
