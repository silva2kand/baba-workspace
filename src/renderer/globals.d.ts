declare module '*.css' {
  const css: string;
  export default css;
}

interface Window {
  babaAPI: {
    openPopup: (id: string, opts: any) => Promise<any>;
    closePopup: (id: string) => Promise<any>;
    resizePopup: (id: string, dimensions: { width?: number; height?: number }) => Promise<any>;
    getSystemInfo: () => Promise<any>;
    onNavigate: (callback: (route: string) => void) => void;
    isPopup: () => string | null;
    fetch: (url: string, options?: any) => Promise<{ ok: boolean; status: number; data?: any; error?: string }>;
    launchApp: (appId: string) => Promise<boolean>;
    openUrl: (url: string) => Promise<boolean>;
    storeLoad: () => Promise<any>;
    storeSave: (data: any) => Promise<boolean>;
    scanApps: () => Promise<any[]>;
    emailConnect: (providerId: 'outlook' | 'gmail', settings: any) => Promise<{ connected: boolean; account?: string }>;
    emailSync: (providerId: 'outlook' | 'gmail', options?: any) => Promise<any[]>;
    emailDesktopStatus: () => Promise<{ ok: boolean; stores?: string[]; error?: string }>;
    emailDisconnect: (providerId: 'outlook' | 'gmail') => Promise<boolean>;
    emailSend: (providerId: 'outlook' | 'gmail', payload: any) => Promise<{ ok: boolean }>;
    emailMarkRead: (providerId: 'outlook' | 'gmail', payload: any) => Promise<{ ok: boolean }>;
  };
}
