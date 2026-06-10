import React from 'react';
import { Upload, Download } from 'lucide-react';
import { formatBytes } from '../../utils/format';

const TrafficGrid = ({ data, t }) => {
  return (
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
  );
};

export default TrafficGrid;
