import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Users as UsersIcon, UserPlus, ShieldAlert, KeyRound, Trash2, X } from 'lucide-react';

const Users = () => {
  const { authFetch, user: currentUser } = useAuth();
  const { t } = useLanguage();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [addingUser, setAddingUser] = useState(false);

  // Change Password Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatedPassword, setUpdatedPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      } else if (res.status === 403) {
        setErrorMsg(t('You do not have permission to view users.'));
      } else {
        setErrorMsg(t('Failed to load user list'));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setErrorMsg(t('Failed to load user list'));
    } finally {
      setLoading(false);
    }
  }, [authFetch, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      alert(t('Fill all fields'));
      return;
    }

    setAddingUser(true);
    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });

      if (res.ok) {
        setNewUsername('');
        setNewPassword('');
        setNewRole('staff');
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.error || t('Error adding user'));
      }
    } catch (err) {
      console.error(err);
      alert(t('Error adding user'));
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (currentUser && currentUser.username === username) {
      alert(t('You cannot delete your own account.'));
      return;
    }

    if (!window.confirm(`${t('Are you sure you want to delete this user?')} (${username})`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.error || t('Error deleting user'));
      }
    } catch (err) {
      console.error(err);
      alert(t('Error deleting user'));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!updatedPassword) {
      alert(t('Fill all fields'));
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await authFetch(`/api/users/${selectedUser._id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: updatedPassword })
      });

      if (res.ok) {
        alert(t('Password updated'));
        setSelectedUser(null);
        setUpdatedPassword('');
      } else {
        const err = await res.json();
        alert(err.error || t('Error updating password'));
      }
    } catch (err) {
      console.error(err);
      alert(t('Error updating password'));
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--danger-color)" style={{ marginBottom: '16px' }} />
        <h2>{t('Access Denied')}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{t('You do not have permission to view users.')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">
          <UsersIcon size={20} color="#3498db" />
          {t('Users')}
        </h2>
        <p className="card-subtitle">{t('Manage administrator and operator credentials access control rights')}</p>

        {/* Add New User Panel */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)' }}>
            <UserPlus size={16} color="#3498db" />
            {t('Add New User')}
          </h3>
          <form onSubmit={handleAddUser} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>{t('Username')}</label>
              <input
                type="text"
                placeholder={t('Username')}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="form-control"
                style={{ margin: 0 }}
                autoComplete="off"
              />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>{t('Password')}</label>
              <input
                type="password"
                placeholder={t('Password')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-control"
                style={{ margin: 0 }}
                autoComplete="new-password"
              />
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>{t('Role')}</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="form-control"
                style={{ margin: 0 }}
              >
                <option value="staff">{t('Staff')}</option>
                <option value="admin">{t('Admin')}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-success" disabled={addingUser} style={{ height: '42px' }}>
              {addingUser ? t('Saving...') : t('Add User')}
            </button>
          </form>
        </div>

        {/* Users List Table */}
        {errorMsg ? (
          <div className="notification notification-error">
            <ShieldAlert size={16} />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>{t('Username')}</th>
                  <th>{t('Role')}</th>
                  <th>{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '40px 0' }}>
                      <span className="spinner" style={{ borderTopColor: '#3498db', width: '24px', height: '24px' }}></span>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      {t('No users created yet.')}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.username}</td>
                      <td>
                        <span className={`badge ${user.role === 'admin' ? 'badge-info' : 'badge-success'}`}>
                          {t(user.role === 'admin' ? 'Admin' : 'Staff')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-warning"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => setSelectedUser(user)}
                          >
                            <KeyRound size={12} />
                            <span>{t('Change Password')}</span>
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleDeleteUser(user._id, user.username)}
                            disabled={currentUser?.username === user.username}
                          >
                            <Trash2 size={12} />
                            <span>{t('Delete')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px', border: 'none', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{t('Change Password')}</h3>
              <button
                onClick={() => { setSelectedUser(null); setUpdatedPassword(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  {t('New Password for')} <strong>{selectedUser.username}</strong>
                </label>
                <input
                  type="password"
                  placeholder={t('Enter new password')}
                  value={updatedPassword}
                  onChange={(e) => setUpdatedPassword(e.target.value)}
                  className="form-control"
                  style={{ width: '100%' }}
                  autoComplete="new-password"
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: '#e2e8f0', color: '#334155' }}
                  onClick={() => { setSelectedUser(null); setUpdatedPassword(''); }}
                >
                  {t('Cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingPassword}>
                  {updatingPassword ? t('Updating...') : t('Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
