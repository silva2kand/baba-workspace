import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';

export const PCControlView: React.FC = () => {
  const [telemetry, setTelemetry] = useState<any>({ cpuUsage: 0, memoryUsage: 0, networkLatency: 0, uptime: 0 });

  useEffect(() => {
    let interval: any;
    async function fetchTelemetry() {
      if (window.babaAPI?.getSystemInfo) {
        const info = await window.babaAPI.getSystemInfo();
        setTelemetry(info);
      }
    }
    
    fetchTelemetry();
    interval = setInterval(fetchTelemetry, 2000); // Pulse every 2s
    
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const stats = [
    { label: 'CPU Usage', value: `${Math.round(telemetry.cpuUsage || 0)}%`, color: 'var(--accent-blue)' },
    { label: 'RAM Load', value: `${Math.round(telemetry.memoryUsage || 0)}%`, color: 'var(--accent-cyan)' },
    { label: 'Network Latency', value: `${telemetry.networkLatency || 12}ms`, color: 'var(--accent-green)' },
    { label: 'Uptime', value: formatUptime(telemetry.uptime || 0), color: 'var(--text-muted)' },
  ];

  const controls = [
    { name: 'Launch Terminal', icon: '🖥️', cmd: 'wt' },
    { name: 'File Explorer', icon: '📁', cmd: 'explorer' },
    { name: 'Task Manager', icon: '📈', cmd: 'taskmgr' },
    { name: 'Regedit', icon: '🛡️', cmd: 'regedit' },
    { name: 'System Settings', icon: '⚙️', cmd: 'start ms-settings:' },
  ];

  const handleControl = (cmd: string) => {
    window.babaAPI?.launchApp(cmd);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>💻 PC Control</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>System Integration — direct management of local hardware and applications.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
        {/* System Utilities */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Quick Utilities</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {controls.map(ctrl => (
              <button 
                key={ctrl.name}
                className="btn btn-secondary btn-sm" 
                style={{ justifyContent: 'flex-start', gap: 10, padding: '10px 12px' }}
                onClick={() => handleControl(ctrl.cmd)}
              >
                <span>{ctrl.icon}</span>
                <span>{ctrl.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Health / Logs */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>System Events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 4, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--accent-green)' }}>[INFO]</span>
              <span>PowerShell bridge initialized. Boot from Tray.</span>
            </div>
            <div style={{ fontSize: 11, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 4, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--accent-green)' }}>[INFO]</span>
              <span>Node.js OS telemetry real-time hook active.</span>
            </div>
            {telemetry.memoryUsage > 80 && (
              <div style={{ fontSize: 11, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 4, display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--accent-orange)' }}>[WARN]</span>
                <span>High memory usage detected ({Math.round(telemetry.memoryUsage)}%)</span>
              </div>
            )}
            <div style={{ fontSize: 11, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 4, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--accent-green)' }}>[INFO]</span>
              <span>Baba Engine Memory Sync Success</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
