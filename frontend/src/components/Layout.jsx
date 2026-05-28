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
  X
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { lang, t, toggleLang } = useLanguage();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Automatically close mobile sidebar on route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/logins', label: 'Recent Logins', icon: LogIn },
    { path: '/network', label: 'Network Usage', icon: Activity },
    { path: '/traffic-report', label: 'Traffic Report', icon: TrendingUp },
    { path: '/xray', label: 'Xray IP Stats', icon: Cpu },
    { path: '/configs', label: 'App Config', icon: Sliders },
  ];

  // Admin users can access the Users tab
  if (user && user.role === 'admin') {
    menuItems.push({ path: '/users', label: 'Users', icon: Users });
  }

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
              <h1 className="sidebar-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: '1.2' }}>GrapeFruitTalk v1.1</h1>
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
          {menuItems.map((item) => {
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

            {/* Logout Button */}
            <button
              onClick={logout}
              className="btn btn-danger"
              style={{ flex: 1, padding: '8px 10px', fontSize: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            >
              <LogOut size={14} />
              <span>{t('Logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Content wrapper */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
