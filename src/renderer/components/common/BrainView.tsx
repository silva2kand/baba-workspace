import React, { useState, useEffect } from 'react';

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

function toPreviewText(value: unknown, max = 200): string {
  if (typeof value === 'string') return value.slice(0, max);
  if (value == null) return '';
  try {
    return JSON.stringify(value).slice(0, max);
  } catch {
    return String(value).slice(0, max);
  }
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
      setStats({
        total: Number(data?.total || 0),
        byCategory: data?.byCategory && typeof data.byCategory === 'object' ? data.byCategory : {},
      });
    } catch (err) {
      console.error('Failed to load brain stats:', err);
    }
  }

  async function loadRecent() {
    try {
      const data = await window.babaAPI.brainRecent(30);
      const normalized = Array.isArray(data)
        ? data.map((item: any) => ({
            id: Number(item?.id || 0),
            title: String(item?.title || 'Untitled'),
            category: String(item?.category || 'unknown'),
            source: String(item?.source || 'local'),
            content: String(item?.content || ''),
            created_at: String(item?.created_at || ''),
          }))
        : [];
      setItems(normalized);
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
      const normalized = Array.isArray(data)
        ? data.map((item: any) => ({
            id: Number(item?.id || 0),
            title: String(item?.title || 'Untitled'),
            category: String(item?.category || 'unknown'),
            source: String(item?.source || 'local'),
            content: String(item?.content || ''),
            created_at: String(item?.created_at || ''),
          }))
        : [];
      setItems(normalized);
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
          items.map((item, idx) => (
            <div key={item?.id || idx} className="card card-clickable">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item?.title || 'Untitled'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                {item?.category || 'unknown'} · {item?.source || 'local'} · {item?.created_at || ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {toPreviewText(item?.content, 200)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
