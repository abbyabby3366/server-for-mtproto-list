import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';

const StatsGrid = ({ data, timeframe, t }) => {
  const navigate = useNavigate();
  const [fgHovered, setFgHovered] = useState(false);
  const [bgHovered, setBgHovered] = useState(false);

  return (
    <div className="grid grid-cols-4" style={{ gap: '8px' }}>
      {/* Foreground Users */}
      <div 
        className="card" 
        onClick={() => navigate(`/talkpro-users?foreground=true&timeframe=${timeframe}`)}
        onMouseEnter={() => setFgHovered(true)}
        onMouseLeave={() => setFgHovered(false)}
        style={{ 
          borderLeft: '4px solid #2ecc71', 
          margin: 0, 
          padding: '8px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: fgHovered ? 'translateY(-2px)' : 'none',
          boxShadow: fgHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
          backgroundColor: fgHovered ? '#f8fafc' : 'white'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
              {data?.dailyActiveUsersForeground ?? 0}
            </div>
            <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {t('Users with at least one foreground ping')}
              <ChevronRight size={10} style={{ opacity: 0.7 }} />
            </div>
          </div>
          <Users size={14} color="#2ecc71" />
        </div>
      </div>

      {/* Background Users */}
      <div 
        className="card" 
        onClick={() => navigate(`/talkpro-users?foreground=false&timeframe=${timeframe}`)}
        onMouseEnter={() => setBgHovered(true)}
        onMouseLeave={() => setBgHovered(false)}
        style={{ 
          borderLeft: '4px solid #3498db', 
          margin: 0, 
          padding: '8px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: bgHovered ? 'translateY(-2px)' : 'none',
          boxShadow: bgHovered ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none',
          backgroundColor: bgHovered ? '#f8fafc' : 'white'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
              {data?.dailyActiveUsersBackground ?? 0}
            </div>
            <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              {t('Users with strictly background pings only')}
              <ChevronRight size={10} style={{ opacity: 0.7 }} />
            </div>
          </div>
          <Users size={14} color="#3498db" />
        </div>
      </div>

      {/* Legacy App Clients */}
      <div className="card" style={{ borderLeft: '4px solid #e74c3c', margin: 0, padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
              {data?.dailyActiveUsersNotApplicable ?? 0}
            </div>
            <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
              {t('Users using legacy app clients')}
            </div>
          </div>
          <Users size={14} color="#e74c3c" />
        </div>
      </div>

      {/* New Users */}
      <div className="card" style={{ borderLeft: '4px solid #95a5a6', margin: 0, padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '2px' }}>
              {data?.dailyNewUsers ?? 0}
            </div>
            <div className="card-subtitle" style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '9px' }}>
              {t('New Users (Period)')}
            </div>
          </div>
          <Users size={14} color="#95a5a6" />
        </div>
      </div>
    </div>
  );
};

export default StatsGrid;
