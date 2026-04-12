import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { chatWithModel } from '../../services/modelService';
import type { ChatMessage } from '@shared/types';

// ── Types ────────────────────────────────────────────────────────
interface RenderedLine {
  text: string;
  role: 'summary' | 'detail' | 'code' | 'note';
}

interface BabaResponse {
  lines: RenderedLine[];
  suggestions: string[];
  experts: string[];
  usedWeb: boolean;
  rawText: string;
}

// ── Helpers ───────────────────────────────────────────────────────
function parseResponseToLines(text: string): BabaResponse {
  const raw = text.trim();
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rendered: RenderedLine[] = lines.map((l, i) => ({
    text: l,
    role: i === 0 ? 'summary' : l.startsWith('```') || l.startsWith('    ') ? 'code' : 'detail',
  }));

  // Context-aware suggestions based on content keywords
  const suggestions = buildSuggestions(raw);

  return {
    lines: rendered,
    suggestions,
    experts: inferExperts(raw),
    usedWeb: false,
    rawText: raw,
  };
}

function buildSuggestions(text: string): string[] {
  const t = text.toLowerCase();
  const base: string[] = [];

  if (t.includes('case') || t.includes('legal') || t.includes('solicitor'))
    base.push('Show related cases', 'Open in Solicitor agent', 'Create evidence entry');
  if (t.includes('tax') || t.includes('hmrc') || t.includes('account'))
    base.push('Open tax case', 'Check HMRC deadlines', 'Create from this for Accountant');
  if (t.includes('email') || t.includes('inbox'))
    base.push('Search emails for this', 'Create task from this', 'Open Inbox');
  if (t.includes('code') || t.includes('script') || t.includes('function'))
    base.push('Open in Coder agent', 'Run this in PC Control', 'Save to Files');
  if (t.includes('research') || t.includes('source') || t.includes('evidence'))
    base.push('Search web for more', 'Add to evidence log', 'Open Radar');
  if (t.includes('schedule') || t.includes('deadline') || t.includes('date'))
    base.push('Add to Scheduler', 'Open Kairos timeline', 'Create reminder task');

  // Always include generic actions
  base.push('Drill deeper on this', 'Create a task from this');

  // Dedupe + trim to max 4
  return [...new Set(base)].slice(0, 4);
}

function inferExperts(text: string): string[] {
  const t = text.toLowerCase();
  const experts: string[] = ['Brain'];
  if (t.includes('legal') || t.includes('case') || t.includes('solicitor')) experts.push('Solicitor');
  if (t.includes('tax') || t.includes('account') || t.includes('financial')) experts.push('Accountant');
  if (t.includes('research') || t.includes('source') || t.includes('evidence')) experts.push('Research');
  if (t.includes('code') || t.includes('script') || t.includes('function')) experts.push('Coder');
  if (t.includes('money') || t.includes('payment') || t.includes('income')) experts.push('Money');
  return experts.slice(0, 3);
}

