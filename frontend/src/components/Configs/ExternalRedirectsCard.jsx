import React from 'react';
import { Globe, ChevronUp, ChevronDown, Edit3, Save, CheckCircle, XCircle, History } from 'lucide-react';

const ExternalRedirectsCard = ({
  extDownloadUrl,
  setExtDownloadUrl,
  extToken,
  setExtToken,
  extEditable,
  handleExtEdit,
  extConfigSaving,
  handleSaveExtConfig,
  domains,
  handleDomainCheckbox,
  extUpdating,
  handleUpdateExternalRedirects,
  extNotification,
  extResults,
  redirectLogsExpanded,
  setRedirectLogsExpanded,
  redirectLogs,
  redirectLogsLoading,
  fetchRedirectLogs,
  extRedirectsOpen,
  setExtRedirectsOpen,
  t
}) => {
  return (
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
  );
};

export default ExternalRedirectsCard;
