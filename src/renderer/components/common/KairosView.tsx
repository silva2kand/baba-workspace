import React from 'react';
import { useAppStore } from '../../stores/appStore';

interface ScheduleJob {
  id: string;
  name: string;
  type: 'scan' | 'sync' | 'agent' | 'report';
  status: 'running' | 'waiting' | 'paused' | 'done';
  nextRun: string;
  interval: string;
  lastOutcome: string;
}

export const KairosView: React.FC = () => {
  const systemStatus = useAppStore((s) => s.systemStatus);
  const tasks = useAppStore((s) => s.tasks);

  const jobs: ScheduleJob[] = [
    { id: '1', name: 'Global Inbox Refresh', type: 'sync', status: 'waiting', nextRun: 'in 4m 12s', interval: 'Every 15m', lastOutcome: 'Success' },
    { id: '2', name: 'VAT Return Auto-Triage', type: 'scan', status: 'running', nextRun: 'Now', interval: 'Daily', lastOutcome: 'N/A' },
    { id: '3', name: 'Radar Intelligence Sweep', type: 'scan', status: 'waiting', nextRun: 'in 28m', interval: 'Every 1h', lastOutcome: '3 signals found' },
    { id: '4', name: 'Solicitor Deadline Audit', type: 'agent', status: 'waiting', nextRun: 'in 2h 15m', interval: 'Every 4h', lastOutcome: 'No changes' },
    { id: '5', name: 'Weekly Finance Summary', type: 'report', status: 'paused', nextRun: 'Mon 09:00', interval: 'Weekly', lastOutcome: 'Sent to Silva' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'var(--accent-green)';
      case 'waiting': return 'var(--accent-cyan)';
      case 'paused': return 'var(--text-muted)';
      default: return 'var(--text-primary)';
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>⏳ Kairos</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Timing & Cadence — managing the when of the system.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm">⏰ Add Job</button>
        </div>
      </div>

      {/* active timelines */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>System Tick Rate</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ width: 4, height: 12, background: 'var(--accent-green)', borderRadius: 2 }} />
            <div style={{ width: 4, height: 24, background: 'var(--accent-green)', borderRadius: 2, opacity: 0.6 }} />
            <div style={{ width: 4, height: 18, background: 'var(--accent-green)', borderRadius: 2 }} />
            <div style={{ width: 4, height: 32, background: 'var(--accent-green)', borderRadius: 2, opacity: 0.8 }} />
            <div style={{ fontSize: 24, fontWeight: 700, marginLeft: 8, color: 'var(--accent-green)' }}>1.0s</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            Baba is pulsing at standard cadence. {systemStatus.scheduler.running} jobs active in current cycle.
          </div>
        </div>
        
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Smart Wait Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
              <span>Solicitor Agent:</span>
              <span style={{ color: 'var(--accent-orange)' }}>Waiting for Email Reply</span>
            </div>
            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
              <span>Accountant Agent:</span>
              <span style={{ color: 'var(--accent-green)' }}>Processing... (14s remain)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', fontSize: 13, fontWeight: 600 }}>
          Scheduled Operations
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-muted)' }}>
              <th style={{ padding: 12, fontWeight: 500 }}>JOB NAME</th>
              <th style={{ padding: 12, fontWeight: 500 }}>FREQUENCY</th>
              <th style={{ padding: 12, fontWeight: 500 }}>NEXT RUN</th>
              <th style={{ padding: 12, fontWeight: 500 }}>STATUS</th>
              <th style={{ padding: 12, fontWeight: 500 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <td style={{ padding: 12, fontWeight: 600 }}>{job.name}</td>
                <td style={{ padding: 12, color: 'var(--text-secondary)' }}>{job.interval}</td>
                <td style={{ padding: 12, color: 'var(--text-secondary)' }}>{job.nextRun}</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusColor(job.status) }} />
                    <span style={{ textTransform: 'capitalize', color: getStatusColor(job.status) }}>{job.status}</span>
                  </div>
                </td>
                <td style={{ padding: 12 }}>
                  <button className="btn btn-ghost btn-sm">⚙️</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }}>⏹</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
