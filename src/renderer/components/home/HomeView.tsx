import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { scanAllProviders, chatWithModel } from '../../services/modelService';

export function HomeView() {
  const username = useAppStore((s) => s.username);
  const agents = useAppStore((s) => s.agents);
  const emailScanProgress = useAppStore((s) => s.emailScanProgress);
  const organizedEmails = useAppStore((s) => s.organizedEmails);
  const evolutionLog = useAppStore((s) => s.evolutionLog);
  const systemStatus = useAppStore((s) => s.systemStatus);
  const selectedProvider = useAppStore((s) => s.selectedProvider);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const addEvolutionEntry = useAppStore((s) => s.addEvolutionEntry);
  const [mode, setMode] = useState('Life');
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const modes = ['Life', 'Write', 'Cases', 'Mail', 'Radar', 'Automate'];
  const workingAgents = agents.filter(a => a.status === 'working');

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  async function handleAsk() {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    setChatResponse('');
    try {
      const messages = [
        { role: 'system', content: 'You are Baba, an intelligent workspace assistant. Be concise and helpful.' },
        { role: 'user', content: chatInput },
      ];
      const response = await chatWithModel(selectedProvider, selectedModel, messages, (chunk) => {
        setChatResponse(prev => prev + chunk);
      });
      if (!chatResponse && response) setChatResponse(response);
    } catch (err) {
      setChatResponse('Unable to connect to AI. Please check your model provider is running.');
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {greeting()}, {username} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Baba is orchestrating {workingAgents.length} agents. 
          {evolutionLog.length > 0 && ` System self-evolved ${evolutionLog[0]?.timestamp || 'recently'}.`}
        </p>
      </div>

      {/* Ask Anything */}
      <div className="card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
          How can I help you today?
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Ask anything, draft a reply, check a case..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleAsk} disabled={chatLoading}>
            {chatLoading ? '⟳' : '➤'} Send
          </button>
        </div>
        {/* Mode Chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {modes.map(m => (
            <button
              key={m}
              className={`chip ${mode === m ? 'chip-active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
        {/* AI Response */}
        {chatResponse && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            <div style={{ fontSize: 10, color: 'var(--text-accent)', marginBottom: 4 }}>Baba AI ({selectedModel})</div>
            {chatResponse}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setCurrentView('advisor')}>🧭 Open Daily Briefing</button>
        <button className="btn btn-secondary" onClick={() => setCurrentView('cases')}>📋 Start focused work</button>
        <button className="btn btn-secondary" onClick={() => setCurrentView('radar')}>📡 Check radar signals</button>
        <button className="btn btn-secondary" onClick={() => setCurrentView('chat')}>💬 Voice mode</button>
      </div>

      {/* Summary Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Urgent Inbox', value: '86', sub: 'across 2 accounts', color: 'var(--accent-red)', icon: '📥', view: 'inbox' },
          { label: 'Active Cases', value: '80', sub: '12 high priority', color: 'var(--accent-purple)', icon: '📋', view: 'cases' },
          { label: 'Radar Alerts', value: '5', sub: '2 deadlines this week', color: 'var(--accent-orange)', icon: '📡', view: 'radar' },
          { label: 'Scheduled Jobs', value: '7', sub: '3 running now', color: 'var(--accent-cyan)', icon: '⏰', view: 'scheduler' },
        ].map(w => (
          <div
            key={w.label}
            className="card card-clickable"
            onClick={() => setCurrentView(w.view as any)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{w.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: w.color }}>{w.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.sub}</div>
              </div>
              <span style={{ fontSize: 24 }}>{w.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Email Scan Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Email Scan Progress</div>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: emailScanProgress.status === 'RUNNING' ? 'rgba(34,197,94,0.15)' : 'var(--bg-tertiary)', color: emailScanProgress.status === 'RUNNING' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {emailScanProgress.status}
          </span>
        </div>
        <div className="progress-bar" style={{ marginBottom: 12 }}>
          <div className="progress-bar-fill" style={{ width: `${emailScanProgress.progress}%` }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Run</span> #{emailScanProgress.runNumber}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Messages</span> {emailScanProgress.messages}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Folders</span> {emailScanProgress.folders}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Urgent</span> <span style={{ color: 'var(--accent-red)' }}>{emailScanProgress.urgent}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary btn-sm">📥 Organize Emails</button>
          <button className="btn btn-secondary btn-sm">⏸ Pause</button>
        </div>
      </div>

      {/* Organized Emails */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Organized Emails</div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last: 8 min ago</span>
        </div>
        {organizedEmails.map((email, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 0', borderBottom: i < organizedEmails.length - 1 ? '1px solid var(--border-primary)' : 'none',
          }}>
            <span className="badge" style={{ background: email.categoryColor, fontSize: 9 }}>{email.category}</span>
            <span style={{ flex: 1, fontSize: 12 }}>
              <strong>{email.sender}</strong> — {email.subject}
            </span>
          </div>
        ))}
      </div>

      {/* Active Agents */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Active Agents</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {agents.filter(a => a.status === 'working').map(agent => (
            <div key={agent.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 8, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontSize: 20 }}>{agent.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{agent.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{agent.currentTask}</div>
              </div>
              <span className="status-dot status-dot-green" />
            </div>
          ))}
        </div>
      </div>

      {/* Self-Evolution Log */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Self-Evolution Log</div>
        {[
          { time: '10:53:47 AM', msg: 'WhatsApp integration sync: 3 new messages parsed.', type: 'whatsapp' },
          { time: '10:20 AM', msg: 'Adjusted prompt for Coder Agent', type: 'self-correction' },
          { time: '10:18 AM', msg: 'Rerouted to Opus-Distill model', type: 'model-routing' },
          { time: '10:15 AM', msg: 'Agent sync completed', type: 'agent' },
        ].map((entry, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, padding: '6px 0',
            borderBottom: i < 3 ? '1px solid var(--border-primary)' : 'none',
            fontSize: 11,
          }}>
            <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{entry.time}</span>
            <span>{entry.msg}</span>
          </div>
        ))}
      </div>

      {/* Quick Context */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Today's Focus</div>
          {['Review HMRC reminder', 'Respond to solicitor', 'Check bank alert', 'Submit meter readings'].map((task, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>○</span> {task}
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Deadlines</div>
          {[
            { label: 'Insurance renewal', date: 'Jan 28' },
            { label: 'MOT retest', date: 'Feb 10' },
            { label: 'Service charges', date: 'Feb 15' },
          ].map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
              <span>{d.label}</span>
              <span style={{ color: 'var(--accent-orange)' }}>{d.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}