import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';

interface RadarTopic {
  id: string;
  name: string;
  queries: string[];
  severity: 'critical' | 'warning' | 'info';
  status: 'scanning' | 'idle';
  lastScan: string;
  signalsCount: number;
}

interface RadarAlert {
  id: string;
  topicId: string;
  title: string;
  source: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  action: string;
  snippet: string;
}

export function RadarView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [scanning, setScanning] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicQueries, setNewTopicQueries] = useState('');

  const [topics, setTopics] = useState<RadarTopic[]>([
    { id: '1', name: 'Commercial Property Law', queries: ['"commercial lease" UK 2025 updates', '"tenant eviction" law changes'], severity: 'warning', status: 'scanning', lastScan: 'Just now', signalsCount: 3 },
    { id: '2', name: 'Flight Prices: LHR to JFK', queries: ['British Airways LHR JFK direct price alert'], severity: 'info', status: 'idle', lastScan: '1h ago', signalsCount: 1 },
    { id: '3', name: 'HMRC Corporate Tax Rates', queries: ['HMRC corporate tax rate 2025 "budget"'], severity: 'critical', status: 'scanning', lastScan: '2m ago', signalsCount: 5 },
    { id: '4', name: 'IT Supplier Insolvency Check', queries: ['"TechCorp Solutions" insolvency OR administration'], severity: 'critical', status: 'idle', lastScan: '1d ago', signalsCount: 0 },
    { id: '5', name: 'Competitor Mention: "Acme Corp"', queries: ['"Acme Corp" "lawsuit" OR "acquisition"'], severity: 'warning', status: 'idle', lastScan: '5h ago', signalsCount: 2 },
  ]);

  const [alerts, setAlerts] = useState<RadarAlert[]>([
    { id: 'a1', topicId: '3', title: 'HMRC announces new tax band thresholds for Q3', source: 'gov.uk/hmrc', severity: 'critical', timestamp: '10 mins ago', action: 'Route to Accountant', snippet: 'The newly proposed thresholds will increase corporate liabilities by 2% for Tier 2 businesses...' },
    { id: 'a2', topicId: '1', title: 'Commercial Lease Act 2025 - Early Draft Leaked', source: 'legalgazette.co.uk', severity: 'warning', timestamp: '1 hour ago', action: 'Create Case', snippet: 'Landlords will now be required to provide a 6-month notice period for standard commercial break clauses...' },
    { id: 'a3', topicId: '2', title: 'BA Flight LHR-JFK drops below £450', source: 'skyscanner.net', severity: 'info', timestamp: '2 hours ago', action: 'Book Now', snippet: 'Flash sale detected on British Airways direct flights for October dates.' },
    { id: 'a4', topicId: '5', title: 'Acme Corp acquires local logistics rival', source: 'businessinsider.com', severity: 'warning', timestamp: '2 days ago', action: 'Route to Brain Agent', snippet: 'Acme Corp has finalized the acquisition of SwiftDelivery in a cash deal...' },
  ]);

  const severityColors: Record<string, string> = { critical: 'var(--accent-red)', warning: 'var(--accent-orange)', info: 'var(--accent-cyan)' };

  const handleScanAll = () => {
    setScanning(true);
    setTopics(prev => prev.map(t => ({ ...t, status: 'scanning' })));
    setTimeout(() => {
      setScanning(false);
      setTopics(prev => prev.map(t => ({ ...t, status: 'idle', lastScan: 'Just now' })));
      // Simulate finding a new alert
      const newAlert: RadarAlert = {
        id: crypto.randomUUID(),
        topicId: '1',
        title: 'New discussion on tenant eviction caps',
        source: 'propertyweek.com',
        severity: 'warning',
        timestamp: 'Just now',
        action: 'Create Case',
        snippet: 'A new parliamentary bill has been proposed to limit commercial tenant evictions...',
      };
      setAlerts(prev => [newAlert, ...prev]);
      setTopics(prev => prev.map(t => t.id === '1' ? { ...t, signalsCount: t.signalsCount + 1 } : t));
    }, 3000);
  };

  const handleCreateTopic = () => {
    if (!newTopicName.trim()) return;
    const newTopic: RadarTopic = {
      id: crypto.randomUUID(),
      name: newTopicName,
      queries: newTopicQueries.split(',').map(q => q.trim()).filter(Boolean),
      severity: 'info',
      status: 'idle',
      lastScan: 'Never',
      signalsCount: 0,
    };
    setTopics(prev => [newTopic, ...prev]);
    setShowAddTopic(false);
    setNewTopicName('');
    setNewTopicQueries('');
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>📡 Intelligence Radar</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Autonomous web scraping threads monitoring {topics.length} active topics.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddTopic(!showAddTopic)}>+ Target Topic</button>
          <button className="btn btn-secondary btn-sm" onClick={handleScanAll} disabled={scanning}>
            {scanning ? '🔄 Scraping the web...' : '🔄 Force Radar Sweep'}
          </button>
        </div>
      </div>

      {showAddTopic && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid var(--accent-blue)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 8 }}>ADD NEW RADAR TARGET</div>
          <input
            className="input"
            placeholder="Topic Name (e.g. 'UK Capital Gains Tax')"
            value={newTopicName}
            onChange={e => setNewTopicName(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            className="input"
            placeholder="Search queries separated by commas (e.g. 'capital gains tax 2025, hmrc updates')"
            value={newTopicQueries}
            onChange={e => setNewTopicQueries(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreateTopic}>Start Scraping</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddTopic(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Active Threads */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Active Scraping Threads</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
        {topics.map((topic) => (
          <div key={topic.id} className="card" style={{ borderTop: `3px solid ${severityColors[topic.severity]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{topic.name}</div>
              {topic.status === 'scanning' ? (
                <span style={{ fontSize: 10, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="status-dot status-dot-green" /> SCRAPING
                </span>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>IDLE</span>
              )}
            </div>
            
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {topic.queries.map((q, i) => <div key={i} style={{ marginBottom: 2 }}>{">"} {q}</div>)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-primary)', paddingTop: 8 }}>
              <span>Signals: <strong style={{ color: 'var(--text-primary)' }}>{topic.signalsCount}</strong></span>
              <span>Last: {topic.lastScan}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Feed */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Detected Signals</h3>
        <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-card)', borderRadius: 12, color: 'var(--accent-red)' }}>{alerts.filter(a => a.severity === 'critical').length} Critical</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((alert) => (
          <div key={alert.id} className="card" style={{ display: 'flex', gap: 12, padding: 16 }}>
            <div style={{ marginTop: 4 }}>
              <span style={{ width: 12, height: 12, display: 'inline-block', borderRadius: '50%', background: severityColors[alert.severity], boxShadow: `0 0 8px ${severityColors[alert.severity]}66` }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{alert.title}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{alert.timestamp}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Source: {alert.source} • Topic: {topics.find(t => t.id === alert.topicId)?.name || 'Unknown'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12, borderLeft: '2px solid var(--border-primary)', paddingLeft: 10 }}>
                "{alert.snippet}"
              </div>
              <div>
                <button 
                  className={`btn btn-sm ${alert.action === 'Create Case' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => alert.action === 'Create Case' && setCurrentView('cases')}
                >
                  {alert.action}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}