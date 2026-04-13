import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { scanAllProviders } from '../../services/modelService';

export function AgentsView() {
  const agents = useAppStore((s) => s.agents);
  const updateAgentStatus = useAppStore((s) => s.updateAgentStatus);
  const selectedProvider = useAppStore((s) => s.selectedProvider);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [taskInput, setTaskInput] = useState('');

  const agentDetails: Record<string, { capabilities: string[], model: string }> = {
    brain: { capabilities: ['Reasoning', 'Orchestration', 'Task Assignment', 'Self-Correction', 'Multi-tasking'], model: 'Qwen3.5-9B-Claude-4.6-Opus' },
    coder: { capabilities: ['Code Generation', 'Document Drafting', 'Legal Responses', 'Template Creation'], model: 'Qwen2.5-Coder-14B' },
    research: { capabilities: ['Information Gathering', 'Signal Detection', 'Topic Monitoring', 'Web Research'], model: 'Qwen3.5-9B-Neo' },
    money: { capabilities: ['Financial Analysis', 'HMRC Tracking', 'Deadline Management', 'Tax Calculations'], model: 'Qwen3.5-9B-Gemini-Pro' },
    legal: { capabilities: ['Legal Correspondence', 'Case Management', 'Evidence Review', 'Risk Assessment'], model: 'Qwen3.5-9B-Claude-4.6-Opus' },
    acct: { capabilities: ['Tax Analysis', 'Financial Reports', 'Budget Tracking', 'Compliance'], model: 'Meta-Llama-3.1-8B' },
    supplier: { capabilities: ['Supplier Spend Analysis', 'Renegotiation Targets', 'Contract Review'], model: 'Qwen3.5-4B' },
    deals: { capabilities: ['Auction Scanning', 'Premises Search', 'Liquidation Stock Scan'], model: 'Llama-3.1-8B' },
    content: { capabilities: ['Content Generation', 'Social Media Drafting', 'Product Descriptions'], model: 'Qwen3.5-9B-Neo' },
    comms: { capabilities: ['Email/WhatsApp Summary', 'Contact Mapping', 'Follow-up Drafting'], model: 'Llama-3.2-3B' },
    pa: { capabilities: ['Renewal Tracking', 'Admin Summary', 'Document Management'], model: 'Llama-3.2-3B' },
  };

  function assignTask(agentId: string) {
    if (!taskInput.trim()) return;
    updateAgentStatus(agentId, 'working', taskInput);
    setTaskInput('');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>🤖 Agents</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm">+ New Agent</button>
          <button className="btn btn-secondary btn-sm">🔄 Sync All</button>
        </div>
      </div>

      {/* Baba Main AI Control */}
      <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent-blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>🧠 Baba Main AI — Orchestrator</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              Assigns tasks to agents, manages multi-tasking, self-evolves, self-corrects. Can chat with you while agents work in background.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="status-dot status-dot-green" />
            <span style={{ fontSize: 11, color: 'var(--accent-green)' }}>Active</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Model: {selectedModel || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
        {agents.map(agent => {
          const details = agentDetails[agent.id] || { capabilities: [], model: 'Default' };
          const isSelected = selectedAgent === agent.id;
          return (
            <div
              key={agent.id}
              className="card card-clickable"
              onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>{agent.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{agent.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Model: {details.model}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className={`status-dot ${agent.status === 'working' ? 'status-dot-green' : agent.status === 'error' ? 'status-dot-red' : 'status-dot-orange'}`} />
                  <span style={{ fontSize: 10, color: agent.status === 'working' ? 'var(--accent-green)' : 'var(--text-muted)' }}>{agent.status}</span>
                </div>
              </div>
              {agent.currentTask && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                  📋 {agent.currentTask}
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                ✅ {agent.tasksCompleted} tasks completed
              </div>
              {isSelected && (
                <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Capabilities:</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {details.capabilities.map(cap => (
                      <span key={cap} className="chip" style={{ fontSize: 10 }}>{cap}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="input"
                      placeholder="Assign a task..."
                      value={selectedAgent === agent.id ? taskInput : ''}
                      onChange={(e) => setTaskInput(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.key === 'Enter' && assignTask(agent.id)}
                      style={{ flex: 1, fontSize: 11 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); assignTask(agent.id); }}>Assign</button>
                    {agent.status === 'working' && <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); updateAgentStatus(agent.id, 'paused'); }}>⏸ Pause</button>}
                    {agent.status === 'paused' && <button className="btn btn-success btn-sm" onClick={(e) => { e.stopPropagation(); updateAgentStatus(agent.id, 'working', agent.currentTask); }}>▶ Resume</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Multi-tasking Info */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Multi-Tasking Status</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Baba can assign multiple tasks to different agents simultaneously. While agents work in background windows/tabs, you can continue chatting with Baba in the main window.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(34,197,94,0.15)', color: 'var(--accent-green)' }}>
            {agents.filter(a => a.status === 'working').length} Working
          </span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {agents.filter(a => a.status === 'idle').length} Idle
          </span>
        </div>
      </div>
    </div>
  );
}