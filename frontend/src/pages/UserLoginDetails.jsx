import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Search, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  ShieldAlert
} from 'lucide-react';

const UserLoginDetails = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();

  // ----- PAGINATION & FILTERS -----
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [indicatorLoading, setIndicatorLoading] = useState(false);
  const itemsPerPage = 50;

  // ----- DATA -----
  const [logins, setLogins] = useState([]);
  const [totalLogins, setTotalLogins] = useState(0);

  // ----- MODALS & OVERLAYS -----
  const [detailsPayload, setDetailsPayload] = useState(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load telemetry data
  const loadData = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) {
      setLoading(true);
    } else {
      setIndicatorLoading(true);
    }

    try {
      const res = await authFetch(
        `/api/telemetry/logins?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(debouncedSearch)}`
      );
      if (res.ok) {
        const data = await res.json();
        setLogins(data.data || []);
        setTotalLogins(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching logins:', err);
    } finally {
      setLoading(false);
      setIndicatorLoading(false);
    }
  }, [currentPage, debouncedSearch, authFetch]);

  // Initial load and periodic polling (10s)
  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Administrative delete function
  const handleDeleteLogins = async (range) => {
    setShowDeleteMenu(false);
    const labels = { 
      yesterday: t('yesterday'), 
      week: t('last week'), 
      month: t('last month'), 
      all: t('ALL time') 
    };
    if (!window.confirm(`${t('Delete all logins older than')} ${labels[range] || range}? ${t('This cannot be undone.')}`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/telemetry/logins?range=${range}`, { method: 'DELETE' });
      if (res.ok) {
        setCurrentPage(1);
        loadData(false);
      }
    } catch (e) {
      console.error(e);
      alert(t('Error deleting records.'));
    }
  };

  // Click outside listener for delete menu
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

  // Calculations
  const totalPages = Math.ceil(totalLogins / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalLogins);

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              <ShieldAlert size={20} color="#3498db" />
              {t('Recent Logins')}
            </h2>
            
            <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: '12px' }}>
              {totalLogins} {t('records')}
            </span>

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
                placeholder={t('Search user, IP, phone, device...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '32px', width: '280px', margin: 0 }}
              />
            </div>
          </div>

          {/* Delete Logins Menu Dropdown */}
          <div style={{ position: 'relative' }} id="delete-menu-container">
            <button 
              className="btn btn-danger" 
              onClick={() => setShowDeleteMenu(!showDeleteMenu)} 
              title={t('Delete Login Data')}
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
                  {t('Delete logins older than...')}
                </div>
                <div 
                  onClick={() => handleDeleteLogins('yesterday')} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item"
                >
                  <span>🕐</span> {t('Older than yesterday')}
                </div>
                <div 
                  onClick={() => handleDeleteLogins('week')} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item"
                >
                  <span>📅</span> {t('Older than last week')}
                </div>
                <div 
                  onClick={() => handleDeleteLogins('month')} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item"
                >
                  <span>🗓️</span> {t('Older than last month')}
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)' }}></div>
                <div 
                  onClick={() => handleDeleteLogins('all')} 
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: '#e74c3c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                  className="dropdown-item-danger"
                >
                  <span>🗑️</span> {t('Delete ALL records')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paginated list top bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', padding: '10px', background: '#f8fafc', borderBottom: '1px solid var(--border-color)', borderRadius: '8px 8px 0 0' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            {t('Showing')} {startItem}-{endItem} {t('of')} {totalLogins} {t('records')}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="btn" 
              style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '13px', padding: '0 8px' }}>
              {currentPage} / {totalPages || 1}
            </span>
            <button 
              className="btn" 
              style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>{t('Network IPs')}</th>
                <th>{t('Time')}</th>
                <th>{t('User')}</th>
                <th>{t('Device')}</th>
                <th>{t('VPN?')}</th>
                <th>{t('Details')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0' }}>
                    <span className="spinner" style={{ borderTopColor: '#3498db', width: '24px', height: '24px' }}></span>
                  </td>
                </tr>
              ) : logins.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    {t('No logins recorded yet.')}
                  </td>
                </tr>
              ) : (
                logins.map((row, index) => {
                  const user = row.telegram_user || {};
                  const dev = row.device_info || {};
                  const net = row.network_info || {};
                  const rawTimestamp = (row.timestamp || "").replace("Z", "");
                  const timeGmt8 = new Date(rawTimestamp).toLocaleString("en-US", { hour12: true });
                  return (
                    <tr key={row._id || index}>
                      <td>
                        <strong>Orig: {net.original_ip || 'N/A'}</strong><br />
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>Proxy: {net.active_proxy_ip || 'N/A'}</span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{timeGmt8}</td>
                      <td>
                        <strong style={{ color: '#1e293b' }}>{user.first_name || ''} {user.last_name || ''}</strong><br />
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>{user.phone_number || ''}</span>
                        {user.username && (
                          <>
                            <br />
                            <span style={{ color: '#3498db', fontSize: '11px', fontWeight: 500 }}>@{user.username}</span>
                          </>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#1e293b' }}>{dev.manufacturer || ''} {dev.model || ''}</strong>
                        {dev.is_emulator && (
                          <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '10px' }}>
                            {t('Emulator')}
                          </span>
                        )}
                        <br />
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>Android {dev.os_version || ''}</span>
                      </td>
                      <td>
                        <span className={`badge ${net.is_using_vpn ? 'badge-success' : 'badge-danger'}`}>
                          {net.is_using_vpn ? t('YES') : t('NO')}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn" 
                          style={{ padding: '6px 10px', background: '#3498db', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setDetailsPayload(row)}
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

        {/* Paginated list bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', padding: '10px', background: '#f8fafc', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 8px 8px', marginTop: '-1px' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            {t('Showing')} {startItem}-{endItem} {t('of')} {totalLogins} {t('records')}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="btn" 
              style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '13px', padding: '0 8px' }}>
              {currentPage} / {totalPages || 1}
            </span>
            <button 
              className="btn" 
              style={{ padding: '4px 8px', background: '#e2e8f0', color: '#334155' }} 
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Details modal overlay */}
      {detailsPayload && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', border: 'none', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{t('Full Login Payload')}</h3>
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

export default UserLoginDetails;
export { UserLoginDetails };
