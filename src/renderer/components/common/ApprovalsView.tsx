import React from 'react';
import { useAppStore } from '../../stores/appStore';

export const ApprovalsView: React.FC = () => {
  const approvals = useAppStore((s) => s.approvals);
  const setApprovals = useAppStore((s) => s.setApprovals);

  const handleAction = (id: string, status: 'approved' | 'rejected') => {
    setApprovals(approvals.map(a => a.id === id ? { ...a, status } : a));
    console.log(`Approval ${id}: ${status}`);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧';
      case 'action': return '⚡';
      case 'case': return '📋';
      case 'document': return '📄';
      default: return '✅';
    }
  };

  const pending = approvals.filter(a => a.status === 'pending');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>✅ Pending Approvals</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Workflow Gate — reviewing Agent-prepared missions before execution.</p>
        </div>
        <span className="badge badge-urgent" style={{ fontSize: 11 }}>{pending.length} ACTION REQUIRED</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pending.map((item) => (
          <div key={item.id} className="card" style={{ display: 'flex', gap: 16, padding: 20 }}>
            <div style={{ 
              width: 44, height: 44, borderRadius: 10, background: 'var(--bg-tertiary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 
            }}>
              {getIcon(item.type)}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{item.title}</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.timestamp}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Prepared by: <strong style={{ color: 'var(--text-accent)' }}>{item.preparedBy}</strong>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 16 }}>
                {item.description}
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleAction(item.id, 'approved')}>
                  Approve & Execute
                </button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleAction(item.id, 'rejected')}>
                  Reject
                </button>
                <button className="btn btn-ghost btn-sm">💬 Details</button>
              </div>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏁</div>
            <div style={{ fontSize: 14 }}>No pending approvals. System is fully autonomous.</div>
          </div>
        )}
      </div>

      {/* Audit Log */}
      {approvals.filter(a => a.status !== 'pending').length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>Past Approvals</h3>
          {approvals.filter(a => a.status !== 'pending').map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-primary)', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>{a.title}</span>
              <span style={{ color: a.status === 'approved' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {a.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
