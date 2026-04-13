import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { babaChat } from '../../services/modelRouterService';
import { copyText, speakText } from '../../services/assistantActions';
import type { ChatMessage } from '@shared/types';

export const AdvisorView: React.FC = () => {
  const username = useAppStore((s) => s.username);
  const systemStatus = useAppStore((s) => s.systemStatus);
  const organizedEmails = useAppStore((s) => s.organizedEmails);
  const evolutionLog = useAppStore((s) => s.evolutionLog);
  const agents = useAppStore((s) => s.agents);

  const [briefing, setBriefing] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const generateBriefing = async () => {
    setLoading(true);
    setBriefing('');

    const statusContext = `
    System Status: Solicitor Agent Urgent Items: ${systemStatus.solicitor.urgent}, Accountant Urgent Items: ${systemStatus.accountant.urgent}.
    Emails: ${organizedEmails.length} recent.
    Working Agents: ${agents.filter(a => a.status === 'working').map(a => a.name).join(', ') || 'None'}.
    Recent Log: ${evolutionLog[0]?.message || 'None'}.
    `;

    const prompt = `You are Baba Advisor, the intelligence layer of the system. You are talking to your operator, ${username}. 
    Based on this telemetry: ${statusContext}
    Provide a professional, 2-3 paragraph daily briefing summarizing what needs their attention today. Format your response cleanly without filler.`;

    try {
      const messages: ChatMessage[] = [{
        id: Date.now().toString(),
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
      }];

      const res = await babaChat(messages, (chunk) => {
        setBriefing((prev) => prev + chunk);
      });
      if (!briefing && res) setBriefing(res);
      setLastUpdated(new Date());
    } catch (err) {
      setBriefing('Failed to generate briefing. Ensure a reasoning model is connected.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Generate initial briefing on mount
    generateBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>🧭 Baba Advisor Brain</h2>
        <button 
          className="btn btn-primary" 
          onClick={generateBriefing}
          disabled={loading}
        >
          {loading ? '⟳ Analyzing...' : '🔄 Refresh Briefing'}
        </button>
      </div>

      <div className="card" style={{ padding: 24, background: 'var(--bg-card)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Daily Intelligence Briefing
        </div>
        
        {loading && !briefing ? (
          <div className="skeleton" style={{ height: 100, width: '100%', borderRadius: 8 }} />
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', paddingRight: 32 }}>
              {briefing}
              {loading && <span className="animate-pulse" style={{ color: 'var(--accent-blue)', marginLeft: 4 }}>▊</span>}
            </div>
            {briefing && !loading && (
              <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                <button
                  onClick={() => copyText(briefing)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    opacity: 0.6,
                    padding: '4px 6px',
                    borderRadius: 4,
                  }}
                  title="Copy briefing"
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                >
                  📋
                </button>
                <button
                  onClick={() => speakText(briefing)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    opacity: 0.6,
                    padding: '4px 6px',
                    borderRadius: 4,
                  }}
                  title="Speak briefing"
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                >
                  🔊
                </button>
              </div>
            )}
          </div>
        )}

        {lastUpdated && !loading && (
          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            Last generated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🧠 Sub-Agent Analysis</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agents.map((agent) => (
              <li key={agent.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span>{agent.icon} {agent.name}</span>
                <span className={`badge ${agent.status === 'working' ? 'badge-urgent' : 'badge-banking'}`} style={{ fontSize: 10 }}>
                  {agent.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📡 Cross-Referenced Vectors</h3>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <p style={{ margin: '0 0 8px 0' }}>• Solicitor Urgent Match: {systemStatus.solicitor.urgent} items</p>
            <p style={{ margin: '0 0 8px 0' }}>• Accountant Active Match: {systemStatus.accountant.urgent} items</p>
            <p style={{ margin: '0 0 8px 0' }}>• Researcher Active Sweeps: {systemStatus.researcher.active} active</p>
            <p style={{ margin: '0' }}>• Outlook OAuth: {systemStatus.outlook.status}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
