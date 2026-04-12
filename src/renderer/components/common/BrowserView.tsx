import React, { useState } from 'react';

export const BrowserView: React.FC = () => {
  const [url, setUrl] = useState('https://www.google.com');
  const [history, setHistory] = useState<string[]>([]);

  const handleGo = () => {
    // In a real implementation this would update the <webview> src or BrowserView bounds
    console.log(`Navigating to ${url}`);
  };

  const bookmarks = [
    { name: 'HMRC Docs', url: 'https://gov.uk/tax' },
    { name: 'Law Society', url: 'https://lawsociety.org.uk' },
    { name: 'Companies House', url: 'https://companieshouse.gov.uk' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Browser Navbar */}
      <div style={{ 
        padding: '8px 12px', 
        background: 'var(--bg-secondary)', 
        borderBottom: '1px solid var(--border-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>←</button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>→</button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>🔄</button>
        </div>
        
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            className="input" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            style={{ 
              width: '100%', 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-primary)',
              borderRadius: 20,
              padding: '6px 16px',
              fontSize: 12,
              color: 'var(--text-secondary)'
            }} 
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 700 }}>🔒 SECURE</span>
          <button className="btn btn-ghost btn-sm">⭐</button>
        </div>
      </div>

      {/* Main Viewport */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Sidebar Bookmarks */}
        <div style={{ width: 200, borderRight: '1px solid var(--border-primary)', padding: 12, background: 'var(--bg-sidebar)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Bookmarks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {bookmarks.map(b => (
              <button 
                key={b.name}
                className="btn btn-ghost btn-sm" 
                style={{ justifyContent: 'flex-start', fontSize: 11, padding: '6px 8px' }}
                onClick={() => setUrl(b.url)}
              >
                📄 {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, background: '#fff', position: 'relative' }}>
          {/* Simulation logic — in real Electron we'd use <webview> here */}
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🌐</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Embedded Browser Active</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>{url}</div>
            <div style={{ 
              marginTop: 20, 
              padding: 12, 
              background: '#f9f9f9', 
              border: '1px solid #eee', 
              borderRadius: 8,
              fontSize: 11,
              maxWidth: 300,
              textAlign: 'center'
            }}>
              Agents can monitor this viewport for real-time scraping and evidence collection.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
