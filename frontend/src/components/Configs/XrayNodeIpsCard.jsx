import React from 'react';
import { Network, Trash2, Plus, Save, CheckCircle, XCircle } from 'lucide-react';

const XrayNodeIpsCard = ({
  transitLoading,
  transitIps,
  handleTransitIpChange,
  removeTransitIpRow,
  addTransitIpRow,
  transitRemarks,
  setTransitRemarks,
  handleTransitSubmit,
  transitSaving,
  transitNotification,
  t
}) => {
  return (
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
  );
};

export default XrayNodeIpsCard;
