import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { NotificationCenterItem, NotificationType } from '@shared/types';
import { markAsRead, markAllAsRead, clearAll, openNotificationInAI, queueNotificationForAI } from '../../services/notificationService';

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  info: '\u2139\uFE0F',
  success: '\u2705',
  warning: '\u26A0\uFE0F',
  error: '\u274C',
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  info: 'var(--accent-blue)',
  success: 'var(--accent-green)',
  warning: 'var(--accent-yellow)',
  error: 'var(--accent-red)',
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getTimeGroup(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();

  if (timestamp >= todayStart) return 'Today';
  if (timestamp >= yesterdayStart) return 'Yesterday';
  return 'Older';
}

interface NotificationItemProps {
  item: NotificationCenterItem;
  onMarkRead: (id: string) => void;
  onClick: (item: NotificationCenterItem) => void;
  onAskAI: (item: NotificationCenterItem) => void;
}

function NotificationItemView({ item, onMarkRead, onClick, onAskAI }: NotificationItemProps) {
  const icon = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.info;
  const color = NOTIFICATION_COLORS[item.type] || NOTIFICATION_COLORS.info;

  return (
    <div
      onClick={() => {
        if (!item.read) onMarkRead(item.id);
        onClick(item);
      }}
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        background: item.read ? 'transparent' : 'rgba(59, 130, 246, 0.06)',
        borderBottom: '1px solid var(--border-primary)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = item.read
          ? 'var(--bg-tertiary)'
          : 'rgba(59, 130, 246, 0.12)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = item.read
          ? 'transparent'
          : 'rgba(59, 130, 246, 0.06)';
      }}
    >
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-md)',
        background: `${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: item.read ? 500 : 600,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}>
            {item.title}
          </span>
          {!item.read && (
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              flexShrink: 0,
              marginTop: 4,
            }} />
          )}
        </div>
        <p style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          margin: '2px 0 0',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {item.body}
        </p>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
          {formatRelativeTime(item.timestamp)}
        </span>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onAskAI(item);
            }}
            style={{ fontSize: 10, padding: '2px 8px' }}
            title="Open Chat and draft with AI"
          >
            Write with AI
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = useAppStore((s) => s.unreadNotificationCount);
  const panelOpen = useAppStore((s) => s.notificationPanelOpen);
  const setPanelOpen = useAppStore((s) => s.setNotificationPanelOpen);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const groupedNotifications: Record<string, NotificationCenterItem[]> = {};
  for (const item of notifications) {
    const group = getTimeGroup(item.timestamp);
    if (!groupedNotifications[group]) groupedNotifications[group] = [];
    groupedNotifications[group].push(item);
  }

  const groupOrder = ['Today', 'Yesterday', 'Older'];

  function handleToggleDropdown() {
    if (panelOpen) {
      setPanelOpen(false);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
      setPanelOpen(true);

      // Mark all as read when opening
      if (unreadCount > 0) {
        markAllAsRead();
      }
    }
  }

  function handleItemClick(item: NotificationCenterItem) {
    if (item.onClickTarget) {
      setCurrentView(item.onClickTarget as any);
    }
    queueNotificationForAI(item);
    setPanelOpen(false);
  }

  function handleMarkSingleRead(id: string) {
    markAsRead([id]);
  }

  async function handleClearAll() {
    await clearAll();
  }

  function handleAskAI(item: NotificationCenterItem) {
    openNotificationInAI(item);
    setPanelOpen(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!panelOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        const dropdown = document.querySelector('[data-notification-dropdown]');
        if (dropdown && !dropdown.contains(e.target as Node)) {
          setPanelOpen(false);
        }
      }
    }

    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [panelOpen, setPanelOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        className="btn btn-ghost btn-icon"
        onClick={handleToggleDropdown}
        style={{ position: 'relative' }}
        title="Notifications"
      >
        <span style={{ fontSize: 16 }}>
          {unreadCount > 0 ? '\uD83D\uDD14' : '\uD83D\uDD14'}
        </span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            background: 'var(--accent-red)',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {panelOpen && dropdownPosition && (
        <div
          data-notification-dropdown
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            right: dropdownPosition.right,
            width: 380,
            maxHeight: 520,
            background: 'var(--bg-popup)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-primary)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Notifications
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => markAllAsRead()}
                  style={{ fontSize: 10, padding: '2px 8px' }}
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleClearAll}
                  style={{ fontSize: 10, padding: '2px 8px', color: 'var(--accent-red)' }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: 40,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  \uD83D\uDD14
                </div>
                No notifications yet
              </div>
            ) : (
              groupOrder.map((group) => {
                const items = groupedNotifications[group];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group}>
                    <div style={{
                      padding: '8px 16px 4px',
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: 'var(--bg-tertiary)',
                      borderBottom: '1px solid var(--border-primary)',
                    }}>
                      {group}
                    </div>
                    {items.map((item) => (
                      <NotificationItemView
                        key={item.id}
                        item={item}
                        onMarkRead={handleMarkSingleRead}
                        onClick={handleItemClick}
                        onAskAI={handleAskAI}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
