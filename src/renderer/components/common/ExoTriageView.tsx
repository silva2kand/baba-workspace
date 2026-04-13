import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

interface IntakeItem {
  id: string;
  source: 'outlook' | 'gmail' | 'radar' | 'whatsapp';
  title: string;
  sender: string;
  timestamp: string;
  snippet: string;
  suggestedCategory: string;
  status: 'pending' | 'routed' | 'ignored';
}

export const ExoTriageView: React.FC = () => {
  const organizedEmails = useAppStore((s) => s.organizedEmails);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  
  const [items, setItems] = useState<IntakeItem[]>([
    { id: '1', source: 'outlook', title: 'Tax Return Reminder', sender: 'HMRC', timestamp: '10:23', snippet: 'Dear taxpayer, your self-assessment...', suggestedCategory: 'HMRC', status: 'pending' },
    { id: '2', source: 'outlook', title: 'Property Completion Date', sender: 'Thompson & Co', timestamp: '09:45', snippet: 'We are pleased to confirm...', suggestedCategory: 'Legal', status: 'pending' },
    { id: '3', source: 'radar', title: 'New tax band thresholds for Q3', sender: 'gov.uk', timestamp: '10:15', snippet: 'The newly proposed thresholds...', suggestedCategory: 'HMRC', status: 'pending' },
    { id: '4', source: 'gmail', title: 'Unusual Activity Alert', sender: 'Santander', timestamp: '09:12', snippet: 'We detected unusual activity...', suggestedCategory: 'Banking', status: 'pending' },
    { id: '5', source: 'whatsapp', title: 'Client asks for contract update', sender: 'WhatsApp: M. Thompson', timestamp: '11:08', snippet: 'Can you send me the latest draft today?', suggestedCategory: 'Legal', status: 'pending' },
  ]);

  const handleRoute = (id: string, view: string) => {
    setItems(items.map(i => i.id === id ? { ...i, status: 'routed' } : i));
    // Simulation: would actually add to case or trigger agent
    console.log(`Routing item ${id} to ${view}`);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'outlook': return '📧';
      case 'gmail': return '🔴';
      case 'radar': return '📡';
      case 'whatsapp': return '💬';
      default: return '📄';
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>⚡ Exo Triage</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Intelligence Intake — classifying and routing external missions.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => console.log('Refreshing triage...')}>🔄 Refresh Intake</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Intake Queue ({items.filter(i => i.status === 'pending').length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-triage: <strong style={{ color: 'var(--accent-green)' }}>ACTIVE</strong></span>
          </div>
        </div>

        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {items.filter(i => i.status === 'pending').map((item) => (
            <div 
              key={item.id} 
              style={{ 
                padding: '16px', 
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 16,
                transition: 'background 0.2s',
              }}
              className="triage-item"
            >
              <div style={{ fontSize: 24, padding: 8, background: 'var(--bg-tertiary)', borderRadius: 8, height: 'fit-content' }}>
                {getSourceIcon(item.source)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.timestamp}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-accent)', marginBottom: 8 }}>{item.sender}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>"{item.snippet}"</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                      AI Match: {item.suggestedCategory}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => setCurrentView('cases')}>📋 Create Case</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleRoute(item.id, 'agent')}>🤖 Route to Agent</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setItems(items.map(i => i.id === item.id ? { ...i, status: 'ignored' } : i))}>✕ Ignore</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {items.filter(i => i.status === 'pending').length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No new intake items. System is clear.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
