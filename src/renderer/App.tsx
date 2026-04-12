import React, { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { Sidebar } from './components/sidebar/Sidebar';
import { Topbar } from './components/topbar/Topbar';
import { Footer } from './components/footer/Footer';
import { ContextPanel } from './components/context/ContextPanel';
import { HomeView } from './components/home/HomeView';
import { ChatView } from './components/chat/ChatView';
import { InboxView } from './components/inbox/InboxView';
import { OrganizerView } from './components/organizer/OrganizerView';
import { CasesView } from './components/cases/CasesView';
import { RadarView } from './components/radar/RadarView';
import { SchedulerView } from './components/scheduler/SchedulerView';
import { FilesView } from './components/files/FilesView';
import { LocalAppsView } from './components/localapps/LocalAppsView';
import { AgentsView } from './components/agents/AgentsView';
import { ProvidersView } from './components/common/ProvidersView';
import { SettingsView } from './components/common/SettingsView';
import { VoiceView } from './components/common/VoiceView';
import { AdvisorView } from './components/common/AdvisorView';
import { ApprovalsView } from './components/common/ApprovalsView';
import { TasksView } from './components/common/TasksView';
import { ExoTriageView } from './components/common/ExoTriageView';
import { KairosView } from './components/common/KairosView';
import { WikiView } from './components/common/WikiView';
import { ClawsView } from './components/common/ClawsView';
import { SelfEvolvingView } from './components/common/SelfEvolvingView';
import { PCControlView } from './components/common/PCControlView';
import { BrowserView } from './components/common/BrowserView';
import { ModelsView } from './components/common/ModelsView';
import { OpenExoView } from './components/common/OpenExoView';
import { PopupManager } from './components/common/PopupManager';
import { syncAndOrganize } from './services/emailService';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Renderer crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ padding: 14, borderColor: 'var(--accent-red)', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>⚠ Something went wrong</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>Reload</button>
            <button className="btn btn-secondary btn-sm" onClick={() => this.setState({ error: null })}>Dismiss</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const viewMap: Record<string, React.FC> = {
  home: HomeView,
  chat: ChatView,
  advisor: AdvisorView,
  agents: AgentsView,
  inbox: InboxView,
  organizer: OrganizerView,
  cases: CasesView,
  radar: RadarView,
  approvals: ApprovalsView,
  tasks: TasksView,
  'exo-triage': ExoTriageView,
  'open-exo': OpenExoView,
  kairos: KairosView,
  wiki: WikiView,
  claws: ClawsView,
  'self-evolving': SelfEvolvingView,
  scheduler: SchedulerView,
  files: FilesView,
  'pc-control': PCControlView,
  browser: BrowserView,
  'local-apps': LocalAppsView,
  models: ModelsView,
  providers: ProvidersView,
  settings: SettingsView,
  voice: VoiceView,
};

export default function App() {
  const currentView = useAppStore((s) => s.currentView);
  const contextPanelOpen = useAppStore((s) => s.contextPanelOpen);
  const connections = useAppStore((s) => s.connections);

  const ViewComponent = viewMap[currentView] || HomeView;

  useEffect(() => {
    async function init() {
      try {
        if (window.babaAPI) {
          const storeData = await window.babaAPI.storeLoad();
          useAppStore.getState().hydrateStore(storeData);
        }
      } catch (err) {
        console.error('Store init failed:', err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const hasEmail = connections.some((c) => c.type === 'email' && c.status === 'connected');
    if (!hasEmail) return;

    syncAndOrganize({ maxResults: 50 }).catch(console.error);
    const interval = setInterval(() => {
      const stillHasEmail = useAppStore.getState().connections.some((c) => c.type === 'email' && c.status === 'connected');
      if (stillHasEmail) syncAndOrganize({ maxResults: 50 }).catch(console.error);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [connections]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      {/* Top Bar */}
      <Topbar />

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>
          <ErrorBoundary>
            <ViewComponent />
          </ErrorBoundary>
        </main>

        {/* Context Panel */}
        {contextPanelOpen && <ContextPanel />}
      </div>

      {/* Footer */}
      <Footer />

      {/* Popup Manager */}
      <PopupManager />
    </div>
  );
}
