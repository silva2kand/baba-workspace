import type { MiroFishConfig, SimulationJob, SimulationReport } from '@shared/types';

const DEFAULT_MIROFISH_URL = 'http://localhost:8000';

// ── Configuration ──────────────────────────────────────────────────

let mirofishConfig: MiroFishConfig = {
  baseUrl: DEFAULT_MIROFISH_URL,
  status: 'disconnected',
  lastChecked: 0,
  dockerRunning: false,
};

export function getMiroFishConfig(): MiroFishConfig {
  return { ...mirofishConfig };
}

export function setMiroFishConfig(config: Partial<MiroFishConfig>): MiroFishConfig {
  mirofishConfig = { ...mirofishConfig, ...config };
  return { ...mirofishConfig };
}

// ── HTTP Client Helpers ────────────────────────────────────────────

async function miroFishRequest(path: string, options: RequestInit = {}) {
  const url = `${mirofishConfig.baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MiroFish API error (${res.status}): ${text}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Health Check ───────────────────────────────────────────────────

export async function checkMiroFishHealth(baseUrl?: string): Promise<MiroFishConfig> {
  const testUrl = baseUrl || mirofishConfig.baseUrl;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(`${testUrl}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      mirofishConfig = {
        baseUrl: testUrl,
        status: 'connected',
        lastChecked: Date.now(),
        dockerRunning: true,
        version: data.version,
      };
    } else {
      mirofishConfig = {
        baseUrl: testUrl,
        status: 'error',
        lastChecked: Date.now(),
        dockerRunning: false,
      };
    }
  } catch {
    mirofishConfig = {
      baseUrl: testUrl,
      status: 'disconnected',
      lastChecked: Date.now(),
      dockerRunning: false,
    };
  }
  return { ...mirofishConfig };
}

// ── Simulation Management ──────────────────────────────────────────

export async function createSimulation(job: Omit<SimulationJob, 'id' | 'status' | 'progress' | 'createdAt'>): Promise<SimulationJob> {
  const simulationJob: SimulationJob = {
    ...job,
    id: crypto.randomUUID(),
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
  };

  await miroFishRequest('/api/simulations', {
    method: 'POST',
    body: JSON.stringify({
      id: simulationJob.id,
      name: simulationJob.name,
      type: simulationJob.type,
      input_source: simulationJob.inputSource,
      input_content: simulationJob.inputContent,
      agent_count: simulationJob.agentCount,
    }),
  });

  return simulationJob;
}

export async function getSimulationStatus(simulationId: string): Promise<SimulationJob> {
  const data = await miroFishRequest(`/api/simulations/${simulationId}/status`);
  return {
    id: simulationId,
    name: data.name || 'Unknown',
    type: data.type || 'custom',
    status: mapSimulationStatus(data.status),
    inputSource: 'scenario_text',
    inputContent: '',
    agentCount: data.agent_count || 1000,
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    startedAt: data.started_at ? new Date(data.started_at).getTime() : undefined,
    completedAt: data.completed_at ? new Date(data.completed_at).getTime() : undefined,
    progress: data.progress || 0,
    error: data.error,
  };
}

export async function getSimulationReport(simulationId: string): Promise<SimulationReport> {
  const data = await miroFishRequest(`/api/simulations/${simulationId}/report`);
  return parseReport(simulationId, data);
}

