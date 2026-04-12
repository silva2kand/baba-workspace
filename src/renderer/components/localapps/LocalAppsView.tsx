import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { LocalApp } from '@shared/types';
import { scanInstalledApps, launchApp } from '../../services/systemIntegrationService';

export function LocalAppsView() {
  const connections = useAppStore((s) => s.connections);
  const setConnections = useAppStore((s) => s.setConnections);
  const [localApps, setLocalApps] = useState<LocalApp[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setIsScanning(true);
      try {
        const scanned = await scanInstalledApps();
        if (cancelled) return;
        setLocalApps(mergeAppsWithConnections(scanned, useAppStore.getState().connections));
      } finally {
        if (!cancelled) setIsScanning(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const scanned = await scanInstalledApps();
      setLocalApps(mergeAppsWithConnections(scanned, useAppStore.getState().connections));
    } finally {
      setIsScanning(false);
    }
  };

  function normalizeConnectionId(id: string) {
    if (id === 'files' || id === 'filesystem') return 'explorer';
    return id;
  }

  function connectionTypeForApp(app: LocalApp) {
    if (app.id === 'outlook' || app.id === 'gmail') return 'email';
    if (app.id === 'whatsapp' || app.type === 'communication') return 'messenger';
    return app.type;
  }

  function mergeAppsWithConnections(scannedApps: LocalApp[], currentConnections: Array<{ id: string; name: string; type: string; status: string; icon: string }>): LocalApp[] {
    const connectedIds = new Set(currentConnections.filter((c) => c.status === 'connected').map((c) => normalizeConnectionId(c.id)));

    const base = scannedApps.map((app) => ({
      ...app,
      connected: connectedIds.has(normalizeConnectionId(app.id)),
    }));

    const extras = currentConnections
      .filter((c) => c.status === 'connected')
      .map((c) => {
        const id = normalizeConnectionId(c.id);
        if (base.some((a) => normalizeConnectionId(a.id) === id)) return null;
        return {
          id,
          name: c.name,
          icon: c.icon,
          path: `${id}.exe`,
          type: (c.type === 'messenger' ? 'communication' : (c.type as LocalApp['type'])) || 'custom',
          status: 'available' as const,
          connected: true,
        } satisfies LocalApp;
      })
      .filter((x): x is Exclude<typeof x, null> => x !== null);

    return [...base, ...extras];
  }

  function toggleConnection(app: LocalApp) {
    const currentConnections = useAppStore.getState().connections;
    const normalizedId = normalizeConnectionId(app.id);

    if (app.connected) {
      const nextConnections = currentConnections.filter((c) => normalizeConnectionId(c.id) !== normalizedId);
      setConnections(nextConnections);
      setLocalApps((prev) => prev.map((a) => (normalizeConnectionId(a.id) === normalizedId ? { ...a, connected: false } : a)));
      return;
    }

    const newConn = { id: normalizedId, name: app.name, type: connectionTypeForApp(app), status: 'connected' as const, icon: app.icon };
    const nextConnections = [...currentConnections.filter((c) => normalizeConnectionId(c.id) !== normalizedId), newConn];
    setConnections(nextConnections);
    setLocalApps((prev) => prev.map((a) => (normalizeConnectionId(a.id) === normalizedId ? { ...a, connected: true } : a)));
  }

  function handleLaunch(id: string) {
    launchApp(id);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>📱 Local Apps</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleScan} disabled={isScanning}>
            {isScanning ? '⏳ Scanning Engine...' : '🔍 Scan for Apps'}
          </button>
          <button className="btn btn-secondary btn-sm">+ Add Custom</button>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          💡 Click <strong>Connect</strong> to enable an app. Connected apps can be launched from Baba and receive context handoff.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: 600, overflowY: 'auto', paddingRight: 8 }}>
        {localApps.map(app => (
          <div key={app.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{app.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{app.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{app.type} • {app.status}</div>
            </div>
            <button
              className={`btn btn-sm ${app.connected ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => toggleConnection(app)}
            >
              {app.connected ? '✓ Connected' : 'Connect'}
            </button>
            {app.connected && <button className="btn btn-ghost btn-sm" onClick={() => handleLaunch(app.id)}>▶ Launch</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
