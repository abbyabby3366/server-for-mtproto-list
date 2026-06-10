import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  TrendingUp, 
  RefreshCw, 
  Download, 
  Copy, 
  Activity, 
  Cpu, 
  Users as UsersIcon
} from 'lucide-react';

// Import modular subcomponents
import OverviewTab from '../components/TrafficReport/OverviewTab';
import UsersTab from '../components/TrafficReport/UsersTab';
import XrayTab from '../components/TrafficReport/XrayTab';
import ExporterTab from '../components/TrafficReport/ExporterTab';
import UserDrawer from '../components/TrafficReport/UserDrawer';
import ProxyDrawer from '../components/TrafficReport/ProxyDrawer';

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
  const [timeframe, setTimeframe] = useState('this_week');
  const [interval, setReportInterval] = useState('1d'); // empty means let backend decide based on timeframe
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

  // Primary Fetch function for Report Dashboard
  const fetchReport = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setLoading(true);
    } else {
      setIndicatorLoading(true);
    }

    try {
      let queryStr = `/api/telemetry/traffic-report?timeframe=${timeframe}&t=${Date.now()}`;
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
      const res = await authFetch(`/api/telemetry/traffic-report?timeframe=${timeframe}&user_id=${userId}&t=${Date.now()}`);
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
      const res = await authFetch(`/api/telemetry/traffic-report?timeframe=${timeframe}&active_proxy_ip=${encodeURIComponent(ip)}&t=${Date.now()}`);
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

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {/* Dynamic Header Banner */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
        color: '#fff', 
        border: 'none',
        borderRadius: '12px',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '30px', 
            height: '30px', 
            borderRadius: '6px', 
            backgroundColor: 'rgba(249, 115, 22, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(249, 115, 22, 0.3)'
          }}>
            <TrendingUp size={16} color="#f97316" />
          </div>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: 700 }}>
              {t('Traffic Report')}
            </h2>
          </div>
        </div>

        {/* Global Action Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* User selector */}
          <select 
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="form-control"
            style={{ width: '150px', height: '28px', padding: '2px 8px', backgroundColor: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '12px', borderRadius: '6px' }}
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
            style={{ width: '150px', height: '28px', padding: '2px 8px', backgroundColor: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '12px', borderRadius: '6px' }}
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
              setReportInterval(''); // Reset manual interval override
            }}
            className="form-control"
            style={{ width: '110px', height: '28px', padding: '2px 8px', backgroundColor: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '12px', borderRadius: '6px' }}
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
            onChange={(e) => setReportInterval(e.target.value)}
            className="form-control"
            style={{ width: '85px', height: '28px', padding: '2px 8px', backgroundColor: '#334155', border: '1px solid #475569', color: '#fff', fontSize: '12px', borderRadius: '6px' }}
          >
            <option value="" style={{ backgroundColor: '#1e293b' }}>{t('Interval')}</option>
            <option value="5m" style={{ backgroundColor: '#1e293b' }}>5m</option>
            <option value="1h" style={{ backgroundColor: '#1e293b' }}>1h</option>
            <option value="1d" style={{ backgroundColor: '#1e293b' }}>1d</option>
          </select>

          <button 
            className="btn btn-warning" 
            style={{ height: '28px', padding: '0 10px', background: '#f97316', border: 'none', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
            onClick={() => fetchReport(false)}
            disabled={loading || indicatorLoading}
          >
            <RefreshCw size={12} className={loading || indicatorLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        borderBottom: '1px solid var(--border-color)', 
        marginBottom: '20px', 
        paddingBottom: '2px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}>
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
                gap: '6px',
                padding: '10px 14px',
                border: 'none',
                borderBottom: isActive ? '3px solid #f97316' : '3px solid transparent',
                background: 'none',
                color: isActive ? '#0f172a' : '#64748b',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '-3px',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={15} color={isActive ? '#f97316' : '#64748b'} style={{ flexShrink: 0 }} />
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
            <OverviewTab 
              reportData={reportData}
              chartRef={chartRef}
              handleMouseMove={handleMouseMove}
              hoveredBucket={hoveredBucket}
              tooltipPos={tooltipPos}
              openUserDrawer={openUserDrawer}
              openProxyDrawer={openProxyDrawer}
              t={t}
            />
          )}

          {/* TAB 2: USERS BREAKDOWN */}
          {activeTab === 'users' && (
            <UsersTab 
              reportData={reportData}
              exportSearch={exportSearch}
              setExportSearch={setExportSearch}
              openUserDrawer={openUserDrawer}
              t={t}
            />
          )}

          {/* TAB 3: XRAY PROXY BREAKDOWN */}
          {activeTab === 'xray' && (
            <XrayTab 
              reportData={reportData}
              openProxyDrawer={openProxyDrawer}
              t={t}
            />
          )}

          {/* TAB 4: CUSTOM REPORT EXPORTER */}
          {activeTab === 'exporter' && (
            <ExporterTab 
              reportData={reportData}
              selectedProxy={selectedProxy}
              handleCopyCsv={handleCopyCsv}
              handleDownloadCsv={handleDownloadCsv}
              t={t}
            />
          )}
        </div>
      )}

      {/* 1. DETAIL SLIDER DRAWER: USER DETAILS */}
      <UserDrawer 
        userDrawerId={userDrawerId}
        setUserDrawerId={setUserDrawerId}
        userDrawerLoading={userDrawerLoading}
        userDrawerData={userDrawerData}
        drawerChartRef={drawerChartRef}
        handleMouseMove={handleMouseMove}
        hoveredDrawerBucket={hoveredDrawerBucket}
        setHoveredDrawerBucket={setHoveredDrawerBucket}
        drawerTooltipPos={drawerTooltipPos}
        t={t}
      />

      {/* 2. DETAIL SLIDER DRAWER: PROXY DETAILS */}
      <ProxyDrawer 
        proxyDrawerIp={proxyDrawerIp}
        setProxyDrawerIp={setProxyDrawerIp}
        proxyDrawerLoading={proxyDrawerLoading}
        proxyDrawerData={proxyDrawerData}
        drawerChartRef={drawerChartRef}
        handleMouseMove={handleMouseMove}
        hoveredDrawerBucket={hoveredDrawerBucket}
        setHoveredDrawerBucket={setHoveredDrawerBucket}
        drawerTooltipPos={drawerTooltipPos}
        t={t}
      />
    </div>
  );
};

export default TrafficReport;
