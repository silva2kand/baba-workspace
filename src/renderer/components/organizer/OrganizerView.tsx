import React from 'react';
import { useAppStore } from '../../stores/appStore';

export function OrganizerView() {
  const emailScanProgress = useAppStore((s) => s.emailScanProgress);
  const organizedEmails = useAppStore((s) => s.organizedEmails);

  const categories = [
    { name: 'Urgent', count: 42, color: '#ef4444', icon: '🔴' },
    { name: 'Legal', count: 12, color: '#818cf8', icon: '⚖️' },
    { name: 'Banking', count: 8, color: '#f59e0b', icon: '🏦' },
    { name: 'Supplier', count: 15, color: '#06b6d4', icon: '📦' },
    { name: 'Council', count: 6, color: '#10b981', icon: '🏛️' },
    { name: 'HMRC', count: 3, color: '#a855f7', icon: '💰' },
    { name: 'Property', count: 5, color: '#ec4899', icon: '🏠' },
    { name: 'Scams', count: 2, color: '#6b7280', icon: '🚫' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Email Organizer</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm">▶ Start Organizing</button>
          <button className="btn btn-secondary btn-sm">⏸ Pause</button>
          <button className="btn btn-ghost btn-sm">⚙ Settings</button>
        </div>
      </div>

      {/* Scan Progress */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Scan Progress</span>
          <span style={{ fontSize: 11, color: emailScanProgress.status === 'RUNNING' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {emailScanProgress.status} • Run #{emailScanProgress.runNumber}
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 8 }}>
          <div className="progress-bar-fill" style={{ width: `${emailScanProgress.progress}%` }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Started</span><br />{emailScanProgress.started}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Duration</span><br />{emailScanProgress.duration}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Stores</span><br />{emailScanProgress.stores}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Folders</span><br />{emailScanProgress.folders}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Messages</span><br />{emailScanProgress.messages}</div>
        </div>
      </div>

      {/* Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {categories.map(cat => (
          <div key={cat.name} className="card" style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{cat.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: cat.color }}>{cat.count}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cat.name}</div>
          </div>
        ))}
      </div>

      {/* Organized Emails */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Recently Organized</div>
        {organizedEmails.map((email, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 0', borderBottom: i < organizedEmails.length - 1 ? '1px solid var(--border-primary)' : 'none',
          }}>
            <span className="badge" style={{ background: email.categoryColor, fontSize: 9 }}>{email.category}</span>
            <span style={{ flex: 1, fontSize: 12 }}><strong>{email.sender}</strong> — {email.subject}</span>
            <button className="btn btn-ghost btn-sm">📋 Link</button>
            <button className="btn btn-ghost btn-sm">📎</button>
          </div>
        ))}
      </div>
    </div>
  );
}