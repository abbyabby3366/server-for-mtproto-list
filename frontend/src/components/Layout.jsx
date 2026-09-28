import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  BarChart3,
  LogIn,
  Activity,
  Cpu,
  Sliders,
  Users,
  LogOut,
  Globe,
  TrendingUp,
  Menu,
  X,
  Smartphone,
  Gauge,
  Radio,
  AlertTriangle
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, authFetch } = useAuth();
  const { lang, t, toggleLang } = useLanguage();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [platform, setPlatform] = useState('android');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Fetch platform configuration
  useEffect(() => {
    const fetchPlatform = async () => {
      try {
        const res = await authFetch('/api/platform');
        if (res.ok) {
          const data = await res.json();
          setPlatform(data.platform);
        }
      } catch (err) {
        console.error('Error fetching platform in Layout:', err);
      }
    };
    fetchPlatform();
  }, [authFetch]);

  // Automatically close mobile sidebar on route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const navSections = [
    {
      title: 'Overview',
      items: [
        { path: '/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/talkpro-users', label: 'TalkPro Users', icon: Users },
      ]
    },
    {
      title: 'Traffic & Telemetry',
      items: [
        { path: '/speed-control', label: 'Speed Control', icon: Gauge },
        { path: '/logins', label: 'Recent Logins', icon: LogIn },
        { path: '/network', label: 'Network Usage', icon: Activity },
        { path: '/traffic-report', label: 'Traffic Report', icon: TrendingUp },
        ...(platform === 'android' ? [{ path: '/xray', label: 'Xray IP Stats', icon: Cpu }] : []),
      ]
    },
    {
      title: 'Configuration',
      items: [
        { path: '/channels', label: 'Channels', icon: Radio },
        { path: '/configs', label: 'App Config', icon: Sliders },
        ...(user && user.role === 'admin' ? [{ path: '/users', label: 'Users', icon: Users }] : []),
      ]
    }
  ];

  return (
    <div className="app-container">
      {/* Mobile Top Header Navbar */}
      <header className="mobile-header">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="mobile-menu-toggle"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="mobile-header-logo">
          <img src="/favicon.png" alt="Grapefruit" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <span className="mobile-header-title">GrapeFruitTalk</span>
        </div>
        <button
          onClick={toggleLang}
          className="mobile-lang-toggle"
          title="Change Language / 切換語言"
        >
          <Globe size={18} />
        </button>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <img src="/favicon.png" alt="Grapefruit" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <div>
              <h1 className="sidebar-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>GrapeFruitTalk v1.6</h1>
              <span style={{ fontSize: '10px', color: '#ea580c', fontWeight: 700, letterSpacing: '0.05em' }}>TELEMETRY HUB</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="sidebar-close-btn"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-menu">
          {navSections.map((section, sIdx) => (
            <div key={section.title} className="sidebar-section">
              {sIdx > 0 && <div className="sidebar-divider" />}
              <span className="sidebar-section-header">{t(section.title)}</span>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{t(item.label)}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Operator Profile details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
              {(user?.username || 'U')[0].toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.username || 'Operator'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                {t(user?.role === 'admin' ? 'Admin' : 'Staff')}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              window.location.href = platform === 'android'
                ? 'https://talkpro-ios-api.grapefruittalk.com/'
                : 'https://talkpro.grapefruittalk.com/';
            }}
            className="btn"
            style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '6px', cursor: 'pointer', marginTop: '4px', fontWeight: 600 }}
          >
            <Smartphone size={14} />
            <span>{platform === 'android' ? t('Switch to iOS Backend') : t('Switch to Android Backend')}</span>
          </button>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            {/* Language Selection */}
            <button
              onClick={toggleLang}
              className="btn btn-warning"
              style={{ flex: 1, padding: '8px 10px', fontSize: '12px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c' }}
              title="Change Language / 切換語言"
            >
              <Globe size={14} />
              <span>{lang === 'en' ? '中文' : 'EN'}</span>
            </button>

            {/* Logout Button with Confirmation Trigger */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="btn btn-danger"
              style={{ flex: 1, padding: '8px 10px', fontSize: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            >
              <LogOut size={14} />
              <span>{t('Logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
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
              maxWidth: '380px',
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
                {t('Confirm Logout')}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
              {t('Are you sure you want to log out of GrapeFruitTalk?')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="btn btn-danger"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {t('Logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel Content wrapper */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
