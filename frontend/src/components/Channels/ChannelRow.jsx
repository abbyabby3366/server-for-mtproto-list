import React from 'react';
import { ExternalLink, Trash2, Image, Radio, RefreshCw } from 'lucide-react';

const ChannelRow = ({
  item,
  originalIndex,
  displayIdx,
  handleFieldChange,
  onRequestDelete,
  onSyncSingle,
  isSyncingSingle,
  t
}) => {
  const directUrl = item.link
    ? item.link.startsWith('http')
      ? item.link
      : `https://${item.link}`
    : '';

  return (
    <tr
      style={{
        borderBottom: '1px solid #f1f5f9',
        backgroundColor: item.disabled ? '#fafafa' : '#ffffff',
        opacity: item.disabled ? 0.75 : 1
      }}
    >
      {/* Index */}
      <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '12px' }}>
        {displayIdx + 1}
      </td>

      {/* Avatar Thumbnail Preview */}
      <td style={{ padding: '8px 12px', textAlign: 'center', width: '56px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}
        >
          {item.avatar_url ? (
            <img
              src={item.avatar_url}
              alt={item.title || 'avatar'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            style={{
              display: item.avatar_url ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: '#e2e8f0',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {item.title ? item.title.slice(0, 1) : <Radio size={16} />}
          </div>
        </div>
      </td>

      {/* Category */}
      <td style={{ padding: '8px 12px', width: '130px' }}>
        <input
          type="text"
          list="category-suggestions"
          value={item.category || ''}
          onChange={(e) => handleFieldChange(originalIndex, 'category', e.target.value)}
          placeholder="Category"
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '12px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            backgroundColor: item.disabled ? '#f1f5f9' : '#fff'
          }}
        />
      </td>

      {/* Title */}
      <td style={{ padding: '8px 12px', width: '160px' }}>
        <input
          type="text"
          value={item.title || ''}
          onChange={(e) => handleFieldChange(originalIndex, 'title', e.target.value)}
          placeholder="Title (e.g. 电影频道)"
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '12px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontWeight: 500,
            backgroundColor: item.disabled ? '#f1f5f9' : '#fff'
          }}
        />
      </td>

      {/* Link + Test Link */}
      <td style={{ padding: '8px 12px', minWidth: '180px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="text"
            value={item.link || ''}
            onChange={(e) => handleFieldChange(originalIndex, 'link', e.target.value)}
            placeholder="https://t.me/yourchannel"
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '12px',
              fontFamily: 'monospace',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              backgroundColor: item.disabled ? '#f1f5f9' : '#fff'
            }}
          />
          {directUrl && (
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Telegram"
              style={{
                color: '#2563eb',
                padding: '6px',
                borderRadius: '4px',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </td>

      {/* Avatar S3 / Image URL */}
      <td style={{ padding: '8px 12px', minWidth: '200px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="text"
            value={item.avatar_url || ''}
            onChange={(e) => handleFieldChange(originalIndex, 'avatar_url', e.target.value)}
            placeholder="https://x.neuronwww.com/... or S3 link"
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              backgroundColor: item.disabled ? '#f1f5f9' : '#fff'
            }}
          />
          {onSyncSingle && (
            <button
              type="button"
              onClick={() => onSyncSingle(originalIndex)}
              disabled={isSyncingSingle}
              title="Fetch title, description, and avatar from Telegram and upload to S3"
              style={{
                color: '#0284c7',
                padding: '6px',
                borderRadius: '4px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                cursor: isSyncingSingle ? 'not-allowed' : 'pointer',
                opacity: isSyncingSingle ? 0.6 : 1
              }}
            >
              <RefreshCw size={13} className={isSyncingSingle ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </td>

      {/* Description */}
      <td style={{ padding: '8px 12px', width: '140px' }}>
        <input
          type="text"
          value={item.description || ''}
          onChange={(e) => handleFieldChange(originalIndex, 'description', e.target.value)}
          placeholder="Description"
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '12px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            backgroundColor: item.disabled ? '#f1f5f9' : '#fff'
          }}
        />
      </td>

      {/* Status Toggle */}
      <td style={{ padding: '8px 12px', textAlign: 'center', width: '80px' }}>
        <button
          type="button"
          onClick={() => handleFieldChange(originalIndex, 'disabled', !item.disabled)}
          style={{
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: item.disabled ? '#f1f5f9' : '#dcfce7',
            color: item.disabled ? '#64748b' : '#15803d'
          }}
        >
          {item.disabled ? (t ? t('Disabled') : 'Disabled') : (t ? t('Active') : 'Active')}
        </button>
      </td>

      {/* Actions */}
      <td style={{ padding: '8px 12px', textAlign: 'center', width: '60px' }}>
        <button
          type="button"
          onClick={() => onRequestDelete(originalIndex)}
          title="Delete channel"
          style={{
            border: 'none',
            background: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px'
          }}
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
};

export default ChannelRow;
