import React from 'react';
import { useAppStore } from '../../stores/appStore';

export function Footer() {
  const systemStatus = useAppStore((s) => s.systemStatus);
  const emailScanProgress = useAppStore((s) => s.emailScanProgress);
  const agents = useAppStore((s) => s.agents);
  const notifications = useAppStore((s) => s.notifications);
  const unreadNotificationCount = useAppStore((s) => s.unreadNotificationCount);
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const workingAgents = agents.filter(a => a.status === 'working').length;
  const health = systemStatus.sync.errors > 0 ? 'Degraded' : 'Healthy';
  const healthDotClass = systemStatus.sync.errors > 0 ? 'status-dot status-dot-red' : 'status-dot status-dot-green';

  return (
    <footer style={{
      height: 'var(--footer-height)',
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontSize: 10,
      color: 'var(--text-muted)',
    }}>
      {/* Left - Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className={healthDotClass} />
          <span>{health}</span>
        </div>
        <span>⚖️ Solicitor: {systemStatus.solicitor.urgent}</span>
        <span>📊 Accountant: {systemStatus.accountant.urgent}</span>
        <span>🔍 Researcher: {systemStatus.researcher.active}</span>
      </div>

      {/* Center - Connections & Scheduler */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: systemStatus.outlook.status === 'oauth connected' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
          📧 Outlook: {systemStatus.outlook.status}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          📧 Gmail: {systemStatus.gmail.status}
        </span>
        <span style={{ color: 'var(--accent-green)' }}>
          📁 EmailOrg: {systemStatus.emailOrg.status}
        </span>
        <span>
          ⏰ Scheduler: {systemStatus.scheduler.running} running
        </span>
      </div>

      {/* Right - Sync & Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: 'var(--accent-green)' }}>
          ✅ {systemStatus.sync.status}
        </span>
        <span>
          ❌ {systemStatus.sync.errors} errors
        </span>
        <span>
          🔔 {unreadNotificationCount} unread / {notifications.length} total
        </span>
        <span>
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </span>
      </div>
    </footer>
  );
}
