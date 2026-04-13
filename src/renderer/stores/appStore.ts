import { create } from 'zustand';
import type { LocalModel, Provider, Agent, SelfEvolutionEntry, SystemStatus, EmailScanProgress, OrganizedEmail, EmailMessage, ChatThread, SidebarView, ConnectionData, Task, ApprovalItem, WikiEntry, AppSettings, MiroFishConfig, SimulationJob, SimulationReport, NotificationCenterItem } from '@shared/types';

interface AppState {
  currentView: SidebarView;
  setCurrentView: (view: SidebarView) => void;

  providers: Provider[];
  models: LocalModel[];
  setProviders: (providers: Provider[]) => void;
  setModels: (models: LocalModel[]) => void;

  selectedProvider: string;
  selectedModel: string;
  setSelectedProvider: (p: string) => void;
  setSelectedModel: (m: string) => void;

  evidenceMode: boolean;
  setEvidenceMode: (v: boolean) => void;

  coworkEnabled: boolean;
  setCoworkEnabled: (v: boolean) => void;

  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  updateAgentStatus: (id: string, status: Agent['status'], task?: string) => void;

  tasks: Task[];
  setTasks: (tasks: Task[]) => void;

  activeChats: ChatThread[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  addChat: (chat: ChatThread) => void;
  chatDraft: string;
  setChatDraft: (value: string) => void;

  evolutionLog: SelfEvolutionEntry[];
  addEvolutionEntry: (entry: SelfEvolutionEntry) => void;

  systemStatus: SystemStatus;
  setSystemStatus: (status: SystemStatus) => void;

  emailScanProgress: EmailScanProgress;
  setEmailScanProgress: (progress: EmailScanProgress) => void;

  emails: EmailMessage[];
  setEmails: (emails: EmailMessage[]) => void;

  organizedEmails: OrganizedEmail[];
  setOrganizedEmails: (emails: OrganizedEmail[]) => void;

  connections: ConnectionData[];
  setConnections: (connections: ConnectionData[]) => void;

  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;

  contextPanelOpen: boolean;
  setContextPanelOpen: (v: boolean) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  voiceReady: boolean;
  setVoiceReady: (v: boolean) => void;

  username: string;
  setUsername: (n: string) => void;

  scanRunning: boolean;
  setScanRunning: (v: boolean) => void;

  approvals: ApprovalItem[];
  setApprovals: (v: ApprovalItem[]) => void;

  wikiEntries: WikiEntry[];
  setWikiEntries: (v: WikiEntry[]) => void;

  miroFishConfig: MiroFishConfig;
  setMiroFishConfig: (v: MiroFishConfig) => void;

  simulations: SimulationJob[];
  setSimulations: (v: SimulationJob[]) => void;
  addSimulation: (v: SimulationJob) => void;
  updateSimulation: (id: string, updates: Partial<SimulationJob>) => void;

  activeSimulation: string | null;
  setActiveSimulation: (id: string | null) => void;

  simulationReports: SimulationReport[];
  setSimulationReports: (v: SimulationReport[]) => void;
  addSimulationReport: (v: SimulationReport) => void;

  notifications: NotificationCenterItem[];
  setNotifications: (v: NotificationCenterItem[]) => void;
  addNotification: (v: NotificationCenterItem) => void;
  markNotificationsRead: (ids: string[]) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  unreadNotificationCount: number;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (v: boolean) => void;

  hydrateStore: (data: any) => void;
  
  // NEW: Persistence helpers
  persistField: (fieldName: string, value: any) => Promise<void>;
  loadField: (fieldName: string) => Promise<any>;
  backupStore: () => Promise<{ success: boolean; path?: string; error?: string }>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'home',
  setCurrentView: (v) => set({ currentView: v }),

  providers: [],
  models: [],
  setProviders: (providers) => set({ providers }),
  setModels: (models) => set({ models }),

  selectedProvider: 'ollama',
  selectedModel: '',
  setSelectedProvider: (p) => set({ selectedProvider: p }),
  setSelectedModel: (m) => set({ selectedModel: m }),

  evidenceMode: true,
  setEvidenceMode: (v) => set({ evidenceMode: v }),

  coworkEnabled: false,
  setCoworkEnabled: (v) => set({ coworkEnabled: v }),

  agents: [
    { id: 'brain', name: 'Brain Agent', type: 'brain', icon: '🧠', status: 'working', currentTask: 'Analyzing 86 urgent emails', tasksCompleted: 142, description: 'Primary reasoning and orchestration agent' },
    { id: 'legal', name: 'Legal Agent', type: 'legal', icon: '⚖', status: 'idle', tasksCompleted: 156, description: 'Scan all data for legal risks, disputes, contract issues' },
    { id: 'acct', name: 'Accounting Agent', type: 'acct', icon: '📊', status: 'idle', tasksCompleted: 187, description: 'Analyse bills, invoices, cashflow, renewals' },
    { id: 'supplier', name: 'Supplier Agent', type: 'supplier', icon: '🏭', status: 'idle', tasksCompleted: 78, description: 'Analyse supplier spend, terms, pricing' },
    { id: 'deals', name: 'Deal & Property Agent', type: 'deals', icon: '🏠', status: 'idle', tasksCompleted: 42, description: 'Scout deal opportunities: auctions, subletting' },
    { id: 'content', name: 'Content Agent', type: 'content', icon: '📝', status: 'idle', tasksCompleted: 112, description: 'Generate content ideas, draft posts, campaigns' },
    { id: 'comms', name: 'Comms Agent', type: 'comms', icon: '💬', status: 'idle', tasksCompleted: 94, description: 'Analyse email and WhatsApp threads' },
    { id: 'pa', name: 'PA & Admin Agent', type: 'pa', icon: '📋', status: 'idle', tasksCompleted: 128, description: 'Track admin: bills, insurance, council, vehicles' },
    { id: 'money', name: 'Money Engine', type: 'money', icon: '💰', status: 'working', currentTask: 'Cross-referencing HMRC deadlines', tasksCompleted: 54, description: 'Full money analysis: savings, cashflow, property' },
    { id: 'coder', name: 'Coder Agent', type: 'coder', icon: '💻', status: 'working', currentTask: 'Drafting legal responses', tasksCompleted: 89, description: 'Code generation and document drafting' },
    { id: 'research', name: 'Research Agent', type: 'research', icon: '🔍', status: 'working', currentTask: 'Monitoring radar signals', tasksCompleted: 67, description: 'Research and information gathering' },
  ],
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (id, status, task) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, status, currentTask: task || a.currentTask } : a
      ),
    })),

  tasks: [],
  setTasks: (tasks) => {
    set({ tasks });
    // Auto-persist tasks to disk
    get().persistField('tasks', tasks);
  },

  activeChats: [],
  currentChatId: null,
  setCurrentChatId: (id) => set({ currentChatId: id }),
  addChat: (chat) => set((state) => ({ activeChats: [...state.activeChats, chat] })),
  chatDraft: '',
  setChatDraft: (value) => set({ chatDraft: value }),

  evolutionLog: [],
  addEvolutionEntry: (entry) => set((state) => ({ evolutionLog: [entry, ...state.evolutionLog].slice(0, 100) })),

  systemStatus: {
    solicitor: { urgent: 18 },
    accountant: { urgent: 20 },
    researcher: { active: 3 },
    outlook: { status: 'oauth connected' },
    gmail: { status: 'agent off' },
    emailOrg: { status: 'done' },
    scheduler: { running: 3 },
    sync: { status: 'synced', errors: 0 },
  },
  setSystemStatus: (status) => set({ systemStatus: status }),

  emailScanProgress: {
    status: 'PAUSED',
    runNumber: 0,
    started: '--:--:--',
    duration: '00:00:00',
    stores: 0,
    folders: 0,
    messages: 0,
    currentModel: '',
    urgent: 0,
    progress: 0,
    error: '',
  },
  setEmailScanProgress: (progress) => set({ emailScanProgress: progress }),

  emails: [],
  setEmails: (emails) => {
    set({ emails });
    // Auto-persist emails to disk
    get().persistField('emails', emails);
  },

  organizedEmails: [],
  setOrganizedEmails: (emails) => set({ organizedEmails: emails }),

  connections: [
    { id: 'outlook', name: 'Outlook', type: 'email', status: 'disconnected', icon: '📧' },
    { id: 'gmail', name: 'Gmail', type: 'email', status: 'disconnected', icon: '📧' },
    { id: 'whatsapp', name: 'WhatsApp', type: 'messenger', status: 'connected', icon: '💬' },
    { id: 'chrome', name: 'Chrome', type: 'browser', status: 'connected', icon: '🌐' },
    { id: 'excel', name: 'Excel', type: 'office', status: 'connected', icon: '📊' },
    { id: 'explorer', name: 'File Explorer', type: 'system', status: 'connected', icon: '📁' },
  ],
  setConnections: (connections) => {
    set({ connections });
    get().persistField('connections', connections);
  },

  settings: {
    email: {
      outlookClientId: '',
      outlookTenant: 'common',
      gmailClientId: '',
    },
  },
  setSettings: (settings) => {
    set({ settings });
    get().persistField('settings', settings);
  },

  contextPanelOpen: true,
  setContextPanelOpen: (v) => set({ contextPanelOpen: v }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  voiceReady: false,
  setVoiceReady: (v) => set({ voiceReady: v }),

  username: 'Silva',
  setUsername: (n) => set({ username: n }),

  scanRunning: false,
  setScanRunning: (v) => set({ scanRunning: v }),

  approvals: [
    { id: '1', type: 'email', title: 'Draft reply to Thompson & Co', description: 'Confirming the completion date as Feb 12th.', preparedBy: 'Solicitor Agent', timestamp: '10:45', status: 'pending', data: {} },
    { id: '2', type: 'action', title: 'File VAT Return', description: 'Agent prepared the HMRC submission for Q4.', preparedBy: 'Accountant Agent', timestamp: 'Yesterday', status: 'pending', data: {} },
  ],
  setApprovals: (v) => {
    set({ approvals: v });
    // Auto-persist approvals to disk
    get().persistField('approvals', v);
  },

  wikiEntries: [],
  setWikiEntries: (v) => {
    set({ wikiEntries: v });
    get().persistField('wikiEntries', v);
  },

  miroFishConfig: {
    baseUrl: 'http://localhost:8000',
    status: 'disconnected',
    lastChecked: 0,
    dockerRunning: false,
  },
  setMiroFishConfig: (v) => set({ miroFishConfig: v }),

  simulations: [],
  setSimulations: (v) => set({ simulations: v }),
  addSimulation: (v) => set((state) => ({ simulations: [...state.simulations, v] })),
  updateSimulation: (id, updates) => set((state) => ({
    simulations: state.simulations.map((s) => s.id === id ? { ...s, ...updates } : s),
  })),

  activeSimulation: null,
  setActiveSimulation: (id) => set({ activeSimulation: id }),

  simulationReports: [],
  setSimulationReports: (v) => set({ simulationReports: v }),
  addSimulationReport: (v) => set((state) => ({ simulationReports: [...state.simulationReports, v] })),

  notifications: [],
  setNotifications: (v) => set({ notifications: v, unreadNotificationCount: v.filter((n) => !n.read).length }),
  addNotification: (v) => set((state) => {
    const next = [v, ...state.notifications].slice(0, 200);
    return { notifications: next, unreadNotificationCount: next.filter((n) => !n.read).length };
  }),
  markNotificationsRead: (ids) => set((state) => {
    const next = state.notifications.map((n) => ids.includes(n.id) ? { ...n, read: true } : n);
    return { notifications: next, unreadNotificationCount: next.filter((n) => !n.read).length };
  }),
  markAllNotificationsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
    unreadNotificationCount: 0,
  })),
  clearNotifications: () => set({ notifications: [], unreadNotificationCount: 0 }),
  unreadNotificationCount: 0,
  notificationPanelOpen: false,
  setNotificationPanelOpen: (v) => set({ notificationPanelOpen: v }),

  hydrateStore: (data) => {
    const rawConnections = Array.isArray(data?.connections) ? data.connections : [];
    const normalized: ConnectionData[] = [];
    const seen = new Set<string>();

    for (const c of rawConnections) {
      if (!c?.id) continue;
      const id = (c.id === 'files' || c.id === 'filesystem') ? 'explorer' : c.id;
      const next = { ...c, id } as ConnectionData;
      if (seen.has(id)) continue;
      seen.add(id);
      normalized.push(next);
    }

    const settings: AppSettings = {
      email: {
        outlookClientId: String(data?.settings?.email?.outlookClientId || ''),
        outlookTenant: String(data?.settings?.email?.outlookTenant || 'common'),
        gmailClientId: String(data?.settings?.email?.gmailClientId || ''),
      },
    };

    set({
      wikiEntries: Array.isArray(data?.wikiEntries) ? data.wikiEntries : [],
      connections: normalized,
      settings,
      // Load new persistent fields
      tasks: Array.isArray(data?.tasks) ? data.tasks : [],
      emails: Array.isArray(data?.emails) ? data.emails : [],
      approvals: Array.isArray(data?.approvals) ? data.approvals : [],
    });
  },

  // NEW: Persist specific field to disk
  persistField: async (fieldName: string, value: any) => {
    try {
      await window.babaAPI?.storeFieldSet?.(fieldName, value);
    } catch (err) {
      console.error(`Failed to persist field: ${fieldName}`, err);
    }
  },

  // NEW: Load specific field from disk
  loadField: async (fieldName: string) => {
    try {
      return await window.babaAPI?.storeFieldGet?.(fieldName);
    } catch (err) {
      console.error(`Failed to load field: ${fieldName}`, err);
      return null;
    }
  },

  // NEW: Backup entire store
  backupStore: async () => {
    try {
      const result = await window.babaAPI?.storeBackup?.();
      return result;
    } catch (err) {
      console.error('Failed to backup store:', err);
      return { success: false, error: String(err) };
    }
  },
}));
