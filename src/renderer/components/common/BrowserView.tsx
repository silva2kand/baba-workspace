import React, { useState, useRef, useCallback } from 'react';

interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

export const BrowserView: React.FC = () => {
  const [url, setUrl] = useState('https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { url: 'https://www.google.com', title: 'Google', timestamp: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState<{ name: string; url: string }[]>([
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'Gov.uk', url: 'https://gov.uk' },
    { name: 'Companies House', url: 'https://find-and-update.company-information.service.gov.uk' },
    { name: 'HMRC', url: 'https://www.gov.uk/government/organisations/hm-revenue-customs' },
  ]);
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigate = useCallback((targetUrl: string, addToHistory = true) => {
    let normalized = targetUrl.trim();
    if (!normalized) return;

    // Auto-prefix if no protocol
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      // Check if it looks like a domain
      if (normalized.includes('.') && !normalized.includes(' ')) {
        normalized = 'https://' + normalized;
      } else {
        // Treat as search query
        normalized = 'https://www.google.com/search?q=' + encodeURIComponent(normalized);
      }
    }

    setUrl(normalized);
    setCurrentUrl(normalized);
    setIsLoading(true);

    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      const title = extractTitle(normalized);
      newHistory.push({ url: normalized, title, timestamp: Date.now() });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }

    // Simulate loading (real webview would emit load events)
    setTimeout(() => setIsLoading(false), 800);
  }, [history, historyIndex]);

  const extractTitle = (urlStr: string): string => {
    try {
      const parsed = new URL(urlStr);
      return parsed.hostname.replace('www.', '');
    } catch {
      return urlStr.slice(0, 40);
    }
  };

  const handleGo = () => {
    if (url !== currentUrl) {
      navigate(url);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      setUrl(entry.url);
      setCurrentUrl(entry.url);
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      setUrl(entry.url);
      setCurrentUrl(entry.url);
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 400);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 600);
  };

  const handleStop = () => {
    setIsLoading(false);
  };

  const toggleBookmark = () => {
    if (isBookmarked) {
      setBookmarks(bookmarks.filter((b) => b.url !== currentUrl));
      setIsBookmarked(false);
    } else {
      setBookmarks([...bookmarks, { name: extractTitle(currentUrl), url: currentUrl }]);
      setIsBookmarked(true);
    }
  };

  React.useEffect(() => {
    setIsBookmarked(bookmarks.some((b) => b.url === currentUrl));
  }, [currentUrl, bookmarks]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGo();
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Browser Navbar */}
      <div style={{
        padding: '8px 12px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleBack}
            disabled={!canGoBack}
            title="Back"
            style={{
              padding: '4px 8px',
              opacity: canGoBack ? 1 : 0.4,
              cursor: canGoBack ? 'pointer' : 'default',
              fontSize: 14,
            }}
          >
            \u2190
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleForward}
            disabled={!canGoForward}
            title="Forward"
            style={{
              padding: '4px 8px',
              opacity: canGoForward ? 1 : 0.4,
              cursor: canGoForward ? 'pointer' : 'default',
              fontSize: 14,
            }}
          >
            \u2192
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={isLoading ? handleStop : handleRefresh}
            title={isLoading ? 'Stop' : 'Refresh'}
            style={{ padding: '4px 8px', fontSize: 14 }}
          >
            {isLoading ? '\u2715' : '\u{1F504}'}
          </button>
        </div>

        {/* URL Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            placeholder="Enter URL or search..."
            style={{
              width: '100%',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 20,
              padding: '6px 16px',
              fontSize: 12,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {isLoading && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 16,
              right: 16,
              height: 2,
              background: 'var(--bg-card)',
              borderRadius: 1,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: '40%',
                background: 'var(--accent-blue)',
                borderRadius: 1,
                animation: 'loading-slide 1s ease-in-out infinite',
              }} />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            style={{ fontSize: 14, color: isBookmarked ? 'var(--accent-yellow)' : 'var(--text-muted)' }}
          >
            {isBookmarked ? '\u2605' : '\u2606'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHistory(!showHistory)}
            title="History"
            style={{ fontSize: 14 }}
          >
            {'\u{1F558}'}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowBookmarks(!showBookmarks)}
            title="Toggle bookmarks"
            style={{ fontSize: 14 }}
          >
            {'\u{1F4CB}'}
          </button>
        </div>
      </div>

      {/* Loading bar animation CSS */}
      <style>{`
        @keyframes loading-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar - Bookmarks / History */}
        {(showBookmarks || showHistory) && (
          <div style={{
            width: 200,
            borderRight: '1px solid var(--border-primary)',
            background: 'var(--bg-sidebar)',
            overflowY: 'auto',
            padding: 8,
          }}>
            {showBookmarks && (
              <>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Bookmarks
                </div>
                {bookmarks.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 0' }}>
                    No bookmarks yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {bookmarks.map((b, i) => (
                      <button
                        key={i}
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'flex-start', fontSize: 11, padding: '5px 8px', textAlign: 'left' }}
                        onClick={() => navigate(b.url)}
                        title={b.url}
                      >
                        <span className="truncate" style={{ flex: 1 }}>{b.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {showHistory && (
              <>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                  marginTop: showBookmarks ? 16 : 0,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  History
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[...history].reverse().map((h, i) => (
                    <button
                      key={i}
                      className="btn btn-ghost btn-sm"
                      style={{ justifyContent: 'flex-start', fontSize: 10, padding: '4px 8px', textAlign: 'left' }}
                      onClick={() => navigate(h.url)}
                      title={h.url}
                    >
                      <span className="truncate" style={{ flex: 1 }}>{h.title}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>
                        {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Viewport */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', position: 'relative' }}>
          {isLoading ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>{'\u{1F310}'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>Loading...</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{currentUrl}</div>
            </div>
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              padding: 24,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{'\u{1F310}'}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Embedded Browser</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 16, wordBreak: 'break-all' }}>
                {currentUrl}
              </div>
              <div style={{
                padding: 12,
                background: '#f9f9f9',
                border: '1px solid #eee',
                borderRadius: 8,
                fontSize: 11,
                maxWidth: 360,
                textAlign: 'center',
                color: '#888',
                lineHeight: 1.5,
              }}>
                Agents can use this browser for real-time web scraping,
                evidence collection, and research. The full implementation
                requires Electron {'<webview>'} tag with
                <code style={{ background: '#eee', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>
                  webPreferences.webviewTag: true
                </code>
                {' '}in main.js.
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.babaAPI?.openUrl?.(currentUrl)}
                >
                  Open in System Browser
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(currentUrl);
                  }}
                >
                  Copy URL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '4px 12px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10,
        color: 'var(--text-muted)',
      }}>
        <span className="truncate" style={{ flex: 1 }}>
          {isLoading ? `Loading ${currentUrl}...` : currentUrl}
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          color: isLoading ? 'var(--accent-orange)' : 'var(--accent-green)',
          marginLeft: 8,
        }}>
          {isLoading ? 'LOADING' : 'READY'}
        </span>
      </div>

      {/* Spin animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
