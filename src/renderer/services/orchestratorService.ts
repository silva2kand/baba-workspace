import type { Agent, Task, TaskAssignment, SimulationJob } from '@shared/types';
import { chatWithModel } from './modelService';
import { useAppStore } from '../stores/appStore';
import { babaChat, agentChat } from './modelRouterService';
import { createSimulation, getSimulationReport, SIMULATION_TEMPLATES } from './mirofishService';
import { notify } from './notificationService';

export const BABA_AGENTS: Agent[] = [
  {
    id: 'brain',
    name: 'Brain Agent',
    type: 'brain',
    description: 'Primary reasoning & orchestration agent',
    status: 'idle',
    icon: '🧠',
    tasksCompleted: 0,
    capabilities: ['reasoning', 'planning', 'analysis', 'orchestration'],
    preferredModel: 'qwen3.5-9b-claude-4.6-opus-reasoning-distilled',
  },
  {
    id: 'coder',
    name: 'Coder Agent',
    type: 'coder',
    description: 'Drafting & code generation specialist',
    status: 'idle',
    icon: '💻',
    tasksCompleted: 0,
    capabilities: ['coding', 'drafting', 'document writing'],
    preferredModel: 'qwen2.5-coder-14b-instruct',
  },
  {
    id: 'research',
    name: 'Research Agent',
    type: 'research',
    description: 'Monitoring & signal detection',
    status: 'idle',
    icon: '🔍',
    tasksCompleted: 0,
    capabilities: ['research', 'monitoring', 'signal detection', 'radar'],
    preferredModel: 'llama3.1-8b-instruct',
  },
  {
    id: 'money',
    name: 'Money Agent',
    type: 'money',
    description: 'Financial & deadline tracking',
    status: 'idle',
    icon: '💰',
    tasksCompleted: 0,
    capabilities: ['finance', 'deadlines', 'calculations', 'accounts'],
    preferredModel: 'qwen3.5-4b-claude-4.6-opus-reasoning-distilled',
  },
  {
    id: 'organizer',
    name: 'Organizer Agent',
    type: 'organizer',
    description: 'Email triage & inbox management',
    status: 'idle',
    icon: '📥',
    tasksCompleted: 0,
    capabilities: ['email triage', 'classification', 'organization'],
    preferredModel: 'llama3.2:3b',
  },
  {
    id: 'evolver',
    name: 'Self Evolver Agent',
    type: 'evolver',
    description: 'System self correction & improvement',
    status: 'idle',
    icon: '⚙️',
    tasksCompleted: 0,
    capabilities: ['self correction', 'system improvement', 'optimization'],
    preferredModel: 'qwen3.5-9b-neo',
  },
];

const CAPABILITY_ALIASES: Record<string, string[]> = {
  reasoning: ['analysis', 'planning', 'orchestration', 'thinking'],
  coding: ['code', 'programming', 'development'],
  drafting: ['writing', 'compose', 'response drafting', 'document writing'],
  research: ['investigation', 'monitoring', 'signal detection', 'radar'],
  finance: ['money', 'accounts', 'accounting', 'calculations', 'deadlines'],
  organization: ['organizer', 'email triage', 'classification', 'inbox'],
  self_correction: ['self correction', 'system improvement', 'optimization'],
  legal: ['solicitor', 'compliance', 'contract review'],
  comms: ['communications', 'whatsapp', 'email response'],
};

function normalizeCapability(raw: string): string {
  const cleaned = raw.trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (!cleaned) return '';

  for (const [canonical, aliases] of Object.entries(CAPABILITY_ALIASES)) {
    if (cleaned === canonical) return canonical;
    if (aliases.map((v) => v.toLowerCase().replace(/[-\s]+/g, '_')).includes(cleaned)) {
      return canonical;
    }
  }
  return cleaned;
}

type AgentSelectionOptions = {
  includeBusy?: boolean;
  allowFallback?: boolean;
};