// ── TTS ──────────────────────────────────────────────────────────
function speak(text: string) {
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 1.0;
  utt.pitch = 1.0;
  utt.volume = 1.0;
  window.speechSynthesis.speak(utt);
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

// ── Sub-components ────────────────────────────────────────────────
function ExpertBadge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    Brain: '#818cf8',
    Solicitor: '#a855f7',
    Accountant: '#22c55e',
    Research: '#06b6d4',
    Coder: '#f59e0b',
    Money: '#ec4899',
  };
  const color = colorMap[label] || '#6b7280';
  return (
    <span style={{
      fontSize: 10,
      padding: '2px 6px',
      borderRadius: 'var(--radius-full)',
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

interface MoeMsgProps {
  msg: ChatMessage;
  parsed: BabaResponse | null;
  agents: ReturnType<typeof useAppStore.getState>['agents'];
  isStreaming: boolean;
  onSuggestionClick: (s: string) => void;
  onSpeak: (text: string) => void;
}

function MoeMessage({ msg, parsed, agents, isStreaming, onSuggestionClick, onSpeak }: MoeMsgProps) {
  const [copied, setCopied] = useState(false);
  const [lineCopied, setLineCopied] = useState<number | null>(null);

  function handleCopy() {
    copyToClipboard(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleLineCopy(idx: number, text: string) {
    copyToClipboard(text);
    setLineCopied(idx);
    setTimeout(() => setLineCopied(null), 1500);
  }

  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <div className="chat-bubble chat-bubble-user" style={{ maxWidth: '72%' }}>
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)',
          background: 'var(--bg-tertiary)', padding: '4px 12px',
          borderRadius: 'var(--radius-full)', border: '1px solid var(--border-primary)',
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  // ── Assistant message ──
  const isError = msg.status === 'error';
  const streaming = isStreaming && msg.status === 'sending';

  return (
    <div style={{ marginBottom: 16, animation: 'fadeIn 0.2s forwards' }}>
      {/* Message card */}
      <div style={{
        background: isError ? 'rgba(239,68,68,0.08)' : 'var(--bg-card)',
        border: `1px solid ${isError ? 'var(--accent-red)' : 'var(--border-primary)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        maxWidth: '88%',
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--border-primary)',
          background: 'var(--bg-tertiary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)' }}>Baba</span>
            {parsed && !streaming && parsed.experts.map((e) => (
              <ExpertBadge key={e} label={e} />
            ))}
            {msg.model && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>· {msg.model}</span>
            )}
          </div>
          {!streaming && !isError && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn btn-ghost btn-sm"
                title="Speak this response"
                onClick={() => onSpeak(msg.content)}
                style={{ fontSize: 12, padding: '2px 8px' }}
              >
                🔊 Speak
              </button>
              <button
                className="btn btn-ghost btn-sm"
                title="Copy full response"
                onClick={handleCopy}
                style={{ fontSize: 12, padding: '2px 8px' }}
              >
                {copied ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Lines */}
        <div style={{ padding: '10px 14px' }}>
          {parsed && !streaming ? (
            parsed.lines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: i < parsed.lines.length - 1 ? 6 : 0,
                  padding: '3px 0',
                  borderRadius: 4,
                  animation: `slideInUp ${0.1 + i * 0.04}s forwards`,
                }}
                className="chat-line-row"
              >
                <span style={{
                  flex: 1,
                  fontSize: line.role === 'summary' ? 13.5 : 13,
                  fontWeight: line.role === 'summary' ? 600 : 400,
                  color: line.role === 'summary' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  lineHeight: 1.6,
                  fontFamily: line.role === 'code' ? 'var(--font-mono)' : 'var(--font-sans)',
                  background: line.role === 'code' ? 'var(--bg-input)' : 'transparent',
                  padding: line.role === 'code' ? '2px 6px' : '0',
                  borderRadius: line.role === 'code' ? 4 : 0,
                }}>
                  {line.text}
                </span>
                {/* Per-line copy */}
                <button
                  onClick={() => handleLineCopy(i, line.text)}
                  title="Copy this line"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: lineCopied === i ? 'var(--accent-green)' : 'var(--text-muted)',
                    fontSize: 11, opacity: 0.6, padding: '2px 4px', flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {lineCopied === i ? '✅' : '⎘'}
                </button>
              </div>
            ))
          ) : (
            // Streaming: show raw text with cursor
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {msg.content}
              {streaming && (
                <span className="animate-pulse" style={{ color: 'var(--accent-blue)', marginLeft: 2 }}>▊</span>
              )}
              {!msg.content && streaming && (
                <span style={{ color: 'var(--text-muted)' }}>Thinking with agents…</span>
              )}
            </div>
          )}
        </div>

        {/* Suggestions chips */}
        {parsed && !streaming && parsed.suggestions.length > 0 && (
          <div style={{
            padding: '8px 14px 10px',
            borderTop: '1px solid var(--border-primary)',
            display: 'flex', flexWrap: 'wrap', gap: 6,
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 2 }}>
              ↳
            </span>
            {parsed.suggestions.map((s) => (
              <button
                key={s}
                className="chip"
                onClick={() => onSuggestionClick(s)}
                style={{ fontSize: 11 }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function ChatView() {
  const selectedProvider = useAppStore((s) => s.selectedProvider);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const agents = useAppStore((s) => s.agents);
  const evidenceMode = useAppStore((s) => s.evidenceMode);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Welcome, Silva. I'm Baba — your local AI workspace.\n\nAll thinking happens on your device — no cloud inference. My MoE engine coordinates Brain, Solicitor, Accountant, Research, Coder, and Money agents.\n\nAsk me anything. I'll respond line-by-line with sources and suggested next steps.`,
      timestamp: Date.now(),
      status: 'done',
    },
  ]);

  const [parsedCache, setParsedCache] = useState<Record<string, BabaResponse>>({});
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [assignAgent, setAssignAgent] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse initial welcome message
  useEffect(() => {
    const msg = messages[0];
    if (!parsedCache[msg.id]) {
      setParsedCache((c) => ({ ...c, [msg.id]: parseResponseToLines(msg.content) }));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'done',
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideInput) setInput('');
    setIsStreaming(true);

    const systemPrompt = assignAgent
      ? `You are the ${assignAgent} agent in Baba Workspace. Focus on your specialty. Be concise, factual, and answer in clear short lines. Do not use big paragraphs.`
      : `You are Baba, a local-only AI workspace assistant. You coordinate Brain, Solicitor, Accountant, Research, Coder, and Money agents. Respond in clear, short, numbered or bulleted lines — never in one giant paragraph. Be concise and precise. If you reference laws, cases, deadlines, or financial figures, note the source.`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      agent: assignAgent || undefined,
      model: selectedModel,
      status: 'sending',
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      await chatWithModel(selectedProvider, selectedModel, apiMessages, (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + chunk, status: 'sending' };
          return updated;
        });
      });

      // Finalise
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        const finalMsg = { ...last, status: 'done' as const };
        updated[updated.length - 1] = finalMsg;
        // Parse and cache the response
        setParsedCache((c) => ({ ...c, [finalMsg.id]: parseResponseToLines(finalMsg.content) }));
        return updated;
      });
    } catch {
      const errContent = 'Unable to reach local AI model. Make sure Ollama, LM Studio, or Jan is running, then select a model in the Providers tab.';
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, content: errContent, status: 'error' };
        setParsedCache((c) => ({ ...c, [last.id]: parseResponseToLines(errContent) }));
        return updated;
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, isStreaming, messages, selectedProvider, selectedModel, assignAgent]);

  function handleSpeak(text: string) {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      speak(text);
      setIsSpeaking(true);
      const end = () => setIsSpeaking(false);
      window.speechSynthesis.getVoices(); // trigger load
      setTimeout(() => setIsSpeaking(false), text.length * 60 + 500);
    }
  }

  function handleSuggestionClick(suggestion: string) {
    handleSend(suggestion);
  }

  function handleCopyAll() {
    const allText = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n\n');
    copyToClipboard(allText);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Chat Workspace</h2>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
            background: 'rgba(34,197,94,0.15)', color: 'var(--accent-green)',
          }}>● Local MoE</span>
          {evidenceMode && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: 'rgba(79,92,255,0.15)', color: 'var(--accent-blue)',
            }}>🔍 Evidence ON</span>
          )}
          {isSpeaking && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: 'rgba(248,113,113,0.15)', color: 'var(--accent-red)',
            }} className="animate-pulse">🔊 Speaking…</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleCopyAll}
            title="Copy entire conversation"
          >
            📋 Copy All
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { window.speechSynthesis.cancel(); setIsSpeaking(false); setMessages([messages[0]]); }}
            title="Clear chat"
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* ── Agent Assignment Bar ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Route to:</span>
        <button
          className={`btn btn-sm ${assignAgent === null ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setAssignAgent(null)}
          style={{ fontSize: 11 }}
        >
          🧠 Baba (Auto)
        </button>
        {agents.map((agent) => (
          <button
            key={agent.id}
            className={`btn btn-sm ${assignAgent === agent.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setAssignAgent(assignAgent === agent.id ? null : agent.id)}
            style={{ fontSize: 11 }}
          >
            {agent.icon} {agent.name.replace(' Agent', '')}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 8px' }}>
        {messages.map((msg) => (
          <MoeMessage
            key={msg.id}
            msg={msg}
            parsed={parsedCache[msg.id] ?? null}
            agents={agents}
            isStreaming={isStreaming && msg.id === messages[messages.length - 1]?.id}
            onSuggestionClick={handleSuggestionClick}
            onSpeak={handleSpeak}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            id="baba-chat-input"
            className="input"
            placeholder={
              assignAgent
                ? `Ask ${agents.find((a) => a.id === assignAgent)?.name}…`
                : 'Ask Baba anything — all local, no cloud…'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isStreaming}
            style={{ flex: 1 }}
          />
          <button
            id="baba-voice-input"
            className="btn btn-ghost btn-icon"
            title="Voice input"
            onClick={() => {/* voice handled in VoiceView */}}
          >🎤</button>
          <button
            id="baba-send-btn"
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? (
              <><span className="animate-spin" style={{ display: 'inline-block' }}>⟳</span> Thinking…</>
            ) : '➤ Send'}
          </button>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 6, fontSize: 10, color: 'var(--text-muted)',
        }}>
          <span>
            {selectedModel
              ? `Model: ${selectedModel} (${selectedProvider})`
              : '⚠ No model selected — go to Providers to connect Ollama / LM Studio / Jan'
            }
          </span>
          <span>Enter to send · Esc to stop speech</span>
        </div>
      </div>
    </div>
  );
}