import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Cpu, RefreshCw, Layers } from 'lucide-react';

const XrayStats = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [timeRangeText, setTimeRangeText] = useState('');
  const [xrayData, setXrayData] = useState([]);
  const [pingFilter, setPingFilter] = useState('true');
  const [timeFilter, setTimeFilter] = useState('last_15_mins');

  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadData = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setLoading(true);
    } else {
      setIndicatorLoading(true);
    }

    try {
      const res = await authFetch(
        `/api/telemetry/xray-stats?timeframe=${timeFilter}&latestPing=${pingFilter}&t=${Date.now()}`
      );
      if (res.ok) {
        const data = await res.json();
        
        let rawText = data.timeRangeText || '';
        if (rawText) {
          const match = rawText.match(/^(.+?)\s+(\(.*\))$/);
          if (match) {
            rawText = `${t(match[1])} ${match[2]}`;
          } else {
            rawText = t(rawText);
          }
        }
        setTimeRangeText(rawText);
        setXrayData(data.results || []);
      }
    } catch (err) {
      console.error('Error fetching xray stats:', err);
    } finally {
      setLoading(false);
      setIndicatorLoading(false);
    }
  }, [timeFilter, pingFilter, authFetch, t]);

  useEffect(() => {
    loadData(false);
  }, [timeFilter, pingFilter]);

  // Periodic polling every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <Cpu size={20} color="#3498db" />
              {t('Active Xray Proxy Servers')}
            </h2>
            
            {timeRangeText && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {timeRangeText}
              </span>
            )}

            {indicatorLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="spinner" style={{ borderTopColor: '#64748b', width: '12px', height: '12px' }}></span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{t('Updating...')}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select 
              value={pingFilter} 
              onChange={(e) => setPingFilter(e.target.value)} 
              className="form-control" 
              style={{ width: 'auto', padding: '6px 12px', margin: 0 }}
            >
              <option value="true">{t('Latest Ping')}</option>
              <option value="false">{t('All Pings')}</option>
            </select>
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)} 
              className="form-control" 
              style={{ width: 'auto', padding: '6px 12px', margin: 0 }}
            >
              <option value="last_15_mins">{t('Last 15 Mins')}</option>
              <option value="last_hour">{t('Last Hour')}</option>
              <option value="today">{t('Today')}</option>
              <option value="yesterday">{t('Yesterday')}</option>
              <option value="this_week">{t('This Week')}</option>
              <option value="all_time">{t('All Time')}</option>
            </select>
            <button 
              className="btn btn-primary" 
              style={{ padding: '8px 12px' }} 
              onClick={() => loadData(false)}
              disabled={loading || indicatorLoading}
            >
              <RefreshCw size={14} className={loading || indicatorLoading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>{t('Xray IP')}</th>
                <th>{t('Active Users')}</th>
                <th>{t('Total Sent (All-Time)')}</th>
                <th>{t('Total Received (All-Time)')}</th>
                <th>{t('Connected Users')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <span className="spinner" style={{ borderTopColor: '#3498db', width: '24px', height: '24px' }}></span>
                  </td>
                </tr>
              ) : xrayData.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    {t('No Xray proxy data available yet.')}
                  </td>
                </tr>
              ) : (
                xrayData.map((proxy, idx) => (
                  <tr key={proxy.ip || idx}>
                    <td style={{ fontWeight: 600, color: '#2980b9' }}>{proxy.ip}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '12px' }}>
                        {proxy.userCount}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{formatBytes(proxy.totalSent)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{formatBytes(proxy.totalReceived)}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                        {proxy.users && proxy.users.length > 0 ? (
                          proxy.users.map((u) => (
                            <span 
                              key={u.id}
                              onClick={() => navigate(`/network?highlightUser=${u.id}`)}
                              style={{ 
                                cursor: 'pointer', 
                                backgroundColor: '#f1f5f9', 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                fontSize: '12px',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e2e8f0';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f1f5f9';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                              }}
                            >
                              {u.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                        )}
                      </div>
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

export default XrayStats;