class Orchestrator {
  private agents: Agent[] = [...BABA_AGENTS];
  private activeTasks: Task[] = [];
  private taskQueue: Task[] = [];
  private taskHistory: Task[] = [];
  private running = true;
  private autoCorrectEnabled = true;
  private selfEvolveEnabled = true;
  private maxParallelAgents = 6;
  private loopIntervalMs = 1000;
  private taskStallMs = 90_000;
  private taskTimeoutMs = 8 * 60 * 1000;
  private healthNoteIntervalMs = 30_000;
  private taskProgressMeta = new Map<string, { lastProgress: number; lastUpdate: number; startedAt: number }>();
  private agentFailureCounts = new Map<string, number>();
  private agentCooldownUntil = new Map<string, number>();
  private lastHealthNoteAt = 0;

  constructor() {
    this.startOrchestrationLoop();
  }

  private syncStore() {
    useAppStore.getState().setAgents([...this.agents]);
    useAppStore.getState().setTasks([...this.activeTasks, ...this.taskQueue, ...this.taskHistory]);
  }

  private archiveTask(task: Task) {
    const idx = this.taskHistory.findIndex((t) => t.id === task.id);
    const snapshot = { ...task };
    if (idx >= 0) {
      this.taskHistory[idx] = snapshot;
    } else {
      this.taskHistory.unshift(snapshot);
    }
    if (this.taskHistory.length > 300) {
      this.taskHistory.length = 300;
    }
  }

  private normalizeCapabilities(capabilities: string[]): string[] {
    return Array.from(new Set((capabilities || []).map(normalizeCapability).filter(Boolean)));
  }

  private getAgentLoad(agentId: string) {
    const active = this.activeTasks.filter((t) => t.agentId === agentId && t.status === 'running').length;
    const queued = this.taskQueue.filter((t) => t.agentId === agentId).length;
    return active + queued;
  }

  private getCapabilityCoverage(agent: Agent, requiredCapabilities: string[]) {
    const required = this.normalizeCapabilities(requiredCapabilities);
    if (required.length === 0) return { matched: 1, total: 1, coverage: 1 };

    const agentCaps = new Set(this.normalizeCapabilities(agent.capabilities || []));
    let matched = 0;
    for (const cap of required) {
      if (agentCaps.has(cap)) matched += 1;
    }
    return {
      matched,
      total: required.length,
      coverage: matched / required.length,
    };
  }

  private scoreAgentForTask(agent: Agent, requiredCapabilities: string[], includeBusy: boolean) {
    if (agent.status === 'error') return -9999;
    if (agent.status === 'paused') return -500;
    if (!includeBusy && agent.status !== 'idle') return -1000;

    const coverage = this.getCapabilityCoverage(agent, requiredCapabilities);
    const load = this.getAgentLoad(agent.id);
    const idleBonus = agent.status === 'idle' ? 1.25 : 0;
    const completionBonus = Math.min(1, (agent.tasksCompleted || 0) / 200);
    const modelBonus = agent.preferredModel ? 0.25 : 0;
    const loadPenalty = load * 0.45;

    let score = coverage.coverage * 8 + idleBonus + completionBonus + modelBonus - loadPenalty;
    if (coverage.coverage === 1) score += 1.5;
    if (coverage.matched === 0 && requiredCapabilities.length > 0) score -= 2.5;
    return score;
  }

  private noteTaskProgress(task: Task) {
    const existing = this.taskProgressMeta.get(task.id);
    const progress = Math.max(0, Math.min(100, task.progress ?? 0));
    const now = Date.now();

    if (!existing) {
      this.taskProgressMeta.set(task.id, { lastProgress: progress, lastUpdate: now, startedAt: now });
      return;
    }
    if (progress > existing.lastProgress) {
      this.taskProgressMeta.set(task.id, { ...existing, lastProgress: progress, lastUpdate: now });
    }
  }

