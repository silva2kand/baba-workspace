import type { NotificationCenterItem } from '@shared/types';

export async function copyText(text: string): Promise<boolean> {
  const value = String(text || '').trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

export function speakText(text: string): boolean {
  const value = String(text || '').trim();
  if (!value) return false;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.error('Failed to speak text:', err);
    return false;
  }
}

export function buildAiPromptFromNotification(item: NotificationCenterItem): string {
  const title = String(item.title || '').trim();
  const body = String(item.body || '').trim();
  const target = String(item.onClickTarget || '').trim();
  return [
    'Help me handle this notification.',
    `Title: ${title || 'Untitled notification'}`,
    `Details: ${body || 'No details provided.'}`,
    target ? `Context view: ${target}` : '',
    'Please draft the best next message/action for me.',
  ].filter(Boolean).join('\n');
}

