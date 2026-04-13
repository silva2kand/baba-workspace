import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { scanAllProviders } from '../../services/modelService';

export function LocalAppsView() {
  const connections = useAppStore((s) => s.connections);
  const setConnections = useAppStore((s) => s.setConnections);

  const [localApps, setLocalApps] = useState([
    { id: 'outlook', name: 'Microsoft Outlook', icon: '📧', type: 'communication', status: 'available', connected: true, path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE' },
    { id: 'chrome', name: 'Google Chrome', icon: '🌐', type: 'browser', status: 'available', connected: true, path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    { id: 'excel', name: 'Microsoft Excel', icon: '📊', type: 'office', status: 'available', connected: true, path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE' },
    { id: 'word', name: 'Microsoft Word', icon: '📝', type: 'office', status: 'available', connected: false, path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE' },
    { id: 'explorer', name: 'File Explorer', icon: '📁', type: 'system', status: 'available', connected: true, path: 'explorer.exe' },
    { id: 'terminal', name: 'Windows Terminal', icon: '⬛', type: 'system', status: 'available', connected: false, path: 'wt.exe' },
    { id: 'notepad', name: 'Notepad', icon: '📄', type: 'system', status: 'available', connected: false, path: 'notepad.exe' },
    { id: 'calculator', name: 'Calculator', icon: '🧮', type: 'system', status: 'available', connected: false, path: 'calc.exe' },
    { id: 'whatsapp', name: 'WhatsApp Desktop', icon: '💬', type: 'communication', status: 'available', connected: true, path: 'C:\\Users\\Silva\\AppData\\Local\\WhatsApp\\WhatsApp.exe' },
    { id: 'snipaste', name: 'Snipaste', icon: '📸', type: 'system', status: 'available', connected: false, path: 'C:\\Program Files\\Snipaste\\Snipaste.exe' },
  ]);

  function toggleConnection(id: string) {
    setLocalApps(prev => prev.map(app => 
      app.id === id ? { ...app, connected: !app.connected } : app
    ));
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>📱 Local Apps</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm">🔍 Scan for Apps</button>
          <button className="btn btn-secondary btn-sm">+ Add Custom</button>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          💡 Click <strong>Connect</strong> to enable an app. Connected apps can be launched from Baba and receive context handoff.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {localApps.map(app => (
          <div key={app.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{app.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{app.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{app.type} • {app.status}</div>
            </div>
            <button
              className={`btn btn-sm ${app.connected ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => toggleConnection(app.id)}
            >
              {app.connected ? '✓ Connected' : 'Connect'}
            </button>
            {app.connected && <button className="btn btn-ghost btn-sm">▶ Launch</button>}
          </div>
        ))}
      </div>
    </div>
  );
}