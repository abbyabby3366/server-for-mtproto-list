import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Gauge,
  Zap,
  Turtle,
  Pencil,
  Check,
  X
} from 'lucide-react';

const SpeedControl = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();

  // State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  const [usersData, setUsersData] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [throttledCount, setThrottledCount] = useState(0);

  // Inline editing state
  const [editingUserId, setEditingUserId] = useState(null);
  const [editDownload, setEditDownload] = useState(250);
  const [editUpload, setEditUpload] = useState(250);

  // Toggling state (to prevent double-clicks)
  const [togglingUsers, setTogglingUsers] = useState(new Set());

  // Notification
  const [notification, setNotification] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users
  const fetchUsers = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setLoading(true);
    } else {
      setIndicatorLoading(true);
    }

    try {
      const res = await authFetch(
        `/api/user-throttles?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}&filter=${filter}`
      );
      if (res.ok) {
        const data = await res.json();
        setUsersData(data.data || []);
        setTotalUsers(data.total || 0);
        setThrottledCount(data.throttledCount || 0);
      }
    } catch (err) {
      console.error('Error fetching speed control data:', err);
    } finally {
      setLoading(false);
      setIndicatorLoading(false);
    }
  }, [page, debouncedSearch, filter, authFetch]);

  useEffect(() => {
    fetchUsers(false);
    const interval = setInterval(() => fetchUsers(true), 15000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Toggle throttle for a user
  const handleToggle = async (user) => {
    if (togglingUsers.has(user.user_id)) return;
    
    setTogglingUsers(prev => new Set(prev).add(user.user_id));
    
    try {
      const newState = !user.throttle_enabled;
      const res = await authFetch(`/api/user-throttle/${user.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          throttle_enabled: newState,
          download_kbps: user.download_kbps || 250,
          upload_kbps: user.upload_kbps || 250,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          username: user.username
        })
      });

      if (res.ok) {
        showNotification(
          newState 
            ? `🐢 ${user.first_name || user.user_id} ${t('throttled')}` 
            : `🚀 ${user.first_name || user.user_id} ${t('unthrottled')}`,
          newState ? 'warning' : 'success'
        );
        // Update local state immediately
        setUsersData(prev => prev.map(u => 
          u.user_id === user.user_id 
            ? { ...u, throttle_enabled: newState } 
            : u
        ));
        if (newState) {
          setThrottledCount(c => c + 1);
        } else {
          setThrottledCount(c => Math.max(0, c - 1));
        }
      }
    } catch (err) {
      showNotification(t('Failed to update throttle'), 'error');
    } finally {
      setTogglingUsers(prev => {
        const next = new Set(prev);
        next.delete(user.user_id);
        return next;
      });
    }
  };

  // Start editing speeds
  const handleStartEdit = (user) => {
    setEditingUserId(user.user_id);
    setEditDownload(user.download_kbps || 250);
    setEditUpload(user.upload_kbps || 250);
  };

  // Save edited speeds
  const handleSaveEdit = async (user) => {
    try {
      const res = await authFetch(`/api/user-throttle/${user.user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          throttle_enabled: user.throttle_enabled,
          download_kbps: editDownload,
          upload_kbps: editUpload,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          username: user.username
        })
      });

      if (res.ok) {
        showNotification(`✅ ${t('Speed updated for')} ${user.first_name || user.user_id}`, 'success');
        setUsersData(prev => prev.map(u => 
          u.user_id === user.user_id 
            ? { ...u, download_kbps: editDownload, upload_kbps: editUpload } 
            : u
        ));
        setEditingUserId(null);
      }
    } catch (err) {
      showNotification(t('Failed to update speeds'), 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = (bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 2 : 0);
    return `${val} ${units[i]}`;
  };

  const DAILY_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5GB

  const getTimeSince = (dateStr) => {
    if (!dateStr) return 'N/A';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('just now');
    if (mins < 60) return `${mins}m ${t('ago')}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${t('ago')}`;
    const days = Math.floor(hours / 24);
    return `${days}d ${t('ago')}`;
  };

  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  const startItem = (page - 1) * itemsPerPage + 1;
  const endItem = Math.min(page * itemsPerPage, totalUsers);

  return (
    <div>
      {/* Notification toast */}
      {notification && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: '#fff',
          background: notification.type === 'success' ? '#16a34a' 
            : notification.type === 'warning' ? '#d97706' 
            : '#dc2626',
          animation: 'fadeIn 0.2s ease'
        }}>
          {notification.message}
        </div>
      )}

      <div className="card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <Gauge size={20} color="#d97706" />
              {t('Speed Control')}
            </h2>

            {/* Throttled count badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
              background: throttledCount > 0 ? '#fef3c7' : '#f0fdf4',
              color: throttledCount > 0 ? '#92400e' : '#166534',
              border: `1px solid ${throttledCount > 0 ? '#fde68a' : '#bbf7d0'}`
            }}>
              {throttledCount} {t('throttled')}
            </div>

            {indicatorLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="spinner" style={{ borderTopColor: '#64748b', width: '12px', height: '12px' }}></span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{t('Updating...')}</span>
              </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={t('Search user, phone, ID...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '32px', width: '240px', margin: 0 }}
              />
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                {t('Filter')}:
              </span>
              <select
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                className="form-control"
                style={{ width: 'auto', margin: 0, padding: '8px 12px', fontSize: '13px' }}
              >
                <option value="all">{t('All Users')}</option>
                <option value="throttled">{t('Throttled Only')}</option>
                <option value="auto_throttled">🐢 {t('Auto-Limited Only')}</option>
                <option value="manual_throttled">🔧 {t('Manual Only')}</option>
                <option value="unthrottled">{t('Full Speed Only')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pagination Row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border-color)', marginBottom: '15px', paddingBottom: '10px',
          flexWrap: 'wrap', gap: '12px'
        }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            {t('Showing')} {totalUsers > 0 ? startItem : 0}-{endItem} {t('of')} {totalUsers} {t('users')}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn"
              style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '13px', padding: '0 8px' }}>
              {page} / {totalPages || 1}
            </span>
            <button
              className="btn"
              style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || totalPages === 0}
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
                <th>{t('User')}</th>
                <th>{t('Last Seen')}</th>
                <th>{t('Usage Today')}</th>
                <th>{t('Status')}</th>
                <th>{t('Download')}</th>
                <th>{t('Upload')}</th>
                <th>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <span className="spinner" style={{ borderTopColor: '#d97706', width: '24px', height: '24px' }}></span>
                  </td>
                </tr>
              ) : usersData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    {t('No users found.')}
                  </td>
                </tr>
              ) : (
                usersData.map((row) => {
                  const isEditing = editingUserId === row.user_id;
                  const isToggling = togglingUsers.has(row.user_id);

                  return (
                    <tr
                      key={row.user_id}
                      style={{
                        backgroundColor: row.throttle_enabled ? '#fffbeb' : 'transparent',
                        transition: 'background-color 0.3s ease'
                      }}
                    >
                      {/* User info */}
                      <td>
                        <strong style={{ color: '#1e293b' }}>
                          {row.first_name || 'Unknown'} {row.last_name || ''}
                        </strong>
                        <br />
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>
                          {row.phone_number || row.user_id}
                        </span>
                        {row.username && (
                          <>
                            <br />
                            <span style={{ color: '#3498db', fontSize: '11px', fontWeight: 500 }}>
                              @{row.username}
                            </span>
                          </>
                        )}
                      </td>

                      {/* Last seen */}
                      <td style={{ fontSize: '12.5px', color: '#475569' }}>
                        {getTimeSince(row.last_updated)}
                      </td>

                      {/* Usage Today */}
                      <td style={{ fontSize: '12px', minWidth: '120px' }}>
                        {(() => {
                          const usage = row.usage_today_bytes || 0;
                          const pct = Math.min((usage / DAILY_LIMIT_BYTES) * 100, 100);
                          const isOver = usage >= DAILY_LIMIT_BYTES;
                          const isNear = pct >= 70 && !isOver;
                          const barColor = isOver ? '#dc2626' : isNear ? '#d97706' : '#22c55e';
                          const textColor = isOver ? '#dc2626' : isNear ? '#92400e' : '#475569';
                          return (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 600, color: textColor }}>
                                  {formatBytes(usage)}
                                </span>
                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                  / 5 GB
                                </span>
                              </div>
                              <div style={{
                                width: '100%', height: '4px', borderRadius: '2px',
                                background: '#e2e8f0', overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${pct}%`, height: '100%', borderRadius: '2px',
                                  background: barColor,
                                  transition: 'width 0.5s ease'
                                }} />
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status badge */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {row.throttle_enabled ? (
                            row.throttle_updated_by === 'system_auto_limit' ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700,
                                background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa'
                              }}>
                                🐢 {t('Auto-Limited')}
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700,
                                background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe'
                              }}>
                                🔧 {t('Manual')}
                              </span>
                            )
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700,
                              background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0'
                            }}>
                              ⚡ {t('Full Speed')}
                            </span>
                          )}
                          {row.throttle_enabled && (
                            <span style={{ fontSize: '10px', color: '#94a3b8', paddingLeft: '2px' }}>
                              {row.throttle_updated_by === 'system_auto_limit' 
                                ? t('Resets at midnight') 
                                : row.throttle_updated_by ? `${t('by')} ${row.throttle_updated_by}` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Download speed */}
                      <td style={{ fontSize: '12.5px', fontWeight: 500 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              value={editDownload}
                              onChange={(e) => setEditDownload(parseInt(e.target.value) || 0)}
                              className="form-control"
                              style={{ width: '70px', margin: 0, padding: '4px 6px', fontSize: '12px' }}
                              min="1"
                            />
                            <span style={{ fontSize: '11px', color: '#64748b' }}>KB/s</span>
                          </div>
                        ) : (
                          row.throttle_enabled ? (
                            <span style={{ color: '#d97706' }}>↓ {row.download_kbps} KB/s</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )
                        )}
                      </td>

                      {/* Upload speed */}
                      <td style={{ fontSize: '12.5px', fontWeight: 500 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              value={editUpload}
                              onChange={(e) => setEditUpload(parseInt(e.target.value) || 0)}
                              className="form-control"
                              style={{ width: '70px', margin: 0, padding: '4px 6px', fontSize: '12px' }}
                              min="1"
                            />
                            <span style={{ fontSize: '11px', color: '#64748b' }}>KB/s</span>
                          </div>
                        ) : (
                          row.throttle_enabled ? (
                            <span style={{ color: '#d97706' }}>↑ {row.upload_kbps} KB/s</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {/* Toggle button */}
                          <button
                            className="btn"
                            onClick={() => handleToggle(row)}
                            disabled={isToggling}
                            style={{
                              padding: '5px 12px', fontSize: '11.5px', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '4px',
                              background: row.throttle_enabled ? '#f0fdf4' : '#fef3c7',
                              color: row.throttle_enabled ? '#16a34a' : '#92400e',
                              border: `1px solid ${row.throttle_enabled ? '#bbf7d0' : '#fde68a'}`,
                              opacity: isToggling ? 0.6 : 1,
                              cursor: isToggling ? 'wait' : 'pointer'
                            }}
                          >
                            {isToggling ? (
                              <span className="spinner" style={{ borderTopColor: 'currentColor', width: '12px', height: '12px' }}></span>
                            ) : row.throttle_enabled ? (
                              <><Zap size={12} /> {t('Unthrottle')}</>
                            ) : (
                              <><Turtle size={12} /> {t('Throttle')}</>
                            )}
                          </button>

                          {/* Edit speeds button */}
                          {isEditing ? (
                            <>
                              <button
                                className="btn"
                                onClick={() => handleSaveEdit(row)}
                                style={{ padding: '5px 8px', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' }}
                                title={t('Save')}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                className="btn"
                                onClick={handleCancelEdit}
                                style={{ padding: '5px 8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                title={t('Cancel')}
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn"
                              onClick={() => handleStartEdit(row)}
                              style={{ padding: '5px 8px', background: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1' }}
                              title={t('Edit speeds')}
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px',
          padding: '10px', background: '#f8fafc', borderTop: '1px solid var(--border-color)',
          borderRadius: '0 0 8px 8px', marginTop: '-1px'
        }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            {t('Showing')} {totalUsers > 0 ? startItem : 0}-{endItem} {t('of')} {totalUsers} {t('users')}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn"
              style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }}
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '13px', padding: '0 8px' }}>
              {page} / {totalPages || 1}
            </span>
            <button
              className="btn"
              style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }}
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || totalPages === 0}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeedControl;
