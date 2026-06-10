import React from 'react';
import { X, Wifi, Smartphone } from 'lucide-react';
import { formatBytes } from '../../pages/Analytics';

const StatsModal = ({ loading, data, onClose, t }) => {
  if (!loading && !data) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="card" style={{ width: '90%', maxWidth: '450px', border: 'none', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{t('App Usage Statistics')}</h3>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
            <span className="spinner" style={{ borderTopColor: '#3498db', width: '24px', height: '24px' }}></span>
          </div>
        ) : (
          data && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2ecc71' }}>{data.activeToday}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>
                    {t('Active Users Today')}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>{data.totalUsers}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>
                    {t('Total Users')}
                  </div>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px', margin: '20px 0 0 0' }}>
                <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <strong style={{ color: '#475569' }}>{t('Total Data Sent (All-Time):')}</strong> 
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2980b9' }}>
                    {formatBytes(data.totalSent)}
                  </span>
                </li>
                <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <strong style={{ color: '#475569' }}>{t('Total Data Received (All-Time):')}</strong> 
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2980b9' }}>
                    {formatBytes(data.totalReceived)}
                  </span>
                </li>
                <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                  <strong style={{ color: '#475569' }}>{t('Top User (Data Volume):')}</strong> 
                  <span style={{ fontWeight: 500 }}>
                    {data.topUser.name}{' '}
                    <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                      ({formatBytes(data.topUser.bytes)})
                    </span>
                  </span>
                </li>
                <li style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                  <strong style={{ color: '#475569' }}>{t('Preferred Network Type:')}</strong> 
                  <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {data.wifiPreferred ? (
                      <>
                        <Wifi size={14} color="#3498db" />
                        <span>WiFi</span>
                      </>
                    ) : (
                      <>
                        <Smartphone size={14} color="#2ecc71" />
                        <span>{t('Mobile Data')}</span>
                      </>
                    )}
                  </span>
                </li>
              </ul>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default StatsModal;
