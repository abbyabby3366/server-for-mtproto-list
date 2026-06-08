import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatBytes } from './Analytics';
import { 
  Search, 
  Trash2, 
  BarChart3, 
  X, 
  Activity, 
  ChevronLeft, 
  ChevronRight, 
  Smartphone, 
  Wifi,
  Info
} from 'lucide-react';

const NetworkUsage = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  // ----- TABS & FILTER STATE -----
  const [activeTab, setActiveTab] = useState(() => {
    const highlight = searchParams.get('highlightUser');
    if (highlight) return 'user';
    return localStorage.getItem('networkUsageActiveTab') || 'user';
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [foregroundFilter, setForegroundFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [indicatorLoading, setIndicatorLoading] = useState(false);

  // ----- PAGINATION -----
  const [userPage, setUserPage] = useState(1);
  const [timePage, setTimePage] = useState(1);
  const itemsPerPage = 50;

  // ----- DATA ARRAYS -----
  const [usersData, setUsersData] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pingsData, setPingsData] = useState([]);
  const [totalPings, setTotalPings] = useState(0);

  // ----- MODALS & OVERLAYS STATE -----
  const [detailsPayload, setDetailsPayload] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  // Refs for highlight scrolling
  const highlightedRef = useRef(null);
  const [hasHighlighted, setHasHighlighted] = useState(false);

  // Sync active tab storage
  useEffect(() => {
    localStorage.setItem('networkUsageActiveTab', activeTab);
  }, [activeTab]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setUserPage(1);
      setTimePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch telemetry function
  const fetchTelemetry = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setLoading(true);
    } else {
      setIndicatorLoading(true);
    }

    try {
      if (activeTab === 'user') {
        const res = await authFetch(
          `/api/telemetry/network-users?page=${userPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}&foreground=${foregroundFilter}`
        );
        if (res.ok) {
          const data = await res.json();
          setUsersData(data.data || []);
          setTotalUsers(data.total || 0);
        }
      } else {
        const res = await authFetch(
          `/api/telemetry/network-pings?page=${timePage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}&foreground=${foregroundFilter}`
        );
        if (res.ok) {
          const data = await res.json();
          setPingsData(data.data || []);
          setTotalPings(data.total || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching network usage:', err);
    } finally {
      setLoading(false);
      setIndicatorLoading(false);
    }
  }, [activeTab, userPage, timePage, debouncedSearch, foregroundFilter, authFetch]);

  // Telemetry triggers and auto-polling (10s)
  useEffect(() => {
    fetchTelemetry(false);
    const interval = setInterval(() => fetchTelemetry(true), 10000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Highlight scroll on loaded user data
  useEffect(() => {
    const highlightId = searchParams.get('highlightUser');
    if (highlightId && activeTab === 'user' && usersData.length > 0 && !hasHighlighted) {
      const isUserInList = usersData.some((u) => String(u.user_id) === String(highlightId));
      if (isUserInList) {
        setTimeout(() => {
          if (highlightedRef.current) {
            highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHasHighlighted(true);
          }
        }, 300);
      }
    }
  }, [usersData, activeTab, searchParams, hasHighlighted]);

  // App Usage Statistics calculation
  const handleLoadStats = async () => {
    setStatsLoading(true);
    setStatsData(null);
    try {
      const res = await authFetch(`/api/telemetry/stats?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const networkRaw = data.network || [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeUsersToday = new Set();
        let totalBytesSent = 0;
        let totalBytesReceived = 0;
        let wifiUsers = 0;
        let mobileUsers = 0;
        let topUser = { name: 'N/A', bytes: 0 };

        networkRaw.forEach((row) => {
          const lastUpdated = new Date(row.last_updated);
          if (lastUpdated >= today) {
            activeUsersToday.add(row.user_id || row.phone_number || row.original_ip || Math.random());
          }

          const sent = row.network_usage?.total_bytes_sent || 0;
          const received = row.network_usage?.total_bytes_received || 0;
          const totalUserBytes = sent + received;
          totalBytesSent += sent;
          totalBytesReceived += received;

          if (totalUserBytes > topUser.bytes) {
            topUser = {
              name: `${row.first_name || 'Unknown'} ${row.last_name || ''}`.trim() || row.phone_number || 'Unknown',
              bytes: totalUserBytes
            };
          }

          const wifiSent = row.network_usage?.wifi_bytes_sent || 0;
          const mobileSent = row.network_usage?.mobile_bytes_sent || 0;
          if (wifiSent > mobileSent) {
            wifiUsers++;
          } else if (mobileSent > wifiSent) {
            mobileUsers++;
          }
        });

        setStatsData({
          activeToday: activeUsersToday.size,
          totalUsers: data.totalUniqueUsers !== undefined ? data.totalUniqueUsers : new Set(networkRaw.map((row) => row.user_id).filter(Boolean)).size,
          totalSent: totalBytesSent,
          totalReceived: totalBytesReceived,
          topUser,
          wifiPreferred: wifiUsers >= mobileUsers
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Administrative telemetry delete command
  const handleDeleteNetwork = async (range) => {
    setShowDeleteMenu(false);
    const labels = { 
      yesterday: t('yesterday'), 
      week: t('last week'), 
      month: t('last month'), 
      all: t('ALL time') 
    };
    if (!window.confirm(`${t('Delete all pings older than')} ${labels[range] || range}? ${t('This cannot be undone.')}`)) {
      return;
    }
    
    try {
      const res = await authFetch(`/api/telemetry/network?range=${range}`, { method: 'DELETE' });
      if (res.ok) {
        setUserPage(1);
        setTimePage(1);
        fetchTelemetry(false);
      }
    } catch (e) {
      console.error(e);
      alert(t('Error deleting records.'));
    }
  };

  const handleFlushOldPings = async () => {
    setShowDeleteMenu(false);

    // Prompt user for data retention days (default 7)
    const inputDays = window.prompt(t('Enter data retention days (documents older than this will be deleted, keeping the latest per user):'), '7');
    if (inputDays === null) return; // cancel click

    const days = parseInt(inputDays);
    if (isNaN(days) || days <= 0) {
      alert(t('Please enter a valid number of days.'));
      return;
    }

    if (!window.confirm(t('Are you sure you want to flush old network pings while keeping the latest ping per user?'))) {
      return;
    }

    try {
      const res = await authFetch(`/api/telemetry/flush-network`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ days })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`${t('Successfully flushed')} ${data.deletedCount} ${t('old records (retention period:')} ${data.days} ${t('days).')}`);
        setUserPage(1);
        setTimePage(1);
        fetchTelemetry(false);
      } else {
        const errData = await res.json();
        alert(`${t('Failed to flush:')} ${errData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert(t('Error flushing records.'));
    }
  };

  // Details Modal clean fields display
  const handleOpenDetails = (row) => {
    const clean = { ...row };
    delete clean.phone_number;
    delete clean.first_name;
    delete clean.last_name;
    delete clean.username;
    delete clean.resolved_phone;
    delete clean.resolved_first_name;
    delete clean.resolved_last_name;
    delete clean.resolved_username;
    setDetailsPayload(clean);
  };

  // Ping dynamic coloring
  const getPingDisplay = (row) => {
    const ping = row.active_connection?.telegram_ping_ms;
    const connType = row.active_connection?.type;
    if (ping === undefined || ping === null) return { text: 'N/A', color: '#94a3b8', isFailed: false };
    if (ping === -1) {
      if (connType && connType !== 'Xray') return { text: 'VPN', color: '#64748b', isFailed: false };
      return { text: t('Failed'), color: '#0f172a', isFailed: true };
    }
    let color = '#e74c3c'; // red (>800ms)
    if (ping <= 300) color = '#2ecc71'; // green (<300ms)
    else if (ping <= 800) color = '#f39c12'; // orange (<800ms)
    return { text: `${ping}ms`, color, isFailed: false };
  };

  const getDisplayName = (row) => {
    if (row.first_name || row.last_name || row.phone_number) {
      return `${row.first_name || 'Unknown'} ${row.last_name || ''}`.trim() || row.phone_number || row.user_id;
    } else if (row.telegram_user) {
      return `${row.telegram_user.first_name || 'Unknown'} ${row.telegram_user.last_name || ''}`.trim() 
        || row.telegram_user.phone_number 
        || row.user_id;
    }
    return row.user_id;
  };

  // Click outside to close dropdown hook
  useEffect(() => {
    if (!showDeleteMenu) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('#delete-menu-container')) {
        setShowDeleteMenu(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showDeleteMenu]);

  // Dynamic values helper
  const totalPages = Math.ceil((activeTab === 'user' ? totalUsers : totalPings) / itemsPerPage);
  const startItem = ((activeTab === 'user' ? userPage : timePage) - 1) * itemsPerPage + 1;
  const endItem = Math.min(
    (activeTab === 'user' ? userPage : timePage) * itemsPerPage,
    activeTab === 'user' ? totalUsers : totalPings
  );

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <Activity size={20} color="#3498db" />
              {t('Network Usage')}
            </h2>
            
            {indicatorLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="spinner" style={{ borderTopColor: '#64748b', width: '12px', height: '12px' }}></span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{t('Updating...')}</span>
              </div>
            )}
            
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={t('Search user, IP, phone, APK version...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '32px', width: '280px', margin: 0 }}
              />
            </div>

            <select
              value={foregroundFilter}
              onChange={(e) => {
                setForegroundFilter(e.target.value);
                setUserPage(1);
                setTimePage(1);
              }}
              className="form-control"
              style={{ width: 'auto', margin: 0, padding: '8px 12px', fontSize: '13px' }}
            >
              <option value="all">{t('All Traffic')}</option>
              <option value="true">{t('Foreground Only')}</option>
              <option value="false">{t('Background Only')}</option>
            </select>
            
            <button 
              className="btn btn-success" 
              onClick={() => { handleLoadStats(); }}
            >
              <BarChart3 size={14} />
              <span>{t('View Stats')}</span>
            </button>
          </div>

          {/* Delete administrative actions menu */}
          <div style={{ position: 'relative' }} id="delete-menu-container">
            <button 
              className="btn btn-danger" 
              onClick={() => setShowDeleteMenu(!showDeleteMenu)} 
              title={t('Delete Network Data')}
            >
              <Trash2 size={16} />
            </button>
            {showDeleteMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                background: 'white',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 100,
                minWidth: '220px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '10px 14px', fontWeight: 600, fontSize: '11px', color: '#64748b', borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase' }}>
                  {t('Delete pings older than...')}
                </div>
                <div 
                  onClick={() => handleDeleteNetwork('yesterday')} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item"
                >
                  {t('Older than yesterday')}
                </div>
                <div 
                  onClick={() => handleDeleteNetwork('week')} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item"
                >
                  {t('Older than last week')}
                </div>
                <div 
                  onClick={() => handleDeleteNetwork('month')} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item"
                >
                  {t('Older than last month')}
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)' }}></div>
                <div 
                  onClick={handleFlushOldPings} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: '#f39c12', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item"
                >
                  {t('Flush Old Pings (Keep Latest)')}
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)' }}></div>
                <div 
                  onClick={() => handleDeleteNetwork('all')} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: '#e74c3c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item-danger"
                >
                  {t('Delete ALL records')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Selection & Pagination Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid var(--border-color)', 
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Left: Tab Buttons */}
          <div className="tabs" style={{ display: 'flex', borderBottom: 'none', marginBottom: 0 }}>
            <div 
              onClick={() => setActiveTab('user')} 
              className={`tab ${activeTab === 'user' ? 'active' : ''}`}
              style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '2px solid transparent', fontWeight: 600 }}
            >
              {t('Users')}{' '}
              <span style={{ fontSize: '0.9em', opacity: 0.8 }}>({totalUsers})</span>
            </div>
            <div 
              onClick={() => setActiveTab('time')} 
              className={`tab ${activeTab === 'time' ? 'active' : ''}`}
              style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '2px solid transparent', fontWeight: 600 }}
            >
              {t('All Pings')}{' '}
              <span style={{ fontSize: '0.9em', opacity: 0.8 }}>({totalPings})</span>
            </div>
          </div>

          {/* Right: Pagination Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '8px 10px' }}>
            <span style={{ color: '#64748b', fontSize: '12px' }}>
              {t('Showing')} {startItem}-{endItem} {t('of')} {activeTab === 'user' ? totalUsers : totalPings} {activeTab === 'user' ? t('users') : t('pings')}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className="btn" 
                style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
                onClick={() => {
                  if (activeTab === 'user') {
                    setUserPage((p) => Math.max(p - 1, 1));
                  } else {
                    setTimePage((p) => Math.max(p - 1, 1));
                  }
                }}
                disabled={activeTab === 'user' ? userPage === 1 : timePage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '13px', padding: '0 8px' }}>
                {activeTab === 'user' ? userPage : timePage} / {totalPages || 1}
              </span>
              <button 
                className="btn" 
                style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
                onClick={() => {
                  if (activeTab === 'user') {
                    setUserPage((p) => Math.min(p + 1, totalPages));
                  } else {
                    setTimePage((p) => Math.min(p + 1, totalPages));
                  }
                }}
                disabled={activeTab === 'user' ? (userPage === totalPages || totalPages === 0) : (timePage === totalPages || totalPages === 0)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Users Grid */}
        {activeTab === 'user' && (
          <div>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', padding: '10px', background: '#f8fafc', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 8px 8px', marginTop: '-1px' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                {t('Showing')} {startItem}-{endItem} {t('of')} {totalUsers} {t('users')}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="btn" 
                  style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
                  onClick={() => setUserPage((p) => Math.max(p - 1, 1))}
                  disabled={userPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '13px', padding: '0 8px' }}>
                  {userPage} / {totalPages || 1}
                </span>
                <button 
                  className="btn" 
                  style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
                  onClick={() => setUserPage((p) => Math.min(p + 1, totalPages))}
                  disabled={userPage === totalPages || totalPages === 0}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: All Pings Grid */}
        {activeTab === 'time' && (
          <div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>{t('Network IP')}</th>
                    <th>{t('User')}</th>
                    <th>{t('APK Version')}</th>
                    <th>{t('TG Ping')}</th>
                    <th>{t('Date/Time')}</th>
                    <th>{t('Total Sent / Received')}</th>
                    <th>{t('Details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0' }}>
                        <span className="spinner" style={{ borderTopColor: '#3498db', width: '24px', height: '24px' }}></span>
                      </td>
                    </tr>
                  ) : pingsData.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        {t('No historical data found.')}
                      </td>
                    </tr>
                  ) : (
                    pingsData.map((row, index) => {
                      const pingInfo = getPingDisplay(row);
                      const dt = new Date(row.last_updated || row.timestamp);
                      return (
                        <tr 
                          key={row._id || index}
                          style={{ backgroundColor: pingInfo.isFailed ? '#fef2f2' : 'transparent' }}
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
                          <td>
                            <strong>{dt.toLocaleDateString()}</strong><br />
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{dt.toLocaleTimeString()}</span>
                          </td>
                          <td className="bytes" style={{ fontWeight: 500, fontSize: '11.5px' }}>
                            <span style={{ color: '#2980b9' }}>S:</span> {formatBytes(row.network_usage?.total_bytes_sent)}<br />
                            <span style={{ color: '#2ecc71' }}>R:</span> {formatBytes(row.network_usage?.total_bytes_received)}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', padding: '10px', background: '#f8fafc', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 8px 8px', marginTop: '-1px' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                {t('Showing')} {startItem}-{endItem} {t('of')} {totalPings} {t('pings')}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="btn" 
                  style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
                  onClick={() => setTimePage((p) => Math.max(p - 1, 1))}
                  disabled={timePage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '13px', padding: '0 8px' }}>
                  {timePage} / {totalPages || 1}
                </span>
                <button 
                  className="btn" 
                  style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
                  onClick={() => setTimePage((p) => Math.min(p + 1, totalPages))}
                  disabled={timePage === totalPages || totalPages === 0}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MODALS OVERLAYS */}
      {/* 4.1. Network details payload */}
      {detailsPayload && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', border: 'none', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{t('Full Network Payload')}</h3>
              <button 
                onClick={() => setDetailsPayload(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', hover: { color: '#475569' } }}
              >
                <X size={20} />
              </button>
            </div>
            <pre style={{
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#334155',
              overflowX: 'auto',
              border: '1px solid var(--border-color)',
              margin: 0
            }}>
              {JSON.stringify(detailsPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 4.2. Statistics summary modal */}
      {statsLoading || statsData ? (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '450px', border: 'none', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{t('App Usage Statistics')}</h3>
              <button 
                onClick={() => { setStatsData(null); setStatsLoading(false); }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {statsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                <span className="spinner" style={{ borderTopColor: '#3498db', width: '24px', height: '24px' }}></span>
              </div>
            ) : (
              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2ecc71' }}>{statsData.activeToday}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>
                      {t('Active Users Today')}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>{statsData.totalUsers}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>
                      {t('Total Users')}
                    </div>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px', margin: '20px 0 0 0' }}>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <strong style={{ color: '#475569' }}>{t('Total Data Sent (All-Time):')}</strong> 
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2980b9' }}>
                      {formatBytes(statsData.totalSent)}
                    </span>
                  </li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <strong style={{ color: '#475569' }}>{t('Total Data Received (All-Time):')}</strong> 
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2980b9' }}>
                      {formatBytes(statsData.totalReceived)}
                    </span>
                  </li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                    <strong style={{ color: '#475569' }}>{t('Top User (Data Volume):')}</strong> 
                    <span style={{ fontWeight: 500 }}>
                      {statsData.topUser.name}{' '}
                      <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                        ({formatBytes(statsData.topUser.bytes)})
                      </span>
                    </span>
                  </li>
                  <li style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                    <strong style={{ color: '#475569' }}>{t('Preferred Network Type:')}</strong> 
                    <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {statsData.wifiPreferred ? (
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
            )}
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default NetworkUsage;
export { NetworkUsage };
