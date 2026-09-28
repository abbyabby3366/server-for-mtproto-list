import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Plus,
  Save,
  CheckCircle,
  XCircle,
  Search,
  CloudDownload,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ChannelRow from '../components/Channels/ChannelRow';
import DeleteChannelModal from '../components/Channels/DeleteChannelModal';

const PRESET_CATEGORIES = [
  '搜索',
  '影视',
  '动漫短剧',
  '漫画小说',
  '音乐',
  '资源',
  '新闻资讯'
];

const Channels = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();

  const [channels, setChannels] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingAvatars, setSyncingAvatars] = useState(false);
  const [syncingSingleIndex, setSyncingSingleIndex] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);

  // Fetch channels on mount
  const fetchChannels = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        setRemarks(data.remarks || '');
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.error || t('Failed to load channels.'), 'error');
      }
    } catch (err) {
      showNotification(t('Failed to load channels.') + ' ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [authFetch]);

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...channels];
    updated[index] = { ...updated[index], [field]: value };
    setChannels(updated);
  };

  const handleAddChannel = () => {
    const defaultCat = selectedCategory !== 'ALL' ? selectedCategory : (PRESET_CATEGORIES[0] || 'General');
    const newChannel = {
      category: defaultCat,
      title: '',
      link: 'https://t.me/',
      avatar_url: '',
      description: '',
      disabled: false
    };
    setChannels([newChannel, ...channels]);
  };

  const confirmDelete = () => {
    if (deleteConfirmIndex === null) return;
    const updated = channels.filter((_, idx) => idx !== deleteConfirmIndex);
    setChannels(updated);
    setDeleteConfirmIndex(null);
  };

  const handleSave = async () => {
    // Validate required fields
    for (let i = 0; i < channels.length; i++) {
      const c = channels[i];
      if (!c.title || !c.title.trim()) {
        showNotification(`${t('Each channel must have a title')} (Row ${i + 1})`, 'error');
        return;
      }
      if (!c.link || !c.link.trim()) {
        showNotification(`${t('Each channel must have a valid link')} (Row ${i + 1})`, 'error');
        return;
      }
    }

    try {
      setSaving(true);
      const res = await authFetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels, remarks })
      });

      if (res.ok) {
        showNotification(t('Channels saved successfully!'), 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.error || t('Failed to save channels.'), 'error');
      }
    } catch (err) {
      showNotification(t('Failed to save channels.') + ' ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAllAvatars = async (force = true) => {
    try {
      setSyncingAvatars(true);
      showNotification(t('Syncing channels from Telegram...'), 'info');
      const res = await authFetch('/api/channels/sync-avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });

      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        showNotification(
          `${t('Successfully synced channels!')} (${data.syncedCount} synced, ${data.failedCount} failed)`,
          'success'
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.error || t('Failed to sync channels.'), 'error');
      }
    } catch (err) {
      showNotification(t('Failed to sync channels.') + ' ' + (err.message || ''), 'error');
    } finally {
      setSyncingAvatars(false);
    }
  };

  const handleSyncSingleAvatar = async (index) => {
    const channel = channels[index];
    if (!channel || !channel.link) return;

    try {
      setSyncingSingleIndex(index);
      const res = await authFetch('/api/channels/sync-single-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: channel.link })
      });

      if (res.ok) {
        const data = await res.json();
        const updated = [...channels];
        updated[index] = {
          ...updated[index],
          ...(data.title ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.avatar_url ? { avatar_url: data.avatar_url } : {})
        };
        setChannels(updated);
        showNotification(`@${data.handle}: ${t('Successfully synced channel info!')}`, 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(errData.error || t('Failed to sync channel.'), 'error');
      }
    } catch (err) {
      showNotification(t('Failed to sync channel.') + ' ' + (err.message || ''), 'error');
    } finally {
      setSyncingSingleIndex(null);
    }
  };

  const availableCategories = useMemo(() => {
    const set = new Set(PRESET_CATEGORIES);
    channels.forEach(c => {
      if (c.category && c.category.trim()) {
        set.add(c.category.trim());
      }
    });
    return Array.from(set);
  }, [channels]);

  const filteredChannelsWithIndices = useMemo(() => {
    return channels
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
        const matchesSearch = !searchTerm ||
          (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.link && item.link.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
      });
  }, [channels, selectedCategory, searchTerm]);

  const activeCount = channels.filter(c => !c.disabled).length;
  const disabledCount = channels.length - activeCount;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            backgroundColor: notification.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: notification.type === 'error' ? '#991b1b' : '#166534',
            border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`
          }}
        >
          {notification.type === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Card */}
      <div className="card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '18px', marginBottom: '4px' }}>
              <Radio size={20} style={{ color: '#2563eb' }} />
              <span>{t('Telegram Channels')}</span>
            </h2>
            <p className="card-subtitle" style={{ margin: 0 }}>
              {t('Manage Telegram channels list served at')}{' '}
              <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>/channels</code>
              {' '}&{' '}
              <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>/api/channels</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => handleSyncAllAvatars(true)}
              disabled={syncingAvatars}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                padding: '7px 14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                cursor: syncingAvatars ? 'not-allowed' : 'pointer',
                opacity: syncingAvatars ? 0.7 : 1,
                fontWeight: 500
              }}
              title="Automatically fetch Telegram channel title, description, and avatar to Linode S3"
            >
              <CloudDownload size={16} />
              <span>{syncingAvatars ? t('Syncing channels...') : t('Auto-Sync Channels')}</span>
            </button>
            <button
              onClick={handleAddChannel}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '7px 14px' }}
            >
              <Plus size={16} />
              <span>{t('Add Channel')}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '7px 16px' }}
            >
              <Save size={16} />
              <span>{saving ? t('Saving...') : t('Save Channels & Remarks')}</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', display: 'flex', gap: '6px' }}>
            <span style={{ color: '#64748b' }}>Total Channels:</span>
            <strong style={{ color: '#0f172a' }}>{channels.length}</strong>
          </div>
          <div style={{ padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '12px', display: 'flex', gap: '6px' }}>
            <span style={{ color: '#166534' }}>Active:</span>
            <strong style={{ color: '#15803d' }}>{activeCount}</strong>
          </div>
          {disabledCount > 0 && (
            <div style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', display: 'flex', gap: '6px' }}>
              <span style={{ color: '#991b1b' }}>Disabled:</span>
              <strong style={{ color: '#b91c1c' }}>{disabledCount}</strong>
            </div>
          )}
          <div style={{ padding: '6px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', display: 'flex', gap: '6px' }}>
            <span style={{ color: '#1e40af' }}>Categories:</span>
            <strong style={{ color: '#2563eb' }}>{availableCategories.length}</strong>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <button
              onClick={() => setSelectedCategory('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: selectedCategory === 'ALL' ? 600 : 400,
                border: selectedCategory === 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: selectedCategory === 'ALL' ? '#2563eb' : '#ffffff',
                color: selectedCategory === 'ALL' ? '#ffffff' : '#475569',
                cursor: 'pointer'
              }}
            >
              {t('All Categories')} ({channels.length})
            </button>
            {availableCategories.map(cat => {
              const count = channels.filter(c => c.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 600 : 400,
                    border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('Search channels...')}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <span>Loading channels...</span>
          </div>
        ) : channels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b', margin: '0 0 12px 0' }}>
              No channels configured yet. Click "+ Add Channel" to get started.
            </p>
            <button onClick={handleAddChannel} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              <Plus size={14} /> {t('Add Channel')}
            </button>
          </div>
        ) : filteredChannelsWithIndices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            No channels match your filter or search query.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '10px 12px', width: '40px' }}>#</th>
                  <th style={{ padding: '10px 12px', width: '56px', textAlign: 'center' }}>Avatar</th>
                  <th style={{ padding: '10px 12px', width: '130px' }}>{t('Category')}</th>
                  <th style={{ padding: '10px 12px', width: '160px' }}>{t('Channel Title')}</th>
                  <th style={{ padding: '10px 12px', minWidth: '180px' }}>{t('Channel Link')}</th>
                  <th style={{ padding: '10px 12px', minWidth: '200px' }}>Avatar URL (S3)</th>
                  <th style={{ padding: '10px 12px', width: '140px' }}>{t('Description')}</th>
                  <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChannelsWithIndices.map(({ item, originalIndex }, displayIdx) => (
                  <ChannelRow
                    key={originalIndex}
                    item={item}
                    originalIndex={originalIndex}
                    displayIdx={displayIdx}
                    handleFieldChange={handleFieldChange}
                    onRequestDelete={(idx) => setDeleteConfirmIndex(idx)}
                    onSyncSingle={handleSyncSingleAvatar}
                    isSyncingSingle={syncingSingleIndex === originalIndex}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <datalist id="category-suggestions">
          {availableCategories.map(cat => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        {/* Remarks */}
        <div style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
            {t('Remarks / Scratchpad')}
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Paste notes, backups, or raw notes here..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '12px',
              fontFamily: 'monospace',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Save button footer */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 20px' }}
          >
            <Save size={16} />
            <span>{saving ? t('Saving...') : t('Save Channels & Remarks')}</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteChannelModal
        isOpen={deleteConfirmIndex !== null}
        channel={deleteConfirmIndex !== null ? channels[deleteConfirmIndex] : null}
        onCancel={() => setDeleteConfirmIndex(null)}
        onConfirm={confirmDelete}
        t={t}
      />
    </div>
  );
};

export default Channels;
