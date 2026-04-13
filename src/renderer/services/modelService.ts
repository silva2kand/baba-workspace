import type { LocalModel, Provider } from '@shared/types';

const OLLAMA_URL = 'http://localhost:11434';
const LMSTUDIO_URL = 'http://localhost:1234';
const JAN_URL = 'http://localhost:1337';
const MASTER_MEMORY_MAX_CHARS = 12000;

// ── Scan deduplication ────────────────────────────────────────────
// Prevents concurrent scans and enforces a 60-second result cache
let _scanInFlight: Promise<Provider[]> | null = null;
let _scanCache: Provider[] | null = null;
let _scanCacheAt = 0;
const SCAN_CACHE_TTL = 60_000; // ms

async function fetchJSON(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function checkLatency(url: string): Promise<number> {
  const start = Date.now();
  try {
    await fetch(url, { signal: AbortSignal.timeout(5000) });
    return Date.now() - start;
  } catch {
    return -1;
  }
}

async function injectMasterMemory(messages: Array<{ role: string; content: string }>): Promise<Array<{ role: string; content: string }>> {
  try {
    const loader = window.babaAPI?.memoryLoad;
    if (typeof loader !== 'function') return messages;

    const rawMemory = String(await loader() || '').trim();
    if (!rawMemory) return messages;

    const clippedMemory = rawMemory.length > MASTER_MEMORY_MAX_CHARS
      ? rawMemory.slice(rawMemory.length - MASTER_MEMORY_MAX_CHARS)
      : rawMemory;

    const memoryPrefix = [
      'BABA MASTER MEMORY (persistent, local-first, additive-only):',
      '- Treat this as operator-grade context for Silva.',
      '- Do not overwrite memory; only extend additively when approved.',
      '',
      clippedMemory,
    ].join('\n');

    const next = [...messages];
    const systemIndex = next.findIndex((m) => m.role === 'system');
    if (systemIndex >= 0) {
      const original = String(next[systemIndex].content || '').trim();
      next[systemIndex] = {
        ...next[systemIndex],
        content: `${memoryPrefix}\n\n${original}`.trim(),
      };
      return next;
    }

    return [{ role: 'system', content: memoryPrefix }, ...next];
  } catch {
    return messages;
  }
}

export async function scanOllama(): Promise<Provider | null> {
  const latency = await checkLatency(`${OLLAMA_URL}/api/tags`);
  if (latency < 0) return null;

  const data = await fetchJSON(`${OLLAMA_URL}/api/tags`);
  if (!data?.models) return null;

  const models: LocalModel[] = data.models.map((m: any) => ({
    id: `ollama:${m.name}`,
    name: m.name,
    provider: 'ollama' as const,
    providerLabel: 'Ollama',
    size: m.size ? `${(m.size / 1073741824).toFixed(1)} GB` : undefined,
    modified_at: m.modified_at,
    details: m.details,
    family: m.details?.family,
    quantization: m.details?.quantization_level,
    status: 'available' as const,
  }));

  return {
    id: 'ollama',
    name: 'Ollama',
    type: 'ollama',
    baseUrl: OLLAMA_URL,
    status: 'connected',
    models,
    lastChecked: Date.now(),
    latency,
  };
}

export async function scanLMStudio(): Promise<Provider | null> {
  const latency = await checkLatency(`${LMSTUDIO_URL}/v1/models`);
  if (latency < 0) return null;

  const data = await fetchJSON(`${LMSTUDIO_URL}/v1/models`);
  if (!data?.data) return null;

  const models: LocalModel[] = data.data.map((m: any) => ({
    id: `lmstudio:${m.id}`,
    name: m.id,
    provider: 'lmstudio' as const,
    providerLabel: 'LM Studio',
    status: 'available' as const,
  }));

  return {
    id: 'lmstudio',
    name: 'LM Studio',
    type: 'lmstudio',
    baseUrl: LMSTUDIO_URL,
    status: 'connected',
    models,
    lastChecked: Date.now(),
    latency,
  };
}

export async function scanJan(): Promise<Provider | null> {
  const latency = await checkLatency(`${JAN_URL}/v1/models`);
  if (latency < 0) return null;

  const data = await fetchJSON(`${JAN_URL}/v1/models`);
  if (!data?.data) return null;

  const models: LocalModel[] = data.data.map((m: any) => ({
    id: `jan:${m.id}`,
    name: m.id,
    provider: 'jan' as const,
    providerLabel: 'Jan',
    status: 'available' as const,
  }));

  return {
    id: 'jan',
    name: 'Jan',
    type: 'jan',
    baseUrl: JAN_URL,
    status: 'connected',
    models,
    lastChecked: Date.now(),
    latency,
  };
}

export async function scanAllProviders(): Promise<Provider[]> {
  // Return cached result if still fresh
  if (_scanCache && Date.now() - _scanCacheAt < SCAN_CACHE_TTL) {
    return _scanCache;
  }
  // If a scan is already in-flight, wait for that one instead of firing a new one
  if (_scanInFlight) return _scanInFlight;

  _scanInFlight = (async () => {
    try {
      const [ollama, lmstudio, jan] = await Promise.all([
        scanOllama(),
        scanLMStudio(),
        scanJan(),
      ]);
      _scanCache = [ollama, lmstudio, jan].filter((p): p is Provider => p !== null);
      _scanCacheAt = Date.now();
      return _scanCache;
    } finally {
      _scanInFlight = null;
    }
  })();

  return _scanInFlight;
}

export async function getAllModels(): Promise<LocalModel[]> {
  const providers = await scanAllProviders();
  return providers.flatMap((p) => p.models);
}

export async function chatWithModel(
  provider: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  onChunk?: (text: string) => void
): Promise<string> {
  const urlMap: Record<string, string> = {
    ollama: `${OLLAMA_URL}/api/chat`,
    lmstudio: `${LMSTUDIO_URL}/v1/chat/completions`,
    jan: `${JAN_URL}/v1/chat/completions`,
  };

  const url = urlMap[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);

  const mergedMessages = await injectMasterMemory(messages);
  const isOllama = provider === 'ollama';
  const body = isOllama
    ? { model, messages: mergedMessages, stream: true }
    : { model, messages: mergedMessages, stream: true, max_tokens: 4096 };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Model API error: ${response.status} - ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      try {
        const json = JSON.parse(line.replace(/^data: /, ''));
        if (isOllama) {
          if (json.message?.content) {
            fullText += json.message.content;
            onChunk?.(json.message.content);
          }
        } else {
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk?.(delta);
          }
        }
      } catch {}
    }
  }

  return fullText;
}

export async function checkModelHealth(provider: string): Promise<{ healthy: boolean; latency: number }> {
  const urlMap: Record<string, string> = {
    ollama: `${OLLAMA_URL}/api/tags`,
    lmstudio: `${LMSTUDIO_URL}/v1/models`,
    jan: `${JAN_URL}/v1/models`,
  };

  const start = Date.now();
  try {
    const res = await fetch(urlMap[provider] || '', { signal: AbortSignal.timeout(5000) });
    return { healthy: res.ok, latency: Date.now() - start };
  } catch {
    return { healthy: false, latency: -1 };
  }
}
