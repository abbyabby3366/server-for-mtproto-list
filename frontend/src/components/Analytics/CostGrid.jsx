import React from 'react';
import { Upload, Download, ArrowUpDown } from 'lucide-react';
import { formatBytes } from '../../utils/format';

const formatTrafficWithCost = (bytes) => {
  if (bytes === undefined || bytes === null) return '0 B ($0.00)';
  const formattedTraffic = formatBytes(bytes);
  const tb = bytes / (1024 * 1024 * 1024 * 1024);
  const cost = tb * 90;
  const formattedCost = cost === 0 ? '$0.00' : (cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`);
  return `${formattedTraffic} (${formattedCost})`;
};

const CostGrid = ({ data, t }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

      <div className="grid grid-cols-3" style={{ gap: '8px' }}>
        {/* Row 1 - Average Upload */}
        <div className="card" style={{ borderLeft: '4px solid #f39c12', margin: 0, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                {formatTrafficWithCost(data?.avgDailySent)}
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

        {/* Row 1 - Average Download */}
        <div className="card" style={{ borderLeft: '4px solid #f39c12', margin: 0, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                {formatTrafficWithCost(data?.avgDailyReceived)}
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

        {/* Row 1 - Total Combined */}
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

        {/* Row 2 - Average Upload Excluding Top 10 */}
        <div className="card" style={{ borderLeft: '4px solid #9b59b6', margin: 0, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                {formatTrafficWithCost(data?.avgDailySentExcludingTop10)}
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

        {/* Row 2 - Average Download Excluding Top 10 */}
        <div className="card" style={{ borderLeft: '4px solid #9b59b6', margin: 0, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2980b9', marginBottom: '2px', fontFamily: 'monospace' }}>
                {formatTrafficWithCost(data?.avgDailyReceivedExcludingTop10)}
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

        {/* Row 2 - Total Combined Excluding Top 10 */}
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
  );
};

export default CostGrid;
