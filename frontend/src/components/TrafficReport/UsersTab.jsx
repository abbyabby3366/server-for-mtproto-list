import React from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { formatBytes } from '../../pages/Analytics';

const UsersTab = ({
  reportData,
  exportSearch,
  setExportSearch,
  openUserDrawer,
  t
}) => {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h4 style={{ margin: 0 }}>{t('User Data Analysis Grid')}</h4>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder={t('Search logs...')}
            value={exportSearch}
            onChange={(e) => setExportSearch(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '32px', width: '220px', margin: 0 }}
          />
        </div>
      </div>

      {/* Heavy Usage Info Alert */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '10px 14px', 
        backgroundColor: '#fef2f2', 
        border: '1px solid #fee2e2', 
        borderRadius: '8px', 
        color: '#b91c1c', 
        fontSize: '12px', 
        marginBottom: '16px',
        fontWeight: 500
      }}>
        <AlertTriangle size={15} color="#dc2626" />
        <span>
          <strong>{t('Usage Alert')}:</strong> {t('Red background flags represent active account connections routing >= 5GB total data volume.')}
        </span>
      </div>

      {/* Users Table Grid */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>{t('User')}</th>
              <th>{t('Total Sent')}</th>
              <th>{t('Total Received')}</th>
              <th>{t('Total Consumption')}</th>
              <th>{t('Network split (Mob / WiFi)')}</th>
              <th>{t('Ping Success Rate')}</th>
              <th>{t('Throttle Status')}</th>
              <th>{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const filtered = reportData.users.filter(u => {
                if (!exportSearch) return true;
                const matchStr = `${u.first_name} ${u.last_name} ${u.username} ${u.phone_number} ${u.user_id}`.toLowerCase();
                return matchStr.includes(exportSearch.toLowerCase());
              });

              if (filtered.length === 0) {
                return (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      {t('No users matched search parameters.')}
                    </td>
                  </tr>
                );
              }

              return filtered.map((u) => {
                const totalBytes = u.bytesSent + u.bytesReceived;
                const hasAlert = totalBytes >= 5 * 1024 * 1024 * 1024;
                const totalNet = (u.mobileSent + u.mobileReceived + u.wifiSent + u.wifiReceived) || 1;
                const mobPerc = Math.round(((u.mobileSent + u.mobileReceived) / totalNet) * 100);
                const wifiPerc = 100 - mobPerc;
                const successRate = u.totalPings ? ((u.totalPings - u.failedPings) / u.totalPings * 100).toFixed(1) : '100.0';

                return (
                  <tr key={u.user_id} style={{ backgroundColor: hasAlert ? '#fff5f5' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>
                          {u.first_name || 'User'} {u.last_name || ''}
                        </span>
                        {u.username && (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>@{u.username}</span>
                        )}
                        {u.phone_number && (
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>+{u.phone_number}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{formatBytes(u.bytesSent)}</td>
                    <td style={{ fontFamily: 'monospace' }}>{formatBytes(u.bytesReceived)}</td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {formatBytes(totalBytes)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '120px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', display: 'flex', overflow: 'hidden' }}>
                          <div style={{ width: `${mobPerc}%`, height: '100%', backgroundColor: '#ea580c' }}></div>
                          <div style={{ width: `${wifiPerc}%`, height: '100%', backgroundColor: '#3b82f6' }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {mobPerc}% / {wifiPerc}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${parseFloat(successRate) >= 85 ? 'badge-success' : 'badge-danger'}`}>
                        {successRate}%
                      </span>
                    </td>
                    <td>
                      {u.throttle_enabled ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {u.throttle_method === 'auto' ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '3px 9px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                              background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa',
                              width: 'fit-content'
                            }}>
                              🐢 {t('Auto-Limited')}
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '3px 9px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                              background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe',
                              width: 'fit-content'
                            }}>
                              🔧 {t('Manual')}
                            </span>
                          )}
                          <span style={{ fontSize: '10px', color: '#94a3b8', paddingLeft: '2px' }}>
                            ↓{u.throttle_download_kbps} ↑{u.throttle_upload_kbps} KB/s
                          </span>
                        </div>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 9px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                          background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                          width: 'fit-content'
                        }}>
                          ⚡ {t('Full Speed')}
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary"
                        style={{ padding: '4px 8px', fontSize: '11.5px', background: 'none', border: '1px solid #e2e8f0', color: '#334155' }}
                        onClick={() => openUserDrawer(u.user_id)}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {t('View Details')}
                      </button>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTab;