  private markTaskFailed(task: Task, reason: string) {
    if (task.status !== 'running') return;
    task.status = 'failed';
    task.error = reason;
    task.completedAt = Date.now();
    task.progress = Math.min(task.progress ?? 0, 99);
    this.archiveTask(task);
    this.activeTasks = this.activeTasks.filter((t) => t.id !== task.id);
    this.taskProgressMeta.delete(task.id);

    const agent = this.agents.find((a) => a.id === task.agentId);
    if (agent && agent.status === 'working') {
      agent.status = 'idle';
      agent.currentTask = undefined;
    }
  }

  assignTask(agentId: string, task: Omit<Task, 'id' | 'agentId' | 'status' | 'createdAt'>): Task {
    const normalizedCapabilities = this.normalizeCapabilities(task.requiredCapabilities || []);
    const newTask: Task = {
      id: crypto.randomUUID(),
      agentId,
      status: 'queued',
      createdAt: Date.now(),
      progress: 0,
      ...task,
      requiredCapabilities: normalizedCapabilities,
    };

    this.taskQueue.push(newTask);
    this.syncStore();
    return newTask;
  }

  assignAutoTask(task: Omit<Task, 'id' | 'agentId' | 'status' | 'createdAt'>): TaskAssignment {
    const bestAgent = this.selectBestAgent(task.requiredCapabilities, {
      includeBusy: true,
      allowFallback: true,
    });

    if (!bestAgent) {
      throw new Error('No suitable agent found for the task');
    }

    return {
      task: this.assignTask(bestAgent.id, task),
      assignedAgent: bestAgent,
    };
  }

  assignSimulationTask(simulationConfig: {
    name?: string;
    type?: string;
    inputSource?: string;
    inputContent: string;
    agentCount?: number;
    templateId?: string;
  }): Task {
    const simulationTask: Task = {
      id: crypto.randomUUID(),
      agentId: 'research', // Research agent handles simulations
      title: `[SIMULATION] ${simulationConfig.name || 'Auto Simulation'}`,
      description: JSON.stringify(simulationConfig),
      requiredCapabilities: ['research', 'monitoring'],
      status: 'queued',
      createdAt: Date.now(),
      progress: 0,
    };

    this.taskQueue.push(simulationTask);
    this.syncStore();
    return simulationTask;
  }

  assignAutoTasks(tasks: Array<Omit<Task, 'id' | 'agentId' | 'status' | 'createdAt'>>): TaskAssignment[] {
    const results: TaskAssignment[] = [];
    for (const task of tasks) {
      results.push(this.assignAutoTask(task));
    }
    return results;
  }

