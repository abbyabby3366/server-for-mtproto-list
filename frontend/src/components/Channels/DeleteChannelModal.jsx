import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DeleteChannelModal = ({ isOpen, channel, onCancel, onConfirm, t }) => {
  if (!isOpen || !channel) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '420px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '8px', backgroundColor: '#fef2f2', borderRadius: '50%', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
            {t ? t('Confirm Delete Channel') : 'Confirm Delete Channel'}
          </h3>
        </div>

        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
          {t ? t('Are you sure you want to delete this channel?') : 'Are you sure you want to delete this channel?'}
          <br />
          <strong style={{ color: '#0f172a' }}>
            {channel.title || 'Untitled'} ({channel.link})
          </strong>
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-danger"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteChannelModal;
