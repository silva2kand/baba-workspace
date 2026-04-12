import React from 'react';
import { createPopupWindow } from '../../services/systemIntegrationService';

export const PopupManager: React.FC = () => {
  return null;
};

export async function openAgentPopup(agentId: string, title: string) {
  return createPopupWindow({
    title,
    width: 600,
    height: 400,
    alwaysOnTop: true,
  });
}

export async function openContextPopup(content: string) {
  return createPopupWindow({
    title: 'Context',
    width: 500,
    height: 600,
    transparent: true,
  });
}
