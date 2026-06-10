import React from 'react';
import { Copy, Download } from 'lucide-react';
import { formatBytes } from '../../pages/Analytics';

const ExporterTab = ({
  reportData,
  selectedProxy,
  handleCopyCsv,
  handleDownloadCsv,
  t
}) => {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h4 style={{ margin: 0 }}>{t('Custom Report Spreadsheet Exporter')}</h4>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            {t('Export formatted telemetry log matrices in CSV or Clipboard layout formats.')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Copy CSV Button */}
          <button 
            className="btn btn-success" 
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155' }}
            onClick={() => {
              const headers = ['User ID', 'Name', 'Phone', 'IP', 'Bytes Sent', 'Bytes Received', 'Total Bytes', 'Mobile Bytes', 'WiFi Bytes', 'Pings Count', 'Failed Pings', 'Success Rate %'];
              const rows = reportData.users.map(u => {
                const totalBytes = u.bytesSent + u.bytesReceived;
                const successRate = u.totalPings ? ((u.totalPings - u.failedPings) / u.totalPings * 100).toFixed(2) : '100.00';
                return [
                  u.user_id,
                  u.first_name || '',
                  u.phone_number || '',
                  selectedProxy || 'All',
                  u.bytesSent,
                  u.bytesReceived,
                  totalBytes,
                  u.mobileSent + u.mobileReceived,
                  u.wifiSent + u.wifiReceived,
                  u.totalPings,
                  u.failedPings,
                  successRate
                ];
              });
              handleCopyCsv(headers, rows);
            }}
          >
            <Copy size={14} />
            {t('Copy CSV')}
          </button>

          {/* Download CSV Button */}
          <button 
            className="btn btn-primary"
            style={{ background: '#ea580c', border: 'none', color: '#fff' }}
            onClick={() => {
              const headers = ['User ID', 'Name', 'Phone', 'IP', 'Bytes Sent', 'Bytes Received', 'Total Bytes', 'Mobile Bytes', 'WiFi Bytes', 'Pings Count', 'Failed Pings', 'Success Rate %'];
              const rows = reportData.users.map(u => {
                const totalBytes = u.bytesSent + u.bytesReceived;
                const successRate = u.totalPings ? ((u.totalPings - u.failedPings) / u.totalPings * 100).toFixed(2) : '100.00';
                return [
                  u.user_id,
                  u.first_name || '',
                  u.phone_number || '',
                  selectedProxy || 'All',
                  u.bytesSent,
                  u.bytesReceived,
                  totalBytes,
                  u.mobileSent + u.mobileReceived,
                  u.wifiSent + u.wifiReceived,
                  u.totalPings,
                  u.failedPings,
                  successRate
                ];
              });
              handleDownloadCsv(headers, rows, 'grapefruittalk_traffic_report');
            }}
          >
            <Download size={14} />
            {t('Download CSV')}
          </button>
        </div>
      </div>

      {/* Grid Logs Preview */}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>{t('User ID')}</th>
              <th>{t('Display Name')}</th>
              <th>{t('Total Volume')}</th>
              <th>{t('Mobile Share')}</th>
              <th>{t('WiFi Share')}</th>
              <th>{t('Total Pings')}</th>
              <th>{t('Failed Pings')}</th>
              <th>{t('Ping Success Rate')}</th>
            </tr>
          </thead>
          <tbody>
            {reportData.users.map((u) => {
              const totalBytes = u.bytesSent + u.bytesReceived;
              const mobTotal = u.mobileSent + u.mobileReceived;
              const wifiTotal = u.wifiSent + u.wifiReceived;
              const successRate = u.totalPings ? ((u.totalPings - u.failedPings) / u.totalPings * 100).toFixed(2) : '100.00';

              return (
                <tr key={u.user_id}>
                  <td style={{ fontFamily: 'monospace' }}>{u.user_id}</td>
                  <td style={{ fontWeight: 600 }}>{u.first_name || 'User'}</td>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatBytes(totalBytes)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#ea580c' }}>{formatBytes(mobTotal)}</td>
                  <td style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{formatBytes(wifiTotal)}</td>
                  <td style={{ fontFamily: 'monospace' }}>{u.totalPings}</td>
                  <td style={{ fontFamily: 'monospace', color: u.failedPings > 0 ? 'var(--danger-color)' : 'inherit' }}>{u.failedPings}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: parseFloat(successRate) >= 85 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {successRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExporterTab;