  selectBestAgent(requiredCapabilities: string[], options: AgentSelectionOptions = {}): Agent | undefined {
    const includeBusy = options.includeBusy ?? false;
    const allowFallback = options.allowFallback ?? true;
    const required = this.normalizeCapabilities(requiredCapabilities || []);

    const eligibleAgents = this.agents.filter((agent) => {
      if (agent.status === 'error') return false;
      if (agent.status === 'paused') return false;
      if (!includeBusy) return agent.status === 'idle';
      return agent.status === 'idle' || agent.status === 'working';
    });

    if (eligibleAgents.length === 0) {
      console.warn('No eligible agents available');
      return undefined;
    }

    let bestAgent: Agent | undefined;
    let bestScore = -Infinity;

    for (const agent of eligibleAgents) {
      const score = this.scoreAgentForTask(agent, required, includeBusy);
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    if (!bestAgent) return undefined;

    if (!allowFallback && required.length > 0) {
      const coverage = this.getCapabilityCoverage(bestAgent, required);
      if (coverage.matched === 0) return undefined;
    }

    return bestAgent;
  }

  private async startOrchestrationLoop() {
    while (this.running) {
      await this.processTaskQueue();
      await this.monitorAgentStatus();

      if (this.selfEvolveEnabled) {
        await this.selfCorrectionCheck();
      }

      // Sync with Zustand store
      this.syncStore();

      await new Promise(resolve => setTimeout(resolve, this.loopIntervalMs));
    }
  }

  private async processTaskQueue() {
    const runningNow = this.activeTasks.filter((t) => t.status === 'running').length;
    const parallelLimit = Math.min(this.maxParallelAgents, this.agents.length);
    const availableSlots = Math.max(0, parallelLimit - runningNow);
    if (availableSlots === 0) return;

    const idleAgents = this.agents.filter((a) => a.status === 'idle').slice(0, availableSlots);

    for (const agent of idleAgents) {
      const nextTaskIdx = this.taskQueue.findIndex((t) => t.agentId === agent.id);
      if (nextTaskIdx === -1) continue;

      const [nextTask] = this.taskQueue.splice(nextTaskIdx, 1);
      if (!nextTask) continue;

      this.activeTasks.push(nextTask);

      agent.status = 'working';
      agent.currentTask = nextTask.title;
      nextTask.status = 'running';
      nextTask.progress = Math.max(nextTask.progress ?? 0, 1);
      this.noteTaskProgress(nextTask);

      this.executeAgentTask(agent, nextTask).finally(() => {
        if (nextTask.status === 'running') {
          nextTask.status = 'completed';
        }
        if (!nextTask.completedAt) {
          nextTask.completedAt = Date.now();
        }
        if (agent.status === 'working') {
          agent.status = 'idle';
          agent.currentTask = undefined;
        }
        this.taskProgressMeta.delete(nextTask.id);
        this.archiveTask(nextTask);
        this.activeTasks = this.activeTasks.filter(t => t.id !== nextTask.id);
        this.syncStore();
      });
    }
  }

  private async executeAgentTask(agent: Agent, task: Task) {
    try {
      if (task.status !== 'running') return;

      // Check if this is a simulation task
      if (task.title.startsWith('[SIMULATION]')) {
        await this.executeSimulationTask(task);
        return;
      }

      // Build agent task prompt based on task title and description
      const systemPrompt = `You are ${agent.name} (${agent.type} agent).
Your capabilities: ${(agent.capabilities || []).join(', ')}.
Execute the assigned task with expertise and precision.
Respond in a structured format with clear results.`;

      const userPrompt = task.description
        ? `Task: ${task.title}\n\nDetails: ${task.description}`
        : `Task: ${task.title}`;

      const messages: import('@shared/types').ChatMessage[] = [
        { id: 'system-prompt', role: 'system', content: systemPrompt, timestamp: Date.now() },
        { id: 'user-task', role: 'user', content: userPrompt, timestamp: Date.now() },
      ];

      console.log(`Agent ${agent.name} executing task: ${task.title}`);
      task.progress = 10;
      this.noteTaskProgress(task);

      // Stream the response with progress updates
      let accumulatedResponse = '';
      await agentChat(agent.id, messages, (chunk: string) => {
        if (task.status !== 'running') return;
        accumulatedResponse += chunk;
        // Update progress as response streams in (10% -> 90%)
        task.progress = Math.min(90, 10 + Math.floor(accumulatedResponse.length / 100));
        this.noteTaskProgress(task);
      });

      if (task.status !== 'running') {
        return;
      }

      task.progress = 100;
      task.result = {
        success: true,
        output: accumulatedResponse,
        agentId: agent.id,
        agentName: agent.name,
        completedAt: new Date().toISOString(),
      };

      // Store important results in Brain Index for future reference
      try {
        if (accumulatedResponse.length > 50) {
          // Only store meaningful results
          await window.babaAPI.brainIngest(
            `Task: ${task.title}`,
            'agent_task',
            accumulatedResponse,
            agent.id
          );
        }
      } catch (err) {
        console.error('Failed to store task result in Brain:', err);
      }

      // Increment agent's completed task counter
      agent.tasksCompleted = (agent.tasksCompleted || 0) + 1;
      this.agentFailureCounts.set(agent.id, 0);
      this.agentCooldownUntil.delete(agent.id);

      // Send notification for completed task
      notify.success('Task Completed', `${agent.name} finished: ${task.title}`, {
        onClickTarget: 'tasks',
      });
    } catch (error) {
      if (task.status !== 'running') return;
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      console.error(`Agent ${agent.name} failed task: ${task.title}`, error);

      // Send notification for failed task
      notify.error('Agent Error', `${agent.name} failed: ${task.title}`, {
        onClickTarget: 'agents',
      });

      // Count failures and only hard-fail the agent after repeated issues.
      const failureCount = (this.agentFailureCounts.get(agent.id) || 0) + 1;
      this.agentFailureCounts.set(agent.id, failureCount);

      if (failureCount >= 3) {
        agent.status = 'error';
        this.agentCooldownUntil.set(agent.id, Date.now() + 45_000);
        useAppStore.getState().updateAgentStatus(agent.id, 'error', task.title);
        notify.warning(
          'Agent Cooling Down',
          `${agent.name} hit repeated failures and will auto-recover shortly.`,
          { onClickTarget: 'agents' },
        );
      } else {
        agent.status = 'idle';
        agent.currentTask = undefined;
      }
    }
  }

  private async executeSimulationTask(task: Task) {
    try {
      if (task.status !== 'running') return;
      task.progress = 10;
      this.noteTaskProgress(task);

      // Parse simulation config from task description
      const simulationConfig = task.description ? JSON.parse(task.description) : {};
      const template = SIMULATION_TEMPLATES.find(t => t.id === simulationConfig.templateId);

      const job = {
        name: simulationConfig.name || template?.name || 'Automated Simulation',
        type: simulationConfig.type || template?.type || 'custom',
        inputSource: simulationConfig.inputSource || template?.inputSource || 'scenario_text',
        inputContent: simulationConfig.inputContent || template?.inputContent || task.title,
        agentCount: simulationConfig.agentCount || template?.agentCount || 5000,
      };

      task.progress = 30;
      this.noteTaskProgress(task);

      // Create simulation via MiroFish
      const newSim = await createSimulation(job);

      task.progress = 50;
      this.noteTaskProgress(task);

      // Poll for completion (with timeout)
      const maxWaitTime = 10 * 60 * 1000; // 10 minutes
      const pollInterval = 5000; // 5 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        if (task.status !== 'running') return;
        await new Promise(r => setTimeout(r, pollInterval));
        task.progress = Math.min(90, 50 + Math.floor((Date.now() - startTime) / maxWaitTime * 40));
        this.noteTaskProgress(task);

        // Check status via the store - the SimulationView handles polling
        const sim = useAppStore.getState().simulations.find(s => s.id === newSim.id);
        if (sim?.status === 'completed') {
          task.progress = 100;
          this.noteTaskProgress(task);
          const report = useAppStore.getState().simulationReports.find(r => r.simulationId === newSim.id);
          task.result = {
            success: true,
            simulationId: newSim.id,
            report,
            summary: report?.summary || 'Simulation completed',
          };

          // Store in Brain Index and Master Memory
          try {
            if (report) {
              await window.babaAPI.brainIngest(
                `Simulation: ${report.summary}`,
                'simulation',
                JSON.stringify(report, null, 2),
                'mirofish'
              );
              await window.babaAPI.memoryAppend(
                `[Simulation Result] ${report.summary} | Key insights: ${report.keyInsights.join('; ')} | Risks: ${report.riskFactors.join('; ')}`
              );
              useAppStore.getState().addEvolutionEntry({
                timestamp: new Date().toISOString(),
                type: 'simulation',
                message: `Simulation completed via orchestrator: ${report.summary}`,
              });

              // Send notification for completed simulation
              notify.success('Simulation Complete', report.summary, {
                onClickTarget: 'simulation',
              });
            }
          } catch (err) {
            console.error('Failed to store simulation result:', err);
          }

          const agent = this.agents.find((a) => a.id === task.agentId);
          if (agent) {
            agent.tasksCompleted = (agent.tasksCompleted || 0) + 1;
            this.agentFailureCounts.set(agent.id, 0);
            this.agentCooldownUntil.delete(agent.id);
          }

          return;
        }

        if (sim?.status === 'failed' || sim?.status === 'cancelled') {
          throw new Error(`Simulation ${sim.status}`);
        }
      }

      throw new Error('Simulation timeout');
    } catch (error) {
      if (task.status === 'running') {
        task.status = 'failed';
        task.error = String(error);
      }
      notify.error('Simulation Failed', String(error), { onClickTarget: 'simulation' });
    }
  }

