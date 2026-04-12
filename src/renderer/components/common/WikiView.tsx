import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

export const WikiView: React.FC = () => {
  const wikiEntries = useAppStore((s) => s.wikiEntries);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(wikiEntries[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['all', 'playbook', 'knowledge', 'template', 'context'];
  
  const filteredEntries = wikiEntries.filter(e => {
    const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedEntry = wikiEntries.find(e => e.id === selectedEntryId);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', height: '100%', display: 'flex', gap: 20 }}>
      {/* Left Sidebar */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>📚 Wiki</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Living Knowledge & Agent Playbooks.</p>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <input 
            className="input" 
            placeholder="Search wiki..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: 12, fontSize: 13 }} 
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`chip ${selectedCategory === cat ? 'chip-active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{ fontSize: 10 }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredEntries.map((entry) => (
            <div 
              key={entry.id}
              onClick={() => setSelectedEntryId(entry.id)}
              style={{ 
                padding: '12px', 
                marginBottom: 8, 
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selectedEntryId === entry.id ? 'var(--accent-blue)' : 'var(--border-primary)',
                background: selectedEntryId === entry.id ? 'var(--bg-card)' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{entry.title}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{entry.category}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{entry.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="card" style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {selectedEntry ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{selectedEntry.title}</h1>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Folder: <strong style={{ color: 'var(--text-accent)' }}>{selectedEntry.category}</strong></span>
                  <span>Last synced: {selectedEntry.lastUpdated}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm">✏️ Edit</button>
                <button className="btn btn-secondary btn-sm">📎 Link Case</button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CONTENT VIEWPORT
              </div>
              <div style={{ 
                fontSize: 14, 
                lineHeight: 1.8, 
                color: 'var(--text-primary)', 
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono)',
                padding: '16px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '4px solid var(--accent-blue)',
              }}>
                {selectedEntry.content}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Associated Tags</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedEntry.tags.map(tag => (
                  <span key={tag} className="badge" style={{ background: 'var(--bg-card)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}>#{tag}</span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select an entry to view the knowledge body.
          </div>
        )}
      </div>
    </div>
  );
};
