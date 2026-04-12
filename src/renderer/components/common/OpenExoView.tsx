import React from 'react';
import { useAppStore } from '../../stores/appStore';

export const OpenExoView: React.FC = () => {
  const connections = useAppStore((s) => s.connections);

  const localApps = [
    { id: 'outlook', name: 'Microsoft Outlook', icon: '📧', description: 'Launch desktop client' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', description: 'Open desktop messenger' },
    { id: 'chrome', name: 'Google Chrome', icon: '🌐', description: 'Open web browser' },
    { id: 'excel', name: 'Microsoft Excel', icon: '📊', description: 'Launch spreadsheet app' },
    { id: 'explorer', name: 'File Explorer', icon: '📁', description: 'Open local files' },
  ];

  const externalLinks = [
    { name: 'HMRC Portal', url: 'https://www.gov.uk/government/organisations/hm-revenue-customs', icon: '💰' },
    { name: 'Santander Business', url: 'https://www.santander.co.uk/', icon: '🏦' },
    { name: 'Land Registry', url: 'https://www.gov.uk/government/organisations/land-registry', icon: '🏠' },
  ];

  const handleLaunch = async (id: string) => {
    try {
      await window.babaAPI.launchApp(id);
    } catch (err) {
      console.error('Launch failed', err);
    }
  };

  const handleOpenUrl = async (url: string) => {
    try {
      await window.babaAPI.openUrl(url);
    } catch (err) {
      console.error('URL open failed', err);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>🔓 Open Exo</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Outbound operator launcher — push data to physical applications.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Local App Launcher */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            🖥️ Local System Apps
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {localApps.map((app) => (
              <div 
                key={app.id} 
                className="card card-clickable" 
                onClick={() => handleLaunch(app.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}
              >
                <span style={{ fontSize: 24 }}>{app.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{app.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{app.description}</div>
                </div>
                <button className="btn btn-sm btn-ghost">↗</button>
              </div>
            ))}
          </div>
        </div>

        {/* Web Portals */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            🌐 External Cloud Portals
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {externalLinks.map((link) => (
              <div 
                key={link.url} 
                className="card card-clickable" 
                onClick={() => handleOpenUrl(link.url)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}
              >
                <span style={{ fontSize: 24 }}>{link.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{link.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{link.url}</div>
                </div>
                <button className="btn btn-sm btn-ghost">↗</button>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 20, background: 'rgba(124, 129, 140, 0.05)', border: '1px dashed var(--border-primary)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Custom Command</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Enter URL or app path..." style={{ flex: 1, fontSize: 11 }} />
              <button className="btn btn-primary btn-sm">Launch</button>
            </div>
          </div>
        </div>
      </div>

      {/* Operator Safety Note */}
      <div style={{ marginTop: 32, padding: 16, background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-orange)', marginBottom: 4 }}>⚠️ Operator Safety Gate</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Baba is restricted from background launches. Every app execution requires explicit operator intent or approval.
        </div>
      </div>
    </div>
  );
};