  private async monitorAgentStatus() {
    const now = Date.now();

    // Detect stalled/timed-out tasks and fail them safely.
    for (const task of [...this.activeTasks]) {
      if (task.status !== 'running') continue;

      const meta = this.taskProgressMeta.get(task.id);
      const ageMs = now - task.createdAt;
      if (!meta) {
        this.noteTaskProgress(task);
        continue;
      }

      const idleForMs = now - meta.lastUpdate;
      if (ageMs > this.taskTimeoutMs) {
        this.markTaskFailed(task, 'Task timed out under orchestration control.');
        notify.warning('Task Timeout', `${task.title} timed out and was safely stopped.`, {
          onClickTarget: 'tasks',
        });
        continue;
      }

      if (idleForMs > this.taskStallMs && (task.progress ?? 0) < 95) {
        this.markTaskFailed(task, 'Task stalled with no progress update.');
        notify.warning('Task Stalled', `${task.title} stalled and was marked failed.`, {
          onClickTarget: 'tasks',
        });
      }
    }

    // Recover agents from cooldown after repeated failures.
    for (const agent of this.agents) {
      if (agent.status !== 'error') continue;
      const cooldownUntil = this.agentCooldownUntil.get(agent.id) || 0;
      if (cooldownUntil > now) continue;

      agent.status = 'idle';
      agent.currentTask = undefined;
      this.agentFailureCounts.set(agent.id, 0);
      this.agentCooldownUntil.delete(agent.id);
      notify.info('Agent Recovered', `${agent.name} is back online and ready for tasks.`, {
        onClickTarget: 'agents',
      });
    }
  }

