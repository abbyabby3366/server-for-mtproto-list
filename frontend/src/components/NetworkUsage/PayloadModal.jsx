import React from 'react';
import { X } from 'lucide-react';

const PayloadModal = ({ payload, onClose, t }) => {
  if (!payload) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', border: 'none', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{t('Full Network Payload')}</h3>
          <button 
            onClick={onClose} 
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
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default PayloadModal;
