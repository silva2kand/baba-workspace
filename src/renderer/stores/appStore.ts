import { create } from 'zustand';
import type { LocalModel, Provider, Agent, SelfEvolutionEntry, SystemStatus, EmailScanProgress, OrganizedEmail, EmailMessage, ChatThread, SidebarView, ConnectionData, Task, ApprovalItem, WikiEntry, AppSettings } from '@shared/types';

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

  hydrateStore: (data: any) => void;
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
    { id: 'coder', name: 'Coder Agent', type: 'coder', icon: '💻', status: 'working', currentTask: 'Drafting legal responses', tasksCompleted: 89, description: 'Code generation and document drafting' },
    { id: 'research', name: 'Research Agent', type: 'research', icon: '🔍', status: 'working', currentTask: 'Monitoring radar signals', tasksCompleted: 67, description: 'Research and information gathering' },
    { id: 'money', name: 'Money Agent', type: 'money', icon: '💰', status: 'working', currentTask: 'Cross-referencing HMRC deadlines', tasksCompleted: 54, description: 'Financial analysis and deadline tracking' },
    { id: 'solicitor', name: 'Solicitor Agent', type: 'solicitor', icon: '⚖️', status: 'idle', tasksCompleted: 203, description: 'Legal correspondence and case management' },
    { id: 'accountant', name: 'Accountant Agent', type: 'accountant', icon: '📊', status: 'idle', tasksCompleted: 187, description: 'Financial computations and tax analysis' },
  ],
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (id, status, task) => 
    set((state) => ({
      agents: state.agents.map((a) => 
        a.id === id ? { ...a, status, currentTask: task || a.currentTask } : a
      ),
    })),
  
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  
  activeChats: [],
  currentChatId: null,
  setCurrentChatId: (id) => set({ currentChatId: id }),
  addChat: (chat) => set((state) => ({ activeChats: [...state.activeChats, chat] })),
  
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
  setEmails: (emails) => set({ emails }),
  
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
    window.babaAPI?.storeSave({ wikiEntries: get().wikiEntries, connections, settings: get().settings, cases: [] });
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
    window.babaAPI?.storeSave({ wikiEntries: get().wikiEntries, connections: get().connections, settings, cases: [] });
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
  setApprovals: (v) => set({ approvals: v }),
  
  wikiEntries: [],
  setWikiEntries: (v) => { set({ wikiEntries: v }); window.babaAPI?.storeSave({ wikiEntries: v, connections: get().connections, settings: get().settings, cases: [] }); },
  
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
    });
  },
}));
