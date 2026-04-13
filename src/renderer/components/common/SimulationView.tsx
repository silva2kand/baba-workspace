import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { SIMULATION_TEMPLATES, checkMiroFishHealth, createSimulation, getSimulationStatus, getSimulationReport, cancelSimulation, listSimulations } from '../../services/mirofishService';
import type { SimulationJob, SimulationReport, MiroFishConfig } from '@shared/types';

const SIMULATION_TYPE_LABELS: Record<string, string> = {
  public_reaction: 'Public Reaction',
  market_sentiment: 'Market Sentiment',
  policy_outcome: 'Policy Outcome',
  social_dynamics: 'Social Dynamics',
  financial_forecast: 'Financial Forecast',
  crisis_simulation: 'Crisis Simulation',
  narrative_test: 'Narrative Test',
  regulatory_impact: 'Regulatory Impact',
  custom: 'Custom',
};

const SIMULATION_TYPE_COLORS: Record<string, string> = {
  public_reaction: '#ec4899',
  market_sentiment: '#f59e0b',
  policy_outcome: '#a855f7',
  social_dynamics: '#06b6d4',
  financial_forecast: '#22c55e',
  crisis_simulation: '#ef4444',
  narrative_test: '#818cf8',
  regulatory_impact: '#f97316',
  custom: '#64748b',
};

const INPUT_SOURCE_LABELS: Record<string, string> = {
  pdf: 'PDF Document',
  article: 'News Article',
  policy_draft: 'Policy Draft',
  financial_report: 'Financial Report',
  scenario_text: 'Scenario Text',
  url: 'URL',
};

