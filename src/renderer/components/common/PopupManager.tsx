import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPopupWindow } from '../../services/systemIntegrationService';

interface PopupWindow {
  id: string;
  title: string;
  width: number;
  height: number;
  alwaysOnTop: boolean;
  transparent: boolean;
  minimized: boolean;
  maximized: boolean;
  createdAt: number;
}

interface PopupManagerState {
  popups: PopupWindow[];
}

const popupState: PopupManagerState = {
  popups: [],
};

// Global event emitter for cross-component popup communication
type PopupEvent = 'popup-opened' | 'popup-closed' | 'popup-minimized' | 'popup-maximized' | 'popup-restored';
const listeners: Map<PopupEvent, Set<() => void>> = new Map();

function emitPopupEvent(event: PopupEvent) {
  const set = listeners.get(event);
  if (set) set.forEach((fn) => fn());
}

export function onPopupEvent(event: PopupEvent, callback: () => void) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(callback);
  return () => listeners.get(event)!.delete(callback);
}

export function getActivePopups(): PopupWindow[] {
  return [...popupState.popups];
}

export function addPopup(popup: PopupWindow) {
  popupState.popups.push(popup);
  emitPopupEvent('popup-opened');
}

export function removePopup(id: string) {
  popupState.popups = popupState.popups.filter((p) => p.id !== id);
  emitPopupEvent('popup-closed');
}

export function updatePopup(id: string, updates: Partial<PopupWindow>) {
  const idx = popupState.popups.findIndex((p) => p.id === id);
  if (idx !== -1) {
    Object.assign(popupState.popups[idx], updates);
  }
}

