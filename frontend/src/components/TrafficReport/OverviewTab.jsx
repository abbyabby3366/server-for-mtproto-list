import React from 'react';
import { Smartphone, Wifi, AlertTriangle, Users as UsersIcon, Cpu, ChevronRight } from 'lucide-react';
import { formatBytes } from '../../pages/Analytics';

const OverviewTab = ({
  reportData,
  chartRef,
  handleMouseMove,
  hoveredBucket,
  tooltipPos,
  openUserDrawer,
  openProxyDrawer,
  t
}) => {
  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-4" style={{ gap: '14px', marginBottom: '20px' }}>
        {/* Card 1: Total Bytes */}
        <div className="card" style={{ borderLeft: '4px solid #f97316', margin: 0, padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {t('All Traffic')}
          </span>
          <h3 style={{ margin: '8px 0 2px 0', fontSize: '20px', fontWeight: 700 }}>
            {formatBytes(reportData.summary.totalBytesSent + reportData.summary.totalBytesReceived)}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            <span>⬆️ {formatBytes(reportData.summary.totalBytesSent)}</span>
            <span>⬇️ {formatBytes(reportData.summary.totalBytesReceived)}</span>
          </div>
        </div>

        {/* Card 2: Mobile Usage */}
        <div className="card" style={{ borderLeft: '4px solid #ea580c', margin: 0, padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Smartphone size={12} color="#ea580c" />
            {t('Mobile Data')}
          </span>
          <h3 style={{ margin: '8px 0 2px 0', fontSize: '20px', fontWeight: 700, color: '#ea580c' }}>
            {formatBytes(reportData.summary.totalMobileSent + reportData.summary.totalMobileReceived)}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            <span>⬆️ {formatBytes(reportData.summary.totalMobileSent)}</span>
            <span>⬇️ {formatBytes(reportData.summary.totalMobileReceived)}</span>
          </div>
        </div>

        {/* Card 3: WiFi Usage */}
        <div className="card" style={{ borderLeft: '4px solid #3b82f6', margin: 0, padding: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Wifi size={12} color="#3b82f6" />
            {t('WiFi Data')}
          </span>
          <h3 style={{ margin: '8px 0 2px 0', fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>
            {formatBytes(reportData.summary.totalWifiSent + reportData.summary.totalWifiReceived)}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            <span>⬆️ {formatBytes(reportData.summary.totalWifiSent)}</span>
            <span>⬇️ {formatBytes(reportData.summary.totalWifiReceived)}</span>
          </div>
        </div>

        {/* Card 4: Health Rate */}
        <div className="card" style={{ 
          borderLeft: `4px solid ${reportData.summary.pingSuccessRate >= 85 ? 'var(--success-color)' : 'var(--danger-color)'}`, 
          margin: 0, 
          padding: '16px' 
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {t('Ping Success Rate')}
          </span>
          <h3 style={{ 
            margin: '8px 0 2px 0', 
            fontSize: '20px', 
            fontWeight: 700, 
            color: reportData.summary.pingSuccessRate >= 85 ? 'var(--success-color)' : 'var(--danger-color)' 
          }}>
            {reportData.summary.pingSuccessRate}%
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            <span>{t('Total')}: {reportData.summary.totalPings} {t('pings')}</span>
            <span style={{ color: reportData.summary.failedPings > 0 ? 'var(--danger-color)' : '#64748b' }}>
              {t('Failed')}: {reportData.summary.failedPings}
            </span>
          </div>
        </div>
      </div>

      {/* Stacked Chart Card & Details Box */}
      <div className="card" style={{ padding: '20px', position: 'relative', overflow: 'visible', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{t('Timeline Charts')}</h4>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {t('Mobile vs WiFi')} & {t('Ping Success Rate')}
            </span>
          </div>

          {/* Micro Legend Indicators */}
          <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: '#64748b' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#ea580c', borderRadius: '2px' }}></span>
              {t('Mobile Data')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></span>
              {t('WiFi Data')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '2px', backgroundColor: '#10b981' }}></span>
              {t('Ping Success Rate')}
            </span>
          </div>
        </div>

        {/* React CUSTOM INLINE SVG CHART */}
        {reportData.aggregateTimeline?.length === 0 ? (
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            {t('No timeline telemetry logged for this period.')}
          </div>
        ) : (
          <div 
            style={{ position: 'relative', cursor: 'crosshair', userSelect: 'none' }}
            ref={chartRef}
            onMouseMove={(e) => handleMouseMove(e, false)}
          >
            {/* SVG Element */}
            <svg viewBox="0 0 700 250" width="100%" height="250" style={{ overflow: 'visible' }}>
              {/* Grid Lines */}
              <line x1="40" y1="30" x2="660" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="80" x2="660" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="130" x2="660" y2="130" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="180" x2="660" y2="180" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="210" x2="660" y2="210" stroke="#e2e8f0" strokeWidth="1" />

              {(() => {
                const buckets = reportData.aggregateTimeline;
                const N = buckets.length;
                
                const maxTraffic = Math.max(
                  ...buckets.map(b => (b.mobileSent + b.mobileReceived + b.wifiSent + b.wifiReceived)),
                  1024 * 1024 // min 1MB for empty state
                );
                
                const padding = 40;
                const xMin = padding;
                const xMax = 700 - padding;
                const yMin = 30;
                const yMax = 210;

                const getBarX = (idx) => xMin + idx * (xMax - xMin) / N + 2;
                const barWidth = Math.max(4, (xMax - xMin) / N - 4);

                // Success Rate overlay coordinates collection
                const linePoints = buckets.map((b, idx) => {
                  const rate = b.totalPings ? ((b.totalPings - b.failedPings) / b.totalPings * 100) : 100;
                  const bx = getBarX(idx) + barWidth / 2;
                  const by = yMax - (rate / 100) * (yMax - yMin);
                  return { x: bx, y: by };
                });

                const linePath = linePoints.length > 1 
                  ? `M ${linePoints.map(p => `${p.x} ${p.y}`).join(' L ')}` 
                  : '';

                return (
                  <>
                    {/* Y-Axis Traffic labels (Left) */}
                    <text x="35" y="34" fill="#94a3b8" fontSize="9" textAnchor="end">{formatBytes(maxTraffic)}</text>
                    <text x="35" y="124" fill="#94a3b8" fontSize="9" textAnchor="end">{formatBytes(maxTraffic / 2)}</text>
                    <text x="35" y="214" fill="#94a3b8" fontSize="9" textAnchor="end">0 B</text>

                    {/* Y-Axis Success Rate label (Right) */}
                    <text x="665" y="34" fill="#10b981" fontSize="9" textAnchor="start">100%</text>
                    <text x="665" y="124" fill="#10b981" fontSize="9" textAnchor="start">50%</text>
                    <text x="665" y="214" fill="#10b981" fontSize="9" textAnchor="start">0%</text>

                    {/* Render Bars */}
                    {buckets.map((b, idx) => {
                      const mob = b.mobileSent + b.mobileReceived;
                      const wifi = b.wifiSent + b.wifiReceived;
                      const hMob = (mob / maxTraffic) * (yMax - yMin);
                      const hWifi = (wifi / maxTraffic) * (yMax - yMin);
                      const bx = getBarX(idx);

                      return (
                        <g key={idx}>
                          {/* Mobile Stack Rect */}
                          {hMob > 0 && (
                            <rect 
                              x={bx} 
                              y={yMax - hMob} 
                              width={barWidth} 
                              height={hMob} 
                              fill="#ea580c" 
                              rx="1" 
                              opacity="0.85"
                            />
                          )}
                          {/* WiFi Stack Rect */}
                          {hWifi > 0 && (
                            <rect 
                              x={bx} 
                              y={yMax - hMob - hWifi} 
                              width={barWidth} 
                              height={hWifi} 
                              fill="#3b82f6" 
                              rx="1" 
                              opacity="0.85"
                            />
                          )}
                          
                          {/* X-Axis labels for spaced items */}
                          {(N <= 15 || idx % Math.ceil(N / 12) === 0) && (
                            <text 
                              x={bx + barWidth / 2} 
                              y="228" 
                              fill="#94a3b8" 
                              fontSize="9.5" 
                              textAnchor="middle"
                            >
                              {b.timeLabel}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Render Dotted Success Line overlay path */}
                    {linePath && (
                      <path 
                        d={linePath} 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="2.5" 
                        strokeDasharray="1 1"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Hover overlay markers */}
                    {hoveredBucket !== null && (
                      <line 
                        x1={getBarX(hoveredBucket) + barWidth / 2} 
                        y1="30" 
                        x2={getBarX(hoveredBucket) + barWidth / 2} 
                        y2="210" 
                        stroke="#94a3b8" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                      />
                    )}

                    {/* Active Point Highlight */}
                    {hoveredBucket !== null && linePoints[hoveredBucket] && (
                      <circle 
                        cx={linePoints[hoveredBucket].x} 
                        cy={linePoints[hoveredBucket].y} 
                        r="5" 
                        fill="#10b981" 
                        stroke="#fff" 
                        strokeWidth="1.5"
                        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                      />
                    )}

                    {/* Full Height Trigger Areas */}
                    {buckets.map((b, idx) => {
                      const sectionWidth = (xMax - xMin) / N;
                      const triggerX = xMin + idx * sectionWidth;
                      return (
                        <rect
                          key={`trig-${idx}`}
                          x={triggerX}
                          y="20"
                          width={sectionWidth}
                          height="200"
                          fill="transparent"
                          onMouseEnter={() => setHoveredBucket(idx)}
                          onMouseLeave={() => setHoveredBucket(null)}
                        />
                      );
                    })}
                  </>
                );
              })()}
            </svg>

            {/* Floating HTML Custom Tooltip */}
            {hoveredBucket !== null && reportData.aggregateTimeline[hoveredBucket] && (
              <div style={{
                position: 'absolute',
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                color: '#fff',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
                pointerEvents: 'none',
                zIndex: 10,
                minWidth: '180px',
                border: '1px solid #475569'
              }}>
                <div style={{ borderBottom: '1px solid #334155', paddingBottom: '6px', marginBottom: '6px', fontWeight: 600, color: '#f97316' }}>
                  ⏱️ {reportData.aggregateTimeline[hoveredBucket].timeLabel}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>{t('Mobile Data')}:</span>
                    <span style={{ fontWeight: 500, color: '#ea580c' }}>
                      {formatBytes(reportData.aggregateTimeline[hoveredBucket].mobileSent + reportData.aggregateTimeline[hoveredBucket].mobileReceived)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>{t('WiFi Data')}:</span>
                    <span style={{ fontWeight: 500, color: '#3b82f6' }}>
                      {formatBytes(reportData.aggregateTimeline[hoveredBucket].wifiSent + reportData.aggregateTimeline[hoveredBucket].wifiReceived)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '4px', marginTop: '2px' }}>
                    <span style={{ color: '#94a3b8' }}>{t('Total Traffic')}:</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatBytes(reportData.aggregateTimeline[hoveredBucket].bytesSent + reportData.aggregateTimeline[hoveredBucket].bytesReceived)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>{t('Ping Success Rate')}:</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>
                      {reportData.aggregateTimeline[hoveredBucket].totalPings 
                        ? ((reportData.aggregateTimeline[hoveredBucket].totalPings - reportData.aggregateTimeline[hoveredBucket].failedPings) / reportData.aggregateTimeline[hoveredBucket].totalPings * 100).toFixed(1)
                        : '100'}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparative Ranking grids (Side-by-side Top 5s) */}
      <div className="grid grid-cols-2" style={{ gap: '16px' }}>
        {/* Ranking block 1: Top Users */}
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UsersIcon size={16} color="#f97316" />
            {t('Top Users by Data Consumption')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reportData.users.slice(0, 5).map((u, i) => {
              const totalBytes = u.bytesSent + u.bytesReceived;
              const hasAlert = totalBytes >= 5 * 1024 * 1024 * 1024;
              return (
                <div 
                  key={u.user_id} 
                  onClick={() => openUserDrawer(u.user_id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '8px 12px', 
                    backgroundColor: hasAlert ? '#fef2f2' : '#f8fafc',
                    border: `1px solid ${hasAlert ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#f97316', width: '16px' }}>#{i+1}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>
                        {u.first_name || 'User'}
                      </span>
                      {u.username && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>@{u.username}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'monospace' }}>
                      {formatBytes(totalBytes)}
                    </span>
                    {hasAlert && <AlertTriangle size={14} color="#dc2626" title="Heavy usage warning" />}
                    <ChevronRight size={14} color="#94a3b8" />
                  </div>
                </div>
              );
            })}
            {reportData.users.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                {t('No user traffic data recorded.')}
              </div>
            )}
          </div>
        </div>

        {/* Ranking block 2: Top Xray IPs */}
        <div className="card" style={{ margin: 0, padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="#3b82f6" />
            {t('Top Xray Proxy Servers')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reportData.xrayIps.slice(0, 5).map((x, i) => {
              const totalBytes = x.bytesSent + x.bytesReceived;
              const failureRate = x.totalPings ? (x.failedPings / x.totalPings * 100) : 0;
              const hasAlert = failureRate > 15;
              return (
                <div 
                  key={x.active_proxy_ip}
                  onClick={() => openProxyDrawer(x.active_proxy_ip)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '8px 12px', 
                    backgroundColor: hasAlert ? '#fff7ed' : '#f8fafc',
                    border: `1px solid ${hasAlert ? '#fed7aa' : '#e2e8f0'}`,
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#3b82f6', width: '16px' }}>#{i+1}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e3a8a', fontFamily: 'monospace' }}>
                        {x.active_proxy_ip}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {t('Success')}: {((x.totalPings - x.failedPings) / (x.totalPings || 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'monospace' }}>
                      {formatBytes(totalBytes)}
                    </span>
                    {hasAlert && <AlertTriangle size={14} color="#ea580c" title="Unstable connection warning" />}
                    <ChevronRight size={14} color="#94a3b8" />
                  </div>
                </div>
              );
            })}
            {reportData.xrayIps.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                {t('No Xray active pings recorded.')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
