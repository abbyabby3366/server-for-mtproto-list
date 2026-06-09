import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatBytes } from './Analytics';
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  Users
} from 'lucide-react';

const TalkProUsers = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  // ----- STATE -----
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [foregroundFilter, setForegroundFilter] = useState(() => {
    return searchParams.get('foreground') || 'all';
  });
  const [timeframe, setTimeframe] = useState(() => {
    return searchParams.get('timeframe') || 'all_time';
  });
  const [loading, setLoading] = useState(true);
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 50;

  const [usersData, setUsersData] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);

  const [detailsPayload, setDetailsPayload] = useState(null);

  // Refs for highlight scrolling
  const highlightedRef = useRef(null);
  const [hasHighlighted, setHasHighlighted] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setUserPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync state from query parameters on navigation
  useEffect(() => {
    const fg = searchParams.get('foreground');
    if (fg !== null) setForegroundFilter(fg);
    const tf = searchParams.get('timeframe');
    if (tf !== null) setTimeframe(tf);
    setUserPage(1);
  }, [searchParams]);

  // Fetch unique users with sort=firstLoginTime and timeframe
  const fetchUsers = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setLoading(true);
    } else {
      setIndicatorLoading(true);
    }

    try {
      const res = await authFetch(
        `/api/telemetry/network-users?page=${userPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}&foreground=${foregroundFilter}&sort=firstLoginTime&timeframe=${timeframe}`
      );

      if (res.ok) {
        const data = await res.json();
        setUsersData(data.data || []);
        setTotalUsers(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching TalkPro users:', err);
    } finally {
      setLoading(false);
      setIndicatorLoading(false);
    }
  }, [userPage, debouncedSearch, foregroundFilter, timeframe, authFetch]);

  // Telemetry triggers and auto-polling (10s)
  useEffect(() => {
    fetchUsers(false);
    const interval = setInterval(() => fetchUsers(true), 10000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Highlight scroll on loaded user data
  useEffect(() => {
    const highlightId = searchParams.get('highlightUser');
    if (highlightId && usersData.length > 0 && !hasHighlighted) {
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
  }, [usersData, searchParams, hasHighlighted]);

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

  // Dynamic values helper
  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  const startItem = (userPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(userPage * itemsPerPage, totalUsers);

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <Users size={20} color="#3498db" />
              {t('TalkPro Users')}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                {t('Last Ping Type')}:
              </span>
              <select
                value={foregroundFilter}
                onChange={(e) => {
                  setForegroundFilter(e.target.value);
                  setUserPage(1);
                }}
                className="form-control"
                style={{ width: 'auto', margin: 0, padding: '8px 12px', fontSize: '13px' }}
              >
                <option value="all">{t('All Traffic')}</option>
                <option value="true">{t('Foreground Only')}</option>
                <option value="false">{t('Background Only')}</option>
                <option value="na">{t('Legacy (N/A)')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                {t('Last Ping')}:
              </span>
              <select
                value={timeframe}
                onChange={(e) => {
                  setTimeframe(e.target.value);
                  setUserPage(1);
                }}
                className="form-control"
                style={{ width: 'auto', margin: 0, padding: '8px 12px', fontSize: '13px' }}
              >
                <option value="last_15_mins">{t('Last 15 Mins')}</option>
                <option value="last_hour">{t('Last Hour')}</option>
                <option value="today">{t('Today')}</option>
                <option value="yesterday">{t('Yesterday')}</option>
                <option value="this_week">{t('This Week')}</option>
                <option value="all_time">{t('All Time')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pagination Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid var(--border-color)', 
          marginBottom: '15px',
          paddingBottom: '10px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
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

        {/* Users Table */}
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>{t('First Login Time')}</th>
                <th>{t('User')}</th>
                <th>{t('APK Version')}</th>
                <th>
                  {t('Total Sent / Received')}
                  <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 'normal', marginTop: '2px', textTransform: 'none' }}>
                    {t('Today')}: {(() => {
                      const start = new Date();
                      start.setHours(0, 0, 0, 0);
                      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
                      const options = { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' };
                      return `${start.toLocaleString(undefined, options)} - ${end.toLocaleString(undefined, options)}`;
                    })()}
                  </span>
                </th>
                <th>{t('Last Ping')}</th>
                <th>{t('Last Ping Details')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <span className="spinner" style={{ borderTopColor: '#3498db', width: '24px', height: '24px' }}></span>
                  </td>
                </tr>
              ) : usersData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
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
                      <td style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                        {row.first_login_time ? new Date(row.first_login_time).toLocaleString() : 'N/A'}
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
                      <td className="bytes" style={{ fontWeight: 500, fontSize: '11.5px' }}>
                        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '4px', marginBottom: '4px' }}>
                          <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                            {t('Today')}
                          </span>
                          <span style={{ color: '#2980b9' }}>S:</span> {formatBytes(row.today_sent)}
                          <span style={{ color: '#cbd5e1', margin: '0 6px' }}>|</span>
                          <span style={{ color: '#2ecc71' }}>R:</span> {formatBytes(row.today_received)}
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '9px', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>{t('All Time')}</span>
                          <span style={{ color: '#2980b9' }}>S:</span> {formatBytes(row.network_usage?.total_bytes_sent)}
                          <span style={{ color: '#cbd5e1', margin: '0 6px' }}>|</span>
                          <span style={{ color: '#2ecc71' }}>R:</span> {formatBytes(row.network_usage?.total_bytes_received)}
                        </div>
                      </td>
                      <td style={{ fontSize: '12.5px', color: '#475569' }}>
                        {new Date(row.last_updated).toLocaleString()}
                      </td>
                      <td>
                        <button 
                          className="btn" 
                          style={{ padding: '6px 10px', background: '#3498db', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleOpenDetails(row)}
                        >
                          <Info size={12} />
                          <span>{t('Last Ping Details')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Controls */}
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

      {/* Details payload modal */}
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
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
    </div>
  );
};

export default TalkProUsers;
export { TalkProUsers };
