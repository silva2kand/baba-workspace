import type { LocalModel, Provider, ChatMessage } from '@shared/types';
import { scanAllProviders, chatWithModel, checkModelHealth } from './modelService';

class ModelRouter {
  private providers: Provider[] = [];
  private fallbackOrder: string[] = ['ollama', 'lmstudio', 'jan'];
  private loadBalancingEnabled = true;
  private autoFailoverEnabled = true;
  private lastUsedProvider: string | null = null;

  constructor() {
    this.startHealthCheckLoop();
  }

  async refreshProviders() {
    this.providers = await scanAllProviders();
    return this.providers;
  }

  getAvailableModels(): LocalModel[] {
    return this.providers.flatMap(p => p.models);
  }

  selectBestModel(taskType: string): { provider: string; model: string } {
    const modelPriority: Record<string, string[]> = {
      reasoning: [
        'qwen3.5-9b-claude-4.6-opus-reasoning-distilled',
        'qwen3.5-9b-neo',
        'qwen3.5:latest',
        'llama3.1-8b-instruct',
        'gemma3:12b',
      ],
      coding: [
        'qwen2.5-coder-14b-instruct',
        'omnicoder-9b',
        'qwen3.5-9b',
      ],
      fast: [
        'llama3.2:3b',
        'qwen3.5-4b-claude-4.6-opus-reasoning-distilled',
        'bonsai-8b',
      ],
      research: [
        'qwen3.5-9b-gemini-3.1-pro-reasoning-distill',
        'qwen3.5-9b-neo',
      ],
      finance: [
        'qwen3.5-9b-claude-4.6-opus-reasoning-distilled',
        'gemma4:4.6b',
      ],
    };

    const priorities = modelPriority[taskType] || modelPriority.reasoning;
    const availableModels = this.getAvailableModels();

    for (const modelName of priorities) {
      const found = availableModels.find(m =>
        m.name.toLowerCase().includes(modelName.toLowerCase()) ||
        m.id.toLowerCase().includes(modelName.toLowerCase())
      );

      if (found) {
        return { provider: found.provider, model: found.name };
      }
    }

    // Fallback to first available model
    const anyModel = availableModels[0];
    if (anyModel) {
      return { provider: anyModel.provider, model: anyModel.name };
    }

    throw new Error('No available models found');
  }

  async chatWithFallback(
    messages: ChatMessage[],
    taskType: string = 'reasoning',
    onChunk?: (text: string) => void
  ): Promise<string> {
    const tried: string[] = [];

    for (const providerType of this.fallbackOrder) {
      if (tried.includes(providerType)) continue;

      const provider = this.providers.find(p => p.type === providerType && p.status === 'connected');
      if (!provider) continue;

      try {
        const { model } = this.selectBestModel(taskType);
        console.log(`Trying ${providerType} with model ${model}`);

        // 🧠 Inject Master Memory as top-level system context
        let preparedMessages = [...messages];
        try {
          const memory = await (window as any).babaAPI?.memoryLoad?.();
          if (memory && !messages.some(m => m.role === 'system')) {
            preparedMessages = [
              { 
                id: 'system-memory',
                role: 'system', 
                content: `BABA MASTER MEMORY:\n${memory}\n\nTreat the above as primary user context.`,
                timestamp: Date.now()
              },
              ...messages
            ];
          }
        } catch (memErr) {
          console.warn('Memory injection failed:', memErr);
        }

        return await chatWithModel(providerType, model, preparedMessages, onChunk);
      } catch (error) {
        console.warn(`${providerType} failed, trying next provider:`, error);
        tried.push(providerType);
      }
    }

    throw new Error('All providers failed. Please start Ollama, LM Studio or Jan.');
  }

  private async startHealthCheckLoop() {
    // Wait 5s before first scan so app can fully load without a request storm
    await new Promise(resolve => setTimeout(resolve, 5000));
    while (true) {
      try {
        await this.refreshProviders();
      } catch {}
      // Poll every 2 minutes — the 60s cache in scanAllProviders handles rapid callers
      await new Promise(resolve => setTimeout(resolve, 120_000));
    }
  }
}

export const modelRouter = new ModelRouter();

export async function babaChat(
  messages: ChatMessage[],
  onChunk?: (text: string) => void
) {
  return modelRouter.chatWithFallback(messages, 'reasoning', onChunk);
}



export async function agentChat(
  agentId: string,
  messages: ChatMessage[],
  onChunk?: (text: string) => void
) {
  const taskTypes: Record<string, string> = {
    brain: 'reasoning',
    coder: 'coding',
    research: 'research',
    money: 'finance',
    organizer: 'fast',
    evolver: 'reasoning',
    legal: 'reasoning',
    acct: 'finance',
    supplier: 'finance',
    deals: 'research',
    content: 'fast',
    comms: 'fast',
    pa: 'fast',
  };

  return modelRouter.chatWithFallback(messages, taskTypes[agentId] || 'reasoning', onChunk);
}
