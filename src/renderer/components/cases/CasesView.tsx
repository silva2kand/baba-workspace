import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

interface CaseItem {
  id: string;
  title: string;
  domain: string;
  status: 'active' | 'pending' | 'closed';
  risk: 'high' | 'medium' | 'low';
  priority: 'urgent' | 'high' | 'normal';
  evidence: number;
  description: string;
  lastUpdated: string;
  assignedAgent?: string;
  linkedEmails?: string[];
  linkedRadar?: string[];
}

export function CasesView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [selectedCase, setSelectedCase] = useState<number | null>(0);
  const [filter, setFilter] = useState('all');
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseDomain, setNewCaseDomain] = useState('Property');
  const [newCaseSnippet, setNewCaseSnippet] = useState('');

  const [cases, setCases] = useState<CaseItem[]>([
    { id: crypto.randomUUID(), title: 'Property Purchase - 23 Oak Lane', domain: 'Property', status: 'active', risk: 'high', priority: 'urgent', evidence: 12, description: 'Residential property purchase with multiple legal requirements', lastUpdated: '2h ago', assignedAgent: 'Solicitor Agent', linkedEmails: ['HMRC Tax Return', 'Thompson & Co'], linkedRadar: ['Property completion deadline'] },
    { id: crypto.randomUUID(), title: 'HMRC Tax Dispute 2024', domain: 'Tax', status: 'active', risk: 'medium', priority: 'high', evidence: 8, description: 'Dispute regarding tax assessment for fiscal year 2024', lastUpdated: '4h ago', assignedAgent: 'Accountant Agent', linkedEmails: ['HMRC reminder'], linkedRadar: ['Tax deadline Apr 30'] },
    { id: crypto.randomUUID(), title: 'Insurance Claim - Water Damage', domain: 'Insurance', status: 'active', risk: 'low', priority: 'normal', evidence: 5, description: 'Home insurance claim for water damage to kitchen', lastUpdated: '1d ago', assignedAgent: 'Brain Agent', linkedEmails: ['AXA Insurance Update'] },
    { id: crypto.randomUUID(), title: 'Lease Review - Commercial Unit', domain: 'Property', status: 'pending', risk: 'medium', priority: 'high', evidence: 15, description: 'Annual lease review for commercial property', lastUpdated: '2d ago', assignedAgent: 'Solicitor Agent', linkedEmails: ['Lease Agreement'] },
    { id: crypto.randomUUID(), title: 'Supplier Contract Dispute', domain: 'Legal', status: 'active', risk: 'high', priority: 'urgent', evidence: 20, description: 'Breach of contract claim against IT supplier', lastUpdated: '3h ago', assignedAgent: 'Solicitor Agent', linkedEmails: ['Supplier invoice', 'Legal notice'] },
    { id: crypto.randomUUID(), title: 'Council Tax Band Appeal', domain: 'Council', status: 'active', risk: 'low', priority: 'normal', evidence: 3, description: 'Appeal against council tax band assessment', lastUpdated: '5d ago', assignedAgent: 'Accountant Agent' },
  ]);

  const riskColors: Record<string, string> = { high: 'var(--accent-red)', medium: 'var(--accent-orange)', low: 'var(--accent-green)' };
  const statusColors: Record<string, string> = { active: 'var(--accent-green)', pending: 'var(--accent-orange)', closed: 'var(--text-muted)' };
  const domains = ['Property', 'Tax', 'Insurance', 'Legal', 'Council', 'Finance', 'Personal'];

  const filteredCases = cases.filter(c => filter === 'all' || c.status === filter || c.risk === filter);
  const selected = selectedCase !== null ? filteredCases[selectedCase] : null;

  const handleCreateCase = () => {
    if (!newCaseTitle.trim()) return;
    const newCase: CaseItem = {
      id: crypto.randomUUID(),
      title: newCaseTitle,
      domain: newCaseDomain,
      status: 'active',
      risk: 'low',
      priority: 'normal',
      evidence: newCaseSnippet ? 1 : 0,
      description: newCaseSnippet || 'New case created via Universal Case Router',
      lastUpdated: 'just now',
      assignedAgent: 'Brain Agent',
    };
    setCases(prev => [newCase, ...prev]);
    setShowNewCase(false);
    setNewCaseTitle('');
    setNewCaseSnippet('');
    setSelectedCase(0);
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left - Case List */}
      <div style={{ width: 280, borderRight: '1px solid var(--border-primary)', overflowY: 'auto', paddingRight: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Cases</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewCase(!showNewCase)}>+ New Case</button>
        </div>

        {/* New Case Form */}
        {showNewCase && (
          <div className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: 'var(--text-accent)' }}>UNIVERSAL CASE ROUTER</div>
            <input
              className="input"
              placeholder="Case title..."
              value={newCaseTitle}
              onChange={(e) => setNewCaseTitle(e.target.value)}
              style={{ marginBottom: 8, fontSize: 12 }}
            />
            <select
              className="input"
              value={newCaseDomain}
              onChange={(e) => setNewCaseDomain(e.target.value)}
              style={{ marginBottom: 8, fontSize: 12 }}
            >
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <textarea
              className="input"
              placeholder="Paste email snippet, text, or evidence here..."
              value={newCaseSnippet}
              onChange={(e) => setNewCaseSnippet(e.target.value)}
              style={{ marginBottom: 8, fontSize: 12, minHeight: 60, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreateCase}>Create & Route</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNewCase(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {['all', 'active', 'pending', 'high'].map(f => (
            <button key={f} className={`chip ${filter === f ? 'chip-active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {filteredCases.map((c, i) => (
          <div
            key={c.id}
            onClick={() => setSelectedCase(i)}
            style={{
              padding: 10, marginBottom: 4, borderRadius: 'var(--radius-md)',
              cursor: 'pointer', border: '1px solid',
              borderColor: selectedCase === i ? 'var(--accent-blue)' : 'var(--border-primary)',
              background: selectedCase === i ? 'var(--bg-card)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{c.title}</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColors[c.risk] }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: 10 }}>
              <span style={{ color: statusColors[c.status] }}>{c.status}</span>
              <span style={{ color: 'var(--text-muted)' }}>• {c.domain}</span>
              <span style={{ color: 'var(--text-muted)' }}>• {c.evidence} evidence</span>
            </div>
          </div>
        ))}
      </div>

      {/* Center - Case Detail */}
      <div style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        {selected ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{selected.title}</h3>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {selected.domain} • Updated {selected.lastUpdated} • Assigned to: {selected.assignedAgent || 'Unassigned'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-sm">📋 Export Pack</button>
                <button className="btn btn-secondary btn-sm">📎 Add Evidence</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Status', value: selected.status, color: statusColors[selected.status] },
                { label: 'Risk', value: selected.risk, color: riskColors[selected.risk] },
                { label: 'Priority', value: selected.priority, color: selected.priority === 'urgent' ? 'var(--accent-red)' : 'var(--text-primary)' },
                { label: 'Evidence', value: `${selected.evidence} items`, color: 'var(--text-primary)' },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Description</div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.description}</p>
            </div>
            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Timeline</div>
              {[
                { time: '2h ago', event: 'New evidence linked from email', icon: '📧' },
                { time: '4h ago', event: 'Risk assessment updated to High', icon: '⚠️' },
                { time: '1d ago', event: 'Solicitor response received', icon: '⚖️' },
                { time: '2d ago', event: 'Case created', icon: '📋' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--border-primary)' : 'none' }}>
                  <span>{t.icon}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60 }}>{t.time}</span>
                  <span style={{ fontSize: 12 }}>{t.event}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>Select a case to view details</div>
        )}
      </div>

      {/* Right - Context */}
      <div style={{ width: 260, borderLeft: '1px solid var(--border-primary)', paddingLeft: 12, overflowY: 'auto' }}>
        {selected && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Linked Evidence</div>
            {(selected.linkedEmails || ['Email: HMRC Tax Return', 'Document: Lease Agreement']).map((e, i) => (
              <div key={i} style={{ padding: '6px 0', fontSize: 11, borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                📎 {e}
              </div>
            ))}

            {selected.linkedRadar && selected.linkedRadar.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Linked Radar Alerts</div>
                {selected.linkedRadar.map((r, i) => (
                  <div key={i} style={{ padding: '6px 0', fontSize: 11, borderBottom: '1px solid var(--border-primary)', color: 'var(--accent-orange)', cursor: 'pointer' }} onClick={() => setCurrentView('radar')}>
                    📡 {r}
                  </div>
                ))}
              </>
            )}

            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>AI Suggestions</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              • Draft response to solicitor<br />
              • Schedule property inspection<br />
              • Set deadline reminder<br />
              • Link to Money Agent for costs
            </div>
          </>
        )}
      </div>
    </div>
  );
}