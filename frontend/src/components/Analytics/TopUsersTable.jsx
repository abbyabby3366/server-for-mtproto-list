import React from 'react';
import { Clock } from 'lucide-react';
import { formatBytes } from '../../utils/format';

const getDisplayName = (user) => {
  if (user.telegram_user) {
    return `${user.telegram_user.first_name || ''} ${user.telegram_user.last_name || ''}`.trim() 
      || user.telegram_user.phone_number 
      || user.user_id;
  }
  return user.user_id;
};

const calculateCostOnly = (bytes) => {
  if (bytes === undefined || bytes === null) return '$0.00';
  const tb = bytes / (1024 * 1024 * 1024 * 1024);
  const cost = tb * 90;
  return cost === 0 ? '$0.00' : (cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`);
};

const TopUsersTable = ({ data, loading, getTimeRangeText, t }) => {
  return (
    <div className="card" style={{ padding: '12px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Clock size={20} color="#3498db" />
          <span>{t('Top 20 Users by Traffic')}</span>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            ({t('Includes VPN/Proxy')})
          </span>
        </h2>
        <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: '12px' }}>
          {getTimeRangeText()}
        </span>
      </div>
      <p className="card-subtitle" style={{ margin: 0, marginBottom: '10px' }}>{t('Real-time rankings calculated on the fly')}</p>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>{t('User')}</th>
              <th>{t('Traffic')}</th>
              <th>{t('Cost')}</th>
              <th>{t('Usage Days')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>
                  <span className="spinner" style={{ borderTopColor: '#3498db', width: '20px', height: '20px' }}></span>
                </td>
              </tr>
            ) : !data?.topUsers || data.topUsers.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  {t('No user data available yet.')}
                </td>
              </tr>
            ) : (
              data.topUsers.map((user, index) => (
                <tr key={user.user_id || index}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: index < 3 ? '#3498db' : '#f1f5f9', color: index < 3 ? '#ffffff' : '#475569', fontSize: '11.5px', fontWeight: 'bold', marginRight: '10px', flexShrink: 0 }}>
                        {index + 1}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{getDisplayName(user)}</span>
                        {user.telegram_user?.username && (
                          <span style={{ color: '#3498db', fontSize: '11px', fontWeight: 500, marginTop: '2px' }}>
                            @{user.telegram_user.username}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2980b9' }}>
                    {formatBytes(user.total_traffic)}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e74c3c' }}>
                    {calculateCostOnly(user.total_traffic)}
                  </td>
                  <td style={{ color: '#475569', fontWeight: 500 }}>
                    {user.usage_days}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopUsersTable;
