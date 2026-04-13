import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { chatWithModel } from '../../services/modelService';
import { notify } from '../../services/notificationService';
import { createDesktopShortcut } from '../../services/systemIntegrationService';
import { copyText, speakText } from '../../services/assistantActions';

export function HomeView() {
  const username = useAppStore((s) => s.username);
  const agents = useAppStore((s) => s.agents);
  const emailScanProgress = useAppStore((s) => s.emailScanProgress);
  const organizedEmails = useAppStore((s) => s.organizedEmails);
  const emails = useAppStore((s) => s.emails);
  const tasks = useAppStore((s) => s.tasks);
  const approvals = useAppStore((s) => s.approvals);
  const notifications = useAppStore((s) => s.notifications);
  const evolutionLog = useAppStore((s) => s.evolutionLog);
  const systemStatus = useAppStore((s) => s.systemStatus);
  const selectedProvider = useAppStore((s) => s.selectedProvider);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [mode, setMode] = useState('Life');
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const modes = ['Life', 'Write', 'Cases', 'Mail', 'Radar', 'Automate'];
  const workingAgents = agents.filter((a) => a.status === 'working');
  const urgentInboxCount = emails.filter((e) => !e.isRead && (e.priority === 'urgent' || e.priority === 'high')).length;
  const queuedOrRunningTasks = tasks.filter((t) => t.status === 'queued' || t.status === 'running').length;
  const runningTasks = tasks.filter((t) => t.status === 'running').length;
  const radarLikeAlerts = notifications.filter((n) => n.type === 'warning' || n.type === 'error').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;

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
        setChatResponse((prev) => prev + chunk);
      });
      if (!chatResponse && response) setChatResponse(response);
    } catch {
      setChatResponse('Unable to connect to AI. Please check your model provider is running.');
    } finally {
      setChatLoading(false);
    }
  }

  async function handleCreateDesktopShortcut() {
    const result = await createDesktopShortcut();
    if (result.ok) {
      await notify.success('Desktop Shortcut Created', `Shortcut saved to ${result.path || 'desktop'}.`, { onClickTarget: 'home' });
      return;
    }
    await notify.error('Shortcut Creation Failed', result.error || 'Unable to create desktop shortcut.');
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {greeting()}, {username} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Baba is orchestrating {workingAgents.length} agents.
          {evolutionLog.length > 0 && ` System self-evolved ${evolutionLog[0]?.timestamp || 'recently'}.`}
        </p>
      </div>

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

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {modes.map((m) => (
            <button
              key={m}
              className={`chip ${mode === m ? 'chip-active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>

        {chatResponse && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--text-accent)' }}>Baba AI ({selectedModel})</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { void copyText(chatResponse); }} style={{ fontSize: 10, padding: '2px 6px' }}>Copy</button>
                <button className="btn btn-ghost btn-sm" onClick={() => speakText(chatResponse)} style={{ fontSize: 10, padding: '2px 6px' }}>Speak</button>
              </div>
            </div>
            {chatResponse}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => setCurrentView('inbox')}>📥 Open quick panel</button>
        <button className="btn btn-secondary" onClick={() => setCurrentView('cases')}>📋 Start focused work</button>
        <button className="btn btn-secondary" onClick={() => setCurrentView('radar')}>📡 Check radar signals</button>
        <button className="btn btn-secondary" onClick={() => setCurrentView('chat')}>💬 Voice mode</button>
        <button className="btn btn-secondary" onClick={handleCreateDesktopShortcut}>🖥 Create desktop shortcut</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Urgent Inbox', value: String(urgentInboxCount), sub: `${emails.length} total emails`, color: 'var(--accent-red)', icon: '📥', view: 'inbox' },
          { label: 'Active Cases', value: String(pendingApprovals), sub: `${approvals.length} approvals tracked`, color: 'var(--accent-purple)', icon: '📋', view: 'cases' },
          { label: 'Radar Alerts', value: String(radarLikeAlerts), sub: `${notifications.length} notifications tracked`, color: 'var(--accent-orange)', icon: '📡', view: 'radar' },
          { label: 'Scheduled Jobs', value: String(Math.max(systemStatus.scheduler.running, runningTasks)), sub: `${queuedOrRunningTasks} queued/running tasks`, color: 'var(--accent-cyan)', icon: '⏰', view: 'scheduler' },
        ].map((w) => (
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
              <strong>{email.sender}</strong> - {email.subject}
            </span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Active Agents</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {agents.filter((a) => a.status === 'working').map((agent) => (
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

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Self-Evolution Log</div>
        {[
          { time: '10:53:47 AM', msg: 'WhatsApp integration sync: 3 new messages parsed.' },
          { time: '10:20 AM', msg: 'Adjusted prompt for Coder Agent' },
          { time: '10:18 AM', msg: 'Rerouted to Opus-Distill model' },
          { time: '10:15 AM', msg: 'Agent sync completed' },
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
