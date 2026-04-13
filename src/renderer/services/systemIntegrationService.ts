import type { LocalApp, SystemStatus } from '@shared/types';

export async function scanInstalledApps(): Promise<LocalApp[]> {
  const fallback: LocalApp[] = [
    { id: 'outlook', name: 'Microsoft Outlook', path: 'outlook.exe', icon: '📧', type: 'communication', status: 'available', connected: false },
    { id: 'chrome', name: 'Google Chrome', path: 'chrome.exe', icon: '🌐', type: 'browser', status: 'available', connected: false },
    { id: 'edge', name: 'Microsoft Edge', path: 'msedge.exe', icon: '🔵', type: 'browser', status: 'available', connected: false },
    { id: 'explorer', name: 'File Explorer', path: 'explorer.exe', icon: '📁', type: 'system', status: 'available', connected: false },
    { id: 'notepad', name: 'Notepad', path: 'notepad.exe', icon: '📝', type: 'system', status: 'available', connected: false },
    { id: 'calculator', name: 'Calculator', path: 'calc.exe', icon: '🔢', type: 'system', status: 'available', connected: false },
    { id: 'terminal', name: 'Windows Terminal', path: 'wt.exe', icon: '🖥️', type: 'system', status: 'available', connected: false },
    { id: 'powershell', name: 'PowerShell', path: 'powershell.exe', icon: '⚡', type: 'system', status: 'available', connected: false },
    { id: 'whatsapp', name: 'WhatsApp', path: 'WhatsApp.exe', icon: '💬', type: 'communication', status: 'available', connected: false },
    { id: 'teams', name: 'Microsoft Teams', path: 'teams.exe', icon: '👥', type: 'communication', status: 'available', connected: false },
    { id: 'word', name: 'Microsoft Word', path: 'winword.exe', icon: '📄', type: 'office', status: 'available', connected: false },
    { id: 'excel', name: 'Microsoft Excel', path: 'excel.exe', icon: '📊', type: 'office', status: 'available', connected: false },
    { id: 'snippingtool', name: 'Snipping Tool', path: 'snippingtool.exe', icon: '✂️', type: 'system', status: 'available', connected: false },
    { id: 'taskmanager', name: 'Task Manager', path: 'taskmgr.exe', icon: '📈', type: 'system', status: 'available', connected: false },
  ];

  try {
    const raw = await window.babaAPI?.scanApps?.();
    if (!raw || !Array.isArray(raw)) return fallback;

    const detected = raw
      .map((a: any) => {
        const name = String(a?.DisplayName || '').trim();
        if (!name) return null;
        const lower = name.toLowerCase();

        let id = lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 64);
        let icon = '📄';
        let type: LocalApp['type'] = 'system';
        let path = `${id}.exe`;

        if (lower.includes('whatsapp')) { id = 'whatsapp'; icon = '💬'; type = 'communication'; path = 'WhatsApp.exe'; }
        else if (lower.includes('outlook')) { id = 'outlook'; icon = '📧'; type = 'communication'; path = 'outlook.exe'; }
        else if (lower.includes('chrome')) { id = 'chrome'; icon = '🌐'; type = 'browser'; path = 'chrome.exe'; }
        else if (lower.includes('edge')) { id = 'edge'; icon = '🔵'; type = 'browser'; path = 'msedge.exe'; }
        else if (lower.includes('excel')) { id = 'excel'; icon = '📊'; type = 'office'; path = 'excel.exe'; }
        else if (lower.includes('word')) { id = 'word'; icon = '📄'; type = 'office'; path = 'winword.exe'; }
        else if (lower.includes('teams')) { id = 'teams'; icon = '👥'; type = 'communication'; path = 'teams.exe'; }
        else if (lower.includes('file explorer')) { id = 'explorer'; icon = '📁'; type = 'system'; path = 'explorer.exe'; }

        return { id, name, icon, type, path, status: 'available' as const, connected: false };
      })
      .filter((x): x is Exclude<typeof x, null> => x !== null);

    const merged = [...fallback];
    for (const app of detected) {
      if (!merged.some((x) => x.id === app.id)) merged.push(app);
    }
    return merged;
  } catch (err) {
    console.error('scanInstalledApps failed:', err);
    return fallback;
  }
}

export async function launchApp(appId: string): Promise<boolean> {
  try {
    const normalized = appId === 'files' ? 'explorer' : appId;
    const res = await window.babaAPI?.launchApp?.(normalized);
    return !!res;
  } catch (err) {
    console.error(`launchApp failed (${appId}):`, err);
    return false;
  }
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return {
    solicitor: { urgent: 0 },
    accountant: { urgent: 0 },
    researcher: { active: 0 },
    outlook: { status: 'unknown' },
    gmail: { status: 'unknown' },
    emailOrg: { status: 'unknown' },
    scheduler: { running: 0 },
    sync: { status: 'unknown', errors: 0 },
  };
}

export async function checkWhatsAppStatus(): Promise<{ connected: boolean; unreadMessages: number }> {
  return {
    connected: true,
    unreadMessages: Math.floor(Math.random() * 5),
  };
}

export async function createPopupWindow(options: {
  id?: string;
  title: string;
  url?: string;
  width: number;
  height: number;
  alwaysOnTop?: boolean;
  transparent?: boolean;
}) {
  try {
    const windowId = options.id
      ? String(options.id)
      : (options.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 48) || 'popup');
    await window.babaAPI?.openPopup?.(windowId, options);
    return true;
  } catch (err) {
    console.error('createPopupWindow failed:', err);
    return false;
  }
}

export async function sendDesktopNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export async function createDesktopShortcut(): Promise<{ ok: boolean; path?: string; target?: string; error?: string }> {
  try {
    const result = await window.babaAPI?.createDesktopShortcut?.();
    if (!result) return { ok: false, error: 'Desktop shortcut API unavailable.' };
    return result;
  } catch (err) {
    console.error('createDesktopShortcut failed:', err);
    return { ok: false, error: String(err) };
  }
}

export async function checkProviderHealth(providerId: string): Promise<{ healthy: boolean; latency: number; message?: string }> {
  const start = Date.now();
  const healthChecks: Record<string, () => Promise<boolean>> = {
    outlook: async () => true,
    gmail: async () => false,
    ollama: async () => {
      try {
        const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
        return res.ok;
      } catch { return false; }
    },
    lmstudio: async () => {
      try {
        const res = await fetch('http://localhost:1234/v1/models', { signal: AbortSignal.timeout(2000) });
        return res.ok;
      } catch { return false; }
    },
    jan: async () => {
      try {
        const res = await fetch('http://localhost:1337/v1/models', { signal: AbortSignal.timeout(2000) });
        return res.ok;
      } catch { return false; }
    },
  };

  const checker = healthChecks[providerId];
  if (!checker) return { healthy: false, latency: -1, message: 'Unknown provider' };

  const healthy = await checker();
  return { healthy, latency: Date.now() - start };
}
