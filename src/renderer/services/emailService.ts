import type { EmailMessage, OrganizedEmail, EmailScanProgress } from '@shared/types';
import { useAppStore } from '../stores/appStore';
import { notify } from './notificationService';

const categoryColor: Record<string, string> = {
  Urgent: '#ef4444',
  Legal: '#8b5cf6',
  Banking: '#f59e0b',
  Supplier: '#06b6d4',
  Council: '#10b981',
  HMRC: '#a855f7',
  Property: '#ec4899',
  Scams: '#6b7280',
  General: '#64748b',
};

function pickCategory(email: EmailMessage): { category: string; priority: EmailMessage['priority'] } {
  const from = (email.from || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const text = `${from} ${subject} ${(email.preview || '').toLowerCase()}`.slice(0, 2000);

  const urgent = /(urgent|overdue|final notice|deadline|due today|action required|reminder)/i.test(text);
  if (/(hmrc|vat|self assessment|tax return|paye|corporation tax)/i.test(text)) return { category: urgent ? 'Urgent' : 'HMRC', priority: urgent ? 'urgent' : 'high' };
  if (/(solicitor|completion|contract|lease|land registry|property|conveyanc)/i.test(text)) return { category: urgent ? 'Urgent' : 'Legal', priority: urgent ? 'urgent' : 'high' };
  if (/(santander|barclays|hsbc|lloyds|natwest|bank|unusual activity|payment|transaction|card)/i.test(text)) return { category: urgent ? 'Urgent' : 'Banking', priority: urgent ? 'urgent' : 'high' };
  if (/(invoice|bill|statement|bt business|edf|thames water|supplier|purchase order)/i.test(text)) return { category: urgent ? 'Urgent' : 'Supplier', priority: urgent ? 'urgent' : 'normal' };
  if (/(council|council tax|tax band|local authority)/i.test(text)) return { category: urgent ? 'Urgent' : 'Council', priority: urgent ? 'urgent' : 'normal' };
  if (/(password|verify your account|suspended|login attempt|reset|security alert|fraud|scam|phish)/i.test(text)) return { category: urgent ? 'Urgent' : 'Scams', priority: urgent ? 'urgent' : 'high' };

  return { category: urgent ? 'Urgent' : 'General', priority: urgent ? 'urgent' : 'normal' };
}

export function organizeEmails(messages: EmailMessage[]): { categorized: EmailMessage[]; organized: OrganizedEmail[] } {
  const categorized = messages.map((m) => {
    const { category, priority } = pickCategory(m);
    return { ...m, category, priority };
  });

  const organized = categorized.map((m) => ({
    sender: m.from,
    subject: m.subject,
    category: m.category || 'General',
    categoryColor: categoryColor[m.category || 'General'] || categoryColor.General,
  }));

  return { categorized, organized };
}

function formatDuration(durationMs: number) {
  const s = Math.max(0, Math.floor(durationMs / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `00:${mm}:${ss}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${Math.ceil(timeoutMs / 1000)}s`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

let running: Promise<void> | null = null;

export async function syncAndOrganize(options?: { maxResults?: number }) {
  if (running) return running;
  running = (async () => {
  const maxResults = Math.max(1, Math.min(Number(options?.maxResults || 50), 200));
  const { connections, settings, emailScanProgress } = useAppStore.getState();
  const emailConnections = connections
    .filter((c) => c.type === 'email' && c.status === 'connected')
    .map((c) => String(c.id))
    .filter((id) => id === 'outlook-desktop' || id === 'outlook' || id.startsWith('outlook:') || id === 'gmail' || id.startsWith('gmail:'));

  const runNumber = Number(emailScanProgress.runNumber || 0) + 1;
  const startedAt = Date.now();
  const started = new Date(startedAt).toLocaleTimeString();

  const progressBase: EmailScanProgress = {
    status: 'RUNNING',
    runNumber,
    started,
    duration: '00:00:00',
    stores: emailConnections.length,
    folders: 1,
    messages: 0,
    currentModel: `${useAppStore.getState().selectedProvider}/${useAppStore.getState().selectedModel || 'auto'}`,
    urgent: 0,
    progress: 1,
    error: '',
  };

  useAppStore.getState().setEmailScanProgress(progressBase);

  const durationTimer = setInterval(() => {
    const current = useAppStore.getState().emailScanProgress;
    if (current.status !== 'RUNNING') return;
    useAppStore.getState().setEmailScanProgress({
      ...current,
      duration: formatDuration(Date.now() - startedAt),
    });
  }, 500);

  if (emailConnections.length === 0) {
    clearInterval(durationTimer);
    useAppStore.getState().setEmailScanProgress({
      ...progressBase,
      status: 'DONE',
      duration: formatDuration(Date.now() - startedAt),
      messages: 0,
      urgent: 0,
      progress: 100,
      error: '',
    });
    useAppStore.getState().setEmails([]);
    useAppStore.getState().setOrganizedEmails([]);
    return;
  }

  const all: EmailMessage[] = [];
  const errors: string[] = [];
  for (let i = 0; i < emailConnections.length; i++) {
    const connId = emailConnections[i];
    const isOutlook = connId === 'outlook-desktop' || connId === 'outlook' || connId.startsWith('outlook:');
    const isOutlookDesktop = connId === 'outlook-desktop';
    const providerId = (isOutlook ? 'outlook' : 'gmail') as 'outlook' | 'gmail';
    const account = connId === 'outlook-desktop' ? undefined : (connId.includes(':') ? connId.split(':').slice(1).join(':') : undefined);
    try {
      let items: any;
      if (isOutlookDesktop) {
        items = await withTimeout(
          window.babaAPI.emailSync(providerId, { maxResults, settings, account, desktop: true } as any),
          45_000,
          `outlook desktop${account ? ` (${account})` : ''} sync`
        );
      } else {
        items = await withTimeout(
          window.babaAPI.emailSync(providerId, { maxResults, settings, account }),
          30_000,
          `${providerId}${account ? ` (${account})` : ''} sync`
        );
        if (providerId === 'outlook' && Array.isArray(items) && items.length === 0) {
          items = await withTimeout(
            window.babaAPI.emailSync(providerId, { maxResults, settings, account, desktop: true } as any),
            30_000,
            `outlook desktop${account ? ` (${account})` : ''} sync`
          );
        }
      }
      for (const item of (items as any[]) || []) {
        all.push({
          id: String(item.id),
          provider: providerId,
          from: String(item.from || 'Unknown'),
          subject: String(item.subject || ''),
          preview: String(item.preview || ''),
          folder: String(item.folder || 'inbox'),
          account: String(item.account || account || providerId),
          date: String(item.date || ''),
          isRead: Boolean(item.isRead),
        });
      }
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : String(err);
      errors.push(`${providerId}${account ? ` (${account})` : ''}: ${msg}`);
      if (isOutlookDesktop) {
        // For desktop outlook we know this is COM failure - include helpful instructions
        errors.push("Outlook Desktop requires Classic Outlook (not New Outlook), running with configured profile");
      }
    }

    useAppStore.getState().setEmailScanProgress({
      ...progressBase,
      messages: all.length,
      progress: Math.floor(((i + 1) / Math.max(1, emailConnections.length)) * 60),
      error: errors.length ? errors.slice(0, 3).join(' • ') : '',
      duration: formatDuration(Date.now() - startedAt),
    });
  }

  if (all.length === 0 && errors.length) {
    clearInterval(durationTimer);
    useAppStore.getState().setEmailScanProgress({
      ...progressBase,
      status: 'ERROR',
      duration: formatDuration(Date.now() - startedAt),
      messages: 0,
      urgent: 0,
      progress: 100,
      error: errors.slice(0, 3).join(' • '),
    });
    // Send notification for email sync error
    notify.error('Email Sync Failed', `Failed to sync emails: ${errors.slice(0, 2).join(', ')}`, {
      onClickTarget: 'inbox',
    });
    return;
  }

  const { categorized, organized } = organizeEmails(all);
  const urgent = categorized.filter((m) => m.category === 'Urgent').length;

  useAppStore.getState().setEmails(categorized);
  useAppStore.getState().setOrganizedEmails(organized);

  clearInterval(durationTimer);
  useAppStore.getState().setEmailScanProgress({
    ...progressBase,
    status: 'DONE',
    duration: formatDuration(Date.now() - startedAt),
    messages: categorized.length,
    urgent,
    progress: 100,
    error: errors.length ? errors.slice(0, 3).join(' • ') : '',
  });

  // Send notification for completed email scan
  if (categorized.length > 0) {
    const urgentMsg = urgent > 0 ? ` ${urgent} urgent email(s) detected.` : '';
    notify.success('Email Scan Complete', `Found ${categorized.length} emails.${urgentMsg}`, {
      onClickTarget: 'inbox',
    });
  }
  })().finally(() => {
    running = null;
  });
  return running;
}
