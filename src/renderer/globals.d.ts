declare module '*.css' {
  const css: string;
  export default css;
}

interface Window {
  babaAPI: {
    openPopup: (id: string, opts: any) => Promise<any>;
    closePopup: (id: string) => Promise<any>;
    resizePopup: (id: string, dimensions: { width?: number; height?: number }) => Promise<any>;
    focusPopup: (id: string) => Promise<boolean>;
    minimizePopup: (id: string, minimize?: boolean) => Promise<boolean>;
    getSystemInfo: () => Promise<any>;
    onNavigate: (callback: (route: string) => void) => (() => void);
    isPopup: () => string | null;
    fetch: (url: string, options?: any) => Promise<{ ok: boolean; status: number; data?: any; error?: string }>;
    launchApp: (appId: string) => Promise<boolean>;
    openUrl: (url: string) => Promise<boolean>;
    openPath: (targetPath: string) => Promise<boolean>;
    createDesktopShortcut: () => Promise<{ ok: boolean; path?: string; target?: string; error?: string }>;
    storeLoad: () => Promise<any>;
    storeSave: (data: any) => Promise<boolean>;
    scanApps: () => Promise<any[]>;
    emailConnect: (providerId: 'outlook' | 'gmail', settings: any) => Promise<{ connected: boolean; account?: string }>;
    emailSync: (providerId: 'outlook' | 'gmail', options?: any) => Promise<any[]>;
    emailDesktopStatus: () => Promise<{ ok: boolean; stores?: string[]; error?: string }>;
    emailDisconnect: (providerId: 'outlook' | 'gmail') => Promise<boolean>;
    emailSend: (providerId: 'outlook' | 'gmail', payload: any) => Promise<{ ok: boolean }>;
    emailMarkRead: (providerId: 'outlook' | 'gmail', payload: any) => Promise<{ ok: boolean }>;

    // Brain Index API
    brainIngest: (title: string, category: string, content: string, source: string) => Promise<number>;
    brainSearch: (query: string) => Promise<any[]>;
    brainStats: () => Promise<any>;
    brainRecent: (n: number) => Promise<any[]>;

    // Master Memory API
    memoryLoad: () => Promise<string>;
    memoryAppend: (text: string) => Promise<boolean>;

    // MiroFish Simulation API
    miroFishHealth: () => Promise<any>;
    miroFishCreateSimulation: (job: any) => Promise<any>;
    miroFishSimulationStatus: (simulationId: string) => Promise<any>;
    miroFishSimulationReport: (simulationId: string) => Promise<any>;
    miroFishCancelSimulation: (simulationId: string) => Promise<any>;
    miroFishListSimulations: () => Promise<any>;
    miroFishBuildGraph: (content: string, sourceType: string) => Promise<any>;
    miroFishQueryGraph: (query: string) => Promise<any>;

    // Filesystem API
    fsListDir: (dirPath: string) => Promise<{ files: any[]; error: string | null }>;
    fsReadFile: (filePath: string) => Promise<{ content: string | null; error: string | null }>;
    fsGetFileInfo: (filePath: string) => Promise<any>;
    storeFieldGet: (fieldName: string) => Promise<any>;
    storeFieldSet: (fieldName: string, value: any) => Promise<boolean>;
    storeBackup: () => Promise<any>;
    
    // Error logging API
    logError: (payload: { name: string; message: string; stack: string }) => Promise<void>;

    // Notification API
    notifySend: (options: { title: string; body: string; icon?: string; type?: string; onClickTarget?: string }) => Promise<{ id: string; success: boolean }>;
    notifyGetHistory: () => Promise<any[]>;
    notifyMarkRead: (ids: string[]) => Promise<{ success: boolean }>;
    notifyClearHistory: () => Promise<{ success: boolean }>;
    onNotificationNew: (callback: (record: any) => void) => (() => void);
    onNotificationClick: (callback: (data: { id: string; target: string }) => void) => (() => void);
  };
}
