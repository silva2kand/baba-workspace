import React, { useState } from 'react';

export function FilesView() {
  const [currentPath, setCurrentPath] = useState('C:\\Users\\Silva');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const files = [
    { name: 'Documents', type: 'folder', size: '-', modified: '2 days ago', icon: '📁' },
    { name: 'Downloads', type: 'folder', size: '-', modified: '1 day ago', icon: '📁' },
    { name: 'Desktop', type: 'folder', size: '-', modified: '3 days ago', icon: '📁' },
    { name: 'Bills', type: 'folder', size: '-', modified: '5 hours ago', icon: '📁' },
    { name: 'tax-return-2024.pdf', type: 'file', size: '2.3 MB', modified: '1 week ago', icon: '📄' },
    { name: 'lease-agreement.docx', type: 'file', size: '1.1 MB', modified: '2 weeks ago', icon: '📄' },
    { name: 'insurance-policy.pdf', type: 'file', size: '4.5 MB', modified: '3 weeks ago', icon: '📄' },
    { name: 'budget-tracker.xlsx', type: 'file', size: '856 KB', modified: '4 days ago', icon: '📊' },
    { name: 'meeting-notes.txt', type: 'file', size: '12 KB', modified: 'Yesterday', icon: '📝' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>📁 Files</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm">📂 Open in Explorer</button>
          <button className="btn btn-secondary btn-sm">🔍 Search</button>
        </div>
      </div>

      {/* Path Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '6px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📁</span>
        <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{currentPath}</span>
      </div>

      {/* File List */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-primary)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span>Name</span><span>Size</span><span>Modified</span><span>Actions</span>
        </div>
        {files.map((file, i) => (
          <div
            key={i}
            onClick={() => setSelectedFile(file.name)}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8,
              padding: '8px 0', borderBottom: i < files.length - 1 ? '1px solid var(--border-primary)' : 'none',
              cursor: 'pointer', background: selectedFile === file.name ? 'var(--bg-tertiary)' : 'transparent',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span>{file.icon}</span>
              <span style={{ fontWeight: file.type === 'folder' ? 600 : 400 }}>{file.name}</span>
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.size}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.modified}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {file.type === 'folder' ? (
                <button className="btn btn-ghost btn-sm">Open</button>
              ) : (
                <>
                  <button className="btn btn-ghost btn-sm">Open</button>
                  <button className="btn btn-ghost btn-sm">📋 Link</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}