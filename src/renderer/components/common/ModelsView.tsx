import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { scanAllProviders, chatWithModel } from '../../services/modelService';

export function ModelsView() {
  const providers = useAppStore((s) => s.providers);
  const models = useAppStore((s) => s.models);
  const setProviders = useAppStore((s) => s.setProviders);
  const setModels = useAppStore((s) => s.setModels);
  const selectedProvider = useAppStore((s) => s.selectedProvider);
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedProvider = useAppStore((s) => s.setSelectedProvider);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const [scanning, setScanning] = useState(false);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  async function handleScan() {
    setScanning(true);
    try {
      const found = await scanAllProviders();
      setProviders(found);
      const allModels = found.flatMap(p => p.models);
      setModels(allModels);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  }

  async function testModel(providerId: string, modelName: string) {
    setTestingModel(modelName);
    try {
      const response = await chatWithModel(providerId, modelName, [
        { role: 'user', content: 'Say "Hello from Baba!" in one sentence.' }
      ]);
      setTestResult(prev => ({ ...prev, [modelName]: `✅ ${response.substring(0, 80)}` }));
    } catch {
      setTestResult(prev => ({ ...prev, [modelName]: '❌ Connection failed' }));
    } finally {
      setTestingModel(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>🧠 Models</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={handleScan} disabled={scanning}>
            {scanning ? '⟳ Scanning...' : '🔍 Auto-Detect All'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          🔍 Baba auto-detects all local AI models from Ollama, LM Studio, and Jan. Click <strong>Auto-Detect All</strong> to scan your system.
        </div>
      </div>

      {/* Provider Cards */}
      {providers.map(provider => (
        <div key={provider.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-dot" style={{ background: provider.status === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)' }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{provider.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{provider.baseUrl}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{provider.latency}ms</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: provider.status === 'connected' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: provider.status === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {provider.status}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{provider.models.length} models available</div>
          {provider.models.map(model => (
            <div key={model.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', marginBottom: 4,
              background: selectedModel === model.name ? 'rgba(79,92,255,0.1)' : 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: selectedModel === model.name ? '1px solid var(--accent-blue)' : '1px solid transparent',
            }}>
              <span style={{ fontSize: 12, color: selectedModel === model.name ? 'var(--accent-blue)' : 'var(--text-primary)', fontWeight: selectedModel === model.name ? 600 : 400 }}>
                {selectedModel === model.name ? '●' : '○'}
              </span>
              <span style={{ flex: 1, fontSize: 12 }}>{model.name}</span>
              {model.size && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{model.size}</span>}
              {model.quantization && <span className="chip" style={{ fontSize: 9 }}>{model.quantization}</span>}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => testModel(provider.id, model.name)}
                disabled={testingModel === model.name}
              >
                {testingModel === model.name ? '⟳' : '🧪'}
              </button>
              <button
                className="btn btn-sm"
                style={{ background: selectedModel === model.name ? 'var(--accent-blue)' : 'var(--bg-card)', color: selectedModel === model.name ? 'white' : 'var(--text-primary)', fontSize: 10 }}
                onClick={() => { setSelectedProvider(provider.id); setSelectedModel(model.name); }}
              >
                {selectedModel === model.name ? 'Active' : 'Use'}
              </button>
            </div>
          ))}
          {provider.models.length === 0 && (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No models detected. Start {provider.name} to connect.
            </div>
          )}
        </div>
      ))}

      {providers.length === 0 && !scanning && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No AI Providers Detected</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Start Ollama, LM Studio, or Jan AI to auto-detect your local models.
          </div>
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Scan Again'}
          </button>
        </div>
      )}

      {/* Test Results */}
      {Object.keys(testResult).length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Test Results</div>
          {Object.entries(testResult).map(([model, result]) => (
            <div key={model} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border-primary)' }}>
              <strong>{model}:</strong> {result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}