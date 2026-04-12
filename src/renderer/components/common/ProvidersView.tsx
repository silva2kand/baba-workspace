import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { scanAllProviders, scanOllama, scanLMStudio, scanJan } from '../../services/modelService';
import { scanInstalledApps } from '../../services/systemIntegrationService';

export function ProvidersView() {
  const connections = useAppStore((s) => s.connections);
  const setConnections = useAppStore((s) => s.setConnections);
  const providers = useAppStore((s) => s.providers);
  const setProviders = useAppStore((s) => s.setProviders);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectedAppIds, setDetectedAppIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const allProviders = [
    { id: 'ollama', name: 'Ollama', type: 'Local AI', icon: '🦙', url: 'http://localhost:11434', description: 'Run local LLM models' },
    { id: 'lmstudio', name: 'LM Studio', type: 'Local AI', icon: '🔬', url: 'http://localhost:1234', description: 'Local model inference' },
    { id: 'jan', name: 'Jan AI', type: 'Local AI', icon: '🤖', url: 'http://localhost:1337', description: 'Local AI assistant' },
    { id: 'outlook', name: 'Microsoft Outlook', type: 'Email', icon: '📧', url: 'OAuth2', description: 'Email, calendar, contacts' },
    { id: 'outlook-desktop', name: 'Outlook Desktop', type: 'Email', icon: '📧', url: 'Desktop', description: 'Use installed Outlook app (COM)' },
    { id: 'gmail', name: 'Gmail', type: 'Email', icon: '📧', url: 'OAuth2', description: 'Google email service' },
    { id: 'whatsapp', name: 'WhatsApp', type: 'Messenger', icon: '💬', url: 'Desktop', description: 'WhatsApp Desktop integration' },
    { id: 'chrome', name: 'Chrome', type: 'Browser', icon: '🌐', url: 'Desktop', description: 'Browser automation' },
    { id: 'excel', name: 'Excel', type: 'Office', icon: '📊', url: 'Desktop', description: 'Spreadsheet integration' },
    { id: 'explorer', name: 'File Explorer', type: 'System', icon: '📁', url: 'Local', description: 'File access and monitoring' },
  ];

  function normalizeConnectionId(id: string) {
    if (id === 'files' || id === 'filesystem') return 'explorer';
    return id;
  }

  function emailProviderIdFromConnectionId(id: string): 'outlook' | 'gmail' | null {
    const normalized = normalizeConnectionId(id);
    if (normalized === 'outlook' || normalized.startsWith('outlook:')) return 'outlook';
    if (normalized === 'outlook-desktop') return 'outlook';
    if (normalized === 'gmail' || normalized.startsWith('gmail:')) return 'gmail';
    return null;
  }

  function emailAccountsForProvider(providerId: 'outlook' | 'gmail') {
    return connections
      .filter((c) => c.type === 'email' && c.status === 'connected')
      .filter((c) => emailProviderIdFromConnectionId(c.id) === providerId);
  }

  function connectionTypeForProvider(providerType: string) {
    if (providerType === 'Email') return 'email';
    if (providerType === 'Messenger') return 'messenger';
    if (providerType === 'Browser') return 'browser';
    if (providerType === 'Office') return 'office';
    if (providerType === 'System') return 'system';
    return 'custom';
  }

  async function handleConnectAI(id: string) {
    setConnecting(id);
    let p = null;
    try {
      if (id === 'ollama') p = await scanOllama();
      else if (id === 'lmstudio') p = await scanLMStudio();
      else if (id === 'jan') p = await scanJan();
      
      if (p) {
        setProviders([...providers.filter(x => x.id !== id), p]);
      }
      setError(null);
      setLastAction(p ? `${p.name} connected` : `${id} not detected`);
    } finally {
      setConnecting(null);
    }
  }

  async function connectService(provider: { id: string; name: string; type: string; icon: string }) {
    setConnecting(provider.id);
    setError(null);
    try {
      if (provider.id === 'outlook' || provider.id === 'gmail') {
        const res = await window.babaAPI?.emailConnect?.(provider.id as 'outlook' | 'gmail', useAppStore.getState().settings);
        if (!res?.connected) throw new Error(`${provider.name} connect failed`);
        const account = String(res.account || provider.id);
        const connId = `${provider.id}:${account}`;
        const current = useAppStore.getState().connections;
        const nextConn = {
          id: connId,
          name: `${provider.name} (${account})`,
          type: 'email',
          status: 'connected' as const,
          icon: provider.icon,
        };
        const nextConnections = [...current.filter((c) => normalizeConnectionId(c.id) !== connId), nextConn];
        setConnections(nextConnections);
        setLastAction(`${provider.name} connected (${account})`);
        return;
      } else if (provider.id === 'outlook-desktop') {
        await window.babaAPI?.launchApp?.('outlook');
        const status = await window.babaAPI?.emailDesktopStatus?.();
        if (!status?.ok) throw new Error(status?.error || 'Outlook Desktop (COM) not available. Use Classic Outlook.');
      } else if (provider.id === 'whatsapp') {
        const launched = await window.babaAPI?.launchApp?.('whatsapp');
        if (!launched) await window.babaAPI?.openUrl?.('https://web.whatsapp.com/');
      } else if (provider.id === 'chrome') {
        await window.babaAPI?.launchApp?.('chrome');
      } else if (provider.id === 'excel') {
        await window.babaAPI?.launchApp?.('excel');
      } else if (provider.id === 'explorer') {
        await window.babaAPI?.launchApp?.('explorer');
      }

      const current = useAppStore.getState().connections;
      const normalizedId = normalizeConnectionId(provider.id);
      const nextConn = {
        id: normalizedId,
        name: provider.name,
        type: connectionTypeForProvider(provider.type),
        status: 'connected' as const,
        icon: provider.icon,
      };
      const nextConnections = [...current.filter((c) => normalizeConnectionId(c.id) !== normalizedId), nextConn];
      setConnections(nextConnections);
      setLastAction(`${provider.name} connected`);
    } catch (err: any) {
      setError(err?.message ? String(err.message) : String(err));
    } finally {
      setConnecting(null);
    }
  }

  async function disconnectService(provider: { id: string; name: string }) {
    setConnecting(provider.id);
    setError(null);
    try {
      const current = useAppStore.getState().connections;
      const normalizedId = normalizeConnectionId(provider.id);
      const nextConnections =
        provider.id === 'outlook' || provider.id === 'gmail'
          ? current.filter((c) => emailProviderIdFromConnectionId(c.id) !== provider.id)
          : current.filter((c) => normalizeConnectionId(c.id) !== normalizedId);
      setConnections(nextConnections);
      if (provider.id === 'outlook' || provider.id === 'gmail') {
        await window.babaAPI?.emailDisconnect?.(provider.id as 'outlook' | 'gmail');
      }
      setLastAction(`${provider.name} disconnected`);
    } catch (err: any) {
      setError(err?.message ? String(err.message) : String(err));
    } finally {
      setConnecting(null);
    }
  }

  async function handleAutoDetect() {
    setDetecting(true);
    try {
      const active = await scanAllProviders();
      if (active.length > 0) {
        setProviders(active);
      }
      const apps = await scanInstalledApps();
      setDetectedAppIds(new Set(apps.map((a) => a.id)));
      setError(null);
      setLastAction('Auto-detect completed');
    } catch (err: any) {
      setError(err?.message ? String(err.message) : String(err));
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>🔌 Providers</h2>
        <button 
          className="btn btn-primary btn-sm"
          onClick={handleAutoDetect}
          disabled={detecting}
        >
          {detecting ? '⏳ Scanning...' : '🔍 Auto-Detect'}
        </button>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          🔌 Click <strong>Connect</strong> to enable a provider. Baba will auto-detect local AI models and PC applications. Connected providers can be used by agents and automation.
        </div>
      </div>

      {(error || lastAction) && (
        <div className="card" style={{ marginBottom: 12, padding: 10, borderColor: error ? 'var(--accent-red)' : 'var(--border-primary)' }}>
          {error ? (
            <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>⚠ {error}</div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>✓ {lastAction}</div>
          )}
        </div>
      )}

      {/* AI Providers */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Local AI Providers</div>
      {allProviders.filter(p => p.type === 'Local AI').map(provider => {
        const connectedProvider = providers.find(p => p.id === provider.id);
        const isConnected = !!connectedProvider;
        const isConnecting = connecting === provider.id;

        return (
          <div key={provider.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{provider.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{provider.name}</div>
              {isConnected ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{connectedProvider.baseUrl} • {connectedProvider.models.length} models • {connectedProvider.latency}ms</div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{provider.description} • {provider.url}</div>
              )}
            </div>
            <button 
              className={`btn btn-sm ${isConnected ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => {
                if (!isConnected) handleConnectAI(provider.id);
              }}
              disabled={isConnecting || isConnected}
            >
              {isConnecting ? '⏳ Connecting...' : isConnected ? '✓ Connected' : 'Connect'}
            </button>
          </div>
        );
      })}

      {/* Other Providers */}
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '16px 0 8px' }}>Services & Applications</div>
      {allProviders.filter(p => p.type !== 'Local AI').map(provider => {
        const emailProvider = provider.id === 'outlook' || provider.id === 'gmail' ? (provider.id as 'outlook' | 'gmail') : null;
        const emailAccounts = emailProvider ? emailAccountsForProvider(emailProvider) : [];
        const conn = connections.find(c => normalizeConnectionId(c.id) === normalizeConnectionId(provider.id));
        const isConnected = emailProvider ? emailAccounts.length > 0 : conn?.status === 'connected';
        const isConnecting = connecting === provider.id;
        const isDetected = detectedAppIds.size === 0 ? true : detectedAppIds.has(provider.id);
        return (
          <div key={provider.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{provider.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{provider.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {provider.description} • {provider.url}
                {provider.type === 'Email' && emailProvider && <span style={{ marginLeft: 8 }}>• {emailAccounts.length} accounts</span>}
                {provider.type !== 'Email' && <span style={{ marginLeft: 8 }}>{isDetected ? '• detected' : '• not detected'}</span>}
              </div>
            </div>
            <button
              className={`btn btn-sm ${isConnected ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => {
                if (isConnected) disconnectService(provider);
                else connectService(provider);
              }}
              disabled={isConnecting || (!isDetected && provider.type !== 'Email')}
            >
              {isConnecting ? '⏳ Working...' : isConnected ? '✓ Connected' : 'Connect'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
