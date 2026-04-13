import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { babaOrchestrator } from '../../services/orchestratorService';
import type { Task, Agent } from '@shared/types';

const statusColors: Record<string, string> = {
  queued: 'var(--accent-orange)',
  running: 'var(--accent-blue)',
  completed: 'var(--accent-green)',
  failed: 'var(--accent-red)',
};

const statusIcons: Record<string, string> = {
  queued: '\u{23F3}',
  running: '\u{25B6}',
  completed: '\u{2705}',
  failed: '\u{274C}',
};

export const TasksView: React.FC = () => {
  const tasks = useAppStore((s) => s.tasks);
  const agents = useAppStore((s) => s.agents);
  const setTasks = useAppStore((s) => s.setTasks);

  const [filter, setFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCapabilities, setNewTaskCapabilities] = useState('reasoning');
  const [isExecuting, setIsExecuting] = useState(false);

  const getAgentById = (agentId: string): Agent | undefined => {
    return agents.find((a) => a.id === agentId);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  // Sort: running first, then queued, then completed, then failed
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const order: Record<string, number> = { running: 0, queued: 1, completed: 2, failed: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4);
  });

  const stats = {
    total: tasks.length,
    running: tasks.filter((t) => t.status === 'running').length,
    queued: tasks.filter((t) => t.status === 'queued').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  };

  const handleQueueTask = () => {
    if (!newTaskTitle.trim()) return;
    try {
      const capabilities = newTaskCapabilities.split(',').map((c) => c.trim()).filter(Boolean);
      const titles = newTaskTitle
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      for (const title of titles) {
        babaOrchestrator.assignAutoTask({
          title,
          description: newTaskDescription.trim() || undefined,
          requiredCapabilities: capabilities,
        });
      }

      // Refresh tasks from orchestrator after execution
      setTasks(babaOrchestrator.getAllTasks());
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleRunNow = async () => {
    if (!newTaskTitle.trim()) return;
    setIsExecuting(true);
    try {
      const capabilities = newTaskCapabilities.split(',').map((c) => c.trim()).filter(Boolean);
      await babaOrchestrator.executeTaskDirectly({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        requiredCapabilities: capabilities,
      });
      setTasks(babaOrchestrator.getAllTasks());
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to execute task:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRefreshTasks = () => {
    setTasks(babaOrchestrator.getAllTasks());
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      {/* Left - Task List */}
      <div style={{ width: 320, borderRight: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', paddingRight: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tasks</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleRefreshTasks} title="Refresh">
              {'\u{1F504}'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              + New Task
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
          {[
            { label: 'Running', value: stats.running, color: 'var(--accent-blue)' },
            { label: 'Queued', value: stats.queued, color: 'var(--accent-orange)' },
            { label: 'Done', value: stats.completed, color: 'var(--accent-green)' },
            { label: 'Failed', value: stats.failed, color: 'var(--accent-red)' },
          ].map((s) => (
            <div
              key={s.label}
              className="card"
              style={{ textAlign: 'center', padding: '6px 4px' }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
          {['all', 'running', 'queued', 'completed', 'failed'].map((f) => (
            <button
              key={f}
              className={`chip ${filter === f ? 'chip-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Create Task Form */}
        {showCreateForm && (
          <div className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Create Task</div>
            <input
              className="input"
              placeholder="Task title... (one per line for batch queue)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              style={{ width: '100%', marginBottom: 6, fontSize: 12 }}
            />
            <textarea
              className="input"
              placeholder="Description (optional)..."
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              rows={2}
              style={{ width: '100%', marginBottom: 6, fontSize: 11, resize: 'none' }}
            />
            <input
              className="input"
              placeholder="Capabilities (comma-separated)"
              value={newTaskCapabilities}
              onChange={(e) => setNewTaskCapabilities(e.target.value)}
              style={{ width: '100%', marginBottom: 8, fontSize: 11 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleQueueTask}
                disabled={!newTaskTitle.trim()}
                style={{ flex: 1 }}
              >
                Queue Task
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleRunNow}
                disabled={isExecuting || !newTaskTitle.trim()}
                style={{ flex: 1 }}
              >
                {isExecuting ? 'Running...' : 'Run Now'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Task List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sortedTasks.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: 12 }}>
              No tasks yet. Create one to get started.
            </div>
          ) : (
            sortedTasks.map((task) => {
              const agent = getAgentById(task.agentId);
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  style={{
                    padding: 10,
                    marginBottom: 4,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedTask?.id === task.id ? 'var(--accent-blue)' : 'var(--border-primary)',
                    background: selectedTask?.id === task.id ? 'var(--bg-card)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }} className="truncate">
                      {task.title}
                    </span>
                    <span style={{ color: statusColors[task.status], fontSize: 12 }}>
                      {statusIcons[task.status]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: 10, alignItems: 'center' }}>
                    <span style={{ color: statusColors[task.status], fontWeight: 600 }}>
                      {task.status}
                    </span>
                    {agent && (
                      <span style={{ color: 'var(--text-muted)' }}>
                      {'\u{2022}'} {agent.icon} {agent.name}
                    </span>
                    )}
                  </div>
                  {task.status === 'running' && task.progress !== undefined && (
                    <div style={{ marginTop: 6, height: 3, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${task.progress}%`,
                          background: 'var(--accent-blue)',
                          borderRadius: 2,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Center - Task Detail */}
      <div style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        {selectedTask ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{selectedTask.title}</h3>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Created {new Date(selectedTask.createdAt).toLocaleString()}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: `${statusColors[selectedTask.status]}22`,
                  color: statusColors[selectedTask.status],
                }}
              >
                {statusIcons[selectedTask.status]} {selectedTask.status}
              </span>
            </div>

            {/* Detail Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                {
                  label: 'Agent',
                  value: getAgentById(selectedTask.agentId)?.name || 'Unknown',
                  icon: getAgentById(selectedTask.agentId)?.icon || '?',
                },
                {
                  label: 'Progress',
                  value: `${selectedTask.progress ?? 0}%`,
                  icon: '\u{1F4CA}',
                },
                {
                  label: 'Duration',
                  value: selectedTask.completedAt
                    ? `${Math.round((selectedTask.completedAt - selectedTask.createdAt) / 1000)}s`
                    : `${Math.round((Date.now() - selectedTask.createdAt) / 1000)}s`,
                  icon: '\u{23F1}',
                },
              ].map((s) => (
                <div key={s.label} className="card" style={{ textAlign: 'center', padding: 10 }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            {selectedTask.progress !== undefined && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Progress</div>
                <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${selectedTask.progress}%`,
                      background: selectedTask.status === 'failed' ? 'var(--accent-red)' : 'var(--accent-blue)',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  {selectedTask.progress}% complete
                </div>
              </div>
            )}

            {/* Description */}
            {selectedTask.description && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Description</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {selectedTask.description}
                </p>
              </div>
            )}

            {/* Capabilities */}
            {selectedTask.requiredCapabilities && selectedTask.requiredCapabilities.length > 0 && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Required Capabilities</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {selectedTask.requiredCapabilities.map((cap) => (
                    <span
                      key={cap}
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Result */}
            {selectedTask.result && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  {selectedTask.status === 'failed' ? 'Error' : 'Result'}
                </div>
                <pre
                  style={{
                    fontSize: 11,
                    color: selectedTask.status === 'failed' ? 'var(--accent-red)' : 'var(--text-secondary)',
                    background: 'var(--bg-tertiary)',
                    padding: 10,
                    borderRadius: 'var(--radius-md)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 200,
                    overflowY: 'auto',
                    margin: 0,
                  }}
                >
                  {typeof selectedTask.result === 'string'
                    ? selectedTask.result
                    : selectedTask.result.output || JSON.stringify(selectedTask.result, null, 2)}
                </pre>
              </div>
            )}

            {/* Error */}
            {selectedTask.error && (
              <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--accent-red)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--accent-red)' }}>
                  Error
                </div>
                <pre style={{ fontSize: 11, color: 'var(--accent-red)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {selectedTask.error}
                </pre>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
            Select a task to view details
          </div>
        )}
      </div>
    </div>
  );
};
