import React from 'react';
import { useAppStore } from '../../stores/appStore';

export function ContextPanel() {
  const currentView = useAppStore((s) => s.currentView);
  const setContextPanelOpen = useAppStore((s) => s.setContextPanelOpen);
  const agents = useAppStore((s) => s.agents);
  const evolutionLog = useAppStore((s) => s.evolutionLog);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const systemStatus = useAppStore((s) => s.systemStatus);

  const workingAgents = agents.filter(a => a.status === 'working');

  return (
    <aside style={{
      width: 'var(--context-panel-width)',
      minWidth: 'var(--context-panel-width)',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Context Panel</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setContextPanelOpen(false)}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* Orchestration */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-header">ORCHESTRATION</div>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
            <div style={{ color: 'var(--text-secondary)' }}>Baba supervising <strong style={{ color: 'var(--accent-green)' }}>{workingAgents.length} agents</strong>.</div>
            <div style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 11 }}>
              {workingAgents.length > 0 ? `${workingAgents.length} tasks completing...` : 'All agents idle.'}
            </div>
            <div style={{ color: 'var(--accent-green)', marginTop: 4, fontSize: 11 }}>✓ Self-evolution passed.</div>
          </div>
        </div>

        {/* Model Routing */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-header">MODEL ROUTING</div>
          <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: 11 }}>
            <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Primary:</span> {selectedModel || 'None selected'}</div>
            <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Coder:</span> Qwen2.5-Coder-14B</div>
            <div style={{ marginBottom: 4 }}><span style={{ color: 'var(--text-muted)' }}>Fast:</span> Llama3.2:3b</div>
          </div>
        </div>

        {/* Self Correction */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-header">SELF CORRECTION</div>
          {[
            { time: '10:20', msg: 'Adjusted prompt for Coder' },
            { time: '10:18', msg: 'Rerouted to Opus-Distill' },
            { time: '10:15', msg: 'Agent sync completed' },
          ].map((entry, i) => (
            <div key={i} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>[{entry.time}]</span> {entry.msg}
            </div>
          ))}
        </div>

        {/* Connections */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-header">CONNECTIONS</div>
          {[
            { name: 'Solicitor', value: '18 urgent', color: 'var(--accent-red)' },
            { name: 'Accountant', value: '20 urgent', color: 'var(--accent-orange)' },
            { name: 'Researcher', value: '3 active', color: 'var(--accent-cyan)' },
          ].map((conn, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
              <span>{conn.name}:</span>
              <span style={{ color: conn.color }}>{conn.value}</span>
            </div>
          ))}
        </div>

        {/* Provider Status */}
        <div style={{ marginBottom: 16 }}>
          <div className="section-header">PROVIDERS</div>
          {[
            { name: 'Outlook', status: 'oauth connected', color: 'var(--accent-green)' },
            { name: 'Gmail', status: 'agent off', color: 'var(--text-muted)' },
            { name: 'WhatsApp', status: 'synced', color: 'var(--accent-green)' },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
              <span>{p.name}:</span>
              <span style={{ color: p.color }}>{p.status}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <div className="section-header">QUICK ACTIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: 'flex-start' }}>📋 Create Case</button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: 'flex-start' }}>📧 Compose Email</button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: 'flex-start' }}>📡 Add Radar Topic</button>
            <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: 'flex-start' }}>⏰ Schedule Job</button>
          </div>
        </div>
      </div>
    </aside>
  );
}