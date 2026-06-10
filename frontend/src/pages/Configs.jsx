import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Import modular subcomponents
import AndroidVersionConfigCard from '../components/Configs/AndroidVersionConfigCard';
import IosVersionConfigCard from '../components/Configs/IosVersionConfigCard';
import ExternalRedirectsCard from '../components/Configs/ExternalRedirectsCard';
import XrayNodeIpsCard from '../components/Configs/XrayNodeIpsCard';
import MtProxiesCard from '../components/Configs/MtProxiesCard';

const Configs = () => {
  const { authFetch } = useAuth();
  const { t } = useLanguage();

  // ----- PLATFORM STATE -----
  const [platform, setPlatform] = useState('android');
  const [platformLoading, setPlatformLoading] = useState(true);

  // ----- VERSION CONFIG STATE -----
  // Android state
  const [androidVersionCode, setAndroidVersionCode] = useState('');
  const [androidVersionName, setAndroidVersionName] = useState('');
  const [androidDownloadUrl, setAndroidDownloadUrl] = useState('');
  const [androidChangelog, setAndroidChangelog] = useState('');
  const [androidForceUpdate, setAndroidForceUpdate] = useState(false);
  const [androidVersionSaving, setAndroidVersionSaving] = useState(false);
  const [androidVersionNotification, setAndroidVersionNotification] = useState(null);

  // iOS state
  const [iosVersionCode, setIosVersionCode] = useState('');
  const [iosVersionName, setIosVersionName] = useState('');
  const [iosDownloadUrl, setIosDownloadUrl] = useState('');
  const [iosChangelog, setIosChangelog] = useState('');
  const [iosForceUpdate, setIosForceUpdate] = useState(false);
  const [iosVersionSaving, setIosVersionSaving] = useState(false);
  const [iosVersionNotification, setIosVersionNotification] = useState(null);

  // ----- EXTERNAL REDIRECTS STATE -----
  const [extDownloadUrl, setExtDownloadUrl] = useState('');
  const [extToken, setExtToken] = useState('');
  const [extEditable, setExtEditable] = useState(false);
  const [extUpdating, setExtUpdating] = useState(false);
  const [extConfigSaving, setExtConfigSaving] = useState(false);
  const [extNotification, setExtNotification] = useState(null);
  const [extResults, setExtResults] = useState(null);
  const [extRedirectsOpen, setExtRedirectsOpen] = useState(false);
  const [domains, setDomains] = useState({
    'talkpro.cc': true,
    'talkspro.xyz': true,
    'talkpro.org': true,
  });

  // ----- TRANSIT IPS STATE -----
  const [transitIps, setTransitIps] = useState([]);
  const [transitRemarks, setTransitRemarks] = useState('');
  const [transitSaving, setTransitSaving] = useState(false);
  const [transitNotification, setTransitNotification] = useState(null);
  const [transitLoading, setTransitLoading] = useState(true);

  // ----- MT PROXIES STATE -----
  const [proxies, setProxies] = useState([]);
  const [proxiesRemarks, setProxiesRemarks] = useState('');
  const [proxiesSaving, setProxiesSaving] = useState(false);
  const [proxiesNotification, setProxiesNotification] = useState(null);
  const [proxiesLoading, setProxiesLoading] = useState(true);

  // ----- LOGGING & TELEMETRY HISTORY STATE -----
  const [androidVersionLogs, setAndroidVersionLogs] = useState([]);
  const [androidVersionLogsLoading, setAndroidVersionLogsLoading] = useState(false);
  const [androidVersionLogsExpanded, setAndroidVersionLogsExpanded] = useState(false);
  const [iosVersionLogs, setIosVersionLogs] = useState([]);
  const [iosVersionLogsLoading, setIosVersionLogsLoading] = useState(false);
  const [iosVersionLogsExpanded, setIosVersionLogsExpanded] = useState(false);
  const [redirectLogs, setRedirectLogs] = useState([]);
  const [redirectLogsLoading, setRedirectLogsLoading] = useState(false);
  const [redirectLogsExpanded, setRedirectLogsExpanded] = useState(false);

  // Load changelog history for Android App Versions
  const fetchAndroidVersionLogs = async () => {
    try {
      setAndroidVersionLogsLoading(true);
      const res = await authFetch('/api/android/version/logs');
      if (res.ok) {
        const data = await res.json();
        setAndroidVersionLogs(data);
      }
    } catch (err) {
      console.error('Error fetching Android version logs:', err);
    } finally {
      setAndroidVersionLogsLoading(false);
    }
  };

  // Load changelog history for iOS App Versions
  const fetchIosVersionLogs = async () => {
    try {
      setIosVersionLogsLoading(true);
      const res = await authFetch('/api/ios/version/logs');
      if (res.ok) {
        const data = await res.json();
        setIosVersionLogs(data);
      }
    } catch (err) {
      console.error('Error fetching iOS version logs:', err);
    } finally {
      setIosVersionLogsLoading(false);
    }
  };

  // Load update activity logs for External Redirects
  const fetchRedirectLogs = async () => {
    try {
      setRedirectLogsLoading(true);
      const res = await authFetch('/api/external-redirects/logs');
      if (res.ok) {
        const data = await res.json();
        setRedirectLogs(data);
      }
    } catch (err) {
      console.error('Error fetching redirect logs:', err);
    } finally {
      setRedirectLogsLoading(false);
    }
  };

  // Load configs and history logs on mount
  useEffect(() => {
    // Fetch platform configuration
    const fetchPlatform = async () => {
      try {
        const res = await authFetch('/api/platform');
        if (res.ok) {
          const data = await res.json();
          setPlatform(data.platform);
        }
      } catch (err) {
        console.error('Error fetching platform:', err);
      } finally {
        setPlatformLoading(false);
      }
    };

    // 1. Fetch Android version configuration
    const fetchAndroidVersion = async () => {
      try {
        const res = await authFetch('/api/android/version');
        if (res.ok) {
          const data = await res.json();
          setAndroidVersionCode(data.versionCode || '');
          setAndroidVersionName(data.versionName || '');
          setAndroidDownloadUrl(data.downloadUrl || '');
          setAndroidChangelog(data.changelog || '');
          setAndroidForceUpdate(data.forceUpdate || false);
        }
      } catch (err) {
        console.error('Error fetching Android version config:', err);
      }
    };

    // Fetch iOS version configuration
    const fetchIosVersion = async () => {
      try {
        const res = await authFetch('/api/ios/version');
        if (res.ok) {
          const data = await res.json();
          // GET /api/ios/version returns snake_case format
          setIosVersionCode(data.version_code || '');
          setIosVersionName(data.version || '');
          setIosDownloadUrl(data.file_url || '');
          setIosChangelog(data.changelog || '');
          setIosForceUpdate(data.force_update || false);
        }
      } catch (err) {
        console.error('Error fetching iOS version config:', err);
      }
    };

    // 2. Fetch external redirects config
    const fetchExternalConfig = async () => {
      try {
        const res = await authFetch('/api/external-redirect-config');
        if (res.ok) {
          const data = await res.json();
          setExtDownloadUrl(data.downloadUrl || '');
          setExtToken(data.token || '');
        }
      } catch (err) {
        console.error('Error fetching external config:', err);
      }
    };

    // 3. Fetch transit node IPs
    const fetchTransitIps = async () => {
      try {
        const res = await authFetch('/api/transit-ips');
        if (res.ok) {
          const data = await res.json();
          setTransitIps(data.ips || []);
          setTransitRemarks(data.remarks || '');
        }
      } catch (err) {
        console.error('Error fetching transit IPs:', err);
      } finally {
        setTransitLoading(false);
      }
    };

    // 4. Fetch MT Proxies
    const fetchProxies = async () => {
      try {
        const res = await authFetch('/api/proxies');
        if (res.ok) {
          const data = await res.json();
          setProxies(data.proxies || []);
          setProxiesRemarks(data.remarks || '');
        }
      } catch (err) {
        console.error('Error fetching proxies:', err);
      } finally {
        setProxiesLoading(false);
      }
    };

    fetchPlatform();
    fetchAndroidVersion();
    fetchIosVersion();
    fetchExternalConfig();
    fetchTransitIps();
    fetchProxies();
    fetchAndroidVersionLogs();
    fetchIosVersionLogs();
    fetchRedirectLogs();
  }, [authFetch]);

  // Handle Android version form submit
  const handleAndroidVersionSubmit = async (e) => {
    e.preventDefault();
    setAndroidVersionSaving(true);
    setAndroidVersionNotification(null);

    const payload = {
      versionCode: parseInt(androidVersionCode, 10),
      versionName: androidVersionName,
      downloadUrl: androidDownloadUrl,
      changelog: androidChangelog,
      forceUpdate: androidForceUpdate
    };

    try {
      const res = await authFetch('/api/android/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showNotification(setAndroidVersionNotification, t('Configuration saved successfully!'), 'success');
        fetchAndroidVersionLogs();
      } else {
        showNotification(setAndroidVersionNotification, t('Failed to save configuration.'), 'error');
      }
    } catch (err) {
      showNotification(setAndroidVersionNotification, t('Error saving configuration.'), 'error');
    } finally {
      setAndroidVersionSaving(false);
    }
  };

  // Handle iOS version form submit
  const handleIosVersionSubmit = async (e) => {
    e.preventDefault();
    setIosVersionSaving(true);
    setIosVersionNotification(null);

    const payload = {
      version_code: parseInt(iosVersionCode, 10),
      version: iosVersionName,
      file_url: iosDownloadUrl,
      changelog: iosChangelog,
      force_update: iosForceUpdate
    };

    try {
      const res = await authFetch('/api/ios/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showNotification(setIosVersionNotification, t('Configuration saved successfully!'), 'success');
        fetchIosVersionLogs();
      } else {
        showNotification(setIosVersionNotification, t('Failed to save configuration.'), 'error');
      }
    } catch (err) {
      showNotification(setIosVersionNotification, t('Error saving configuration.'), 'error');
    } finally {
      setIosVersionSaving(false);
    }
  };

  // Toggle domain redirect checkbox
  const handleDomainCheckbox = (domain) => {
    setDomains((prev) => ({ ...prev, [domain]: !prev[domain] }));
  };

  // Enable/Disable editing external config
  const handleExtEdit = () => {
    setExtEditable((prev) => !prev);
  };

  // Save Token/URL for external configs to db
  const handleSaveExtConfig = async () => {
    setExtConfigSaving(true);
    setExtNotification(null);
    try {
      const res = await authFetch('/api/external-redirect-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: extDownloadUrl, token: extToken })
      });

      if (res.ok) {
        showNotification(setExtNotification, t('Configuration saved to DB successfully!'), 'success');
        setExtEditable(false);
      } else {
        showNotification(setExtNotification, t('Failed to save configuration.'), 'error');
      }
    } catch (err) {
      showNotification(setExtNotification, t('Error saving configuration.'), 'error');
    } finally {
      setExtConfigSaving(false);
    }
  };

  // Update external redirects triggering endpoint API posts
  const handleUpdateExternalRedirects = async (e) => {
    e.preventDefault();
    setExtUpdating(true);
    setExtNotification(null);
    setExtResults(null);

    const selectedDomains = Object.keys(domains).filter((d) => domains[d]);
    if (selectedDomains.length === 0) {
      showNotification(setExtNotification, t('Please select at least one domain.'), 'error');
      setExtUpdating(false);
      return;
    }

    const payload = {
      downloadUrl: extDownloadUrl,
      token: extToken,
      domains: selectedDomains
    };

    try {
      const actualRes = await authFetch('/api/external-redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await actualRes.json();
      if (actualRes.ok) {
        const allSuccess = data.results.every((r) => r.status === 'success');
        if (allSuccess) {
          showNotification(setExtNotification, t('All redirects updated successfully!'), 'success');
        } else {
          showNotification(setExtNotification, t('Some updates failed. Check results below.'), 'error');
        }
        setExtResults(data.results);
        fetchRedirectLogs();
      } else {
        showNotification(setExtNotification, data.error || t('Failed to update redirects.'), 'error');
      }
    } catch (err) {
      showNotification(setExtNotification, t('Error updating redirects.'), 'error');
    } finally {
      setExtUpdating(false);
    }
  };

  // ----- TRANSIT IPS LIST OPERATIONS -----
  const addTransitIpRow = () => {
    setTransitIps((prev) => [...prev, '']);
  };

  const removeTransitIpRow = (index) => {
    setTransitIps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTransitIpChange = (index, value) => {
    setTransitIps((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleTransitSubmit = async () => {
    setTransitSaving(true);
    setTransitNotification(null);

    // Clean up empty IPs
    const cleanIps = transitIps.map((ip) => ip.trim()).filter((ip) => ip.length > 0);

    try {
      const res = await authFetch('/api/transit-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: cleanIps, remarks: transitRemarks })
      });

      if (res.ok) {
        showNotification(
          setTransitNotification,
          `${t('XRAY IPs & Remarks saved successfully!')} (${cleanIps.length} IP${cleanIps.length !== 1 ? 's' : ''})`,
          'success'
        );
        // Refresh local array
        setTransitIps(cleanIps);
      } else {
        showNotification(setTransitNotification, t('Failed to save Xray IPs.'), 'error');
      }
    } catch (err) {
      showNotification(setTransitNotification, t('Error saving Xray IPs.'), 'error');
    } finally {
      setTransitSaving(false);
    }
  };

  // ----- MT PROXIES LIST OPERATIONS -----
  const addProxyRow = () => {
    setProxies((prev) => [...prev, { host: '', port: 443, secret: '' }]);
  };

  const removeProxyRow = (index) => {
    setProxies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProxyChange = (index, field, value) => {
    setProxies((prev) => {
      const copy = [...prev];
      copy[index] = { 
        ...copy[index], 
        [field]: field === 'port' ? (value === '' ? '' : parseInt(value, 10) || 0) : value 
      };
      return copy;
    });
  };

  const handleProxiesSubmit = async () => {
    setProxiesSaving(true);
    setProxiesNotification(null);

    // Clean up empty proxies (require host and secret to be present)
    const cleanProxies = proxies
      .map((p) => ({
        host: p.host?.trim() || '',
        port: parseInt(p.port, 10) || 443,
        secret: p.secret?.trim() || ''
      }))
      .filter((p) => p.host.length > 0 && p.secret.length > 0);

    try {
      const res = await authFetch('/api/proxies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies: cleanProxies, remarks: proxiesRemarks })
      });

      if (res.ok) {
        showNotification(
          setProxiesNotification,
          `${t('MT Proxies & Remarks saved successfully!')} (${cleanProxies.length} Prox${cleanProxies.length !== 1 ? 'ies' : 'y'})`,
          'success'
        );
        setProxies(cleanProxies);
      } else {
        showNotification(setProxiesNotification, t('Failed to save MT Proxies.'), 'error');
      }
    } catch (err) {
      showNotification(setProxiesNotification, t('Error saving MT Proxies.'), 'error');
    } finally {
      setProxiesSaving(false);
    }
  };

  // Helper notification timer
  const showNotification = (setter, message, type) => {
    setter({ message, type });
    setTimeout(() => {
      setter(null);
    }, 4000);
  };

  if (platformLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <span className="spinner" style={{ borderTopColor: '#3498db', width: '40px', height: '40px' }}></span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. APP VERSION CONFIGURATIONS */}
      {platform === 'android' ? (
        <AndroidVersionConfigCard
          androidVersionCode={androidVersionCode}
          setAndroidVersionCode={setAndroidVersionCode}
          androidVersionName={androidVersionName}
          setAndroidVersionName={setAndroidVersionName}
          androidDownloadUrl={androidDownloadUrl}
          setAndroidDownloadUrl={setAndroidDownloadUrl}
          androidChangelog={androidChangelog}
          setAndroidChangelog={setAndroidChangelog}
          androidForceUpdate={androidForceUpdate}
          setAndroidForceUpdate={setAndroidForceUpdate}
          androidVersionSaving={androidVersionSaving}
          androidVersionNotification={androidVersionNotification}
          androidVersionLogsExpanded={androidVersionLogsExpanded}
          setAndroidVersionLogsExpanded={setAndroidVersionLogsExpanded}
          androidVersionLogs={androidVersionLogs}
          androidVersionLogsLoading={androidVersionLogsLoading}
          fetchAndroidVersionLogs={fetchAndroidVersionLogs}
          handleAndroidVersionSubmit={handleAndroidVersionSubmit}
          t={t}
        />
      ) : (
        <IosVersionConfigCard
          iosVersionCode={iosVersionCode}
          setIosVersionCode={setIosVersionCode}
          iosVersionName={iosVersionName}
          setIosVersionName={setIosVersionName}
          iosDownloadUrl={iosDownloadUrl}
          setIosDownloadUrl={setIosDownloadUrl}
          iosChangelog={iosChangelog}
          setIosChangelog={setIosChangelog}
          iosForceUpdate={iosForceUpdate}
          setIosForceUpdate={setIosForceUpdate}
          iosVersionSaving={iosVersionSaving}
          iosVersionNotification={iosVersionNotification}
          iosVersionLogsExpanded={iosVersionLogsExpanded}
          setIosVersionLogsExpanded={setIosVersionLogsExpanded}
          iosVersionLogs={iosVersionLogs}
          iosVersionLogsLoading={iosVersionLogsLoading}
          fetchIosVersionLogs={fetchIosVersionLogs}
          handleIosVersionSubmit={handleIosVersionSubmit}
          t={t}
        />
      )}

      {/* 2. EXTERNAL REDIRECTS CONFIG */}
      {platform === 'android' && (
        <ExternalRedirectsCard
          extDownloadUrl={extDownloadUrl}
          setExtDownloadUrl={setExtDownloadUrl}
          extToken={extToken}
          setExtToken={setExtToken}
          extEditable={extEditable}
          handleExtEdit={handleExtEdit}
          extConfigSaving={extConfigSaving}
          handleSaveExtConfig={handleSaveExtConfig}
          domains={domains}
          handleDomainCheckbox={handleDomainCheckbox}
          extUpdating={extUpdating}
          handleUpdateExternalRedirects={handleUpdateExternalRedirects}
          extNotification={extNotification}
          extResults={extResults}
          redirectLogsExpanded={redirectLogsExpanded}
          setRedirectLogsExpanded={setRedirectLogsExpanded}
          redirectLogs={redirectLogs}
          redirectLogsLoading={redirectLogsLoading}
          fetchRedirectLogs={fetchRedirectLogs}
          extRedirectsOpen={extRedirectsOpen}
          setExtRedirectsOpen={setExtRedirectsOpen}
          t={t}
        />
      )}

      {/* 3. XRAY NODE IPS */}
      {platform === 'android' && (
        <XrayNodeIpsCard
          transitLoading={transitLoading}
          transitIps={transitIps}
          handleTransitIpChange={handleTransitIpChange}
          removeTransitIpRow={removeTransitIpRow}
          addTransitIpRow={addTransitIpRow}
          transitRemarks={transitRemarks}
          setTransitRemarks={setTransitRemarks}
          handleTransitSubmit={handleTransitSubmit}
          transitSaving={transitSaving}
          transitNotification={transitNotification}
          t={t}
        />
      )}

      {/* 4. MT PROXIES */}
      {platform === 'ios' && (
        <MtProxiesCard
          proxiesLoading={proxiesLoading}
          proxies={proxies}
          handleProxyChange={handleProxyChange}
          removeProxyRow={removeProxyRow}
          addProxyRow={addProxyRow}
          proxiesRemarks={proxiesRemarks}
          setProxiesRemarks={setProxiesRemarks}
          handleProxiesSubmit={handleProxiesSubmit}
          proxiesSaving={proxiesSaving}
          proxiesNotification={proxiesNotification}
          t={t}
        />
      )}

    </div>
  );
};

export default Configs;
