import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatBytes } from '../../pages/Analytics';

const XrayTab = ({
  reportData,
  openProxyDrawer,
  t
}) => {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0 }}>{t('Xray Server Health Summary')}</h4>
      </div>

      {/* Server health check alert */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '10px 14px', 
        backgroundColor: '#fff7ed', 
        border: '1px solid #fed7aa', 
        borderRadius: '8px', 
        color: '#c2410c', 
        fontSize: '12px', 
        marginBottom: '16px',
        fontWeight: 500
      }}>
        <AlertTriangle size={15} color="#ea580c" />
        <span>
          <strong>{t('Usage Alert')}:</strong> {t('Proxy active IPs registering a ping failure rate exceeding 15% are flagged with orange warnings for connection instability.')}
        </span>
      </div>

      {/* Proxies Table */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>{t('Proxy IP')}</th>
              <th>{t('Total Bytes Sent')}</th>
              <th>{t('Total Bytes Received')}</th>
              <th>{t('Combined Traffic')}</th>
              <th>{t('Success Rate / Total pings')}</th>
              <th>{t('Status Badge')}</th>
              <th>{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {reportData.xrayIps.map((x) => {
              const totalBytes = x.bytesSent + x.bytesReceived;
              const failureRate = x.totalPings ? (x.failedPings / x.totalPings * 100) : 0;
              const successRate = 100 - failureRate;
              const hasAlert = failureRate > 15;

              return (
                <tr key={x.active_proxy_ip} style={{ backgroundColor: hasAlert ? '#fffbf5' : 'transparent' }}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', color: '#1e3a8a' }}>
                    {x.active_proxy_ip}
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{formatBytes(x.bytesSent)}</td>
                  <td style={{ fontFamily: 'monospace' }}>{formatBytes(x.bytesReceived)}</td>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatBytes(totalBytes)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{successRate.toFixed(1)}%</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {t('Failed')} {x.failedPings} {t('of')} {x.totalPings} {t('pings')}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${successRate >= 95 ? 'badge-success' : successRate >= 85 ? 'badge-warning' : 'badge-danger'}`}>
                      {successRate >= 95 ? t('Excellent') : successRate >= 85 ? t('Warning') : t('Poor Health')}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-primary"
                      style={{ padding: '4px 8px', fontSize: '11.5px', background: 'none', border: '1px solid #e2e8f0', color: '#334155' }}
                      onClick={() => openProxyDrawer(x.active_proxy_ip)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {t('View Details')}
                    </button>
                  </td>
                </tr>
              );
            })}
            {reportData.xrayIps.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  {t('No Xray proxy metrics registered.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default XrayTab;
