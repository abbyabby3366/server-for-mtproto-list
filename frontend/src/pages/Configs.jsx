import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Sliders, 
  Globe, 
  Network, 
  Plus, 
  Trash2, 
  Save, 
  Edit3,
  CheckCircle,
  XCircle,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const Configs = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();

  // ----- VERSION CONFIG STATE -----
  const [versionCode, setVersionCode] = useState('');
  const [versionName, setVersionName] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [changelog, setChangelog] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [versionSaving, setVersionSaving] = useState(false);
  const [versionNotification, setVersionNotification] = useState(null);

  // ----- EXTERNAL REDIRECTS STATE -----
  const [extDownloadUrl, setExtDownloadUrl] = useState('');
  const [extToken, setExtToken] = useState('');
  const [extEditable, setExtEditable] = useState(false);
  const [extUpdating, setExtUpdating] = useState(false);
  const [extConfigSaving, setExtConfigSaving] = useState(false);
  const [extNotification, setExtNotification] = useState(null);
  const [extResults, setExtResults] = useState(null);
  const [extRedirectsOpen, setExtRedirectsOpen] = useState(false);
  const [domains, setDomains] = useState({
    'talkpro.cc': true,
    'talkspro.xyz': true,
    'talkpro.org': true,
  });

  // ----- TRANSIT IPS STATE -----
  const [transitIps, setTransitIps] = useState([]);
  const [transitRemarks, setTransitRemarks] = useState('');
  const [transitSaving, setTransitSaving] = useState(false);
  const [transitNotification, setTransitNotification] = useState(null);
  const [transitLoading, setTransitLoading] = useState(true);

  // ----- MT PROXIES STATE -----
  const [proxies, setProxies] = useState([]);
  const [proxiesRemarks, setProxiesRemarks] = useState('');
  const [proxiesSaving, setProxiesSaving] = useState(false);
  const [proxiesNotification, setProxiesNotification] = useState(null);
  const [proxiesLoading, setProxiesLoading] = useState(true);

  // ----- LOGGING & TELEMETRY HISTORY STATE -----
  const [versionLogs, setVersionLogs] = useState([]);
  const [versionLogsLoading, setVersionLogsLoading] = useState(false);
  const [versionLogsExpanded, setVersionLogsExpanded] = useState(false);
  const [redirectLogs, setRedirectLogs] = useState([]);
  const [redirectLogsLoading, setRedirectLogsLoading] = useState(false);
  const [redirectLogsExpanded, setRedirectLogsExpanded] = useState(false);

  // Load changelog history for App Versions
  const fetchVersionLogs = async () => {
    try {
      setVersionLogsLoading(true);
      const res = await authFetch('/api/android/version/logs');
      if (res.ok) {
        const data = await res.json();
        setVersionLogs(data);
      }
    } catch (err) {
      console.error('Error fetching version logs:', err);
    } finally {
      setVersionLogsLoading(false);
    }
  };

  // Load update activity logs for External Redirects
  const fetchRedirectLogs = async () => {
    try {
      setRedirectLogsLoading(true);
      const res = await authFetch('/api/external-redirects/logs');
      if (res.ok) {
        const data = await res.json();
        setRedirectLogs(data);
      }
    } catch (err) {
      console.error('Error fetching redirect logs:', err);
    } finally {
      setRedirectLogsLoading(false);
    }
  };

  // Load configs and history logs on mount
  useEffect(() => {
    // 1. Fetch version configuration
    const fetchVersion = async () => {
      try {
        const res = await authFetch('/api/android/version');
        if (res.ok) {
          const data = await res.json();
          setVersionCode(data.versionCode || '');
          setVersionName(data.versionName || '');
          setDownloadUrl(data.downloadUrl || '');
          setChangelog(data.changelog || '');
          setForceUpdate(data.forceUpdate || false);
        }
      } catch (err) {
        console.error('Error fetching version config:', err);
      }
    };

    // 2. Fetch external redirects config
    const fetchExternalConfig = async () => {
      try {
        const res = await authFetch('/api/external-redirect-config');
        if (res.ok) {
          const data = await res.json();
          setExtDownloadUrl(data.downloadUrl || '');
          setExtToken(data.token || '');
        }
      } catch (err) {
        console.error('Error fetching external config:', err);
      }
    };

    // 3. Fetch transit node IPs
    const fetchTransitIps = async () => {
      try {
        const res = await authFetch('/api/transit-ips');
        if (res.ok) {
          const data = await res.json();
          // The API returns { ips: [], remarks: '' } for the UI
          setTransitIps(data.ips || []);
          setTransitRemarks(data.remarks || '');
        }
      } catch (err) {
        console.error('Error fetching transit IPs:', err);
      } finally {
        setTransitLoading(false);
      }
    };

    // 4. Fetch MT Proxies
    const fetchProxies = async () => {
      try {
        const res = await authFetch('/api/proxies');
        if (res.ok) {
          const data = await res.json();
          setProxies(data.proxies || []);
          setProxiesRemarks(data.remarks || '');
        }
      } catch (err) {
        console.error('Error fetching proxies:', err);
      } finally {
        setProxiesLoading(false);
      }
    };

    fetchVersion();
    fetchExternalConfig();
    fetchTransitIps();
    fetchProxies();
    fetchVersionLogs();
    fetchRedirectLogs();
  }, [authFetch]);

  // Handle version form submit
  const handleVersionSubmit = async (e) => {
    e.preventDefault();
    setVersionSaving(true);
    setVersionNotification(null);

    const payload = {
      versionCode: parseInt(versionCode, 10),
      versionName,
      downloadUrl,
      changelog,
      forceUpdate
    };

    try {
      const res = await authFetch('/api/android/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showNotification(setVersionNotification, t('Configuration saved successfully!'), 'success');
        fetchVersionLogs();
      } else {
        showNotification(setVersionNotification, t('Failed to save configuration.'), 'error');
      }
    } catch (err) {
      showNotification(setVersionNotification, t('Error saving configuration.'), 'error');
    } finally {
      setVersionSaving(false);
    }
  };

  // Toggle domain redirect checkbox
  const handleDomainCheckbox = (domain) => {
    setDomains((prev) => ({ ...prev, [domain]: !prev[domain] }));
  };

  // Enable/Disable editing external config
  const handleExtEdit = () => {
    setExtEditable((prev) => !prev);
  };

  // Save Token/URL for external configs to db
  const handleSaveExtConfig = async () => {
    setExtConfigSaving(true);
    setExtNotification(null);
    try {
      const res = await authFetch('/api/external-redirect-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: extDownloadUrl, token: extToken })
      });

      if (res.ok) {
        showNotification(setExtNotification, t('Configuration saved to DB successfully!'), 'success');
        setExtEditable(false);
      } else {
        showNotification(setExtNotification, t('Failed to save configuration.'), 'error');
      }
    } catch (err) {
      showNotification(setExtNotification, t('Error saving configuration.'), 'error');
    } finally {
      setExtConfigSaving(false);
    }
  };

  // Update external redirects triggering endpoint API posts
  const handleUpdateExternalRedirects = async (e) => {
    e.preventDefault();
    setExtUpdating(true);
    setExtNotification(null);
    setExtResults(null);

    const selectedDomains = Object.keys(domains).filter((d) => domains[d]);
    if (selectedDomains.length === 0) {
      showNotification(setExtNotification, t('Please select at least one domain.'), 'error');
      setExtUpdating(false);
      return;
    }

    const payload = {
      downloadUrl: extDownloadUrl,
      token: extToken,
      domains: selectedDomains
    };

    try {
      const res = await authFetch('/api/external-redirect-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Wait, in server.js we saw the endpoint is POST /api/external-redirects
      // Let's verify the endpoint name: it's app.post('/api/external-redirects', verifyToken, async (req, res) => { ... })
      // Ah! Yes, it's '/api/external-redirects'! Let's make sure we call '/api/external-redirects'.
      const actualRes = await authFetch('/api/external-redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await actualRes.json();
      if (actualRes.ok) {
        const allSuccess = data.results.every((r) => r.status === 'success');
        if (allSuccess) {
          showNotification(setExtNotification, t('All redirects updated successfully!'), 'success');
        } else {
          showNotification(setExtNotification, t('Some updates failed. Check results below.'), 'error');
        }
        setExtResults(data.results);
        fetchRedirectLogs();
      } else {
        showNotification(setExtNotification, data.error || t('Failed to update redirects.'), 'error');
      }
    } catch (err) {
      showNotification(setExtNotification, t('Error updating redirects.'), 'error');
    } finally {
      setExtUpdating(false);
    }
  };

  // ----- TRANSIT IPS LIST OPERATIONS -----
  const addTransitIpRow = () => {
    setTransitIps((prev) => [...prev, '']);
  };

  const removeTransitIpRow = (index) => {
    setTransitIps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTransitIpChange = (index, value) => {
    setTransitIps((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleTransitSubmit = async () => {
    setTransitSaving(true);
    setTransitNotification(null);

    // Clean up empty IPs
    const cleanIps = transitIps.map((ip) => ip.trim()).filter((ip) => ip.length > 0);

    try {
      const res = await authFetch('/api/transit-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: cleanIps, remarks: transitRemarks })
      });

      if (res.ok) {
        showNotification(
          setTransitNotification,
          `${t('XRAY IPs & Remarks saved successfully!')} (${cleanIps.length} IP${cleanIps.length !== 1 ? 's' : ''})`,
          'success'
        );
        // Refresh local array
        setTransitIps(cleanIps);
      } else {
        showNotification(setTransitNotification, t('Failed to save Xray IPs.'), 'error');
      }
    } catch (err) {
      showNotification(setTransitNotification, t('Error saving Xray IPs.'), 'error');
    } finally {
      setTransitSaving(false);
    }
  };

  // ----- MT PROXIES LIST OPERATIONS -----
  const addProxyRow = () => {
    setProxies((prev) => [...prev, { host: '', port: 443, secret: '' }]);
  };

  const removeProxyRow = (index) => {
    setProxies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProxyChange = (index, field, value) => {
    setProxies((prev) => {
      const copy = [...prev];
      copy[index] = { 
        ...copy[index], 
        [field]: field === 'port' ? (value === '' ? '' : parseInt(value, 10) || 0) : value 
      };
      return copy;
    });
  };

  const handleProxiesSubmit = async () => {
    setProxiesSaving(true);
    setProxiesNotification(null);

    // Clean up empty proxies (require host and secret to be present)
    const cleanProxies = proxies
      .map((p) => ({
        host: p.host?.trim() || '',
        port: parseInt(p.port, 10) || 443,
        secret: p.secret?.trim() || ''
      }))
      .filter((p) => p.host.length > 0 && p.secret.length > 0);

    try {
      const res = await authFetch('/api/proxies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies: cleanProxies, remarks: proxiesRemarks })
      });

      if (res.ok) {
        showNotification(
          setProxiesNotification,
          `${t('MT Proxies & Remarks saved successfully!')} (${cleanProxies.length} Prox${cleanProxies.length !== 1 ? 'ies' : 'y'})`,
          'success'
        );
        setProxies(cleanProxies);
      } else {
        showNotification(setProxiesNotification, t('Failed to save MT Proxies.'), 'error');
      }
    } catch (err) {
      showNotification(setProxiesNotification, t('Error saving MT Proxies.'), 'error');
    } finally {
      setProxiesSaving(false);
    }
  };



  // Helper notification timer
  const showNotification = (setter, message, type) => {
    setter({ message, type });
    setTimeout(() => {
      setter(null);
    }, 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. APP VERSION CONFIGURATION */}
      <div className="card">
        <h2 className="card-title">
          <Sliders size={20} color="#3498db" />
          {t('App Version Configuration')}
        </h2>
        <p className="card-subtitle">{t('Configure update metrics served at /api/android/version')}</p>
        
        <form onSubmit={handleVersionSubmit}>
          <div className="grid grid-cols-2" style={{ gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="versionCode">{t('Version Code')}</label>
              <input
                type="number"
                id="versionCode"
                className="form-control"
                placeholder="e.g. 6514"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="versionName">{t('Version Name')}</label>
              <input
                type="text"
                id="versionName"
                className="form-control"
                placeholder="e.g. 12.4.5"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="downloadUrl">{t('Download URL')}</label>
            <input
              type="text"
              id="downloadUrl"
              className="form-control"
              placeholder="https://..."
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="changelog">{t('Changelog')}</label>
            <textarea
              id="changelog"
              className="form-control"
              placeholder="Enter changelog details..."
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <input
              type="checkbox"
              id="forceUpdate"
              checked={forceUpdate}
              onChange={(e) => setForceUpdate(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="forceUpdate" style={{ cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>
              {t('Require Force Update')}
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={versionSaving}
          >
            <Save size={16} />
            {versionSaving ? t('Saving...') : t('Save Configuration')}
          </button>
        </form>

        {versionNotification && (
          <div className={`notification notification-${versionNotification.type}`}>
            {versionNotification.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <span>{versionNotification.message}</span>
          </div>
        )}

        {/* App Version Change History Panel */}
        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '20px' }}>
          <button 
            type="button" 
            onClick={() => {
              setVersionLogsExpanded(!versionLogsExpanded);
              if (!versionLogsExpanded && versionLogs.length === 0) fetchVersionLogs();
            }}
            className="btn btn-outline" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: 'transparent', 
              color: '#3498db', 
              border: '1px solid #3498db',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            <History size={14} />
            {versionLogsExpanded ? t('Hide Change History') : t('View Change History')}
          </button>

          {versionLogsExpanded && (
            <div style={{ marginTop: '16px' }}>
              {versionLogsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <span className="spinner" style={{ borderTopColor: '#3498db', width: '20px', height: '20px' }}></span>
                </div>
              ) : versionLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                  {t('No change logs recorded yet.')}
                </p>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '12px' }}>
                  <table style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '180px' }}>{t('Time & Operator')}</th>
                        <th>{t('Changed Fields')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versionLogs.map((log) => (
                        <tr key={log._id}>
                          <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              by <span style={{ fontWeight: 500, color: '#3498db' }}>{log.user?.username}</span>
                              <span className="badge badge-info" style={{ marginLeft: '4px', fontSize: '9px', padding: '2px 4px' }}>
                                {log.user?.role}
                              </span>
                            </div>
                          </td>
                          <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                            {log.previousConfig ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <table style={{ border: '1px solid #e2e8f0', width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                      <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>{t('Parameter')}</th>
                                      <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>{t('Previous Value')}</th>
                                      <th style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>{t('New Value')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {['versionCode', 'versionName', 'downloadUrl', 'changelog', 'forceUpdate'].map((field) => {
                                      const isChanged = log.changedFields?.includes(field);
                                      const prevVal = String(log.previousConfig[field]);
                                      const newVal = String(log.newConfig[field]);
                                      return (
                                        <tr key={field} style={{ 
                                          borderBottom: '1px solid #e2e8f0',
                                          backgroundColor: isChanged ? '#fffbeb' : 'transparent',
                                          transition: 'background-color 0.2s'
                                        }}>
                                          <td style={{ padding: '6px', fontWeight: 500, color: isChanged ? '#d97706' : 'inherit' }}>
                                            {t(field.charAt(0).toUpperCase() + field.slice(1))}
                                          </td>
                                          <td style={{ 
                                            padding: '6px', 
                                            color: isChanged ? '#d97706' : 'var(--text-muted)',
                                            textDecoration: isChanged ? 'line-through' : 'none',
                                            wordBreak: 'break-all'
                                          }}>
                                            {field === 'forceUpdate' ? (log.previousConfig[field] ? t('Yes') : t('No')) : prevVal || '-'}
                                          </td>
                                          <td style={{ 
                                            padding: '6px', 
                                            fontWeight: isChanged ? 600 : 'normal',
                                            color: isChanged ? '#b45309' : 'var(--text-main)',
                                            wordBreak: 'break-all'
                                          }}>
                                            {field === 'forceUpdate' ? (log.newConfig[field] ? t('Yes') : t('No')) : newVal || '-'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div>
                                <span className="badge badge-success">{t('Initial Configuration')}</span>
                                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                  <strong>{t('Code')}:</strong> {log.newConfig?.versionCode} | <strong>{t('Name')}:</strong> {log.newConfig?.versionName}
                                </div>
                                <div style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                                  <strong>{t('URL')}:</strong> {log.newConfig?.downloadUrl}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. EXTERNAL REDIRECTS CONFIG */}
      <div className="card" style={{ transition: 'all 0.3s ease' }}>
        <div 
          onClick={() => setExtRedirectsOpen(!extRedirectsOpen)}
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={20} color="#e67e22" />
              {t('External Redirects')}
            </h2>
            <span 
              className="badge" 
              style={{ 
                backgroundColor: '#fee2e2', 
                color: '#ef4444', 
                fontSize: '11px', 
                padding: '3px 8px', 
                fontWeight: 600,
                border: '1px solid #fecaca',
                marginLeft: '6px'
              }}
            >
              {t('Deprecated')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            {extRedirectsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
        
        {!extRedirectsOpen && (
          <p className="card-subtitle" style={{ margin: '8px 0 0 0', fontStyle: 'italic', fontSize: '12px' }}>
            {t('Click to expand this deprecated section.')}
          </p>
        )}

        {extRedirectsOpen && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <p className="card-subtitle">
              {t('Update the APK download redirect link on external domains (e.g., talkpro.cc).')}
            </p>

        <form onSubmit={handleUpdateExternalRedirects}>
          <div className="form-group">
            <label htmlFor="extDownloadUrl">{t('Download URL')}</label>
            <input
              type="text"
              id="extDownloadUrl"
              className="form-control"
              placeholder="https://..."
              value={extDownloadUrl}
              onChange={(e) => setExtDownloadUrl(e.target.value)}
              readOnly={!extEditable}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="extToken">{t('Authorization Token')}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                id="extToken"
                className="form-control"
                placeholder="Bearer token prefix..."
                value={extToken}
                onChange={(e) => setExtToken(e.target.value)}
                readOnly={!extEditable}
                required
              />
              <button 
                type="button" 
                onClick={handleExtEdit} 
                className="btn btn-warning"
                style={{ backgroundColor: extEditable ? '#95a5a6' : '#f39c12' }}
              >
                <Edit3 size={16} />
                {extEditable ? t('Cancel') : t('Edit Config')}
              </button>
              {extEditable && (
                <button 
                  type="button" 
                  onClick={handleSaveExtConfig} 
                  className="btn btn-success"
                  disabled={extConfigSaving}
                >
                  <Save size={16} />
                  {extConfigSaving ? t('Saving...') : t('Save')}
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600 }}>{t('Domains to Update')}</label>
            <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
              {Object.keys(domains).map((domain) => (
                <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    id={`domain-${domain}`}
                    checked={domains[domain]}
                    onChange={() => handleDomainCheckbox(domain)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor={`domain-${domain}`} style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
                    {domain}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={extUpdating}
            style={{ backgroundColor: '#e67e22' }}
          >
            <Globe size={16} />
            {extUpdating ? t('Updating...') : t('Update External Redirects')}
          </button>
        </form>

        {extNotification && (
          <div className={`notification notification-${extNotification.type}`}>
            {extNotification.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <span>{extNotification.message}</span>
          </div>
        )}

        {extResults && (
          <pre style={{ 
            marginTop: '16px', 
            backgroundColor: '#f8fafc', 
            padding: '12px', 
            borderRadius: '8px', 
            fontSize: '12px', 
            fontFamily: 'monospace',
            color: '#334155',
            border: '1px solid var(--border-color)',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {JSON.stringify(extResults, null, 2)}
          </pre>
        )}

        {/* External Redirects Telemetry Activity Panel */}
        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '20px' }}>
          <button 
            type="button" 
            onClick={() => {
              setRedirectLogsExpanded(!redirectLogsExpanded);
              if (!redirectLogsExpanded && redirectLogs.length === 0) fetchRedirectLogs();
            }}
            className="btn btn-outline" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: 'transparent', 
              color: '#e67e22', 
              border: '1px solid #e67e22',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            <History size={14} />
            {redirectLogsExpanded ? t('Hide Update Activity') : t('View Update Activity')}
          </button>

          {redirectLogsExpanded && (
            <div style={{ marginTop: '16px' }}>
              {redirectLogsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <span className="spinner" style={{ borderTopColor: '#e67e22', width: '20px', height: '20px' }}></span>
                </div>
              ) : redirectLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                  {t('No update logs recorded yet.')}
                </p>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '12px' }}>
                  <table style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '180px' }}>{t('Time & Operator')}</th>
                        <th style={{ width: '250px' }}>{t('Details')}</th>
                        <th>{t('API Query Responses')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redirectLogs.map((log) => (
                        <tr key={log._id}>
                          <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              by <span style={{ fontWeight: 500, color: '#e67e22' }}>{log.user?.username}</span>
                              <span className="badge badge-info" style={{ marginLeft: '4px', fontSize: '9px', padding: '2px 4px', backgroundColor: '#e67e22', color: 'white' }}>
                                {log.user?.role}
                              </span>
                            </div>
                          </td>
                          <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                            <div style={{ wordBreak: 'break-all', fontSize: '12px', color: 'var(--text-muted)' }}>
                              <strong>{t('URL')}:</strong> <span style={{ color: 'var(--text-main)' }}>{log.downloadUrl}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              <strong>{t('Token')}:</strong> <code style={{ fontSize: '11px' }}>{log.token ? (log.token.length > 12 ? `${log.token.substring(0, 8)}...${log.token.substring(log.token.length - 4)}` : log.token) : '-'}</code>
                            </div>
                          </td>
                          <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {log.results && log.results.map((res, rIdx) => {
                                const isSuccess = res.status === 'success';
                                return (
                                  <div key={rIdx} style={{ 
                                    display: 'flex', 
                                    alignItems: 'flex-start', 
                                    gap: '6px',
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: isSuccess ? '#f0fdf4' : '#fef2f2',
                                    border: `1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'}`,
                                    fontSize: '12px'
                                  }}>
                                    <span style={{ 
                                      color: isSuccess ? '#16a34a' : '#dc2626',
                                      fontWeight: 'bold',
                                      fontSize: '14px',
                                      lineHeight: '1'
                                    }}>
                                      {isSuccess ? '✓' : '✗'}
                                    </span>
                                    <div>
                                      <span style={{ fontWeight: 600, color: isSuccess ? '#15803d' : '#991b1b' }}>{res.domain}</span>
                                      {!isSuccess && res.error && (
                                        <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '2px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                                          {res.error}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
          </div>
        )}
      </div>

      {/* 3. XRAY NODE IPS */}
      <div className="card">
        <h2 className="card-title">
          <Network size={20} color="#2ecc71" />
          {t('XRAY Node IPs')}
        </h2>

        {transitLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <span className="spinner" style={{ borderTopColor: '#2ecc71' }}></span>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {transitIps.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic', padding: '10px 0' }}>
                  {t('No Xray IPs configured. Click "+ Add IP Address" to get started.')}
                </div>
              ) : (
                transitIps.map((ip, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 600, color: '#94a3b8', minWidth: '24px', textAlign: 'right' }}>
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 95.40.68.126"
                      value={ip}
                      onChange={(e) => handleTransitIpChange(index, e.target.value)}
                      style={{ maxWidth: '300px' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => removeTransitIpRow(index)} 
                      className="btn btn-danger" 
                      style={{ padding: '8px 12px' }}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button 
              type="button" 
              onClick={addTransitIpRow} 
              className="btn btn-success" 
              style={{ marginBottom: '20px' }}
            >
              <Plus size={16} />
              {t('+ Add IP Address')}
            </button>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
              <label 
                htmlFor="transitRemarks" 
                style={{ fontWeight: 600, display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-main)' }}
              >
                {t('Remarks / Scratchpad')}
              </label>
              <textarea
                id="transitRemarks"
                className="form-control"
                placeholder="Paste notes, older IPs, or scratchpad text here..."
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={transitRemarks}
                onChange={(e) => setTransitRemarks(e.target.value)}
              />
            </div>

            <button 
              type="button" 
              onClick={handleTransitSubmit} 
              className="btn btn-primary" 
              style={{ marginTop: '20px', backgroundColor: '#2ecc71' }}
              disabled={transitSaving}
            >
              <Save size={16} />
              {transitSaving ? t('Saving...') : t('Save XRAY IPs & Remarks')}
            </button>
          </div>
        )}

        {transitNotification && (
          <div className={`notification notification-${transitNotification.type}`}>
            {transitNotification.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <span>{transitNotification.message}</span>
          </div>
        )}
      </div>

      {/* 4. MT PROXIES */}
      <div className="card">
        <h2 className="card-title">
          <Network size={20} color="#9b59b6" />
          {t('MT Proxies')}
        </h2>

        {proxiesLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <span className="spinner" style={{ borderTopColor: '#9b59b6' }}></span>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {proxies.length === 0 ? (
                <div style={{ color: '#64748b', fontStyle: 'italic', padding: '10px 0' }}>
                  {t('No MT Proxies configured. Click "+ Add Proxy" to get started.')}
                </div>
              ) : (
                proxies.map((p, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#94a3b8', minWidth: '24px', textAlign: 'right' }}>
                      {index + 1}.
                    </span>
                    
                    <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={t('Host (e.g. 13.212.194.160)')}
                        value={p.host || ''}
                        onChange={(e) => handleProxyChange(index, 'host', e.target.value)}
                        style={{ flex: '2 1 180px' }}
                      />
                      
                      <input
                        type="number"
                        className="form-control"
                        placeholder={t('Port (e.g. 443)')}
                        value={p.port === '' ? '' : p.port}
                        onChange={(e) => handleProxyChange(index, 'port', e.target.value)}
                        style={{ flex: '1 1 80px', maxWidth: '100px' }}
                      />
                      
                      <input
                        type="text"
                        className="form-control"
                        placeholder={t('Secret (hex)')}
                        value={p.secret || ''}
                        onChange={(e) => handleProxyChange(index, 'secret', e.target.value)}
                        style={{ flex: '3 1 240px' }}
                      />
                    </div>

                    <button 
                      type="button" 
                      onClick={() => removeProxyRow(index)} 
                      className="btn btn-danger" 
                      style={{ padding: '8px 12px' }}
                      title={t('Remove')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button 
              type="button" 
              onClick={addProxyRow} 
              className="btn btn-success" 
              style={{ marginBottom: '20px', backgroundColor: '#9b59b6' }}
            >
              <Plus size={16} />
              {t('+ Add Proxy')}
            </button>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
              <label 
                htmlFor="proxiesRemarks" 
                style={{ fontWeight: 600, display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text-main)' }}
              >
                {t('Remarks / Scratchpad')}
              </label>
              <textarea
                id="proxiesRemarks"
                className="form-control"
                placeholder={t('Paste notes, backup config strings, or scratchpad text here...')}
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={proxiesRemarks}
                onChange={(e) => setProxiesRemarks(e.target.value)}
              />
            </div>

            <button 
              type="button" 
              onClick={handleProxiesSubmit} 
              className="btn btn-primary" 
              style={{ marginTop: '20px', backgroundColor: '#9b59b6' }}
              disabled={proxiesSaving}
            >
              <Save size={16} />
              {proxiesSaving ? t('Saving...') : t('Save MT Proxies & Remarks')}
            </button>
          </div>
        )}

        {proxiesNotification && (
          <div className={`notification notification-${proxiesNotification.type}`}>
            {proxiesNotification.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            <span>{proxiesNotification.message}</span>
          </div>
        )}
      </div>

    </div>
  );
};

export default Configs;
export { Configs };
