import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { syncAndOrganize } from '../../services/emailService';

export function InboxView() {
  const organizedEmails = useAppStore((s) => s.organizedEmails);
  const emails = useAppStore((s) => s.emails);
  const setEmails = useAppStore((s) => s.setEmails);
  const connections = useAppStore((s) => s.connections);
  const emailScanProgress = useAppStore((s) => s.emailScanProgress);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const folders = [
    { id: 'inbox', label: 'Inbox', count: emails.length, icon: '📥' },
    { id: 'Urgent', label: 'Urgent', count: emails.filter(e => e.category === 'Urgent').length, icon: '🔴' },
    { id: 'Legal', label: 'Legal', count: emails.filter(e => e.category === 'Legal').length, icon: '⚖️' },
    { id: 'Banking', label: 'Banking', count: emails.filter(e => e.category === 'Banking').length, icon: '🏦' },
    { id: 'Supplier', label: 'Supplier', count: emails.filter(e => e.category === 'Supplier').length, icon: '📦' },
    { id: 'Council', label: 'Council', count: emails.filter(e => e.category === 'Council').length, icon: '🏛️' },
    { id: 'HMRC', label: 'HMRC', count: emails.filter(e => e.category === 'HMRC').length, icon: '💰' },
    { id: 'sent', label: 'Sent', count: 0, icon: '📤' },
    { id: 'drafts', label: 'Drafts', count: 2, icon: '📝' },
  ];

  const filteredEmails = emails.filter(e => 
    selectedFolder === 'inbox' || e.category === selectedFolder
  );

  const selected = selectedEmail !== null ? filteredEmails[selectedEmail] : null;
  const emailConnectedCount = connections.filter((c) => c.type === 'email' && c.status === 'connected').length;

  useEffect(() => {
    if (emailConnectedCount === 0) return;
    if (emails.length > 0) return;
    if (emailScanProgress.status === 'RUNNING') return;
    syncAndOrganize({ maxResults: 100 }).catch(console.error);
  }, [emailConnectedCount, emailScanProgress.status, emails.length]);

  function extractEmailAddress(input: string) {
    const angle = input.match(/<([^>]+)>/);
    if (angle?.[1]) return angle[1].trim();
    const match = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0] : input.trim();
  }

  async function openReply() {
    if (!selected) return;
    setComposeOpen(true);
    setComposeError(null);
    setComposeTo(extractEmailAddress(selected.from));
    setComposeSubject(selected.subject.startsWith('Re:') ? selected.subject : `Re: ${selected.subject}`);
    setComposeBody('');
  }

  async function sendCompose() {
    if (!selected && !composeTo) return;
    setComposeSending(true);
    setComposeError(null);
    try {
      const provider = selected?.provider || (connections.find((c) => c.id.startsWith('gmail:') || c.id === 'gmail') ? 'gmail' : 'outlook');
      const account = selected?.account || undefined;
      const res = await window.babaAPI.emailSend(provider, { account, to: composeTo, subject: composeSubject, body: composeBody });
      if (!res?.ok) throw new Error('Send failed');
      setComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    } catch (err: any) {
      setComposeError(err?.message ? String(err.message) : String(err));
    } finally {
      setComposeSending(false);
    }
  }

  function connectAndOrganize() {
    if (emailConnectedCount === 0) {
      setCurrentView('providers');
      return;
    }
    syncAndOrganize({ maxResults: 100 }).catch(console.error);
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left - Folders */}
      <div style={{ width: 200, borderRight: '1px solid var(--border-primary)', paddingRight: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Inbox</div>
        <div style={{ marginBottom: 8 }}>
          {connections.filter(c => c.type === 'email').map(acc => (
            <div key={acc.id} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 0' }}>
              📧 {acc.name} {acc.status === 'connected' ? '✅' : '⏸'}
            </div>
          ))}
        </div>
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFolder(f.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              padding: '6px 8px', border: 'none', borderRadius: 'var(--radius-sm)',
              background: selectedFolder === f.id ? 'var(--accent-blue)' : 'transparent',
              color: selectedFolder === f.id ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)',
              textAlign: 'left',
            }}
          >
            <span>{f.icon}</span>
            <span style={{ flex: 1 }}>{f.label}</span>
            {f.count > 0 && <span className="badge" style={{ background: selectedFolder === f.id ? 'rgba(255,255,255,0.25)' : 'var(--accent-red)', fontSize: 9 }}>{f.count}</span>}
          </button>
        ))}
      </div>

      {/* Center - Email List */}
      <div style={{ flex: 1, borderRight: '1px solid var(--border-primary)', overflowY: 'auto', padding: '0 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-primary)', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{folders.find(f => f.id === selectedFolder)?.label || 'Inbox'}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={connectAndOrganize}
              disabled={emailScanProgress.status === 'RUNNING'}
              title={emailConnectedCount === 0 ? 'Open Providers to connect email' : 'Connect + Organize'}
            >
              ⚡ Email ({emailConnectedCount}) + Organize
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentView('providers')}>📧 Manage</button>
            <button className="btn btn-ghost btn-sm" onClick={() => syncAndOrganize({ maxResults: 50 }).catch(console.error)}>🔄 Refresh</button>
            <button className="btn btn-ghost btn-sm" onClick={() => syncAndOrganize({ maxResults: 100 }).catch(console.error)}>📥 Organize</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setComposeOpen(true); setComposeError(null); setComposeTo(''); setComposeSubject(''); setComposeBody(''); }}>✉ New</button>
          </div>
        </div>
        {emailScanProgress.status === 'RUNNING' && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Sync running • {emailScanProgress.messages} messages
          </div>
        )}
        {emailScanProgress.status === 'ERROR' && (
          <div style={{ fontSize: 11, color: 'var(--accent-red)', marginBottom: 8 }}>
            ⚠ Sync error{emailScanProgress.error ? `: ${emailScanProgress.error}` : ''}
          </div>
        )}
        {filteredEmails.map((email, i) => (
          <div
            key={i}
            onClick={() => {
              setSelectedEmail(i);
              if (!email.isRead) {
                window.babaAPI.emailMarkRead(email.provider, { account: email.account, messageId: email.id }).catch(console.error);
                setEmails(useAppStore.getState().emails.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)));
              }
            }}
            style={{
              padding: '10px 8px', borderBottom: '1px solid var(--border-primary)',
              cursor: 'pointer', borderRadius: 'var(--radius-sm)',
              background: selectedEmail === i ? 'var(--bg-card)' : 'transparent',
              borderLeft: email.category === 'Urgent' ? '3px solid var(--accent-red)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {email.isRead ? '○' : '●'} {email.from}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{email.account}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{email.subject}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }} className="truncate">{email.preview}</div>
          </div>
        ))}
        {filteredEmails.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No messages yet. Click Organize to sync.
          </div>
        )}
      </div>

      {/* Right - Preview */}
      <div style={{ width: 320, padding: 12, overflowY: 'auto' }}>
        {selected ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{selected.subject}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>From: {selected.from} • {selected.account}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.preview}</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={openReply}>Reply</button>
              <button className="btn btn-secondary btn-sm">Forward</button>
              <button className="btn btn-secondary btn-sm">Link Case</button>
            </div>
            <div style={{ marginTop: 16, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-accent)', marginBottom: 4 }}>AI Context</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>• Auto-categorized as {selected.category || 'General'}<br />• Recommended next step: Draft reply.</div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
            Select a message to view the brief
          </div>
        )}

        {composeOpen && (
          <div style={{ marginTop: 16, padding: 10, background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Compose</div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setComposeOpen(false); setComposeError(null); }}>✕</button>
            </div>
            {composeError && <div style={{ fontSize: 11, color: 'var(--accent-red)', marginBottom: 6 }}>⚠ {composeError}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="To" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              <input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
              <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} placeholder="Write message..." rows={6} style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', background: 'var(--bg-input)', color: 'var(--text-primary)', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={sendCompose} disabled={composeSending}>{composeSending ? '⏳ Sending...' : 'Send'}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setComposeOpen(false); setComposeError(null); }} disabled={composeSending}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
