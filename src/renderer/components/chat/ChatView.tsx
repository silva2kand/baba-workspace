import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { chatWithModel } from '../../services/modelService';
import { copyText, speakText } from '../../services/assistantActions';
import type { ChatMessage } from '@shared/types';

export function ChatView() {
  const selectedProvider = useAppStore((s) => s.selectedProvider);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const agents = useAppStore((s) => s.agents);
  const chatDraft = useAppStore((s) => s.chatDraft);
  const setChatDraft = useAppStore((s) => s.setChatDraft);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'Welcome to the premium Chat Workspace! I am online and ready to help. You can talk to me while agents work in the background on other tasks.', timestamp: Date.now(), status: 'done' },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatMode, setChatMode] = useState<'chat' | 'face' | 'voice'>('chat');
  const [assignAgent, setAssignAgent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chatDraft) return;
    setInput((prev) => (prev.trim() ? `${prev}\n${chatDraft}` : chatDraft));
    setChatDraft('');
  }, [chatDraft, setChatDraft]);

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      status: 'done',
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const systemPrompt = assignAgent
      ? `You are the ${assignAgent} agent. Focus on tasks related to your specialty.`
      : 'You are Baba, an intelligent workspace assistant. Be concise and helpful. You can multitask - agents are working in the background while you chat.';

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: input },
    ];

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      agent: assignAgent || undefined,
      model: selectedModel,
      status: 'sending',
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      await chatWithModel(selectedProvider, selectedModel, apiMessages, (chunk) => {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + chunk, status: 'sending' };
          return updated;
        });
      });
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, status: 'done' };
        return updated;
      });
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, content: 'Unable to connect to AI model. Please check your provider is running.', status: 'error' };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function assignTaskToAgent(agentId: string, task: string) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    useAppStore.getState().updateAgentStatus(agentId, 'working', task);
    const msg: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: `Task assigned to ${agent.name}: "${task}". The agent will work in the background while you continue chatting.`,
      timestamp: Date.now(),
      status: 'done',
    };
    setMessages(prev => [...prev, msg]);
  }

  async function handleCopyAll() {
    const transcript = messages
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    await copyText(transcript);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Chat Workspace</h2>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(34,197,94,0.15)', color: 'var(--accent-green)' }}>
            ● Online
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['chat', 'face', 'voice'].map(m => (
            <button
              key={m}
              className={`btn btn-sm ${chatMode === m ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setChatMode(m as any)}
            >
              {m === 'chat' ? '💬' : m === 'face' ? '👤' : '🎤'} {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={handleCopyAll}>📋 Copy All</button>
        </div>
      </div>

      {/* Agent Assignment Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Assign to:</span>
        {agents.map(agent => (
          <button
            key={agent.id}
            className={`btn btn-sm ${assignAgent === agent.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setAssignAgent(assignAgent === agent.id ? null : agent.id)}
            style={{ fontSize: 11 }}
          >
            {agent.icon} {agent.name}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 12,
          }}>
            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`} style={{ position: 'relative' }}>
              {msg.agent && (
                <div style={{ fontSize: 10, color: 'var(--text-accent)', marginBottom: 4 }}>
                  {agents.find(a => a.id === msg.agent)?.icon} {msg.agent}
                </div>
              )}
              {msg.content}
              {msg.status === 'sending' && <span className="animate-pulse">▊</span>}
              {msg.role === 'assistant' && msg.content && msg.status === 'done' && (
                <div style={{ position: 'absolute', bottom: 4, right: 4, display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => copyText(msg.content)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      opacity: 0.6,
                      padding: '2px 4px',
                      borderRadius: 4,
                    }}
                    title="Copy response"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                  >
                    📋
                  </button>
                  <button
                    onClick={() => speakText(msg.content)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      opacity: 0.6,
                      padding: '2px 4px',
                      borderRadius: 4,
                    }}
                    title="Speak response"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                  >
                    🔊
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-icon" title="Attach file">📎</button>
          <input
            className="input"
            placeholder={assignAgent ? `Message ${agents.find(a => a.id === assignAgent)?.name}...` : 'Ask Baba anything...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-ghost btn-icon" title="Voice input">🎤</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={isStreaming || !input.trim()}>
            {isStreaming ? '⟳' : '➤'} Send
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>
          <span>Model: {selectedModel || 'None selected'}</span>
          <span>Baba can chat while agents work in background</span>
        </div>
      </div>
    </div>
  );
}
