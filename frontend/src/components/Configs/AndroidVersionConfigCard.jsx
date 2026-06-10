import React from 'react';
import { Sliders, Save, CheckCircle, XCircle, History } from 'lucide-react';

const AndroidVersionConfigCard = ({
  androidVersionCode,
  setAndroidVersionCode,
  androidVersionName,
  setAndroidVersionName,
  androidDownloadUrl,
  setAndroidDownloadUrl,
  androidChangelog,
  setAndroidChangelog,
  androidForceUpdate,
  setAndroidForceUpdate,
  androidVersionSaving,
  androidVersionNotification,
  androidVersionLogsExpanded,
  setAndroidVersionLogsExpanded,
  androidVersionLogs,
  androidVersionLogsLoading,
  fetchAndroidVersionLogs,
  handleAndroidVersionSubmit,
  t
}) => {
  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <h2 className="card-title">
        <Sliders size={20} color="#3498db" />
        {t('App Version Configuration (Android)')}
      </h2>
      <p className="card-subtitle">{t('Configure update metrics served at /api/android/version')}</p>
      
      <form onSubmit={handleAndroidVersionSubmit}>
        <div className="grid grid-cols-2" style={{ gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="androidVersionCode">{t('Version Code')}</label>
            <input
              type="number"
              id="androidVersionCode"
              className="form-control"
              placeholder="e.g. 6514"
              value={androidVersionCode}
              onChange={(e) => setAndroidVersionCode(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="androidVersionName">{t('Version Name')}</label>
            <input
              type="text"
              id="androidVersionName"
              className="form-control"
              placeholder="e.g. 12.4.5"
              value={androidVersionName}
              onChange={(e) => setAndroidVersionName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '16px' }}>
          <label htmlFor="androidDownloadUrl">{t('Download URL')}</label>
          <input
            type="text"
            id="androidDownloadUrl"
            className="form-control"
            placeholder="https://..."
            value={androidDownloadUrl}
            onChange={(e) => setAndroidDownloadUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="androidChangelog">{t('Changelog')}</label>
          <textarea
            id="androidChangelog"
            className="form-control"
            placeholder="Enter changelog details..."
            style={{ minHeight: '80px', resize: 'vertical' }}
            value={androidChangelog}
            onChange={(e) => setAndroidChangelog(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <input
            type="checkbox"
            id="androidForceUpdate"
            checked={androidForceUpdate}
            onChange={(e) => setAndroidForceUpdate(e.target.checked)}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <label htmlFor="androidForceUpdate" style={{ cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>
            {t('Require Force Update')}
          </label>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={androidVersionSaving}
        >
          <Save size={16} />
          {androidVersionSaving ? t('Saving...') : t('Save Configuration')}
        </button>
      </form>

      {androidVersionNotification && (
        <div className={`notification notification-${androidVersionNotification.type}`}>
          {androidVersionNotification.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{androidVersionNotification.message}</span>
        </div>
      )}

      {/* Android Version Change History Panel */}
      <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '20px' }}>
        <button 
          type="button" 
          onClick={() => {
            setAndroidVersionLogsExpanded(!androidVersionLogsExpanded);
            if (!androidVersionLogsExpanded && androidVersionLogs.length === 0) fetchAndroidVersionLogs();
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
          {androidVersionLogsExpanded ? t('Hide Change History') : t('View Change History')}
        </button>

        {androidVersionLogsExpanded && (
          <div style={{ marginTop: '16px' }}>
            {androidVersionLogsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <span className="spinner" style={{ borderTopColor: '#3498db', width: '20px', height: '20px' }}></span>
              </div>
            ) : androidVersionLogs.length === 0 ? (
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
                    {androidVersionLogs.map((log) => (
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

export default AndroidVersionConfigCard;
