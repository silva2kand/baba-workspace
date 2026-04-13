export interface LocalModel {
  id: string;
  name: string;
  provider: 'ollama' | 'lmstudio' | 'jan' | 'openai';
  providerLabel: string;
  size?: string;
  quantization?: string;
  family?: string;
  modified_at?: string;
  details?: Record<string, string>;
  status: 'available' | 'loading' | 'error' | 'disconnected';
}

export interface Provider {
  id: string;
  name: string;
  type: 'ollama' | 'lmstudio' | 'jan' | 'openai' | 'custom';
  baseUrl: string;
  status: 'connected' | 'disconnected' | 'error';
  models: LocalModel[];
  lastChecked: number;
  latency: number;
}

export interface Agent {
  id: string;
  name: string;
  type: 'brain' | 'coder' | 'research' | 'money' | 'solicitor' | 'accountant' | 'organizer' | 'evolver' | 'legal' | 'acct' | 'supplier' | 'deals' | 'content' | 'comms' | 'pa' | 'custom';
  icon: string;
  status: 'idle' | 'working' | 'error' | 'paused';
  currentTask?: string;
  model?: string;
  tasksCompleted: number;
  description: string;
  capabilities?: string[];
  preferredModel?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  agent?: string;
  model?: string;
  timestamp: number;
  status?: 'sending' | 'done' | 'error';
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  model?: string;
  agent?: string;
  createdAt: number;
  updatedAt: number;
}

export interface EmailMessage {
  id: string;
  provider: 'outlook' | 'gmail';
  from: string;
  subject: string;
  preview: string;
  folder: string;
  account: string;
  date: string;
  category?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  isRead: boolean;
  linkedCase?: string;
  linkedRadar?: string;
}

export interface CaseItem {
  id: string;
  title: string;
  domain: string;
  status: 'active' | 'closed' | 'pending';
  risk: 'high' | 'medium' | 'low';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  evidenceCount: number;
  description: string;
  lastUpdated: string;
  emails?: number;
  notes?: number;
}

export interface RadarAlert {
  id: string;
  topic: string;
  signal: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  timestamp: string;
  linkedCase?: string;
  action?: string;
}

export interface ScheduledJob {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  interval: string;
  lastRun: string;
  nextRun: string;
  runsCompleted: number;
}

export interface SelfEvolutionEntry {
  timestamp: string;
  type: 'health' | 'scheduler' | 'self-correction' | 'self-evolution' | 'evidence' | 'sync' | 'model-routing' | 'agent' | 'whatsapp' | 'simulation';
  message: string;
}

export interface LocalApp {
  id: string;
  name: string;
  icon: string;
  path: string;
  type: 'communication' | 'browser' | 'office' | 'system' | 'custom';
  status: 'available' | 'running' | 'not-found';
  connected: boolean;
}

export interface SystemStatus {
  solicitor: { urgent: number };
  accountant: { urgent: number };
  researcher: { active: number };
  outlook: { status: string };
  gmail: { status: string };
  emailOrg: { status: string };
  scheduler: { running: number };
  sync: { status: string; errors: number };
}

export interface EmailScanProgress {
  status: 'RUNNING' | 'PAUSED' | 'DONE' | 'ERROR';
  runNumber: number;
  started: string;
  duration: string;
  stores: number;
  folders: number;
  messages: number;
  currentModel: string;
  urgent: number;
  progress: number;
  error?: string;
}

export interface OrganizedEmail {
  sender: string;
  subject: string;
  category: string;
  categoryColor: string;
}

export interface AppSettings {
  email: {
    outlookClientId: string;
    outlookTenant: string;
    gmailClientId: string;
  };
}

export interface ConnectionData {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
}

export interface ApprovalItem {
  id: string;
  type: 'email' | 'case' | 'document' | 'action';
  title: string;
  description: string;
  preparedBy: string;
  timestamp: string;
  data: any;
  status: 'pending' | 'approved' | 'rejected';
}

export interface WikiEntry {
  id: string;
  title: string;
  category: 'playbook' | 'knowledge' | 'template' | 'context';
  content: string;
  lastUpdated: string;
  tags: string[];
}

export interface Task {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  requiredCapabilities: string[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  progress?: number;
  result?: any;
  error?: string;
}

export interface MiroFishConfig {
  baseUrl: string;
  status: 'connected' | 'disconnected' | 'error';
  lastChecked: number;
  dockerRunning: boolean;
  version?: string;
}

export interface SimulationJob {
  id: string;
  name: string;
  type: 'public_reaction' | 'market_sentiment' | 'policy_outcome' | 'social_dynamics' | 'financial_forecast' | 'crisis_simulation' | 'narrative_test' | 'regulatory_impact' | 'custom';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  inputSource: 'pdf' | 'article' | 'policy_draft' | 'financial_report' | 'scenario_text' | 'url';
  inputContent: string;
  agentCount: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  report?: SimulationReport;
  error?: string;
}

export interface SimulationReport {
  id: string;
  simulationId: string;
  summary: string;
  predictions: PredictionItem[];
  sentimentDistribution: Record<string, number>;
  keyInsights: string[];
  riskFactors: string[];
  opportunities: string[];
  scenarioOutcomes: ScenarioOutcome[];
  agentBehaviors: AgentBehaviorSummary[];
  knowledgeGraph: KnowledgeGraphSummary;
  createdAt: number;
  rawReport?: any;
}

export interface PredictionItem {
  id: string;
  prediction: string;
  confidence: number;
  timeframe: string;
  supportingEvidence: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ScenarioOutcome {
  scenario: string;
  probability: number;
  description: string;
  triggers: string[];
}

export interface AgentBehaviorSummary {
  personaType: string;
  behaviorPattern: string;
  percentage: number;
  keyActions: string[];
}

export interface KnowledgeGraphSummary {
  entityCount: number;
  relationshipCount: number;
  topEntities: string[];
  keyRelationships: string[];
}

export interface TaskAssignment {
  task: Task;
  assignedAgent: Agent;
}

export interface CaseHistoryEntry {
  timestamp: string;
  event: string;
  icon: string;
}

export type SidebarView =
  | 'home' | 'chat' | 'advisor' | 'agents' | 'inbox' | 'organizer' | 'brain'
  | 'cases' | 'radar' | 'approvals' | 'tasks' | 'exo-triage' | 'open-exo'
  | 'kairos' | 'wiki' | 'claws' | 'self-evolving' | 'scheduler' | 'files'
  | 'pc-control' | 'browser' | 'local-apps' | 'models' | 'providers' | 'settings' | 'voice'
  | 'simulation';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationCenterItem {
  id: string;
  title: string;
  body: string;
  icon?: string;
  type: NotificationType;
  timestamp: number;
  read: boolean;
  onClickTarget?: string | null;
}
