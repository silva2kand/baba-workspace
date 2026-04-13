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
  const [followUpByMessageId, setFollowUpByMessageId] = useState<Record<string, string[]>>({});
  const [followUpLoadingFor, setFollowUpLoadingFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chatDraft) return;
    setInput((prev) => (prev.trim() ? `${prev}\n${chatDraft}` : chatDraft));
    setChatDraft('');
  }, [chatDraft, setChatDraft]);

  function parseFollowUpList(raw: string): string[] {
    const text = String(raw || '').trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3);
      }
    } catch {
      // ignore and continue with line parsing
    }

    return text
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  function fallbackFollowUps(userInput: string, assistantText: string): string[] {
    const joined = `${userInput}\n${assistantText}`.toLowerCase();
    if (joined.includes('email') || joined.includes('reply')) {
      return [
        'Draft the final email I can send now.',
        'Give me a short follow-up checklist for this thread.',
        'Create a polite reminder if no reply in 48 hours.',
      ];
    }
    if (joined.includes('case') || joined.includes('legal')) {
      return [
        'Summarize next legal actions by priority.',
        'Draft a concise update I can send to my solicitor.',
        'List evidence/documents still missing for this case.',
      ];
    }
    if (joined.includes('task') || joined.includes('plan')) {
      return [
        'Break this into actionable tasks with deadlines.',
        'Which step should I do first right now?',
        'Prepare a short status update I can share.',
      ];
    }
    return [
      'What should I do next?',
      'Can you turn this into a step-by-step checklist?',
      'Draft the message I should send now.',
    ];
  }

  async function generateFollowUps(messageId: string, userInput: string, assistantText: string) {
    setFollowUpLoadingFor(messageId);
    try {
      const prompt = [
        'Create exactly 3 short follow-up prompts the user can click next.',
        'Return only a JSON array of 3 strings.',
        `User message: ${userInput}`,
        `Assistant response: ${assistantText}`,
      ].join('\n');

      const raw = await chatWithModel(
        selectedProvider,
        selectedModel,
        [
          {
            role: 'system',
            content: 'You generate concise follow-up prompts. Output strict JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ]
      );

      const suggestions = parseFollowUpList(raw);
      const finalSuggestions = suggestions.length > 0
        ? suggestions
        : fallbackFollowUps(userInput, assistantText);

      setFollowUpByMessageId((prev) => ({ ...prev, [messageId]: finalSuggestions }));
    } catch {
      setFollowUpByMessageId((prev) => ({ ...prev, [messageId]: fallbackFollowUps(userInput, assistantText) }));
    } finally {
      setFollowUpLoadingFor((prev) => (prev === messageId ? null : prev));
    }
  }

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const userInput = input;
    const assistantId = (Date.now() + 1).toString();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
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
      { role: 'user', content: userInput },
    ];

    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      agent: assignAgent || undefined,
      model: selectedModel,
      status: 'sending',
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      let streamed = '';
      const finalText = await chatWithModel(selectedProvider, selectedModel, apiMessages, (chunk) => {
        streamed += chunk;
        setMessages(prev => {
          return prev.map((m) => (
            m.id === assistantId
              ? { ...m, content: `${m.content}${chunk}`, status: 'sending' }
              : m
          ));
        });
      });
      setMessages(prev => {
        return prev.map((m) => (
          m.id === assistantId ? { ...m, status: 'done' } : m
        ));
      });
      void generateFollowUps(assistantId, userInput, String(finalText || streamed || '').trim());
    } catch {
      setMessages(prev => {
        return prev.map((m) => (
          m.id === assistantId
            ? { ...m, content: 'Unable to connect to AI model. Please check your provider is running.', status: 'error' }
            : m
        ));
      });
      setFollowUpByMessageId((prev) => ({
        ...prev,
        [assistantId]: fallbackFollowUps(userInput, 'Unable to connect to AI model.'),
      }));
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

  const latestAssistantDoneId = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && m.status === 'done')?.id || null;

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
            {msg.role === 'assistant' && msg.status === 'done' && msg.id === latestAssistantDoneId && (
              <div style={{ marginTop: 6, marginLeft: 8, display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: '80%' }}>
                {(followUpByMessageId[msg.id] || []).map((s, i) => (
                  <button
                    key={`${msg.id}-followup-${i}`}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11 }}
                    onClick={() => setInput(s)}
                    title="Use this follow-up prompt"
                  >
                    {s}
                  </button>
                ))}
                {followUpLoadingFor === msg.id && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Generating follow-up suggestions...</span>
                )}
              </div>
            )}
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
