import React from 'react';
import { Sliders, Save, CheckCircle, XCircle, History } from 'lucide-react';

const IosVersionConfigCard = ({
  iosVersionCode,
  setIosVersionCode,
  iosVersionName,
  setIosVersionName,
  iosDownloadUrl,
  setIosDownloadUrl,
  iosChangelog,
  setIosChangelog,
  iosForceUpdate,
  setIosForceUpdate,
  iosVersionSaving,
  iosVersionNotification,
  iosVersionLogsExpanded,
  setIosVersionLogsExpanded,
  iosVersionLogs,
  iosVersionLogsLoading,
  fetchIosVersionLogs,
  handleIosVersionSubmit,
  t
}) => {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h2 className="card-title">
        <Sliders size={20} color="#007aff" />
        {t('App Version Configuration (iOS)')}
      </h2>
      <p className="card-subtitle">{t('Configure update metrics served at /api/ios/version')}</p>
      
      <form onSubmit={handleIosVersionSubmit}>
        <div className="grid grid-cols-2" style={{ gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="iosVersionCode">{t('Version Code')}</label>
            <input
              type="number"
              id="iosVersionCode"
              className="form-control"
              placeholder="e.g. 120"
              value={iosVersionCode}
              onChange={(e) => setIosVersionCode(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="iosVersionName">{t('Version Name')}</label>
            <input
              type="text"
              id="iosVersionName"
              className="form-control"
              placeholder="e.g. 1.2.0"
              value={iosVersionName}
              onChange={(e) => setIosVersionName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '16px' }}>
          <label htmlFor="iosDownloadUrl">{t('Download URL')}</label>
          <input
            type="text"
            id="iosDownloadUrl"
            className="form-control"
            placeholder="https://apps.apple.com/app/id..."
            value={iosDownloadUrl}
            onChange={(e) => setIosDownloadUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="iosChangelog">{t('Changelog')}</label>
          <textarea
            id="iosChangelog"
            className="form-control"
            placeholder="Enter changelog details..."
            style={{ minHeight: '80px', resize: 'vertical' }}
            value={iosChangelog}
            onChange={(e) => setIosChangelog(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <input
            type="checkbox"
            id="iosForceUpdate"
            checked={iosForceUpdate}
            onChange={(e) => setIosForceUpdate(e.target.checked)}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <label htmlFor="iosForceUpdate" style={{ cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>
            {t('Require Force Update')}
          </label>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={iosVersionSaving}
          style={{ backgroundColor: '#007aff' }}
        >
          <Save size={16} />
          {iosVersionSaving ? t('Saving...') : t('Save Configuration')}
        </button>
      </form>

      {iosVersionNotification && (
        <div className={`notification notification-${iosVersionNotification.type}`}>
          {iosVersionNotification.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{iosVersionNotification.message}</span>
        </div>
      )}

      {/* iOS Version Change History Panel */}
      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '20px' }}>
        <button 
          type="button" 
          onClick={() => {
            setIosVersionLogsExpanded(!iosVersionLogsExpanded);
            if (!iosVersionLogsExpanded && iosVersionLogs.length === 0) fetchIosVersionLogs();
          }}
          className="btn btn-outline" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: 'transparent', 
            color: '#007aff', 
            border: '1px solid #007aff',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '13px',
            transition: 'all 0.2s'
          }}
        >
          <History size={14} />
          {iosVersionLogsExpanded ? t('Hide Change History') : t('View Change History')}
        </button>

        {iosVersionLogsExpanded && (
          <div style={{ marginTop: '16px' }}>
            {iosVersionLogsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <span className="spinner" style={{ borderTopColor: '#007aff', width: '20px', height: '20px' }}></span>
              </div>
            ) : iosVersionLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', margin: '8px 0 0 0' }}>
                {t('No change logs recorded yet.')}
              </p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '12px' }}>
                <table style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>{t('Time & Operator')}</th>
                      <th>{t('Changed Fields')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iosVersionLogs.map((log) => (
                      <tr key={log._id}>
                        <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            by <span style={{ fontWeight: 500, color: '#007aff' }}>{log.user?.username}</span>
                            <span className="badge badge-info" style={{ marginLeft: '4px', fontSize: '9px', padding: '2px 4px', backgroundColor: '#e0f2fe', color: '#007aff' }}>
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
                                          {t(field)}
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
  );
};

export default IosVersionConfigCard;
