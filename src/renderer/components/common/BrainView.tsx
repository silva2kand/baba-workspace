import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';

interface BrainStats {
  total: number;
  byCategory: Record<string, number>;
}

interface BrainItem {
  id: number;
  title: string;
  category: string;
  source: string;
  content: string;
  created_at: string;
}

export function BrainView() {
  const [stats, setStats] = useState<BrainStats>({ total: 0, byCategory: {} });
  const [items, setItems] = useState<BrainItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refreshAll();
  }, []);

  async function refreshAll() {
    await Promise.all([loadStats(), loadRecent()]);
  }

  async function loadStats() {
    try {
      const data = await window.babaAPI.brainStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load brain stats:', err);
    }
  }

  async function loadRecent() {
    try {
      const data = await window.babaAPI.brainRecent(30);
      setItems(data);
    } catch (err) {
      console.error('Failed to load recent items:', err);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadRecent();
      return;
    }
    
    setLoading(true);
    try {
      const data = await window.babaAPI.brainSearch(searchQuery);
      setItems(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>🧠 Brain Index</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => { void refreshAll(); }}>🔄 Refresh</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="chip" style={{ fontSize: 14, padding: '8px 12px' }}>
            <strong>{stats.total}</strong> Total Items
          </div>
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            <div key={cat} className="chip" style={{ fontSize: 12, padding: '6px 10px' }}>
              <strong>{count}</strong> {cat}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Search brain index..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ color: 'var(--text-muted)' }}>No items in brain index yet</div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="card card-clickable">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                {item.category} · {item.source} · {item.created_at}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {item.content.substring(0, 200)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
