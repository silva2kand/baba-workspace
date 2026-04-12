import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

interface AuditCheck {
  id: string;
  name: string;
  category: 'proof' | 'risk' | 'logic';
  target: string;
  status: 'searching' | 'passed' | 'failed' | 'idle';
  finding?: string;
}

export const ClawsView: React.FC = () => {
  const agents = useAppStore((s) => s.agents);
  const [isAuditing, setIsAuditing] = useState(false);
  const [selectedCase, setSelectedCase] = useState('Property Purchase - 23 Oak Lane');

  const [checks, setChecks] = useState<AuditCheck[]>([
    { id: '1', name: 'Signature Verification', category: 'proof', target: 'Lease Agreement v2', status: 'passed', finding: 'Cryptographic match confirmed.' },
    { id: '2', name: 'Date Consistency', category: 'logic', target: 'Timeline vs Solicitor Email', status: 'passed', finding: 'Completion dates align across all sources.' },
    { id: '3', name: 'Identity KYC Check', category: 'proof', target: 'Thompson & Co credentials', status: 'failed', finding: 'Company registration number mismatch in footer.' },
    { id: '4', name: 'HMRC Tax Calculation', category: 'logic', target: 'VAT Return Draft', status: 'idle' },
    { id: '5', name: 'Money Trail Audit', category: 'logic', target: 'Santander unusual activity', status: 'idle' },
  ]);

  const runAudit = () => {
    setIsAuditing(true);
    setChecks(checks.map(c => c.status === 'idle' ? { ...c, status: 'searching' } : c));
    
    setTimeout(() => {
      setChecks(checks.map(c => {
        if (c.id === '4') return { ...c, status: 'passed', finding: 'Calculations verified against 2024 rates.' };
        if (c.id === '5') return { ...c, status: 'failed', finding: 'Unidentifiable transaction from "Unknown HoldCo".' };
        return c;
      }));
      setIsAuditing(false);
    }, 3000);
  };

  const statusColors = { 
    passed: 'var(--accent-green)', 
    failed: 'var(--accent-red)', 
    searching: 'var(--accent-blue)', 
    idle: 'var(--text-muted)' 
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>🦅 Claws</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Adversarial Audit — Deep-dive investigation and evidence verification.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select 
            className="input" 
            value={selectedCase} 
            onChange={(e) => setSelectedCase(e.target.value)}
            style={{ fontSize: 12, height: 32, padding: '0 8px' }}
          >
            <option>Property Purchase - 23 Oak Lane</option>
            <option>HMRC Tax Dispute 2024</option>
            <option>Insurance Claim - Water Damage</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={runAudit} disabled={isAuditing}>
            {isAuditing ? '🦅 Scanning...' : '🦅 Run Deep Audit'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* Verification List */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', fontSize: 13, fontWeight: 600 }}>
            Audit Workbench
          </div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {checks.map((check) => (
              <div 
                key={check.id} 
                style={{ 
                  padding: '16px', 
                  borderBottom: '1px solid var(--border-primary)',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ 
                  width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-tertiary)', fontSize: 16
                }}>
                  {check.category === 'proof' ? '📜' : check.category === 'logic' ? '🧠' : '⚠️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{check.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: statusColors[check.status], textTransform: 'uppercase' }}>{check.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Target: {check.target}</div>
                  {check.finding && (
                    <div style={{ 
                      fontSize: 11, color: check.status === 'failed' ? 'var(--accent-red)' : 'var(--text-secondary)',
                      padding: 8, background: 'var(--bg-tertiary)', borderRadius: 4, 
                      borderLeft: `2px solid ${statusColors[check.status]}`
                    }}>
                      <strong>Result:</strong> {check.finding}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Summary & Risks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Case Integrity Monitor</h3>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent-orange)' }}>82%</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Authenticity Score</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--accent-red)' }}>⚠️ Identified Contradictions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, padding: 10, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <strong>ID Mismatch:</strong> Solicitor ID footer does not match official Law Society registration for Thompson & Co.
              </div>
              <div style={{ fontSize: 11, padding: 10, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <strong>Financial Risk:</strong> Transaction amount (£2,450) exceeds previous quote by 18% without matching invoice note.
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 12 }}>Link to Legal Case</button>
          </div>
        </div>
      </div>
    </div>
  );
};
