import type { Agent, Task, TaskAssignment } from '@shared/types';
import { chatWithModel } from './modelService';
import { useAppStore } from '../stores/appStore';

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

class Orchestrator {
  private agents: Agent[] = [...BABA_AGENTS];
  private activeTasks: Task[] = [];
  private taskQueue: Task[] = [];
  private running = true;
  private autoCorrectEnabled = true;
  private selfEvolveEnabled = true;

  constructor() {
    this.startOrchestrationLoop();
  }

  assignTask(agentId: string, task: Omit<Task, 'id' | 'agentId' | 'status' | 'createdAt'>): Task {
    const newTask: Task = {
      id: crypto.randomUUID(),
      agentId,
      status: 'queued',
      createdAt: Date.now(),
      ...task,
    };

    this.taskQueue.push(newTask);
    return newTask;
  }

  assignAutoTask(task: Omit<Task, 'id' | 'agentId' | 'status' | 'createdAt'>): TaskAssignment {
    const bestAgent = this.selectBestAgent(task.requiredCapabilities);

    return {
      task: this.assignTask(bestAgent.id, task),
      assignedAgent: bestAgent,
    };
  }

  selectBestAgent(requiredCapabilities: string[]): Agent {
    return this.agents
      .filter(a => requiredCapabilities.every(cap => (a.capabilities || []).includes(cap)))
      .sort((a, b) => {
        if (a.status === 'idle' && b.status !== 'idle') return -1;
        if (b.status === 'idle' && a.status !== 'idle') return 1;
        return 0;
      })[0] || this.agents[0];
  }

  private async startOrchestrationLoop() {
    while (this.running) {
      await this.processTaskQueue();
      await this.monitorAgentStatus();

      if (this.selfEvolveEnabled) {
        await this.selfCorrectionCheck();
      }

      // Sync with Zustand store
      useAppStore.getState().setAgents([...this.agents]);
      useAppStore.getState().setTasks([...this.activeTasks, ...this.taskQueue]);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async processTaskQueue() {
    const idleAgents = this.agents.filter(a => a.status === 'idle');

    for (const agent of idleAgents) {
      const nextTask = this.taskQueue.find(t => t.agentId === agent.id);
      if (!nextTask) continue;

      this.taskQueue = this.taskQueue.filter(t => t.id !== nextTask.id);
      this.activeTasks.push(nextTask);

      agent.status = 'working';
      nextTask.status = 'running';

      this.executeAgentTask(agent, nextTask).finally(() => {
        agent.status = 'idle';
        nextTask.status = 'completed';
        nextTask.completedAt = Date.now();
        this.activeTasks = this.activeTasks.filter(t => t.id !== nextTask.id);
      });
    }
  }

  private async executeAgentTask(agent: Agent, task: Task) {
    try {
      // Real agent execution will happen here using assigned model
      console.log(`Agent ${agent.name} executing task: ${task.title}`);

      task.progress = 0;
      for (let i = 0; i <= 100; i += 5) {
        task.progress = i;
        await new Promise(r => setTimeout(r, 200));
      }

      task.result = { success: true, output: `Completed ${task.title}` };
    } catch (error) {
      task.status = 'failed';
      task.error = String(error);
    }
  }

  private async monitorAgentStatus() {
    // Monitor health & load of all running agents
  }

  private async selfCorrectionCheck() {
    // Check system health, identify issues, self correct
    const correctionTask = this.agents.find(a => a.id === 'evolver');
    if (correctionTask && correctionTask.status === 'idle' && Math.random() < 0.02) {
      // Run self correction every ~50 seconds
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

  toggleAutoCorrect(enabled: boolean) {
    this.autoCorrectEnabled = enabled;
  }

  toggleSelfEvolve(enabled: boolean) {
    this.selfEvolveEnabled = enabled;
  }
}

export const babaOrchestrator = new Orchestrator();

export async function chatWithBaba(
  messages: Array<{ role: string; content: string }>,
  onChunk?: (text: string) => void
): Promise<string> {
  // Baba automatically routes to best model based on query
  return chatWithModel('ollama', 'qwen3.5:latest', messages, onChunk);
}
