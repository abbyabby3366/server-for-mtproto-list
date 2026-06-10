import React from 'react';
import { Network, Trash2, Plus, Save, CheckCircle, XCircle } from 'lucide-react';

const MtProxiesCard = ({
  proxiesLoading,
  proxies,
  handleProxyChange,
  removeProxyRow,
  addProxyRow,
  proxiesRemarks,
  setProxiesRemarks,
  handleProxiesSubmit,
  proxiesSaving,
  proxiesNotification,
  t
}) => {
  return (
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
  );
};

export default MtProxiesCard;