export async function cancelSimulation(simulationId: string): Promise<boolean> {
  try {
    await miroFishRequest(`/api/simulations/${simulationId}/cancel`, { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

export async function listSimulations(): Promise<SimulationJob[]> {
  const data = await miroFishRequest('/api/simulations');
  return (data.simulations || []).map((s: any) => ({
    id: s.id,
    name: s.name || 'Unknown',
    type: s.type || 'custom',
    status: mapSimulationStatus(s.status),
    inputSource: 'scenario_text',
    inputContent: '',
    agentCount: s.agent_count || 1000,
    createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
    startedAt: s.started_at ? new Date(s.started_at).getTime() : undefined,
    completedAt: s.completed_at ? new Date(s.completed_at).getTime() : undefined,
    progress: s.progress || 0,
    error: s.error,
    report: s.report ? parseReport(s.id, s.report) : undefined,
  }));
}

// ── Knowledge Graph ────────────────────────────────────────────────

export async function buildKnowledgeGraph(content: string, sourceType: string): Promise<any> {
  return miroFishRequest('/api/graph/build', {
    method: 'POST',
    body: JSON.stringify({
      content,
      source_type: sourceType,
    }),
  });
}

export async function queryKnowledgeGraph(query: string): Promise<any> {
  return miroFishRequest('/api/graph/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

// ── Scenario Templates ─────────────────────────────────────────────

export const SIMULATION_TEMPLATES = [
  {
    id: 'hmrc_dispute',
    name: 'HMRC Dispute Outcome',
    type: 'policy_outcome' as const,
    description: 'Simulate HMRC response to a tax dispute, including appeal pathways and settlement likelihood.',
    inputSource: 'scenario_text' as const,
    inputContent: 'HMRC has raised questions about VAT return discrepancies over the past 3 quarters. The business believes the claims are legitimate but HMRC may disagree. Simulate possible outcomes including penalties, appeals, and settlement.',
    agentCount: 5000,
  },
  {
    id: 'tenant_behaviour',
    name: 'Tenant Behaviour Prediction',
    type: 'social_dynamics' as const,
    description: 'Predict tenant behaviour in response to rent changes, eviction notices, or property conditions.',
    inputSource: 'scenario_text' as const,
    inputContent: 'Commercial tenant has been late on rent 2 out of last 6 months. Property needs repairs. Simulate tenant response to rent increase notice, including likelihood of vacating, negotiating, or disputing.',
    agentCount: 3000,
  },
  {
    id: 'supplier_negotiation',
    name: 'Supplier Negotiation Strategy',
    type: 'market_sentiment' as const,
    description: 'Test supplier reaction to renegotiation requests and find optimal strategy.',
    inputSource: 'scenario_text' as const,
    inputContent: 'Major supplier has increased prices 15% annually for 3 years. Contract renewal in 60 days. Simulate supplier response to 20% price reduction request, including counter-offers and walk-away scenarios.',
    agentCount: 2000,
  },
  {
    id: 'legal_dispute',
    name: 'Legal Dispute Pathways',
    type: 'policy_outcome' as const,
    description: 'Simulate legal dispute outcomes including settlement, court, and alternative resolution paths.',
    inputSource: 'scenario_text' as const,
    inputContent: 'Contract dispute with former business partner over profit sharing. £50k at stake. Both sides have informal evidence. Simulate pathways: settlement, mediation, court action, including costs and timelines.',
    agentCount: 4000,
  },
  {
    id: 'financial_risk',
    name: 'Financial Risk Scenario',
    type: 'financial_forecast' as const,
    description: 'Forecast financial outcomes under stress scenarios including cashflow, market changes, and unexpected costs.',
    inputSource: 'scenario_text' as const,
    inputContent: 'Business has 3 months cash runway. Two major clients representing 40% revenue have contracts expiring. One property needs £15k emergency repairs. Simulate cashflow scenarios and survival strategies.',
    agentCount: 5000,
  },
  {
    id: 'public_reaction',
    name: 'Public Reaction to Policy',
    type: 'public_reaction' as const,
    description: 'Simulate public and social media reaction to a policy change or announcement.',
    inputSource: 'scenario_text' as const,
    inputContent: 'Local council proposes increasing business rates by 8% to fund infrastructure. Simulate business community reaction, social media sentiment, potential protests or petitions, and media coverage.',
    agentCount: 10000,
  },
  {
    id: 'crisis_management',
    name: 'Crisis Management Simulation',
    type: 'crisis_simulation' as const,
    description: 'Test business resilience and response to unexpected crisis events.',
    inputSource: 'scenario_text' as const,
    inputContent: 'Major data breach exposed customer information. Regulatory notification required within 72 hours. Simulate stakeholder reactions, reputational damage, regulatory response, and recovery strategies.',
    agentCount: 8000,
  },
];

// ── Helpers ────────────────────────────────────────────────────────

function mapSimulationStatus(status: string): SimulationJob['status'] {
  switch (status) {
    case 'queued': return 'queued';
    case 'running': return 'running';
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return 'queued';
  }
}

function parseReport(simulationId: string, data: any): SimulationReport {
  return {
    id: data.id || crypto.randomUUID(),
    simulationId,
    summary: data.summary || 'No summary available.',
    predictions: (data.predictions || []).map((p: any, i: number) => ({
      id: `pred_${i}`,
      prediction: p.prediction || '',
      confidence: p.confidence || 0,
      timeframe: p.timeframe || 'unknown',
      supportingEvidence: p.evidence || '',
      impact: p.impact || 'medium',
    })),
    sentimentDistribution: data.sentiment || {},
    keyInsights: data.key_insights || [],
    riskFactors: data.risks || [],
    opportunities: data.opportunities || [],
    scenarioOutcomes: (data.scenarios || []).map((s: any) => ({
      scenario: s.name || '',
      probability: s.probability || 0,
      description: s.description || '',
      triggers: s.triggers || [],
    })),
    agentBehaviors: (data.agent_behaviors || []).map((b: any) => ({
      personaType: b.persona_type || '',
      behaviorPattern: b.behavior_pattern || '',
      percentage: b.percentage || 0,
      keyActions: b.key_actions || [],
    })),
    knowledgeGraph: {
      entityCount: data.knowledge_graph?.entity_count || 0,
      relationshipCount: data.knowledge_graph?.relationship_count || 0,
      topEntities: data.knowledge_graph?.top_entities || [],
      keyRelationships: data.knowledge_graph?.key_relationships || [],
    },
    createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    rawReport: data,
  };
}
