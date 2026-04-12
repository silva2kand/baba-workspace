import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { scanAllProviders } from '../../services/modelService';

export function Topbar() {
  const currentView = useAppStore((s) => s.currentView);
  const providers = useAppStore((s) => s.providers);
  const models = useAppStore((s) => s.models);
  const selectedProvider = useAppStore((s) => s.selectedProvider);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedProvider = useAppStore((s) => s.setSelectedProvider);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const setProviders = useAppStore((s) => s.setProviders);
  const setModels = useAppStore((s) => s.setModels);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const username = useAppStore((s) => s.username);
  const evidenceMode = useAppStore((s) => s.evidenceMode);
  const coworkEnabled = useAppStore((s) => s.coworkEnabled);
  const [scanning, setScanning] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    scanProviders();
  }, []);

  async function scanProviders() {
    setScanning(true);
    try {
      const found = await scanAllProviders();
      setProviders(found);
      const allModels = found.flatMap(p => p.models);
      setModels(allModels);
      if (found.length > 0 && !selectedProvider) {
        setSelectedProvider(found[0].id);
      }
      if (allModels.length > 0 && !selectedModel) {
        setSelectedModel(allModels[0].name);
      }
    } catch (err) {
      console.error('Provider scan failed:', err);
    } finally {
      setScanning(false);
    }
  }

  const viewLabels: Record<string, string> = {
    home: 'Home', chat: 'Chat', advisor: 'Advisor', agents: 'Agents',
    inbox: 'Inbox', organizer: 'Organizer', cases: 'Cases', radar: 'Radar',
    approvals: 'Approvals', tasks: 'Tasks', 'exo-triage': 'Exo Triage',
    'open-exo': 'Open Exo', kairos: 'Kairos', wiki: 'Wiki', claws: 'Claws',
    'self-evolving': 'Self-Evolving', scheduler: 'Scheduler', files: 'Files',
    'pc-control': 'PC Control', browser: 'Browser', 'local-apps': 'Local Apps',
    models: 'Models', providers: 'Providers', settings: 'Settings',
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-primary)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
    }}>
      {/* Search / Command Bar */}
      <div style={{ flex: 1, maxWidth: 400 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-input)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '4px 12px',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>🔍</span>
          <input
            type="text"
            placeholder="Search or ask a command..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </div>

      {/* Current View */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
        {viewLabels[currentView] || currentView}
      </div>

      <div style={{ flex: 1 }} />

      {/* Evidence & Cowork indicators */}
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)',
          background: evidenceMode ? 'rgba(34,197,94,0.15)' : 'var(--bg-tertiary)',
          color: evidenceMode ? 'var(--accent-green)' : 'var(--text-muted)',
          border: `1px solid ${evidenceMode ? 'var(--accent-green)' : 'var(--border-primary)'}`,
        }}>
          🔍 Evidence {evidenceMode ? 'ON' : 'OFF'}
        </span>
        {coworkEnabled && (
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)',
            background: 'rgba(34,197,94,0.15)', color: 'var(--accent-green)',
            border: '1px solid var(--accent-green)',
          }}>
            👥 Cowork ON
          </span>
        )}
      </div>

      {/* Model Selector */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowModelDropdown(!showModelDropdown)}
          style={{ minWidth: 180, justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot" style={{ background: currentProvider ? 'var(--accent-green)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: 11 }}>
              {currentProvider?.name || 'Provider'}: {selectedModel || 'No model'}
            </span>
          </span>
          <span style={{ fontSize: 10 }}>▼</span>
        </button>

        {showModelDropdown && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            width: 320, maxHeight: 400, overflowY: 'auto',
            background: 'var(--bg-popup)', border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>AI MODELS</span>
              <button className="btn btn-ghost btn-sm" onClick={scanProviders} disabled={scanning}>
                {scanning ? '⟳ Scanning...' : '🔄 Rescan'}
              </button>
            </div>
            {providers.map(provider => (
              <div key={provider.id}>
                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 600, color: 'var(--text-accent)', background: 'var(--bg-tertiary)' }}>
                  {provider.name} <span style={{ color: 'var(--accent-green)' }}>●</span> {provider.latency}ms
                </div>
                {provider.models.map(model => (
                  <button
                    key={model.id}
                    className="btn btn-ghost w-full"
                    style={{ justifyContent: 'flex-start', padding: '6px 12px', fontSize: 11 }}
                    onClick={() => {
                      setSelectedProvider(provider.id);
                      setSelectedModel(model.name);
                      setShowModelDropdown(false);
                    }}
                  >
                    <span style={{ marginRight: 8 }}>{selectedModel === model.name ? '●' : '○'}</span>
                    <span style={{ flex: 1 }}>{model.name}</span>
                    {model.size && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{model.size}</span>}
                  </button>
                ))}
              </div>
            ))}
            {providers.length === 0 && !scanning && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No AI providers detected.<br />Start Ollama, LM Studio, or Jan to connect.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
        🔔
        <span style={{
          position: 'absolute', top: 2, right: 2, width: 8, height: 8,
          background: 'var(--accent-red)', borderRadius: '50%',
        }} />
      </button>

      {/* Sync Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent-green)' }}>
        <span className="status-dot status-dot-green" />
        Synced
      </div>

      {/* User */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 8px', borderRadius: 'var(--radius-md)',
        background: 'var(--bg-tertiary)', cursor: 'pointer',
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 'var(--radius-full)',
          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'white',
        }}>{username.charAt(0)}</div>
        <span style={{ fontSize: 12 }}>{username}</span>
      </div>
    </header>
  );
}