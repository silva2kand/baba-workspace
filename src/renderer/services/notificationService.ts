import type { NotificationType, NotificationCenterItem } from '@shared/types';
import { useAppStore } from '../stores/appStore';
import { buildAiPromptFromNotification } from './assistantActions';

export interface SendNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  type?: NotificationType;
  onClickTarget?: string;
}

/**
 * Send a native desktop notification via Electron IPC.
 * Also updates the app store for the in-app notification center.
 */
export async function sendNotification(options: SendNotificationOptions): Promise<{ id: string; success: boolean }> {
  const { title, body, icon, type = 'info', onClickTarget } = options;

  const result = await window.babaAPI?.notifySend?.({ title, body, icon, type, onClickTarget });

  if (result?.success) {
    const item: NotificationCenterItem = {
      id: result.id,
      title,
      body,
      icon,
      type,
      timestamp: Date.now(),
      read: false,
      onClickTarget: onClickTarget || null,
    };
    useAppStore.getState().addNotification(item);
  }

  return result || { id: '', success: false };
}

/**
 * Convenience wrappers for each notification type.
 */
export const notify = {
  info: (title: string, body: string, options?: Partial<SendNotificationOptions>) =>
    sendNotification({ title, body, type: 'info', ...options }),

  success: (title: string, body: string, options?: Partial<SendNotificationOptions>) =>
    sendNotification({ title, body, type: 'success', ...options }),

  warning: (title: string, body: string, options?: Partial<SendNotificationOptions>) =>
    sendNotification({ title, body, type: 'warning', ...options }),

  error: (title: string, body: string, options?: Partial<SendNotificationOptions>) =>
    sendNotification({ title, body, type: 'error', ...options }),
};

/**
 * Load notification history from main process into the store.
 */
export async function loadNotificationHistory(): Promise<NotificationCenterItem[]> {
  const history = await window.babaAPI?.notifyGetHistory?.() || [];
  useAppStore.getState().setNotifications(history);
  return history;
}

/**
 * Mark specific notifications as read (both in store and main process).
 */
export async function markAsRead(ids: string[]): Promise<void> {
  useAppStore.getState().markNotificationsRead(ids);
  await window.babaAPI?.notifyMarkRead?.(ids);
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(): Promise<void> {
  useAppStore.getState().markAllNotificationsRead();
  const items = useAppStore.getState().notifications;
  if (items.length > 0) {
    await window.babaAPI?.notifyMarkRead?.(items.map((n) => n.id));
  }
}

/**
 * Clear all notification history.
 */
export async function clearAll(): Promise<void> {
  useAppStore.getState().clearNotifications();
  await window.babaAPI?.notifyClearHistory?.();
}

export function queueNotificationForAI(item: NotificationCenterItem): void {
  const prompt = buildAiPromptFromNotification(item);
  useAppStore.getState().setChatDraft(prompt);
}

export function openNotificationInAI(item: NotificationCenterItem): void {
  queueNotificationForAI(item);
  useAppStore.getState().setCurrentView('chat');
}

/**
 * Set up IPC listeners for real-time notification events.
 * Call this once during app initialization.
 */
export function setupNotificationListeners(): () => void {
  const cleanupFns: (() => void)[] = [];

  if (window.babaAPI?.onNotificationNew) {
    const handler = (record: NotificationCenterItem) => {
      useAppStore.getState().addNotification(record);
    };
    const unsubscribe = window.babaAPI.onNotificationNew(handler);
    if (typeof unsubscribe === 'function') cleanupFns.push(unsubscribe);
  }

  if (window.babaAPI?.onNotificationClick) {
    const handler = (data: { id: string; target: string }) => {
      const state = useAppStore.getState();
      const record = state.notifications.find((n) => n.id === data.id);
      if (record) {
        openNotificationInAI(record);
        state.markNotificationsRead([record.id]);
      } else if (data.target) {
        state.setChatDraft([
          'Help me handle this notification.',
          `Context view: ${data.target}`,
          'Please draft the best next message/action for me.',
        ].join('\n'));
        state.setCurrentView('chat');
      }
      if (data.id) {
        void window.babaAPI?.notifyMarkRead?.([data.id]);
      }
    };
    const unsubscribe = window.babaAPI.onNotificationClick(handler);
    if (typeof unsubscribe === 'function') cleanupFns.push(unsubscribe);
  }

  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}
