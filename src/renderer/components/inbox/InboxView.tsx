import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { copyText, speakText } from '../../services/assistantActions';

export function InboxView() {
  const emailScanProgress = useAppStore((s) => s.emailScanProgress);
  const organizedEmails = useAppStore((s) => s.organizedEmails);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setChatDraft = useAppStore((s) => s.setChatDraft);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null);
  const aiSuggestions = '• Draft a response\n• Add to case file\n• Flag for follow-up';

  const folders = [
    { id: 'inbox', label: 'Inbox', count: 86, icon: '📥' },
    { id: 'urgent', label: 'Urgent', count: 42, icon: '🔴' },
    { id: 'legal', label: 'Legal', count: 12, icon: '⚖️' },
    { id: 'banking', label: 'Banking', count: 8, icon: '🏦' },
    { id: 'supplier', label: 'Supplier', count: 15, icon: '📦' },
    { id: 'council', label: 'Council', count: 6, icon: '🏛️' },
    { id: 'hmrc', label: 'HMRC', count: 3, icon: '💰' },
    { id: 'sent', label: 'Sent', count: 0, icon: '📤' },
    { id: 'drafts', label: 'Drafts', count: 2, icon: '📝' },
  ];

  const emails = [
    { from: 'HMRC', subject: 'Tax Return Reminder', preview: 'Dear taxpayer, your self-assessment tax return...', time: '10:23', folder: 'urgent', priority: 'urgent', isRead: false },
    { from: 'Thompson & Co', subject: 'Property Completion Date', preview: 'We are pleased to confirm the completion date...', time: '09:45', folder: 'legal', priority: 'high', isRead: false },
    { from: 'Santander', subject: 'Unusual Activity Alert', preview: 'We detected unusual activity on your account...', time: '09:12', folder: 'banking', priority: 'urgent', isRead: false },
    { from: 'BT Business', subject: 'Monthly Bill January 2025', preview: 'Your January bill is now available...', time: '08:30', folder: 'supplier', priority: 'normal', isRead: true },
    { from: 'Council', subject: 'Tax Band Adjustment', preview: 'Following our review, your council tax band...', time: 'Yesterday', folder: 'council', priority: 'normal', isRead: true },
    { from: 'HMRC', subject: 'VAT Return Filed', preview: 'Your VAT return has been successfully filed...', time: 'Yesterday', folder: 'hmrc', priority: 'normal', isRead: true },
  ];

  const accounts = ['Outlook', 'Gmail'];

  function handleWriteWithAI() {
    const context = selectedEmail !== null
      ? `Email subject: ${emails[selectedEmail]?.subject || 'Unknown'}\nFrom: ${emails[selectedEmail]?.from || 'Unknown'}`
      : 'No specific email selected.';
    const prompt = `${context}\n\nHelp me write the best response.\n\nSuggestions:\n${aiSuggestions}`;
    setChatDraft(prompt);
    setCurrentView('chat');
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left - Folders */}
      <div style={{ width: 200, borderRight: '1px solid var(--border-primary)', paddingRight: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Inbox</div>
        <div style={{ marginBottom: 8 }}>
          {accounts.map(acc => (
            <div key={acc} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 0' }}>
              📧 {acc} {acc === 'Outlook' ? '✅' : '⏸'}
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
            <button className="btn btn-ghost btn-sm">🔄 Refresh</button>
            <button className="btn btn-ghost btn-sm">📥 Organize</button>
            <button className="btn btn-ghost btn-sm">🗑 Archive</button>
          </div>
        </div>
        {emails.filter(e => selectedFolder === 'inbox' || e.folder === selectedFolder).map((email, i) => (
          <div
            key={i}
            onClick={() => setSelectedEmail(i)}
            style={{
              padding: '10px 8px', borderBottom: '1px solid var(--border-primary)',
              cursor: 'pointer', borderRadius: 'var(--radius-sm)',
              background: selectedEmail === i ? 'var(--bg-card)' : 'transparent',
              borderLeft: email.priority === 'urgent' ? '3px solid var(--accent-red)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: email.isRead ? 400 : 700, color: email.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                {email.isRead ? '' : '● '}{email.from}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{email.time}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: email.isRead ? 400 : 600, marginTop: 2 }}>{email.subject}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }} className="truncate">{email.preview}</div>
          </div>
        ))}
      </div>

      {/* Right - Preview */}
      <div style={{ width: 320, padding: 12, overflowY: 'auto' }}>
        {selectedEmail !== null ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{emails[selectedEmail]?.subject}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>From: {emails[selectedEmail]?.from} • {emails[selectedEmail]?.time}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{emails[selectedEmail]?.preview}</div>
            <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm">Reply</button>
              <button className="btn btn-secondary btn-sm">Forward</button>
              <button className="btn btn-secondary btn-sm">Link to Case</button>
              <button className="btn btn-ghost btn-sm">📎 Attach</button>
            </div>
            <div style={{ marginTop: 16, padding: 10, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text-accent)' }}>AI Suggestions</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => copyText(aiSuggestions)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.6, padding: '2px 4px', borderRadius: 4 }}
                    title="Copy suggestions"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                  >
                    📋
                  </button>
                  <button
                    onClick={() => speakText(aiSuggestions)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.6, padding: '2px 4px', borderRadius: 4 }}
                    title="Speak suggestions"
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                  >
                    🔊
                  </button>
                  <button
                    onClick={handleWriteWithAI}
                    style={{ background: 'transparent', border: '1px solid var(--border-primary)', cursor: 'pointer', fontSize: 10, opacity: 0.85, padding: '1px 6px', borderRadius: 10, color: 'var(--text-secondary)' }}
                    title="Open Chat and draft with AI"
                  >
                    Write with AI
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>• Draft a response<br />• Add to case file<br />• Flag for follow-up</div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
            Select an email to preview
          </div>
        )}
      </div>
    </div>
  );
}
