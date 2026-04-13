import React from 'react';
import { useAppStore } from '../../stores/appStore';

const navItems = [
  { section: 'CORE', items: [
    { id: 'home' as const, label: 'Home', icon: '🏠', badge: undefined as number | undefined },
    { id: 'chat' as const, label: 'Chat', icon: '💬', badge: undefined as number | undefined },
    { id: 'advisor' as const, label: 'Advisor', icon: '🧭', badge: undefined as number | undefined },
    { id: 'agents' as const, label: 'Agents', icon: '🤖', badge: 4 },
  ]},
  { section: 'INTELLIGENCE', items: [
    { id: 'inbox' as const, label: 'Inbox', icon: '📥', badge: 86 },
    { id: 'organizer' as const, label: 'Organizer', icon: '🗂️', badge: undefined as number | undefined },
    { id: 'brain' as const, label: 'Brain', icon: '🧠', badge: undefined as number | undefined },
    { id: 'cases' as const, label: 'Cases', icon: '📋', badge: 80 },
    { id: 'radar' as const, label: 'Radar', icon: '📡', badge: 5 },
    { id: 'approvals' as const, label: 'Approvals', icon: '✅', badge: undefined as number | undefined },
    { id: 'tasks' as const, label: 'Tasks', icon: '📝', badge: undefined as number | undefined },
  ]},
  { section: 'OPERATIONS', items: [
    { id: 'exo-triage' as const, label: 'Exo Triage', icon: '⚡', badge: undefined as number | undefined },
    { id: 'open-exo' as const, label: 'Open Exo', icon: '🔓', badge: undefined as number | undefined },
    { id: 'kairos' as const, label: 'Kairos', icon: '⏳', badge: undefined as number | undefined },
    { id: 'wiki' as const, label: 'Wiki', icon: '📚', badge: undefined as number | undefined },
    { id: 'claws' as const, label: 'Claws', icon: '🦅', badge: undefined as number | undefined },
    { id: 'simulation' as const, label: 'Simulation', icon: '🧪', badge: undefined as number | undefined },
    { id: 'self-evolving' as const, label: 'Self-Evolving', icon: '🧬', badge: undefined as number | undefined },
  ]},
  { section: 'SYSTEM', items: [
    { id: 'scheduler' as const, label: 'Scheduler', icon: '⏰', badge: undefined as number | undefined },
    { id: 'files' as const, label: 'Files', icon: '📁', badge: undefined as number | undefined },
    { id: 'pc-control' as const, label: 'PC Control', icon: '🖥️', badge: undefined as number | undefined },
    { id: 'browser' as const, label: 'Browser', icon: '🌐', badge: undefined as number | undefined },
    { id: 'local-apps' as const, label: 'Local Apps', icon: '📱', badge: undefined as number | undefined },
    { id: 'models' as const, label: 'Models', icon: '🧠', badge: undefined as number | undefined },
    { id: 'providers' as const, label: 'Providers', icon: '🔌', badge: undefined as number | undefined },
    { id: 'voice' as const, label: 'Voice', icon: '🎤', badge: undefined as number | undefined },
    { id: 'settings' as const, label: 'Settings', icon: '⚙️', badge: undefined as number | undefined },
  ]},
];

export function Sidebar() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const agents = useAppStore((s) => s.agents);
  const evidenceMode = useAppStore((s) => s.evidenceMode);
  const setEvidenceMode = useAppStore((s) => s.setEvidenceMode);
  const coworkEnabled = useAppStore((s) => s.coworkEnabled);
  const setCoworkEnabled = useAppStore((s) => s.setCoworkEnabled);

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo & New Task */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'white',
          }}>B</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Baba Workspace</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>v0.9.2 beta</div>
          </div>
        </div>
        <button
          className="btn btn-primary w-full"
          style={{ fontSize: 12 }}
          onClick={() => setCurrentView('tasks')}
        >
          ✨ New Task
        </button>
      </div>

      {/* Toggle Buttons */}
      <div style={{ padding: '6px 12px', display: 'flex', gap: 6, borderBottom: '1px solid var(--border-primary)' }}>
        <button
          className={`btn btn-sm ${evidenceMode ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setEvidenceMode(!evidenceMode)}
          style={{ fontSize: 10 }}
        >
          🔍 Evidence {evidenceMode ? 'ON' : 'OFF'}
        </button>
        <button
          className={`btn btn-sm ${coworkEnabled ? 'btn-success' : 'btn-ghost'}`}
          onClick={() => setCoworkEnabled(!coworkEnabled)}
          style={{ fontSize: 10 }}
        >
          👥 Cowork {coworkEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="section-header" style={{ padding: '6px 16px', fontSize: 10 }}>
              {section.section}
            </div>
            {section.items.map((item) => {
              const isActive = currentView === item.id;
              const workingAgents = item.id === 'agents' ? agents.filter(a => a.status === 'working').length : 0;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 16px',
                    border: 'none',
                    background: isActive ? 'var(--accent-blue)' : 'transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontFamily: 'var(--font-sans)',
                    transition: 'all var(--transition-fast)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span className="badge" style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--accent-blue)',
                      fontSize: 10,
                    }}>{item.badge}</span>
                  )}
                  {item.id === 'agents' && workingAgents > 0 && (
                    <span className="status-dot status-dot-green" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border-primary)',
        fontSize: 10,
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <span className="status-dot status-dot-green" />
          <span>All Systems Healthy</span>
        </div>
        <div>Share Baba Workspace with a friend</div>
      </div>
    </aside>
  );
}
