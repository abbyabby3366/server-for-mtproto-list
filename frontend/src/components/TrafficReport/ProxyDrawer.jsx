import React from 'react';
import { X } from 'lucide-react';
import { formatBytes } from '../../pages/Analytics';

const ProxyDrawer = ({
  proxyDrawerIp,
  setProxyDrawerIp,
  proxyDrawerLoading,
  proxyDrawerData,
  drawerChartRef,
  handleMouseMove,
  hoveredDrawerBucket,
  setHoveredDrawerBucket,
  drawerTooltipPos,
  t
}) => {
  if (!proxyDrawerIp) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 'min(500px, 100vw)',
      height: '100vh',
      backgroundColor: '#fff',
      boxShadow: '-10px 0 30px rgba(15, 23, 42, 0.15)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      borderLeft: '1px solid var(--border-color)',
      boxSizing: 'border-box'
    }}>
      {/* Drawer Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid var(--border-color)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#f8fafc' 
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            {t('Proxy Server Details')}
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
            IP: {proxyDrawerIp}
          </span>
        </div>
        <button 
          onClick={() => setProxyDrawerIp(null)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#64748b' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Drawer Body content */}
      <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
        {proxyDrawerLoading ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="spinner" style={{ borderTopColor: '#f97316' }}></span>
          </div>
        ) : proxyDrawerData ? (
          <div>
            {/* Micro KPI breakdown summary */}
            <div className="grid grid-cols-2" style={{ gap: '10px', marginBottom: '20px' }}>
              <div className="card" style={{ margin: 0, padding: '10px', backgroundColor: '#fafaf9' }}>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>{t('Ping Health Rate')}</span>
                <h4 style={{ margin: '4px 0 0 0', color: proxyDrawerData.summary.pingSuccessRate >= 85 ? 'var(--success-color)' : 'var(--danger-color)', fontSize: '14px', fontWeight: 700 }}>
                  {proxyDrawerData.summary.pingSuccessRate}%
                </h4>
              </div>
              <div className="card" style={{ margin: 0, padding: '10px', backgroundColor: '#fafaf9' }}>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>{t('Combined Traffic')}</span>
                <h4 style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '14px', fontFamily: 'monospace' }}>
                  {formatBytes(proxyDrawerData.summary.totalBytesSent + proxyDrawerData.summary.totalBytesReceived)}
                </h4>
              </div>
            </div>

            {/* Drawer Individual Timeline Custom SVG Chart */}
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>{t('Traffic Timeline History')}</h4>
            {proxyDrawerData.aggregateTimeline.length === 0 ? (
              <div style={{ height: '140px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', marginBottom: '20px' }}>
                {t('No timelines recorded for this proxy server.')}
              </div>
            ) : (
              <div 
                style={{ position: 'relative', cursor: 'crosshair', userSelect: 'none', marginBottom: '20px' }}
                ref={drawerChartRef}
                onMouseMove={(e) => handleMouseMove(e, true)}
              >
                <svg viewBox="0 0 460 150" width="100%" height="150" style={{ overflow: 'visible' }}>
                  <line x1="30" y1="20" x2="430" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="70" x2="430" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="30" y1="120" x2="430" y2="120" stroke="#e2e8f0" strokeWidth="1" />

                  {(() => {
                    const buckets = proxyDrawerData.aggregateTimeline;
                    const N = buckets.length;
                    const maxTraffic = Math.max(...buckets.map(b => (b.mobileSent + b.mobileReceived + b.wifiSent + b.wifiReceived)), 1024 * 512);
                    
                    const xMin = 30;
                    const xMax = 430;
                    const yMin = 20;
                    const yMax = 120;
                    const barWidth = Math.max(3, (xMax - xMin) / N - 3);
                    const getBarX = (idx) => xMin + idx * (xMax - xMin) / N + 1.5;

                    return (
                      <>
                        <text x="25" y="24" fill="#94a3b8" fontSize="8" textAnchor="end">{formatBytes(maxTraffic)}</text>
                        <text x="25" y="124" fill="#94a3b8" fontSize="8" textAnchor="end">0 B</text>

                        {buckets.map((b, idx) => {
                          const mob = b.mobileSent + b.mobileReceived;
                          const wifi = b.wifiSent + b.wifiReceived;
                          const hMob = (mob / maxTraffic) * (yMax - yMin);
                          const hWifi = (wifi / maxTraffic) * (yMax - yMin);
                          const bx = getBarX(idx);

                          return (
                            <g key={idx}>
                              {hMob > 0 && <rect x={bx} y={yMax - hMob} width={barWidth} height={hMob} fill="#ea580c" opacity="0.85" rx="0.5" />}
                              {hWifi > 0 && <rect x={bx} y={yMax - hMob - hWifi} width={barWidth} height={hWifi} fill="#3b82f6" opacity="0.85" rx="0.5" />}
                              
                              {(N <= 10 || idx % Math.ceil(N / 8) === 0) && (
                                <text x={bx + barWidth/2} y="134" fill="#94a3b8" fontSize="8.5" textAnchor="middle">{b.timeLabel}</text>
                              )}
                            </g>
                          );
                        })}

                        {hoveredDrawerBucket !== null && (
                          <line x1={getBarX(hoveredDrawerBucket) + barWidth / 2} y1="20" x2={getBarX(hoveredDrawerBucket) + barWidth / 2} y2="120" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
                        )}

                        {buckets.map((b, idx) => {
                          const sectionWidth = (xMax - xMin) / N;
                          return (
                            <rect
                              key={`dr-trig-${idx}`}
                              x={xMin + idx * sectionWidth}
                              y="10"
                              width={sectionWidth}
                              height="120"
                              fill="transparent"
                              onMouseEnter={() => setHoveredDrawerBucket(idx)}
                              onMouseLeave={() => setHoveredDrawerBucket(null)}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* Drawer Tooltip Floater */}
                {hoveredDrawerBucket !== null && proxyDrawerData.aggregateTimeline[hoveredDrawerBucket] && (
                  <div style={{
                    position: 'absolute',
                    left: `${drawerTooltipPos.x}px`,
                    top: `${drawerTooltipPos.y}px`,
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    color: '#fff',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    pointerEvents: 'none',
                    zIndex: 100,
                    minWidth: '130px',
                    border: '1px solid #475569'
                  }}>
                    <div style={{ fontWeight: 600, color: '#f97316', marginBottom: '4px' }}>
                      ⏱️ {proxyDrawerData.aggregateTimeline[hoveredDrawerBucket].timeLabel}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>{t('Mob')}:</span>
                        <span style={{ color: '#ea580c' }}>
                          {formatBytes(proxyDrawerData.aggregateTimeline[hoveredDrawerBucket].mobileSent + proxyDrawerData.aggregateTimeline[hoveredDrawerBucket].mobileReceived)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8' }}>{t('WiFi')}:</span>
                        <span style={{ color: '#3b82f6' }}>
                          {formatBytes(proxyDrawerData.aggregateTimeline[hoveredDrawerBucket].wifiSent + proxyDrawerData.aggregateTimeline[hoveredDrawerBucket].wifiReceived)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Users connected on this proxy */}
            <h4 style={{ margin: '14px 0 8px 0', fontSize: '13px' }}>{t('Active Users on proxy:')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {proxyDrawerData.users.map(u => (
                <div 
                  key={u.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '8px 12px', 
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px',
                    fontSize: '12px' 
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{u.name || 'User'}</span>
                    {u.username && <span style={{ fontSize: '10px', color: '#64748b' }}>@{u.username}</span>}
                  </div>
                  <span style={{ fontWeight: 600, color: '#475569' }}>
                    {formatBytes(u.totalSent + u.totalReceived || u.bytesSent + u.bytesReceived || 0)}
                  </span>
                </div>
              ))}
              {proxyDrawerData.users.length === 0 && (
                <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                  {t('No active users routed through this IP for the period.')}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
            {t('Error loading data.')}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProxyDrawer;
