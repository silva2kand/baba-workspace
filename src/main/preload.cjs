const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('babaAPI', {
  openPopup: (windowId, opts) => ipcRenderer.invoke('open-popup', windowId, opts),
  closePopup: (windowId) => ipcRenderer.invoke('close-popup', windowId),
  resizePopup: (windowId, dimensions) => ipcRenderer.invoke('resize-popup', windowId, dimensions),
  focusPopup: (windowId) => ipcRenderer.invoke('focus-popup', windowId),
  minimizePopup: (windowId, minimize) => ipcRenderer.invoke('minimize-popup', windowId, minimize),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  onNavigate: (callback) => {
    const listener = (_, route) => callback(route);
    ipcRenderer.on('navigate', listener);
    return () => ipcRenderer.removeListener('navigate', listener);
  },
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
  openPath: (targetPath) => ipcRenderer.invoke('system:open-path', targetPath),
  webSearch: (query, options) => ipcRenderer.invoke('research:web-search', query, options),
  createDesktopShortcut: () => ipcRenderer.invoke('system:create-desktop-shortcut'),
  storeLoad: () => ipcRenderer.invoke('system:store-load'),
  storeSave: (data) => ipcRenderer.invoke('system:store-save', data),
  storeFieldGet: (fieldName) => ipcRenderer.invoke('system:store-field-get', fieldName),
  storeFieldSet: (fieldName, fieldValue) => ipcRenderer.invoke('system:store-field-set', fieldName, fieldValue),
  storeBackup: () => ipcRenderer.invoke('system:store-backup'),
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

  // MiroFish Simulation API
  miroFishHealth: () => ipcRenderer.invoke('mirofish:health'),
  miroFishCreateSimulation: (job) => ipcRenderer.invoke('mirofish:create-simulation', job),
  miroFishSimulationStatus: (simulationId) => ipcRenderer.invoke('mirofish:simulation-status', simulationId),
  miroFishSimulationReport: (simulationId) => ipcRenderer.invoke('mirofish:simulation-report', simulationId),
  miroFishCancelSimulation: (simulationId) => ipcRenderer.invoke('mirofish:cancel-simulation', simulationId),
  miroFishListSimulations: () => ipcRenderer.invoke('mirofish:list-simulations'),
  miroFishBuildGraph: (content, sourceType) => ipcRenderer.invoke('mirofish:build-graph', content, sourceType),
  miroFishQueryGraph: (query) => ipcRenderer.invoke('mirofish:query-graph', query),

  // Filesystem API
  fsListDir: (dirPath) => ipcRenderer.invoke('fs:listDir', dirPath),
  fsReadFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  fsGetFileInfo: (filePath) => ipcRenderer.invoke('fs:getFileInfo', filePath),

  // Error logging API
  logError: (payload) => ipcRenderer.invoke('log:error', payload),

  // Notification API
  notifySend: (options) => ipcRenderer.invoke('notify:send', options),
  notifyGetHistory: () => ipcRenderer.invoke('notify:get-history'),
  notifyMarkRead: (ids) => ipcRenderer.invoke('notify:mark-read', ids),
  notifyClearHistory: () => ipcRenderer.invoke('notify:clear-history'),
  onNotificationNew: (callback) => {
    const listener = (_, record) => callback(record);
    ipcRenderer.on('notification:new', listener);
    return () => ipcRenderer.removeListener('notification:new', listener);
  },
  onNotificationClick: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('notification:click', listener);
    return () => ipcRenderer.removeListener('notification:click', listener);
  },
});
