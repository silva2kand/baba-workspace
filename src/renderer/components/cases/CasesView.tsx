import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { copyText, speakText } from '../../services/assistantActions';

export function CasesView() {
  const [selectedCase, setSelectedCase] = useState<number | null>(0);
  const [filter, setFilter] = useState('all');
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setChatDraft = useAppStore((s) => s.setChatDraft);

  const cases = [
    { id: '1', title: 'Property Purchase - 23 Oak Lane', domain: 'Property', status: 'active', risk: 'high', priority: 'urgent', evidence: 12, description: 'Residential property purchase with multiple legal requirements', lastUpdated: '2h ago' },
    { id: '2', title: 'HMRC Tax Dispute 2024', domain: 'Tax', status: 'active', risk: 'medium', priority: 'high', evidence: 8, description: 'Dispute regarding tax assessment for fiscal year 2024', lastUpdated: '4h ago' },
    { id: '3', title: 'Insurance Claim - Water Damage', domain: 'Insurance', status: 'active', risk: 'low', priority: 'normal', evidence: 5, description: 'Home insurance claim for water damage to kitchen', lastUpdated: '1d ago' },
    { id: '4', title: 'Lease Review - Commercial Unit', domain: 'Property', status: 'pending', risk: 'medium', priority: 'high', evidence: 15, description: 'Annual lease review for commercial property', lastUpdated: '2d ago' },
    { id: '5', title: 'Supplier Contract Dispute', domain: 'Legal', status: 'active', risk: 'high', priority: 'urgent', evidence: 20, description: 'Breach of contract claim against IT supplier', lastUpdated: '3h ago' },
    { id: '6', title: 'Council Tax Band Appeal', domain: 'Council', status: 'active', risk: 'low', priority: 'normal', evidence: 3, description: 'Appeal against council tax band assessment', lastUpdated: '5d ago' },
  ];

  const riskColors: Record<string, string> = { high: 'var(--accent-red)', medium: 'var(--accent-orange)', low: 'var(--accent-green)' };
  const statusColors: Record<string, string> = { active: 'var(--accent-green)', pending: 'var(--accent-orange)', closed: 'var(--text-muted)' };
  const aiSuggestions = '• Draft response to solicitor\n• Schedule property inspection\n• Set deadline reminder';

  const selected = selectedCase !== null ? cases[selectedCase] : null;

  function handleWriteWithAI() {
    const prompt = selected
      ? `Help me write updates for case: ${selected.title}\n\nSuggestions:\n${aiSuggestions}\n\nDraft a professional action plan and message I can send now.`
      : `Help me action these case suggestions:\n${aiSuggestions}`;
    setChatDraft(prompt);
    setCurrentView('chat');
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left - Case List */}
      <div style={{ width: 280, borderRight: '1px solid var(--border-primary)', overflowY: 'auto', paddingRight: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Cases</h2>
          <button className="btn btn-primary btn-sm">+ New Case</button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {['all', 'active', 'pending', 'high'].map(f => (
            <button key={f} className={`chip ${filter === f ? 'chip-active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {cases.filter(c => filter === 'all' || c.status === filter || c.risk === filter).map((c, i) => (
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
                  {selected.domain} • Updated {selected.lastUpdated}
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
            {['Email: HMRC Tax Return', 'Document: Lease Agreement', 'Email: Thompson & Co', 'Note: Deadline reminder'].map((e, i) => (
              <div key={i} style={{ padding: '6px 0', fontSize: 11, borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                📎 {e}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>AI Suggestions</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => copyText(aiSuggestions)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.6, padding: '2px 4px', borderRadius: 4 }}
                  title="Copy suggestions"
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                >
                  📋
                </button>
                <button
                  onClick={() => speakText(aiSuggestions)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.6, padding: '2px 4px', borderRadius: 4 }}
                  title="Speak suggestions"
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                >
                  🔊
                </button>
                <button
                  onClick={handleWriteWithAI}
                  style={{ background: 'transparent', border: '1px solid var(--border-primary)', cursor: 'pointer', fontSize: 10, opacity: 0.85, padding: '1px 6px', borderRadius: 10, color: 'var(--text-secondary)' }}
                  title="Open Chat and draft with AI"
                >
                  Write with AI
                </button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              • Draft response to solicitor<br />
              • Schedule property inspection<br />
              • Set deadline reminder
            </div>
          </>
        )}
      </div>
    </div>
  );
}
