import React from 'react';
import { Info } from 'lucide-react';
import { formatBytes } from '../../pages/Analytics';

const NetworkUsersTable = ({ usersData, loading, searchParams, highlightedRef, getPingDisplay, handleOpenDetails, t }) => {
  return (
    <div className="table-responsive">
      <table>
        <thead>
          <tr>
            <th>{t('Network IP')}</th>
            <th>{t('User')}</th>
            <th>{t('APK Version')}</th>
            <th>{t('TG Ping')}</th>
            <th>{t('Last Updated')}</th>
            <th>{t('Total Sent / Received')}</th>
            <th>{t('Mobile Data')}</th>
            <th>{t('WiFi Data')}</th>
            <th>{t('Details')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '40px 0' }}>
                <span className="spinner" style={{ borderTopColor: '#3498db', width: '24px', height: '24px' }}></span>
              </td>
            </tr>
          ) : usersData.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                {t('No network data found.')}
              </td>
            </tr>
          ) : (
            usersData.map((row, index) => {
              const pingInfo = getPingDisplay(row);
              const isHighlighted = searchParams.get('highlightUser') === String(row.user_id);
              return (
                <tr 
                  key={row.user_id || index}
                  ref={isHighlighted ? highlightedRef : null}
                  style={{
                    backgroundColor: pingInfo.isFailed ? '#fef2f2' : isHighlighted ? '#fef9c3' : 'transparent',
                    transition: 'background-color 2s ease'
                  }}
                >
                  <td>
                    <strong style={{ color: '#2980b9' }}>{row.active_proxy_ip || 'Unknown'}</strong><br />
                    <span style={{ color: '#64748b', fontSize: '11px' }}>(ori: {row.original_ip || 'Unknown'})</span>
                  </td>
                  <td>
                    <strong style={{ color: '#1e293b' }}>{row.first_name || 'Unknown'} {row.last_name || ''}</strong><br />
                    <span style={{ color: '#64748b', fontSize: '11.5px' }}>{row.phone_number || row.user_id}</span>
                    {row.username && (
                      <>
                        <br />
                        <span style={{ color: '#3498db', fontSize: '11px', fontWeight: 500 }}>@{row.username}</span>
                      </>
                    )}
                  </td>
                  <td>{row.apk_version || 'Unknown'}</td>
                  <td style={{ fontWeight: 'bold', color: pingInfo.color }}>{pingInfo.text}</td>
                  <td style={{ fontSize: '12.5px', color: '#475569' }}>
                    {new Date(row.last_updated).toLocaleString()}
                  </td>
                  <td className="bytes" style={{ fontWeight: 500, fontSize: '11.5px' }}>
                    <span style={{ color: '#2980b9' }}>S:</span> {formatBytes(row.network_usage?.total_bytes_sent)}<br />
                    <span style={{ color: '#2ecc71' }}>R:</span> {formatBytes(row.network_usage?.total_bytes_received)}
                  </td>
                  <td className="bytes" style={{ fontSize: '11.5px' }}>
                    <span style={{ color: '#64748b' }}>S:</span> {formatBytes(row.network_usage?.mobile_bytes_sent)}<br />
                    <span style={{ color: '#64748b' }}>R:</span> {formatBytes(row.network_usage?.mobile_bytes_received)}
                  </td>
                  <td className="bytes" style={{ fontSize: '11.5px' }}>
                    <span style={{ color: '#64748b' }}>S:</span> {formatBytes(row.network_usage?.wifi_bytes_sent)}<br />
                    <span style={{ color: '#64748b' }}>R:</span> {formatBytes(row.network_usage?.wifi_bytes_received)}
                  </td>
                  <td>
                    <button 
                      className="btn" 
                      style={{ padding: '6px 10px', background: '#3498db', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleOpenDetails(row)}
                    >
                      <Info size={12} />
                      <span>{t('View Details')}</span>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default NetworkUsersTable;
