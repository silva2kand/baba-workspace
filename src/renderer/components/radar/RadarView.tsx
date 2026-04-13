import React, { useState, useEffect } from 'react';
import { notify } from '../../services/notificationService';

export function RadarView() {
  const [selectedTopic, setSelectedTopic] = useState<number | null>(0);

  const topics = [
    { id: '1', name: 'Phone Bills', signals: 3, severity: 'warning', lastSignal: '2h ago', description: 'Monitoring phone bill patterns and unusual charges' },
    { id: '2', name: 'Service Charges', signals: 5, severity: 'critical', lastSignal: '1h ago', description: 'Tracking service charge increases and disputes' },
    { id: '3', name: 'Rent/Lease', signals: 2, severity: 'info', lastSignal: '1d ago', description: 'Lease renewal dates and rent review triggers' },
    { id: '4', name: 'Broadband', signals: 1, severity: 'info', lastSignal: '3d ago', description: 'Contract end dates and better deal alerts' },
    { id: '5', name: 'Vehicle MOT', signals: 2, severity: 'warning', lastSignal: '5h ago', description: 'MOT deadline approaching, repair estimates' },
    { id: '6', name: 'Insurance', signals: 4, severity: 'critical', lastSignal: '30m ago', description: 'Insurance renewal deadline, comparison quotes needed' },
  ];

  const alerts = [
    { topic: 'Insurance', message: 'Car insurance expires in 14 days', severity: 'critical', time: '30m ago', action: 'Compare quotes now' },
    { topic: 'Service Charges', message: 'New service charge invoice received - £2,450', severity: 'warning', time: '1h ago', action: 'Review and dispute' },
    { topic: 'Vehicle MOT', message: 'MOT due in 21 days', severity: 'warning', time: '5h ago', action: 'Book MOT test' },
    { topic: 'Phone Bills', message: 'Unusual charge detected on BT bill', severity: 'warning', time: '2h ago', action: 'Investigate charge' },
    { topic: 'Broadband', message: 'Contract ends in 45 days', severity: 'info', time: '3d ago', action: 'Compare deals' },
  ];

  // Send notifications for critical/warning alerts on mount
  useEffect(() => {
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning');
    for (const alert of criticalAlerts.slice(0, 3)) {
      notify.warning(
        `Radar: ${alert.topic}`,
        alert.message,
        { onClickTarget: 'radar' },
      );
    }
  }, []);

  const severityColors: Record<string, string> = { critical: 'var(--accent-red)', warning: 'var(--accent-orange)', info: 'var(--accent-cyan)' };
  const selected = selectedTopic !== null ? topics[selectedTopic] : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>📡 Radar</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm">+ Add Topic</button>
          <button className="btn btn-secondary btn-sm">🔄 Refresh Signals</button>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Active Alerts ({alerts.length})</div>
        {alerts.map((alert, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 0', borderBottom: i < alerts.length - 1 ? '1px solid var(--border-primary)' : 'none',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: severityColors[alert.severity] }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{alert.message}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{alert.topic} • {alert.time}</div>
            </div>
            <button className="btn btn-sm btn-secondary">{alert.action}</button>
          </div>
        ))}
      </div>

      {/* Topics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {topics.map((topic, i) => (
          <div
            key={topic.id}
            className="card card-clickable"
            onClick={() => setSelectedTopic(i)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{topic.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{topic.description}</div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: severityColors[topic.severity] }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11 }}>
              <span style={{ color: 'var(--text-muted)' }}>{topic.signals} signals</span>
              <span style={{ color: 'var(--text-muted)' }}>{topic.lastSignal}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}