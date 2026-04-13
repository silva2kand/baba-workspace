import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../stores/appStore';

// ── Shortcut definition ──────────────────────────────────────────────────────

export interface Shortcut {
  id: string;
  label: string;
  keys: string;          // human-readable, e.g. "Ctrl+K"
  handler: () => void;
  category: 'navigation' | 'actions' | 'view' | 'general';
}

// Centralised shortcut registry
export const shortcuts: Shortcut[] = [
  {
    id: 'open-command-palette',
    label: 'Open Search / Command Palette',
    keys: 'Ctrl+K',
    handler: () => {},            // wired at runtime via the hook
    category: 'navigation',
  },
  {
    id: 'new-task',
    label: 'New Task',
    keys: 'Ctrl+N',
    handler: () => {},
    category: 'actions',
  },
  {
    id: 'focus-search',
    label: 'Focus Search Bar',
    keys: 'Ctrl+F',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'toggle-voice',
    label: 'Toggle Voice',
    keys: 'Alt+M',
    handler: () => {},
    category: 'actions',
  },
  {
    id: 'close-modals',
    label: 'Close Modals / Dropdowns',
    keys: 'Esc',
    handler: () => {},
    category: 'general',
  },
  {
    id: 'toggle-sidebar',
    label: 'Toggle Sidebar',
    keys: 'Ctrl+B',
    handler: () => {},
    category: 'view',
  },
  {
    id: 'open-settings',
    label: 'Open Settings',
    keys: 'Ctrl+,',
    handler: () => {},
    category: 'navigation',
  },
  // Quick-view shortcuts: Ctrl+1 … Ctrl+9
  {
    id: 'view-home',
    label: 'Go to Home',
    keys: 'Ctrl+1',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'view-chat',
    label: 'Go to Chat',
    keys: 'Ctrl+2',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'view-agents',
    label: 'Go to Agents',
    keys: 'Ctrl+3',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'view-inbox',
    label: 'Go to Inbox',
    keys: 'Ctrl+4',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'view-cases',
    label: 'Go to Cases',
    keys: 'Ctrl+5',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'view-radar',
    label: 'Go to Radar',
    keys: 'Ctrl+6',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'view-scheduler',
    label: 'Go to Scheduler',
    keys: 'Ctrl+7',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'view-wiki',
    label: 'Go to Wiki',
    keys: 'Ctrl+8',
    handler: () => {},
    category: 'navigation',
  },
  {
    id: 'view-settings',
    label: 'Go to Settings',
    keys: 'Ctrl+9',
    handler: () => {},
    category: 'navigation',
  },
];

// ── Keyboard mapping helpers ─────────────────────────────────────────────────

const viewByDigit: Record<string, string> = {
  '1': 'home',
  '2': 'chat',
  '3': 'agents',
  '4': 'inbox',
  '5': 'cases',
  '6': 'radar',
  '7': 'scheduler',
  '8': 'wiki',
  '9': 'settings',
};

function matchEvent(e: KeyboardEvent): string | null {
  // Ctrl+<digit>
  if (e.ctrlKey && !e.shiftKey && !e.altKey && viewByDigit[e.key]) {
    return `view-${viewByDigit[e.key]}`;
  }
  // Ctrl+K
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') return 'open-command-palette';
  // Ctrl+N
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') return 'new-task';
  // Ctrl+F
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') return 'focus-search';
  // Alt+M
  if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'm') return 'toggle-voice';
  // Escape
  if (e.key === 'Escape') return 'close-modals';
  // Ctrl+B
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') return 'toggle-sidebar';
  // Ctrl+,
  if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === ',') return 'open-settings';
  return null;
}

// ── React hook ───────────────────────────────────────────────────────────────

export function useKeyboardShortcuts({
  onOpenCommandPalette,
  onNewTask,
  onFocusSearch,
  onToggleVoice,
  onCloseModals,
  onToggleSidebar,
  onOpenSettings,
}: {
  onOpenCommandPalette?: () => void;
  onNewTask?: () => void;
  onFocusSearch?: () => void;
  onToggleVoice?: () => void;
  onCloseModals?: () => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
} = {}) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setContextPanelOpen = useAppStore((s) => s.setContextPanelOpen);
  const contextPanelOpen = useAppStore((s) => s.contextPanelOpen);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setVoiceReady = useAppStore((s) => s.setVoiceReady);
  const voiceReady = useAppStore((s) => s.voiceReady);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in input/textarea/contentEditable
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
        // Still allow Escape to close modals even inside inputs
        if (e.key === 'Escape' && onCloseModals) {
          e.preventDefault();
          onCloseModals();
          return;
        }
        return;
      }

      const id = matchEvent(e);
      if (!id) return;

      e.preventDefault();

      switch (id) {
        case 'open-command-palette':
          onOpenCommandPalette?.();
          break;
        case 'new-task':
          onNewTask?.();
          break;
        case 'focus-search':
          onFocusSearch?.();
          break;
        case 'toggle-voice':
          if (onToggleVoice) onToggleVoice();
          else setVoiceReady(!voiceReady);
          break;
        case 'close-modals':
          onCloseModals?.();
          break;
        case 'toggle-sidebar':
          if (onToggleSidebar) onToggleSidebar();
          else setContextPanelOpen(!contextPanelOpen);
          break;
        case 'open-settings':
          if (onOpenSettings) onOpenSettings();
          else setCurrentView('settings');
          break;
        default:
          // Ctrl+1 … Ctrl+9  →  view navigation
          if (id.startsWith('view-')) {
            const viewName = id.replace('view-', '');
            setCurrentView(viewName as any);
          }
          break;
      }
    },
    [
      onOpenCommandPalette, onNewTask, onFocusSearch, onToggleVoice,
      onCloseModals, onToggleSidebar, onOpenSettings,
      setCurrentView, setContextPanelOpen, contextPanelOpen,
      setSearchQuery, setVoiceReady, voiceReady,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ── Shortcuts modal state (for the help overlay) ─────────────────────────────

let _showShortcutsModal = false;
const _listeners: Set<(v: boolean) => void> = new Set();

export function showShortcutsHelp() {
  _showShortcutsModal = true;
  _listeners.forEach((fn) => fn(true));
}

export function hideShortcutsHelp() {
  _showShortcutsModal = false;
  _listeners.forEach((fn) => fn(false));
}

export function useShortcutsModal(): [boolean, () => void] {
  const [open, setOpen] = useState(_showShortcutsModal);

  useEffect(() => {
    const listener = (v: boolean) => setOpen(v);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  return [open, hideShortcutsHelp];
}