export const PopupManager: React.FC = () => {
  const [popups, setPopups] = useState<PopupWindow[]>([]);
  const [selectedPopup, setSelectedPopup] = useState<string | null>(null);
  const popupRestoreSizes = useRef<Record<string, { width: number; height: number }>>({});

  const refreshPopups = useCallback(() => {
    setPopups([...popupState.popups]);
  }, []);

  useEffect(() => {
    refreshPopups();
    const unsubscribers: (() => void)[] = [];
    (['popup-opened', 'popup-closed', 'popup-minimized', 'popup-maximized', 'popup-restored'] as PopupEvent[]).forEach((event) => {
      unsubscribers.push(onPopupEvent(event, refreshPopups));
    });
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [refreshPopups]);

  const handleClose = async (popup: PopupWindow) => {
    try {
      await window.babaAPI?.closePopup?.(popup.id);
    } catch (err) {
      console.error(`Failed to close popup ${popup.id}:`, err);
    }
    removePopup(popup.id);
  };

  const handleMinimize = async (popup: PopupWindow) => {
    const nextMinimized = !popup.minimized;
    updatePopup(popup.id, { minimized: nextMinimized });
    emitPopupEvent(nextMinimized ? 'popup-minimized' : 'popup-restored');
    try {
      await window.babaAPI?.minimizePopup?.(popup.id, nextMinimized);
    } catch (err) {
      console.error(`Failed to minimize/restore popup ${popup.id}:`, err);
    }
  };

  const handleMaximize = async (popup: PopupWindow) => {
    const newMaximized = !popup.maximized;
    let targetWidth = popup.width;
    let targetHeight = popup.height;

    if (newMaximized) {
      popupRestoreSizes.current[popup.id] = { width: popup.width, height: popup.height };
      targetWidth = Math.max(500, Math.floor(window.screen.availWidth * 0.96));
      targetHeight = Math.max(380, Math.floor(window.screen.availHeight * 0.9));
    } else {
      const previous = popupRestoreSizes.current[popup.id];
      if (previous) {
        targetWidth = previous.width;
        targetHeight = previous.height;
      }
    }

    updatePopup(popup.id, {
      maximized: newMaximized,
      minimized: false,
      width: targetWidth,
      height: targetHeight,
    });
    emitPopupEvent('popup-maximized');

    try {
      await window.babaAPI?.resizePopup?.(popup.id, { width: targetWidth, height: targetHeight });
      await window.babaAPI?.focusPopup?.(popup.id);
    } catch (err) {
      console.error(`Failed to resize popup ${popup.id}:`, err);
    }
  };

  const handleFocus = async (popup: PopupWindow) => {
    setSelectedPopup(popup.id);
    try {
      await window.babaAPI?.focusPopup?.(popup.id);
    } catch (err) {
      console.error(`Failed to focus popup ${popup.id}:`, err);
    }
  };

  if (popups.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 8,
      right: 8,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      maxWidth: 280,
    }}>
      {/* Popup Manager Header */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>
            {'\u{1F5D7}'} Popups ({popups.length})
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              // Close all popups
              popups.forEach((p) => {
                window.babaAPI?.closePopup?.(p.id);
                removePopup(p.id);
              });
            }}
            style={{ fontSize: 10, padding: '2px 6px' }}
          >
            Close All
          </button>
        </div>

        {/* Popup List */}
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {popups.map((popup) => (
            <div
              key={popup.id}
              onClick={() => handleFocus(popup)}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-primary)',
                cursor: 'pointer',
                background: selectedPopup === popup.id ? 'var(--bg-tertiary)' : 'transparent',
                opacity: popup.minimized ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (selectedPopup !== popup.id) {
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPopup !== popup.id) {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }
              }}
            >
              {/* Status Indicator */}
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: popup.minimized ? 'var(--text-muted)' : 'var(--accent-green)',
                flexShrink: 0,
              }} />

              {/* Title */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div className="truncate" style={{ fontSize: 11, fontWeight: 600 }}>
                  {popup.title}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  {popup.width}x{popup.height}
                  {popup.alwaysOnTop ? ' \u2022 Always on Top' : ''}
                  {popup.minimized ? ' \u2022 Minimized' : ''}
                  {popup.maximized ? ' \u2022 Maximized' : ''}
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleMinimize(popup); }}
                  title={popup.minimized ? 'Restore' : 'Minimize'}
                  style={{ padding: '1px 5px', fontSize: 10, lineHeight: 1 }}
                >
                  {popup.minimized ? '\u25B2' : '\u2013'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleMaximize(popup); }}
                  title={popup.maximized ? 'Restore' : 'Maximize'}
                  style={{ padding: '1px 5px', fontSize: 10, lineHeight: 1 }}
                >
                  {popup.maximized ? '\u25F0' : '\u25A1'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleClose(popup); }}
                  title="Close"
                  style={{ padding: '1px 5px', fontSize: 10, lineHeight: 1, color: 'var(--accent-red)' }}
                >
                  \u2715
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to open a popup and track it
export async function openAgentPopup(agentId: string, title: string) {
  const popupId = `agent-${agentId}`;
  const popup: PopupWindow = {
    id: popupId,
    title,
    width: 600,
    height: 400,
    alwaysOnTop: true,
    transparent: false,
    minimized: false,
    maximized: false,
    createdAt: Date.now(),
  };

  addPopup(popup);

  return createPopupWindow({
    id: popupId,
    title,
    width: 600,
    height: 400,
    alwaysOnTop: true,
  });
}

export async function openContextPopup(content: string) {
  const popupId = `context-${Date.now()}`;
  const popup: PopupWindow = {
    id: popupId,
    title: 'Context',
    width: 500,
    height: 600,
    alwaysOnTop: false,
    transparent: true,
    minimized: false,
    maximized: false,
    createdAt: Date.now(),
  };

  addPopup(popup);

  return createPopupWindow({
    id: popupId,
    title: 'Context',
    width: 500,
    height: 600,
    transparent: true,
  });
}

// Generic popup opener for any use case
export async function openCustomPopup(options: {
  id: string;
  title: string;
  width?: number;
  height?: number;
  alwaysOnTop?: boolean;
  transparent?: boolean;
}) {
  const popupId = options.id || `popup-${Date.now()}`;
  const defaultWidth = Math.min(960, Math.max(520, Math.floor(window.screen.availWidth * 0.62)));
  const defaultHeight = Math.min(760, Math.max(420, Math.floor(window.screen.availHeight * 0.62)));
  const popup: PopupWindow = {
    id: popupId,
    title: options.title,
    width: options.width || defaultWidth,
    height: options.height || defaultHeight,
    alwaysOnTop: options.alwaysOnTop ?? false,
    transparent: options.transparent ?? false,
    minimized: false,
    maximized: false,
    createdAt: Date.now(),
  };

  addPopup(popup);

  return createPopupWindow({
    id: popupId,
    title: options.title,
    width: popup.width,
    height: popup.height,
    alwaysOnTop: popup.alwaysOnTop,
    transparent: popup.transparent,
  });
}
