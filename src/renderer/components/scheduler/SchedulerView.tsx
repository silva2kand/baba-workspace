import React, { useState } from 'react';

export function SchedulerView() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const jobs = [
    { id: '1', name: 'Email Organizer', type: 'Recurring', status: 'running', interval: 'Every 45 min', lastRun: '10:23 AM', nextRun: '11:08 AM', runsCompleted: 847 },
    { id: '2', name: 'Daily Triage Report', type: 'Recurring', status: 'running', interval: 'Daily 6:00 AM', lastRun: '6:00 AM', nextRun: 'Tomorrow 6:00 AM', runsCompleted: 45 },
    { id: '3', name: 'Weekly Case Review', type: 'Recurring', status: 'paused', interval: 'Weekly Monday', lastRun: 'Last Monday', nextRun: 'Next Monday', runsCompleted: 12 },
    { id: '4', name: 'File Watcher - Bills', type: 'Trigger', status: 'running', interval: 'On file change', lastRun: '2h ago', nextRun: 'On trigger', runsCompleted: 23 },
    { id: '5', name: 'Radar Signal Scan', type: 'Recurring', status: 'running', interval: 'Every 30 min', lastRun: '15 min ago', nextRun: '15 min', runsCompleted: 312 },
    { id: '6', name: 'Provider Health Check', type: 'Recurring', status: 'running', interval: 'Every 10 min', lastRun: '5 min ago', nextRun: '5 min', runsCompleted: 1205 },
    { id: '7', name: 'Self-Evolution Cycle', type: 'Recurring', status: 'running', interval: 'Every 12 min', lastRun: '12 min ago', nextRun: '< 1 min', runsCompleted: 523 },
  ];

  const statusColors: Record<string, string> = { running: 'var(--accent-green)', paused: 'var(--accent-orange)', stopped: 'var(--text-muted)', error: 'var(--accent-red)' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>⏰ Scheduler</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm">+ New Job</button>
          <button className="btn btn-secondary btn-sm">📋 View Logs</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Jobs', value: jobs.length, color: 'var(--accent-blue)' },
          { label: 'Running', value: jobs.filter(j => j.status === 'running').length, color: 'var(--accent-green)' },
          { label: 'Paused', value: jobs.filter(j => j.status === 'paused').length, color: 'var(--accent-orange)' },
          { label: 'Total Runs', value: jobs.reduce((a, j) => a + j.runsCompleted, 0), color: 'var(--accent-cyan)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Job List */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Jobs</div>
        {jobs.map(job => (
          <div
            key={job.id}
            onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
            style={{
              padding: '10px 0', borderBottom: '1px solid var(--border-primary)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[job.status] }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{job.name}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{job.type}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {job.status === 'running' && <button className="btn btn-ghost btn-sm">⏸ Pause</button>}
                {job.status === 'paused' && <button className="btn btn-ghost btn-sm">▶ Resume</button>}
                <button className="btn btn-ghost btn-sm">🔄 Run Now</button>
              </div>
            </div>
            {selectedJob === job.id && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--text-secondary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Interval:</span> {job.interval}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Last Run:</span> {job.lastRun}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Next Run:</span> {job.nextRun}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Runs:</span> {job.runsCompleted}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <span style={{ color: statusColors[job.status] }}>{job.status}</span></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}