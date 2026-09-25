import React, { useState, useEffect } from 'react';
import { Globe, Trash2, Plus, Save, CheckCircle, XCircle, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const PROXY_TYPES = ['socks5', 'http', 'https', 'socks4'];

const WebProxiesCard = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();

  const [proxies, setProxies] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);

  // Fetch web proxies from backend
  const fetchWebProxies = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/web-proxies');
      if (res.ok) {
        const data = await res.json();
        setProxies(data.proxies || []);
        setRemarks(data.remarks || '');
      } else {
        const errorData = await res.json().catch(() => ({}));
        showNotification(errorData.error || t('Failed to load Web Proxies.'), 'error');
      }
    } catch (err) {
      showNotification(t('Error loading Web Proxies: ') + (err.message || 'Network error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebProxies();
  }, [authFetch]);

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...proxies];
    updated[index] = { ...updated[index], [field]: value };
    setProxies(updated);
  };

  const togglePasswordVisibility = (index) => {
    setShowPasswords((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleAddProxy = () => {
    setProxies([
      ...proxies,
      {
        type: 'socks5',
        host: '',
        port: 443,
        username: '',
        password: '',
        disabled: false
      }
    ]);
  };

  const requestDeleteRow = (index) => {
    setDeleteConfirmIndex(index);
  };

  const confirmDeleteRow = () => {
    if (deleteConfirmIndex !== null && deleteConfirmIndex >= 0 && deleteConfirmIndex < proxies.length) {
      const updated = proxies.filter((_, idx) => idx !== deleteConfirmIndex);
      setProxies(updated);
      setDeleteConfirmIndex(null);
    }
  };

  const cancelDeleteRow = () => {
    setDeleteConfirmIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);

    // Validation
    const invalidRows = [];
    proxies.forEach((p, idx) => {
      const host = p.host ? p.host.trim() : '';
      const port = Number(p.port);
      if (!host || isNaN(port) || port <= 0 || port > 65535) {
        invalidRows.push(idx + 1);
      }
    });

    if (invalidRows.length > 0) {
      setSaving(false);
      showNotification(
        `Row(s) ${invalidRows.join(', ')} must have a valid Host and Port (1-65535).`,
        'error'
      );
      return;
    }

    const payloadProxies = proxies.map((p) => ({
      type: p.type || 'socks5',
      host: p.host.trim(),
      port: Number(p.port),
      username: p.username ? p.username.trim() : '',
      password: p.password ? p.password.trim() : '',
      disabled: Boolean(p.disabled)
    }));

    try {
      const res = await authFetch('/api/web-proxies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies: payloadProxies, remarks })
      });

      if (res.ok) {
        showNotification(
          `${t('Web Proxies & Remarks saved successfully!')} (${payloadProxies.length} Prox${payloadProxies.length !== 1 ? 'ies' : 'y'})`,
          'success'
        );
        setProxies(payloadProxies);
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.error || t('Failed to save Web Proxies.'), 'error');
      }
    } catch (err) {
      showNotification(t('Error saving Web Proxies: ') + (err.message || 'Network error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const targetProxyToDelete = deleteConfirmIndex !== null ? proxies[deleteConfirmIndex] : null;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          <Globe size={20} color="#0284c7" />
          {t('Web Proxies')}
        </h2>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Endpoint: <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>GET /web-proxies</code>
        </span>
      </div>

      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
        {t('Manage the list of SOCKS5 / HTTP web proxies served at')} <strong>/web-proxies</strong>
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <span className="spinner" style={{ borderTopColor: '#0284c7' }}></span>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
            {proxies.length === 0 ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '12px 0' }}>
                {t('No Web Proxies configured. Click "+ Add Web Proxy" to get started.')}
              </div>
            ) : (
              proxies.map((p, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '12px',
                    opacity: p.disabled ? 0.6 : 1
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#94a3b8', minWidth: '24px', textAlign: 'right' }}>
                    {index + 1}.
                  </span>

                  {/* Type Selector */}
                  <div style={{ minWidth: '110px', flex: '1 1 110px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                      {t('Type')}
                    </label>
                    <select
                      className="form-control"
                      value={p.type || 'socks5'}
                      onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: '13px' }}
                    >
                      {PROXY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Host */}
                  <div style={{ minWidth: '160px', flex: '2 1 160px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                      Host / IP
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 13.214.162.135"
                      value={p.host || ''}
                      onChange={(e) => handleFieldChange(index, 'host', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: '13px' }}
                    />
                  </div>

                  {/* Port */}
                  <div style={{ minWidth: '80px', maxWidth: '100px', flex: '1 1 80px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                      Port
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="443"
                      value={p.port === '' ? '' : p.port}
                      onChange={(e) => handleFieldChange(index, 'port', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: '13px' }}
                    />
                  </div>

                  {/* Username */}
                  <div style={{ minWidth: '130px', flex: '1.5 1 130px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                      {t('Username')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. socksproxy"
                      value={p.username || ''}
                      onChange={(e) => handleFieldChange(index, 'username', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: '13px' }}
                    />
                  </div>

                  {/* Password with Eye toggle */}
                  <div style={{ minWidth: '160px', flex: '2 1 160px', position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                      {t('Password')}
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showPasswords[index] ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Password"
                        value={p.password || ''}
                        onChange={(e) => handleFieldChange(index, 'password', e.target.value)}
                        style={{ padding: '6px 32px 6px 8px', fontSize: '13px', width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(index)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={showPasswords[index] ? 'Hide password' : 'Show password'}
                      >
                        {showPasswords[index] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Status checkbox */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                      Active
                    </label>
                    <input
                      type="checkbox"
                      checked={!p.disabled}
                      onChange={(e) => handleFieldChange(index, 'disabled', !e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', marginTop: '4px' }}
                      title="Toggle active status"
                    />
                  </div>

                  {/* Delete button (opens confirmation prompt) */}
                  <div style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
                    <button
                      type="button"
                      onClick={() => requestDeleteRow(index)}
                      className="btn btn-danger"
                      style={{ padding: '7px 11px' }}
                      title={t('Remove')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={handleAddProxy}
            className="btn btn-success"
            style={{ marginBottom: '20px', backgroundColor: '#0284c7' }}
          >
            <Plus size={16} />
            {t('+ Add Web Proxy')}
          </button>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
            <label
              htmlFor="webProxiesRemarks"
              style={{ fontWeight: 600, display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-main)' }}
            >
              {t('Remarks / Scratchpad')}
            </label>
            <textarea
              id="webProxiesRemarks"
              className="form-control"
              placeholder={t('Paste notes, backup config strings, or scratchpad text here...')}
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            style={{ marginTop: '20px', backgroundColor: '#0284c7' }}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? t('Saving...') : t('Save Web Proxies & Remarks')}
          </button>
        </div>
      )}

      {notification && (
        <div className={`notification notification-${notification.type}`} style={{ marginTop: '16px' }}>
          {notification.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Confirmation Modal for Row Deletion (Rule 9 Compliance) */}
      {deleteConfirmIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              padding: '24px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '50%',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <h3 id="delete-dialog-title" style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('Confirm Remove Web Proxy')}
              </h3>
            </div>

            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('Are you sure you want to remove this web proxy?')}
              {targetProxyToDelete && (
                <span
                  style={{
                    display: 'block',
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#0f172a'
                  }}
                >
                  {(targetProxyToDelete.type || 'socks5').toUpperCase()} - {targetProxyToDelete.host || '(no host)'}:{targetProxyToDelete.port || 443}
                </span>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelDeleteRow}
                style={{ padding: '8px 16px' }}
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteRow}
                style={{ padding: '8px 16px' }}
              >
                <Trash2 size={14} />
                <span>{t('Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebProxiesCard;
