import React, { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { useKeyboardShortcuts } from './services/keyboardShortcuts';
import { loadNotificationHistory, setupNotificationListeners } from './services/notificationService';
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
import { OpenExoView } from './components/common/OpenExoView';
import { KairosView } from './components/common/KairosView';
import { WikiView } from './components/common/WikiView';
import { ClawsView } from './components/common/ClawsView';
import { SelfEvolvingView } from './components/common/SelfEvolvingView';
import { PCControlView } from './components/common/PCControlView';
import { BrowserView } from './components/common/BrowserView';
import { ModelsView } from './components/common/ModelsView';
import { BrainView } from './components/common/BrainView';
import { SimulationView } from './components/common/SimulationView';
import { PopupManager } from './components/common/PopupManager';
import ErrorBoundary from './components/common/ErrorBoundary';

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
  brain: BrainView,
  'local-apps': LocalAppsView,
  models: ModelsView,
  simulation: SimulationView,
  providers: ProvidersView,
  settings: SettingsView,
  voice: VoiceView,
};

export default function App() {
  const currentView = useAppStore((s) => s.currentView);
  const contextPanelOpen = useAppStore((s) => s.contextPanelOpen);
  const hydrateStore = useAppStore((s) => s.hydrateStore);

  // Mount global keyboard shortcuts
  useKeyboardShortcuts();

  // Set up notification listeners on app mount
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    loadNotificationHistory().catch((err) => {
      console.error('Failed to load notification history:', err);
    });
    return cleanup;
  }, []);

  // Load persisted store data once on startup
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await window.babaAPI?.storeLoad?.();
        if (!cancelled && data) {
          hydrateStore(data);
        }
      } catch (err) {
        console.error('Failed to hydrate app store:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateStore]);

  const ViewComponent = viewMap[currentView] || HomeView;

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
          <ErrorBoundary name={currentView}>
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
