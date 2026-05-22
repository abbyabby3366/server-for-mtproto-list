import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/analytics');
      } else {
        setErrorMsg(t(result.error));
      }
    } catch (err) {
      setErrorMsg(t('Network error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f1f5f9',
      margin: 0
    }}>
      <div className="card" style={{
        width: '360px',
        padding: '40px 30px',
        textAlign: 'center',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        border: 'none',
        borderRadius: '16px'
      }}>
        <div style={{
          display: 'inline-flex',
          backgroundColor: '#3498db',
          padding: '12px',
          borderRadius: '12px',
          color: '#white',
          marginBottom: '20px'
        }}>
          <Activity size={32} color="#ffffff" />
        </div>
        
        <h2 style={{ fontSize: '24px', margin: '0 0 8px 0', color: '#1e293b', fontWeight: 700 }}>
          GrapeFruitTalk
        </h2>
        <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: 0, marginBottom: 30, fontWeight: 500 }}>
          Telemetry Management Center
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label htmlFor="username">{t('Username')}</label>
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder={t('Username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left', marginBottom: '24px' }}>
            <label htmlFor="password">{t('Password')}</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder={t('Password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ marginRight: '8px' }}></span>
                {t('Loading...')}
              </>
            ) : (
              t('Sign In')
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="notification notification-error" style={{ marginTop: '20px', textAlign: 'left' }}>
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