  private async selfCorrectionCheck() {
    if (!this.autoCorrectEnabled) return;
    const now = Date.now();
    if (now - this.lastHealthNoteAt < this.healthNoteIntervalMs) return;
    this.lastHealthNoteAt = now;

    // Rebalance queued tasks away from unhealthy/overloaded agents.
    let rebalanced = 0;
    for (const task of this.taskQueue) {
      const assigned = this.agents.find((a) => a.id === task.agentId);
      const assignedLoad = this.getAgentLoad(task.agentId);
      const unhealthy = !assigned || assigned.status === 'error' || assigned.status === 'paused';
      const overloaded = assignedLoad > 2;
      if (!unhealthy && !overloaded) continue;

      const better = this.selectBestAgent(task.requiredCapabilities, {
        includeBusy: true,
        allowFallback: true,
      });
      if (better && better.id !== task.agentId) {
        task.agentId = better.id;
        rebalanced += 1;
      }
    }

    // Optional periodic health log in evolution stream.
    const running = this.activeTasks.filter((t) => t.status === 'running').length;
    const queued = this.taskQueue.length;
    const failedRecent = this.taskHistory.slice(0, 50).filter((t) => t.status === 'failed').length;
    useAppStore.getState().addEvolutionEntry({
      timestamp: new Date().toISOString(),
      type: 'self-correction',
      message: `Orchestrator health: running=${running}, queued=${queued}, recentFailed=${failedRecent}, rebalanced=${rebalanced}`,
    });

    const correctionTask = this.agents.find(a => a.id === 'evolver');
    if (correctionTask && correctionTask.status === 'idle' && queued > this.agents.length) {
      useAppStore.getState().addEvolutionEntry({
        timestamp: new Date().toISOString(),
        type: 'self-evolution',
        message: 'Self Evolver queued optimization suggestions for load balancing.',
      });
    }
  }

