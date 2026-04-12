import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';

interface EvolutionEvent {
  id: string;
  timestamp: number;
  type: 'prompt-correction' | 'model-reroute' | 'agent-sync' | 'self-test' | 'optimization';
  agent: string;
  description: string;
  before?: string;
  after?: string;
  status: 'success' | 'warning' | 'failed';
}

export const SelfEvolvingView: React.FC = () => {
  const agents = useAppStore((s) => s.agents);
  const addEvolutionEntry = useAppStore((s) => s.addEvolutionEntry);

  const [events, setEvents] = useState<EvolutionEvent[]>([
    { id: '1', timestamp: Date.now() - 300000, type: 'prompt-correction', agent: 'Coder Agent', description: 'Adjusted system prompt to reduce verbosity by 40%', before: 'You are a helpful coding assistant...', after: 'You are a concise code generator. Output code only.', status: 'success' },
    { id: '2', timestamp: Date.now() - 240000, type: 'model-reroute', agent: 'Brain Agent', description: 'Rerouted from Llama3.2:3b → Qwen3.5-9B for complex reasoning task', status: 'success' },
    { id: '3', timestamp: Date.now() - 180000, type: 'agent-sync', agent: 'Research Agent', description: 'Synchronized radar signals with Solicitor case database', status: 'success' },
    { id: '4', timestamp: Date.now() - 120000, type: 'self-test', agent: 'Evolver', description: 'Ran latency benchmark: Ollama avg 340ms, LM Studio avg 280ms, Jan avg 410ms', status: 'success' },
    { id: '5', timestamp: Date.now() - 60000, type: 'optimization', agent: 'Money Agent', description: 'Cached HMRC deadline lookup — reduced repeated API calls by 85%', status: 'success' },
    { id: '6', timestamp: Date.now() - 30000, type: 'prompt-correction', agent: 'Solicitor Agent', description: 'Injected UK legal terminology glossary into system prompt', before: 'Generic legal assistant prompt', after: 'UK-specific legal correspondence with HMRC/Council terminology', status: 'success' },
    { id: '7', timestamp: Date.now() - 15000, type: 'self-test', agent: 'Evolver', description: 'Memory usage check: 2.1GB / 64GB RAM — healthy', status: 'success' },
    { id: '8', timestamp: Date.now() - 5000, type: 'model-reroute', agent: 'Organizer', description: 'Switched email triage from Qwen3.5-9B to Llama3.2:3b for speed', status: 'warning' },
  ]);

  const [autoEvolve, setAutoEvolve] = useState(true);
  const [evolveInterval, setEvolveInterval] = useState(30);

  // Simulate periodic self-evolution events
  useEffect(() => {
    if (!autoEvolve) return;
    const interval = setInterval(() => {
      const newEvents: EvolutionEvent[] = [
        { id: crypto.randomUUID(), timestamp: Date.now(), type: 'self-test', agent: 'Evolver', description: `Health check passed — ${agents.filter(a => a.status === 'working').length} agents active, all responding`, status: 'success' },
        { id: crypto.randomUUID(), timestamp: Date.now(), type: 'optimization', agent: 'Brain Agent', description: 'Context window optimized — pruned 1,200 stale tokens', status: 'success' },
      ];
      const pick = newEvents[Math.floor(Math.random() * newEvents.length)];
      setEvents(prev => [pick, ...prev].slice(0, 50));
    }, evolveInterval * 1000);

    return () => clearInterval(interval);
  }, [autoEvolve, evolveInterval, agents]);

  const typeIcons: Record<string, string> = {
    'prompt-correction': '✏️',
    'model-reroute': '🔀',
    'agent-sync': '🔄',
    'self-test': '🧪',
    'optimization': '⚡',
  };

  const typeColors: Record<string, string> = {
    'prompt-correction': 'var(--accent-purple)',
    'model-reroute': 'var(--accent-cyan)',
    'agent-sync': 'var(--accent-green)',
    'self-test': 'var(--accent-orange)',
    'optimization': 'var(--accent-blue)',
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>⚙️ Self-Evolution Engine</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-evolve every {evolveInterval}s</span>
          <button
            className={`btn btn-sm ${autoEvolve ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setAutoEvolve(!autoEvolve)}
          >
            {autoEvolve ? '● Running' : '○ Paused'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Corrections', value: events.filter(e => e.type === 'prompt-correction').length, color: 'var(--accent-purple)' },
          { label: 'Model Reroutes', value: events.filter(e => e.type === 'model-reroute').length, color: 'var(--accent-cyan)' },
          { label: 'Self Tests', value: events.filter(e => e.type === 'self-test').length, color: 'var(--accent-orange)' },
          { label: 'Optimizations', value: events.filter(e => e.type === 'optimization').length, color: 'var(--accent-blue)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Event Log */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', fontSize: 13, fontWeight: 600 }}>
          Evolution Timeline
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {events.map((event, i) => (
            <div
              key={event.id}
              style={{
                padding: '12px 16px',
                borderBottom: i < events.length - 1 ? '1px solid var(--border-primary)' : 'none',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: 18, marginTop: 2 }}>{typeIcons[event.type]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: typeColors[event.type] }}>
                    {event.type.replace(/-/g, ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTime(event.timestamp)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>{event.description}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Agent: {event.agent}</div>

                {event.before && event.after && (
                  <div style={{ marginTop: 8, fontSize: 11, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
                    <div style={{ color: 'var(--accent-red)', marginBottom: 4 }}>− {event.before}</div>
                    <div style={{ color: 'var(--accent-green)' }}>+ {event.after}</div>
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                background: event.status === 'success' ? 'rgba(34,197,94,0.15)' : event.status === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                color: event.status === 'success' ? 'var(--accent-green)' : event.status === 'warning' ? 'var(--accent-orange)' : 'var(--accent-red)',
              }}>
                {event.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
