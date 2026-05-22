import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  TrendingUp, 
  RefreshCw, 
  Download, 
  Copy, 
  Search, 
  AlertTriangle, 
  Wifi, 
  Smartphone, 
  X, 
  ExternalLink, 
  Clock, 
  Activity, 
  Cpu, 
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  ChevronRight,
  TrendingDown
} from 'lucide-react';

const TrafficReport = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Tabs: 'overview', 'users', 'xray', 'exporter'
  const [activeTab, setActiveTab] = useState('overview');
  
  // States for general loading and data
  const [loading, setLoading] = useState(true);
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Filter States
  const [timeframe, setTimeframe] = useState('all_time');
  const [interval, setInterval] = useState('1d'); // empty means let backend decide based on timeframe
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedProxy, setSelectedProxy] = useState('');
  
  // UI States for Detail Drawers / Sliders
  const [userDrawerId, setUserDrawerId] = useState(null);
  const [userDrawerData, setUserDrawerData] = useState(null);
  const [userDrawerLoading, setUserDrawerLoading] = useState(false);

  const [proxyDrawerIp, setProxyDrawerIp] = useState(null);
  const [proxyDrawerData, setProxyDrawerData] = useState(null);
  const [proxyDrawerLoading, setProxyDrawerLoading] = useState(false);

  // Exporter Filter States
  const [exportSearch, setExportSearch] = useState('');
  const [exportLimit, setExportLimit] = useState(100);

  // SVG Chart Tooltip State
  const [hoveredBucket, setHoveredBucket] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const chartRef = useRef(null);

  // Drawer Chart Tooltip State
  const [hoveredDrawerBucket, setHoveredDrawerBucket] = useState(null);
  const [drawerTooltipPos, setDrawerTooltipPos] = useState({ x: 0, y: 0 });
  const drawerChartRef = useRef(null);

  // Helper: Format Bytes beautifully
  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Primary Fetch function for Report Dashboard
  const fetchReport = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setLoading(true);
    } else {
      setIndicatorLoading(true);
    }

    try {
      let queryStr = `/api/telemetry/traffic-report?timeframe=${timeframe}`;
      if (interval) queryStr += `&interval=${interval}`;
      if (selectedUser) queryStr += `&user_id=${selectedUser}`;
      if (selectedProxy) queryStr += `&active_proxy_ip=${encodeURIComponent(selectedProxy)}`;

      const res = await authFetch(queryStr);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Error fetching traffic report:', err);
    } finally {
      setLoading(false);
      setIndicatorLoading(false);
    }
  }, [timeframe, interval, selectedUser, selectedProxy, authFetch]);

  // Initial load and filter change trigger
  useEffect(() => {
    fetchReport(false);
  }, [timeframe, interval, selectedUser, selectedProxy]);

  // Poll every 10 seconds for real-time updates
  useEffect(() => {
    const poll = setInterval(() => {
      fetchReport(true);
    }, 10000);
    return () => clearInterval(poll);
  }, [fetchReport]);

  // Drawer loading trigger: User drawer
  const openUserDrawer = async (userId) => {
    setUserDrawerId(userId);
    setUserDrawerLoading(true);
    setUserDrawerData(null);
    try {
      // Fetch report data filtered to this user only (with timeframe and auto buckets)
      const res = await authFetch(`/api/telemetry/traffic-report?timeframe=${timeframe}&user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserDrawerData(data);
      }
    } catch (err) {
      console.error('Error loading user details for drawer:', err);
    } finally {
      setUserDrawerLoading(false);
    }
  };

  // Drawer loading trigger: Proxy drawer
  const openProxyDrawer = async (ip) => {
    setProxyDrawerIp(ip);
    setProxyDrawerLoading(true);
    setProxyDrawerData(null);
    try {
      // Fetch report data filtered to this proxy IP only (with timeframe and auto buckets)
      const res = await authFetch(`/api/telemetry/traffic-report?timeframe=${timeframe}&active_proxy_ip=${encodeURIComponent(ip)}`);
      if (res.ok) {
        const data = await res.json();
        setProxyDrawerData(data);
      }
    } catch (err) {
      console.error('Error loading proxy details for drawer:', err);
    } finally {
      setProxyDrawerLoading(false);
    }
  };

  // CSV Generator
  const generateCSV = (headers, rows) => {
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };
    const headerRow = headers.map(h => escapeCsv(h)).join(',');
    const bodyRows = rows.map(row => row.map(cell => escapeCsv(cell)).join(',')).join('\n');
    return `${headerRow}\n${bodyRows}`;
  };

  // Exporter Actions: Copy to Clipboard
  const handleCopyCsv = (headers, rows) => {
    const csvContent = generateCSV(headers, rows);
    navigator.clipboard.writeText(csvContent)
      .then(() => alert(t('CSV copied to clipboard successfully!')))
      .catch((err) => console.error('Failed to copy CSV:', err));
  };

  // Exporter Actions: Download File
  const handleDownloadCsv = (headers, rows, filename) => {
    const csvContent = generateCSV(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Hover coordinates tracker
  const handleMouseMove = (e, isDrawer = false) => {
    const targetRef = isDrawer ? drawerChartRef : chartRef;
    if (!targetRef.current) return;
    const rect = targetRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - 120; // Float slightly above the cursor
    if (isDrawer) {
      setDrawerTooltipPos({ x, y });
    } else {
      setTooltipPos({ x, y });
    }
  };

  // Main UI Renders
  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {/* Dynamic Header Banner */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
        color: '#fff', 
        border: 'none',
        borderRadius: '12px',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '10px', 
            backgroundColor: 'rgba(249, 115, 22, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(249, 115, 22, 0.3)'
          }}>
            <TrendingUp size={20} color="#f97316" />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 700 }}>
              {t('Traffic Report')}
            </h2>
          </div>
        </div>

        {/* Global Action Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* User selector */}
          <select 
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="form-control"
            style={{ width: '160px', backgroundColor: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '12.5px', borderRadius: '6px' }}
          >
            <option value="" style={{ backgroundColor: '#1e293b' }}>{t('All Users')}</option>
            {reportData?.users?.map(u => (
              <option key={u.user_id} value={u.user_id} style={{ backgroundColor: '#1e293b' }}>
                {u.first_name || u.username || u.user_id}
              </option>
            ))}
          </select>

          {/* Proxy Xray IP selector */}
          <select 
            value={selectedProxy}
            onChange={(e) => setSelectedProxy(e.target.value)}
            className="form-control"
            style={{ width: '160px', backgroundColor: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '12.5px', borderRadius: '6px' }}
          >
            <option value="" style={{ backgroundColor: '#1e293b' }}>{t('All Xray IPs')}</option>
            {reportData?.xrayIps?.map(x => (
              <option key={x.active_proxy_ip} value={x.active_proxy_ip} style={{ backgroundColor: '#1e293b' }}>
                {x.active_proxy_ip}
              </option>
            ))}
          </select>

          {/* Timeframe Selector */}
          <select
            value={timeframe}
            onChange={(e) => {
              setTimeframe(e.target.value);
              setInterval(''); // Reset manual interval override
            }}
            className="form-control"
            style={{ width: '120px', backgroundColor: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '12.5px', borderRadius: '6px' }}
          >
            <option value="last_15_mins" style={{ backgroundColor: '#1e293b' }}>{t('Last 15 Mins')}</option>
            <option value="last_hour" style={{ backgroundColor: '#1e293b' }}>{t('Last Hour')}</option>
            <option value="today" style={{ backgroundColor: '#1e293b' }}>{t('Today')}</option>
            <option value="yesterday" style={{ backgroundColor: '#1e293b' }}>{t('Yesterday')}</option>
            <option value="this_week" style={{ backgroundColor: '#1e293b' }}>{t('This Week')}</option>
            <option value="all_time" style={{ backgroundColor: '#1e293b' }}>{t('All Time')}</option>
          </select>

          {/* Manual Interval toggle */}
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="form-control"
            style={{ width: '90px', backgroundColor: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '12.5px', borderRadius: '6px' }}
          >
            <option value="" style={{ backgroundColor: '#1e293b' }}>{t('Interval')}</option>
            <option value="5m" style={{ backgroundColor: '#1e293b' }}>5m</option>
            <option value="1h" style={{ backgroundColor: '#1e293b' }}>1h</option>
            <option value="1d" style={{ backgroundColor: '#1e293b' }}>1d</option>
          </select>

          <button 
            className="btn btn-warning" 
            style={{ padding: '8px 12px', background: '#f97316', border: 'none', color: '#fff', borderRadius: '6px' }} 
            onClick={() => fetchReport(false)}
            disabled={loading || indicatorLoading}
          >
            <RefreshCw size={14} className={loading || indicatorLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '2px' }}>
        {[
          { id: 'overview', label: t('Overview Dashboard'), icon: Activity },
          { id: 'users', label: t('Users Breakdown'), icon: UsersIcon },
          { id: 'xray', label: t('Xray Proxy Breakdown'), icon: Cpu },
          { id: 'exporter', label: t('Export Report'), icon: Download }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderBottom: isActive ? '3px solid #f97316' : '3px solid transparent',
                background: 'none',
                color: isActive ? '#0f172a' : '#64748b',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '-3px'
              }}
            >
              <Icon size={16} color={isActive ? '#f97316' : '#64748b'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <span className="spinner" style={{ borderTopColor: '#f97316', width: '32px', height: '32px' }}></span>
          <span style={{ color: '#64748b', fontSize: '13px' }}>{t('Loading...')}</span>
        </div>
      )}

      {/* Main Page Tabs Content */}
      {!loading && reportData && (
        <div>
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
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
                      const hasAlert = totalBytes >= 500 * 1024 * 1024;
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
          )}

          {/* TAB 2: USERS BREAKDOWN */}
          {activeTab === 'users' && (
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
                  <strong>{t('Usage Alert')}:</strong> {t('Red background flags represent active account connections routing >= 500MB total data volume.')}
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
                            <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                              {t('No users matched search parameters.')}
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((u) => {
                        const totalBytes = u.bytesSent + u.bytesReceived;
                        const hasAlert = totalBytes >= 500 * 1024 * 1024;
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
          )}

          {/* TAB 3: XRAY PROXY BREAKDOWN */}
          {activeTab === 'xray' && (
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
          )}

          {/* TAB 4: CUSTOM REPORT EXPORTER */}
          {activeTab === 'exporter' && (
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
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 1. DETAIL SLIDER DRAWER: USER DETAILS */}
      {/* ==================================================== */}
      {userDrawerId && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '500px',
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
                {t('User Telemetry Details')}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                ID: {userDrawerId}
              </span>
            </div>
            <button 
              onClick={() => setUserDrawerId(null)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#64748b' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Body content */}
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            {userDrawerLoading ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner" style={{ borderTopColor: '#f97316' }}></span>
              </div>
            ) : userDrawerData ? (
              <div>
                {/* Micro KPI breakdown summary */}
                <div className="grid grid-cols-2" style={{ gap: '10px', marginBottom: '20px' }}>
                  <div className="card" style={{ margin: 0, padding: '10px', backgroundColor: '#fafaf9' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>{t('Mobile Usage')}</span>
                    <h4 style={{ margin: '4px 0 0 0', color: '#ea580c', fontSize: '14px', fontFamily: 'monospace' }}>
                      {formatBytes(userDrawerData.summary.totalMobileSent + userDrawerData.summary.totalMobileReceived)}
                    </h4>
                  </div>
                  <div className="card" style={{ margin: 0, padding: '10px', backgroundColor: '#fafaf9' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>{t('WiFi Usage')}</span>
                    <h4 style={{ margin: '4px 0 0 0', color: '#3b82f6', fontSize: '14px', fontFamily: 'monospace' }}>
                      {formatBytes(userDrawerData.summary.totalWifiSent + userDrawerData.summary.totalWifiReceived)}
                    </h4>
                  </div>
                </div>

                {/* Drawer Individual Timeline Custom SVG Chart */}
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>{t('Usage History Timeline')}</h4>
                {userDrawerData.aggregateTimeline.length === 0 ? (
                  <div style={{ height: '140px', backgroundColor: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px', marginBottom: '20px' }}>
                    {t('No timelines recorded for this user.')}
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
                        const buckets = userDrawerData.aggregateTimeline;
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
                    {hoveredDrawerBucket !== null && userDrawerData.aggregateTimeline[hoveredDrawerBucket] && (
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
                          ⏱️ {userDrawerData.aggregateTimeline[hoveredDrawerBucket].timeLabel}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>{t('Mob')}:</span>
                            <span style={{ color: '#ea580c' }}>
                              {formatBytes(userDrawerData.aggregateTimeline[hoveredDrawerBucket].mobileSent + userDrawerData.aggregateTimeline[hoveredDrawerBucket].mobileReceived)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>{t('WiFi')}:</span>
                            <span style={{ color: '#3b82f6' }}>
                              {formatBytes(userDrawerData.aggregateTimeline[hoveredDrawerBucket].wifiSent + userDrawerData.aggregateTimeline[hoveredDrawerBucket].wifiReceived)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Proxies used by this specific user */}
                <h4 style={{ margin: '14px 0 8px 0', fontSize: '13px' }}>{t('Proxies Routed Through')}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {userDrawerData.xrayIps.map(x => (
                    <div 
                      key={x.active_proxy_ip}
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
                      <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{x.active_proxy_ip}</span>
                      <span style={{ fontWeight: 600, color: '#475569' }}>
                        {formatBytes(x.bytesSent + x.bytesReceived)}
                      </span>
                    </div>
                  ))}
                  {userDrawerData.xrayIps.length === 0 && (
                    <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                      {t('No active proxies recorded for this user.')}
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
      )}

      {/* ==================================================== */}
      {/* 2. DETAIL SLIDER DRAWER: PROXY DETAILS */}
      {/* ==================================================== */}
      {proxyDrawerIp && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '500px',
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
                      key={u.user_id}
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
                        <span style={{ fontWeight: 600 }}>{u.first_name || 'User'}</span>
                        {u.username && <span style={{ fontSize: '10px', color: '#64748b' }}>@{u.username}</span>}
                      </div>
                      <span style={{ fontWeight: 600, color: '#475569' }}>
                        {formatBytes(u.bytesSent + u.bytesReceived)}
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
      )}
    </div>
  );
};

export default TrafficReport;
