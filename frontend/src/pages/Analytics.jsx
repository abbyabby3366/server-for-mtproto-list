import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3 } from 'lucide-react';

// Import modular subcomponents
import StatsGrid from '../components/Analytics/StatsGrid';
import CostGrid from '../components/Analytics/CostGrid';
import TopUsersTable from '../components/Analytics/TopUsersTable';

import { formatBytes } from '../utils/format';
export { formatBytes };

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
            <StatsGrid 
              data={data}
              timeframe={timeframe}
              t={t}
            />

            <CostGrid 
              data={data}
              t={t}
            />
          </div>
        )}
      </div>

      <TopUsersTable 
        data={data}
        loading={loading}
        getTimeRangeText={getTimeRangeText}
        t={t}
      />
    </div>
  );
};

export default Analytics;
