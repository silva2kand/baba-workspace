const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('babaAPI', {
  openPopup: (windowId, opts) => ipcRenderer.invoke('open-popup', windowId, opts),
  closePopup: (windowId) => ipcRenderer.invoke('close-popup', windowId),
  resizePopup: (windowId, dimensions) => ipcRenderer.invoke('resize-popup', windowId, dimensions),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  onNavigate: (callback) => ipcRenderer.on('navigate', (_, route) => callback(route)),
  isPopup: () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('popup') || null;
  },
  fetch: async (url, options) => {
    try {
      const response = await fetch(url, options);
      return { ok: response.ok, status: response.status, data: await response.json() };
    } catch (err) {
      return { ok: false, status: 0, error: err.message };
    }
  },
  launchApp: (appId) => ipcRenderer.invoke('system:launch-app', appId),
  openUrl: (url) => ipcRenderer.invoke('system:open-url', url),
  storeLoad: () => ipcRenderer.invoke('system:store-load'),
  storeSave: (data) => ipcRenderer.invoke('system:store-save', data),
  scanApps: () => ipcRenderer.invoke('system:scan-apps'),
  emailConnect: (providerId, settings) => ipcRenderer.invoke('email:connect', providerId, settings),
  emailSync: (providerId, options) => ipcRenderer.invoke('email:sync', providerId, options),
  emailDesktopStatus: () => ipcRenderer.invoke('email:desktop-status'),
  emailDisconnect: (providerId) => ipcRenderer.invoke('email:disconnect', providerId),
  emailSend: (providerId, payload) => ipcRenderer.invoke('email:send', providerId, payload),
  emailMarkRead: (providerId, payload) => ipcRenderer.invoke('email:mark-read', providerId, payload),
  
  // Brain Index API
  brainIngest: (title, category, content, source) => ipcRenderer.invoke('brain:ingest', title, category, content, source),
  brainSearch: (query) => ipcRenderer.invoke('brain:search', query),
  brainStats: () => ipcRenderer.invoke('brain:stats'),
  brainRecent: (n) => ipcRenderer.invoke('brain:recent', n),
  
  // Master Memory API
  memoryLoad: () => ipcRenderer.invoke('memory:load'),
  memoryAppend: (text) => ipcRenderer.invoke('memory:append', text),
});
