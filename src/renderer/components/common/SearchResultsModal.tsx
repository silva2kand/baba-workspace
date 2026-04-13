import React, { useState, useEffect } from 'react';
import { searchAll, SearchResult } from '../../services/searchService';
import { useAppStore } from '../../stores/appStore';

interface SearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
}

const typeIcons: Record<string, string> = {
  task: '📋',
  email: '📧',
  case: '📁',
  wiki: '📚',
  brain: '🧠',
  chat: '💬',
  approval: '✅',
};

const typeColors: Record<string, string> = {
  task: 'var(--accent-blue)',
  email: 'var(--accent-green)',
  case: 'var(--accent-orange)',
  wiki: 'var(--accent-purple)',
  brain: 'var(--accent-pink)',
  chat: 'var(--accent-cyan)',
  approval: 'var(--accent-yellow)',
};

export const SearchResultsModal: React.FC<SearchResultsModalProps> = ({ isOpen, onClose, query }) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const setCurrentView = useAppStore(s => s.setCurrentView);
  const setCurrentChatId = useAppStore(s => s.setCurrentChatId);

  useEffect(() => {
    if (isOpen && query) {
      performSearch(query);
    }
  }, [isOpen, query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const searchResults = await searchAll(searchQuery);
      setResults(searchResults);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Navigate to appropriate view
    switch (result.type) {
      case 'task':
        setCurrentView('tasks');
        break;
      case 'email':
        setCurrentView('inbox');
        break;
      case 'case':
        setCurrentView('cases');
        break;
      case 'wiki':
        setCurrentView('wiki');
        break;
      case 'brain':
        setCurrentView('brain');
        break;
      case 'chat':
        setCurrentView('chat');
        setCurrentChatId(result.id);
        break;
      case 'approval':
        setCurrentView('approvals');
        break;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          width: '80%',
          maxWidth: 800,
          maxHeight: '70vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🔍</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Search Results
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {loading ? 'Searching...' : `${results.length} results for "${query}"`}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Results */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div>Searching across all entities...</div>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div>No results found</div>
              <div style={{ fontSize: 11, marginTop: 8 }}>Try a different search term</div>
            </div>
          ) : (
            results.map((result) => (
              <div
                key={result.id}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${typeColors[result.type]}`,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => handleResultClick(result)}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{typeIcons[result.type]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {result.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {result.description}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-tertiary)',
                          color: typeColors[result.type],
                          textTransform: 'uppercase',
                        }}
                      >
                        {result.type}
                      </span>
                      {result.metadata?.status && (
                        <span
                          style={{
                            fontSize: 9,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {result.metadata.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      textAlign: 'right',
                    }}
                  >
                    {Math.round(result.relevance * 100)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