  getAgents(): Agent[] {
    return this.agents;
  }

  getActiveTasks(): Task[] {
    return this.activeTasks;
  }

  getQueuedTasks(): Task[] {
    return this.taskQueue;
  }

  getAllTasks(): Task[] {
    return [...this.activeTasks, ...this.taskQueue, ...this.taskHistory];
  }

  toggleAutoCorrect(enabled: boolean) {
    this.autoCorrectEnabled = enabled;
  }

  toggleSelfEvolve(enabled: boolean) {
    this.selfEvolveEnabled = enabled;
  }

  // Execute a task immediately and return the result (for UI-triggered tasks)
  async executeTaskDirectly(
    taskInput: Omit<Task, 'id' | 'agentId' | 'status' | 'createdAt'>
  ): Promise<{ task: Task; agent: Agent; result: string }> {
    const assignedAgent = this.selectBestAgent(taskInput.requiredCapabilities, {
      includeBusy: false,
      allowFallback: true,
    });
    if (!assignedAgent) {
      const queued = this.assignAutoTask(taskInput);
      return {
        task: queued.task,
        agent: queued.assignedAgent,
        result: 'No idle agent available right now. Task queued for execution.',
      };
    }

    const task: Task = {
      id: crypto.randomUUID(),
      agentId: assignedAgent.id,
      status: 'running',
      createdAt: Date.now(),
      ...taskInput,
    };

    this.activeTasks.push(task);
    assignedAgent.status = 'working';
    assignedAgent.currentTask = task.title;
    task.progress = 1;
    this.noteTaskProgress(task);
    this.syncStore();

    console.log(`Executing task directly: ${task.title} → ${assignedAgent.name}`);

    try {
      // Execute the task immediately
      await this.executeAgentTask(assignedAgent, task);
    } finally {
      if (task.status === 'running') {
        task.status = 'completed';
      }
      if (!task.completedAt) {
        task.completedAt = Date.now();
      }
      if (assignedAgent.status === 'working') {
        assignedAgent.status = 'idle';
        assignedAgent.currentTask = undefined;
      }
      this.taskProgressMeta.delete(task.id);
      this.archiveTask(task);
      this.activeTasks = this.activeTasks.filter((t) => t.id !== task.id);
      this.syncStore();
    }

    return {
      task,
      agent: assignedAgent,
      result: task.result?.output || 'Task completed with no output',
    };
  }

  // Get orchestrator status for debugging
  getStatus() {
    return {
      running: this.running,
      agents: this.agents.length,
      activeTasks: this.activeTasks.length,
      queuedTasks: this.taskQueue.length,
      maxParallelAgents: Math.min(this.maxParallelAgents, this.agents.length),
      agentLoads: this.agents.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        load: this.getAgentLoad(a.id),
        failures: this.agentFailureCounts.get(a.id) || 0,
      })),
      autoCorrectEnabled: this.autoCorrectEnabled,
      selfEvolveEnabled: this.selfEvolveEnabled,
    };
  }
}

export const babaOrchestrator = new Orchestrator();


export async function chatWithBaba(
  messages: Array<{ role: string; content: string }>,
  onChunk?: (text: string) => void
): Promise<string> {
  // Use the unified router instead of hardcoded Ollama. 
  // This enables Master Memory injection and automatic failover.
  return babaChat(messages as any, onChunk);
}