export function SimulationView() {
  const miroFishConfig = useAppStore((s) => s.miroFishConfig);
  const setMiroFishConfig = useAppStore((s) => s.setMiroFishConfig);
  const simulations = useAppStore((s) => s.simulations);
  const setSimulations = useAppStore((s) => s.setSimulations);
  const addSimulation = useAppStore((s) => s.addSimulation);
  const updateSimulation = useAppStore((s) => s.updateSimulation);
  const simulationReports = useAppStore((s) => s.simulationReports);
  const addSimulationReport = useAppStore((s) => s.addSimulationReport);
  const activeSimulation = useAppStore((s) => s.activeSimulation);
  const setActiveSimulation = useAppStore((s) => s.setActiveSimulation);
  const addEvolutionEntry = useAppStore((s) => s.addEvolutionEntry);

  const [showNewSimulation, setShowNewSimulation] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<SimulationJob['type']>('custom');
  const [customInputSource, setCustomInputSource] = useState<SimulationJob['inputSource']>('scenario_text');
  const [customContent, setCustomContent] = useState('');
  const [customAgentCount, setCustomAgentCount] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  // Check MiroFish health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  // Poll running simulations
  useEffect(() => {
    const runningSimulations = simulations.filter((s) => s.status === 'running');
    if (runningSimulations.length > 0 && !pollingInterval) {
      const interval = setInterval(() => {
        runningSimulations.forEach((sim) => pollSimulation(sim.id));
      }, 3000);
      setPollingInterval(interval);
      return () => clearInterval(interval);
    }
    if (runningSimulations.length === 0 && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [simulations, pollingInterval]);

  async function checkHealth() {
    try {
      const status = await window.babaAPI.miroFishHealth();
      setMiroFishConfig(status);
    } catch (err) {
      setMiroFishConfig({
        baseUrl: 'http://localhost:8000',
        status: 'disconnected',
        lastChecked: Date.now(),
        dockerRunning: false,
      });
    }
  }

  async function pollSimulation(simulationId: string) {
    try {
      const statusData = await window.babaAPI.miroFishSimulationStatus(simulationId);
      const mappedStatus = mapStatus(statusData.status);
      updateSimulation(simulationId, {
        status: mappedStatus,
        progress: statusData.progress || 0,
      });

      if (mappedStatus === 'completed') {
        const reportData = await window.babaAPI.miroFishSimulationReport(simulationId);
        const report = parseReport(simulationId, reportData);
        addSimulationReport(report);

        // Store in Brain Index and Master Memory
        try {
          await window.babaAPI.brainIngest(
            `Simulation: ${report.summary}`,
            'simulation',
            JSON.stringify(report, null, 2),
            'mirofish'
          );
          await window.babaAPI.memoryAppend(
            `[Simulation Result] ${report.summary} | Key insights: ${report.keyInsights.join('; ')} | Risks: ${report.riskFactors.join('; ')}`
          );
          addEvolutionEntry({
            timestamp: new Date().toISOString(),
            type: 'simulation',
            message: `Simulation completed: ${report.summary}`,
          });
        } catch (err) {
          console.error('Failed to store simulation result:', err);
        }

        setActiveSimulation(null);
      }

      if (mappedStatus === 'failed' || mappedStatus === 'cancelled') {
        setActiveSimulation(null);
      }
    } catch (err) {
      console.error('Failed to poll simulation:', err);
    }
  }

  async function handleCreateSimulation(template?: any) {
    setLoading(true);
    try {
      const job = {
        name: template?.name || customName || 'Custom Simulation',
        type: template?.type || customType,
        inputSource: template?.inputSource || customInputSource,
        inputContent: template?.inputContent || customContent,
        agentCount: template?.agentCount || customAgentCount,
      };

      const newSim = await createSimulation(job);
      addSimulation(newSim);
      setActiveSimulation(newSim.id);

      // Start polling
      const interval = setInterval(async () => {
        pollSimulation(newSim.id);
      }, 3000);

      // Clear polling after 10 minutes
      setTimeout(() => clearInterval(interval), 10 * 60 * 1000);

      setShowNewSimulation(false);
      resetForm();
    } catch (err: any) {
      console.error('Failed to create simulation:', err);
      alert(`Failed to create simulation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSimulation(simulationId: string) {
    try {
      await cancelSimulation(simulationId);
      updateSimulation(simulationId, { status: 'cancelled' });
      if (activeSimulation === simulationId) setActiveSimulation(null);
    } catch (err) {
      console.error('Failed to cancel simulation:', err);
    }
  }

  function resetForm() {
    setCustomName('');
    setCustomType('custom');
    setCustomInputSource('scenario_text');
    setCustomContent('');
    setCustomAgentCount(5000);
    setSelectedTemplate(null);
    setShowTemplates(false);
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function mapStatus(status: string): SimulationJob['status'] {
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

  function getStatusColor(status: string): string {
    switch (status) {
      case 'running': return '#4f5cff';
      case 'completed': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#64748b';
    }
  }

  function getImpactColor(impact: string): string {
    switch (impact) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  const completedReports = simulationReports.filter((r) => {
    const sim = simulations.find((s) => s.id === r.simulationId);
    return sim?.status === 'completed';
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🐟 Simulation Engine</h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              MiroFish-powered swarm intelligence predictions
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className={`status-dot ${miroFishConfig.dockerRunning ? 'status-dot-green' : 'status-dot-red'}`} style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: miroFishConfig.dockerRunning ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              {miroFishConfig.dockerRunning ? 'MiroFish Connected' : 'MiroFish Disconnected'}
            </span>
            {!miroFishConfig.dockerRunning && (
              <button className="btn btn-sm btn-ghost" onClick={checkHealth} style={{ fontSize: 10 }}>
                ↻ Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className="btn btn-primary"
          onClick={() => { setShowNewSimulation(true); setShowTemplates(false); }}
          disabled={!miroFishConfig.dockerRunning}
          style={{ fontSize: 12 }}
        >
          ✨ New Simulation
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => { setShowNewSimulation(true); setShowTemplates(true); }}
          disabled={!miroFishConfig.dockerRunning}
          style={{ fontSize: 12 }}
        >
          📋 Use Template
        </button>
      </div>

      {/* New Simulation Form */}
      {showNewSimulation && (
        <div className="card" style={{ padding: 16, marginBottom: 20, borderColor: 'var(--border-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              {showTemplates ? 'Choose a Template' : 'Create New Simulation'}
            </h3>
            <button className="btn btn-sm btn-ghost" onClick={() => { setShowNewSimulation(false); resetForm(); }}>✕</button>
          </div>

          {showTemplates ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
              {SIMULATION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowTemplates(false);
                    setCustomName(template.name);
                    setCustomType(template.type);
                    setCustomInputSource(template.inputSource);
                    setCustomContent(template.inputContent);
                    setCustomAgentCount(template.agentCount);
                  }}
                  className="card"
                  style={{
                    padding: 12,
                    textAlign: 'left',
                    borderColor: 'var(--border-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: SIMULATION_TYPE_COLORS[template.type] }}>
                      {SIMULATION_TYPE_LABELS[template.type]}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{template.agentCount.toLocaleString()} agents</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{template.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{template.description}</div>
                </button>
              ))}
            </div>
          ) : null}

          {!showTemplates && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Simulation name..."
                  className="input"
                  style={{ width: '100%', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Type</label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as any)}
                    className="input"
                    style={{ width: '100%', fontSize: 12 }}
                  >
                    {Object.entries(SIMULATION_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Input Source</label>
                  <select
                    value={customInputSource}
                    onChange={(e) => setCustomInputSource(e.target.value as any)}
                    className="input"
                    style={{ width: '100%', fontSize: 12 }}
                  >
                    {Object.entries(INPUT_SOURCE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                  Scenario Content ({INPUT_SOURCE_LABELS[customInputSource]})
                </label>
                <textarea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Describe the scenario, policy, or situation..."
                  rows={6}
                  className="input"
                  style={{ width: '100%', fontSize: 12, resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                  Agent Count: {customAgentCount.toLocaleString()}
                </label>
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={customAgentCount}
                  onChange={(e) => setCustomAgentCount(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>1,000</span>
                  <span>50,000</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewSimulation(false); resetForm(); }}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleCreateSimulation(selectedTemplate)}
                  disabled={loading || !customContent.trim()}
                >
                  {loading ? 'Creating...' : '🚀 Start Simulation'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Running Simulations */}
      {simulations.filter((s) => s.status === 'running' || s.status === 'queued').length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔄 Active Simulations</h3>
          {simulations.filter((s) => s.status === 'running' || s.status === 'queued').map((sim) => (
            <div key={sim.id} className="card" style={{ padding: 14, marginBottom: 12, borderColor: 'var(--border-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span
                      className="status-dot"
                      style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: getStatusColor(sim.status) }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{sim.name}</span>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: `${SIMULATION_TYPE_COLORS[sim.type]}22`,
                      color: SIMULATION_TYPE_COLORS[sim.type],
                    }}>
                      {SIMULATION_TYPE_LABELS[sim.type]}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {sim.agentCount.toLocaleString()} agents • Started {formatTime(sim.createdAt)}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleCancelSimulation(sim.id)}
                  style={{ fontSize: 10, color: 'var(--accent-red)' }}
                >
                  Cancel
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <span>{sim.status === 'queued' ? 'Queued...' : 'Running...'}</span>
                  <span>{sim.progress}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${sim.progress}%`,
                      background: sim.status === 'queued' ? 'var(--text-muted)' : 'var(--accent-blue)',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Reports */}
      {completedReports.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Simulation Reports</h3>
          {completedReports.map((report) => {
            const sim = simulations.find((s) => s.id === report.simulationId);
            return (
              <div key={report.id} className="card" style={{ padding: 14, marginBottom: 12, borderColor: 'var(--border-primary)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{report.summary}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {sim?.agentCount.toLocaleString()} agents • Completed {formatTime(report.createdAt)}
                </div>

                {/* Predictions */}
                {report.predictions.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Predictions</div>
                    {report.predictions.slice(0, 5).map((pred) => (
                      <div key={pred.id} style={{ padding: 8, background: 'var(--bg-tertiary)', borderRadius: 6, marginBottom: 6, fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>{pred.prediction}</span>
                          <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: `${getImpactColor(pred.impact)}22`,
                            color: getImpactColor(pred.impact),
                          }}>
                            {pred.impact} • {Math.round(pred.confidence * 100)}%
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pred.supportingEvidence}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Key Insights */}
                {report.keyInsights.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>💡 Key Insights</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {report.keyInsights.slice(0, 6).map((insight, i) => (
                        <span key={i} style={{
                          fontSize: 10,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                        }}>
                          {insight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Factors */}
                {report.riskFactors.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>⚠️ Risk Factors</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {report.riskFactors.slice(0, 6).map((risk, i) => (
                        <span key={i} style={{
                          fontSize: 10,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: '#ef444418',
                          color: '#ef4444',
                        }}>
                          {risk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opportunities */}
                {report.opportunities.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>🎯 Opportunities</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {report.opportunities.slice(0, 6).map((opp, i) => (
                        <span key={i} style={{
                          fontSize: 10,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: '#22c55e18',
                          color: '#22c55e',
                        }}>
                          {opp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!showNewSimulation && simulations.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center', borderColor: 'var(--border-primary)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐟</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No Simulations Yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
            Start a new simulation to predict outcomes, test scenarios, and forecast public reaction using swarm intelligence.
          </div>
        </div>
      )}

      {/* Disconnected State */}
      {!miroFishConfig.dockerRunning && !showNewSimulation && (
        <div className="card" style={{ padding: 16, borderColor: 'var(--accent-orange)', background: '#f59e0b08' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>MiroFish Not Connected</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Run MiroFish as a Docker container on port 8000. See the MiroFish documentation for setup instructions.
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                Expected API endpoint: http://localhost:8000/api/health
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
