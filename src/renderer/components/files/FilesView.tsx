import React, { useState, useEffect, useCallback } from 'react';

interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  path: string;
  extension?: string;
}

interface FilePreview {
  name: string;
  path: string;
  content: string;
  size: number;
  error?: string;
}

function getFileIcon(name: string, isDirectory: boolean): string {
  if (isDirectory) return '\u{1F4C1}';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    pdf: '\u{1F4C4}',
    doc: '\u{1F4DD}',
    docx: '\u{1F4DD}',
    xls: '\u{1F4CA}',
    xlsx: '\u{1F4CA}',
    csv: '\u{1F4CA}',
    txt: '\u{1F4DD}',
    md: '\u{1F4DD}',
    json: '\u{1F4DC}',
    xml: '\u{1F4DC}',
    html: '\u{1F310}',
    htm: '\u{1F310}',
    css: '\u{1F3A8}',
    js: '\u{1F4F1}',
    ts: '\u{1F4F1}',
    tsx: '\u{1F4F1}',
    jsx: '\u{1F4F1}',
    py: '\u{1F40D}',
    java: '\u{2615}',
    png: '\u{1F5BC}',
    jpg: '\u{1F5BC}',
    jpeg: '\u{1F5BC}',
    gif: '\u{1F5BC}',
    svg: '\u{1F5BC}',
    zip: '\u{1F4E6}',
    rar: '\u{1F4E6}',
    '7z': '\u{1F4E6}',
    exe: '\u2699',
    bat: '\u2699',
    sh: '\u2699',
    log: '\u{1F4CB}',
    sql: '\u{1F5C4}',
    yaml: '\u2699',
    yml: '\u2699',
    env: '\u{1F512}',
  };
  return iconMap[ext] || '\u{1F4C4}';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function getBreadcrumbParts(path: string): { label: string; path: string }[] {
  const parts = path.split(/[\\/]/).filter(Boolean);
  const result: { label: string; path: string }[] = [];
  let accumulated = '';

  // Handle Windows drive
  if (parts[0] && parts[0].includes(':')) {
    accumulated = parts[0];
    result.push({ label: parts[0], path: accumulated });
    for (let i = 1; i < parts.length; i++) {
      accumulated += '\\' + parts[i];
      result.push({ label: parts[i], path: accumulated });
    }
  } else {
    // Unix-style
    for (const part of parts) {
      accumulated += '/' + part;
      result.push({ label: part, path: accumulated || '/' });
    }
  }

  return result;
}

export function FilesView() {
  const [currentPath, setCurrentPath] = useState('C:\\Users\\Silva');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileEntry } | null>(null);

  const loadDirectory = useCallback(async (dirPath: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedFile(null);
    setFilePreview(null);

    try {
      const result = await window.babaAPI?.fsListDir?.(dirPath);
      if (result && result.error) {
        setError(result.error);
        setFiles([]);
      } else if (result && Array.isArray(result.files)) {
        setFiles(result.files);
        setCurrentPath(dirPath);
      } else {
        // Fallback: IPC handler not available, show placeholder data
        setFiles([
          { name: 'Documents', isDirectory: true, size: 0, modified: Date.now() - 172800000, path: `${dirPath}\\Documents` },
          { name: 'Downloads', isDirectory: true, size: 0, modified: Date.now() - 86400000, path: `${dirPath}\\Downloads` },
          { name: 'Desktop', isDirectory: true, size: 0, modified: Date.now() - 259200000, path: `${dirPath}\\Desktop` },
          { name: 'Bills', isDirectory: true, size: 0, modified: Date.now() - 432000000, path: `${dirPath}\\Bills` },
          { name: 'tax-return-2024.pdf', isDirectory: false, size: 2411724, modified: Date.now() - 604800000, path: `${dirPath}\\tax-return-2024.pdf`, extension: 'pdf' },
          { name: 'lease-agreement.docx', isDirectory: false, size: 1153434, modified: Date.now() - 1209600000, path: `${dirPath}\\lease-agreement.docx`, extension: 'docx' },
          { name: 'insurance-policy.pdf', isDirectory: false, size: 4718592, modified: Date.now() - 1814400000, path: `${dirPath}\\insurance-policy.pdf`, extension: 'pdf' },
          { name: 'budget-tracker.xlsx', isDirectory: false, size: 876544, modified: Date.now() - 345600000, path: `${dirPath}\\budget-tracker.xlsx`, extension: 'xlsx' },
          { name: 'meeting-notes.txt', isDirectory: false, size: 12288, modified: Date.now() - 86400000, path: `${dirPath}\\meeting-notes.txt`, extension: 'txt' },
        ]);
        setCurrentPath(dirPath);
      }
    } catch (err) {
      console.error('Failed to load directory:', err);
      setError(`Failed to load: ${err instanceof Error ? err.message : String(err)}`);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigate = (dirPath: string) => {
    loadDirectory(dirPath);
  };

  const handleFileClick = async (file: FileEntry) => {
    setSelectedFile(file);
    setContextMenu(null);

    if (file.isDirectory) {
      handleNavigate(file.path);
    } else {
      // Try to read file content for preview
      try {
        const result = await window.babaAPI?.fsReadFile?.(file.path);
        if (result && result.content !== undefined && result.content !== null) {
          setFilePreview({
            name: file.name,
            path: file.path,
            content: result.content,
            size: file.size,
          });
        } else {
          setFilePreview({
            name: file.name,
            path: file.path,
            content: '',
            size: file.size,
            error: result?.error || 'Could not read file',
          });
        }
      } catch {
        setFilePreview(null);
      }
    }
  };

  const handleOpenInExplorer = () => {
    if (selectedFile) {
      window.babaAPI?.launchApp?.('explorer');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileEntry) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  // Filter and sort
  let filteredFiles = files;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredFiles = files.filter((f) => f.name.toLowerCase().includes(q));
  }

  filteredFiles = [...filteredFiles].sort((a, b) => {
    // Directories first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let cmp = 0;
    if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortBy === 'size') cmp = a.size - b.size;
    else if (sortBy === 'modified') cmp = a.modified - b.modified;
    return sortAsc ? cmp : -cmp;
  });

  const breadcrumbParts = getBreadcrumbParts(currentPath);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{'\u{1F4C1}'}</span>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Files</h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={handleOpenInExplorer}>
            Open in Explorer
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => loadDirectory(currentPath)} title="Refresh">
            {'\u{1F504}'}
          </button>
        </div>
      </div>

      {/* Breadcrumb + Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-primary)',
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              // Go up one level
              const parts = currentPath.split(/[\\/]/).filter(Boolean);
              if (parts.length > 1) {
                parts.pop();
                let parentPath = parts.join('\\');
                if (!parentPath.includes(':')) parentPath = '/' + parentPath;
                handleNavigate(parentPath);
              }
            }}
            title="Up"
            style={{ padding: '2px 6px', fontSize: 12 }}
          >
            \u2191
          </button>
          {breadcrumbParts.map((part, i) => (
            <React.Fragment key={i}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleNavigate(part.path)}
                style={{
                  padding: '2px 6px',
                  fontSize: 11,
                  color: i === breadcrumbParts.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: i === breadcrumbParts.length - 1 ? 600 : 400,
                }}
              >
                {part.label}
              </button>
              {i < breadcrumbParts.length - 1 && (
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>\u203A</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Search */}
        <input
          className="input"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: 180,
            fontSize: 11,
            padding: '4px 10px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
          }}
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* File List */}
        <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--border-primary)' }}>
          {/* Column Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 100px 120px 100px',
            gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-primary)',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            position: 'sticky',
            top: 0,
            background: 'var(--bg-primary)',
            zIndex: 1,
          }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { if (sortBy === 'name') setSortAsc(!sortAsc); else { setSortBy('name'); setSortAsc(true); } }}
              style={{ justifyContent: 'flex-start', fontSize: 10, padding: 0, color: sortBy === 'name' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              Name {sortBy === 'name' ? (sortAsc ? '\u2191' : '\u2193') : ''}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { if (sortBy === 'size') setSortAsc(!sortAsc); else { setSortBy('size'); setSortAsc(true); } }}
              style={{ fontSize: 10, padding: 0, color: sortBy === 'size' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              Size {sortBy === 'size' ? (sortAsc ? '\u2191' : '\u2193') : ''}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { if (sortBy === 'modified') setSortAsc(!sortAsc); else { setSortBy('modified'); setSortAsc(true); } }}
              style={{ fontSize: 10, padding: 0, color: sortBy === 'modified' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              Modified {sortBy === 'modified' ? (sortAsc ? '\u2191' : '\u2193') : ''}
            </button>
            <span>Actions</span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Loading...
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div style={{ padding: 16, margin: 12, background: 'var(--accent-red)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* File List */}
          {!isLoading && !error && filteredFiles.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              {searchQuery ? 'No files match your search' : 'This folder is empty'}
            </div>
          )}

          {!isLoading && filteredFiles.map((file, i) => (
            <div
              key={file.path}
              onClick={() => handleFileClick(file)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 100px 120px 100px',
                gap: 8,
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-primary)',
                cursor: 'pointer',
                background: selectedFile?.path === file.path ? 'var(--bg-card)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (selectedFile?.path !== file.path) {
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedFile?.path !== file.path) {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, overflow: 'hidden' }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{getFileIcon(file.name, file.isDirectory)}</span>
                <span
                  className="truncate"
                  style={{ fontWeight: file.isDirectory ? 600 : 400 }}
                  title={file.name}
                >
                  {file.name}
                </span>
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {file.isDirectory ? '--' : formatFileSize(file.size)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                {formatDate(file.modified)}
              </span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {file.isDirectory ? (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>Open</button>
                ) : (
                  <>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>Preview</button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.babaAPI?.openPath?.(file.path);
                      }}
                    >
                      Open
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel - Preview */}
        <div style={{ width: 340, overflowY: 'auto', background: 'var(--bg-primary)' }}>
          {selectedFile ? (
            <div style={{ padding: 12 }}>
              {/* File Info */}
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }} className="truncate" title={selectedFile.name}>
                {getFileIcon(selectedFile.name, selectedFile.isDirectory)} {selectedFile.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, wordBreak: 'break-all' }}>
                {selectedFile.path}
              </div>

              {/* Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                {[
                  { label: 'Type', value: selectedFile.isDirectory ? 'Folder' : (selectedFile.extension?.toUpperCase() || 'File') },
                  { label: 'Size', value: selectedFile.isDirectory ? '--' : formatFileSize(selectedFile.size) },
                  { label: 'Modified', value: formatDate(selectedFile.modified) },
                  { label: 'Path', value: 'See below' },
                ].map((m) => (
                  <div key={m.label} className="card" style={{ padding: 8 }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }} className="truncate">{m.value}</div>
                  </div>
                ))}
              </div>

              {/* File Preview */}
              {filePreview && !selectedFile.isDirectory && (
                <div className="card" style={{ padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Preview</div>
                  {filePreview.error ? (
                    <div style={{ fontSize: 11, color: 'var(--accent-red)' }}>{filePreview.error}</div>
                  ) : (
                    <pre style={{
                      fontSize: 10,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-tertiary)',
                      padding: 8,
                      borderRadius: 'var(--radius-sm)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 300,
                      overflowY: 'auto',
                      margin: 0,
                      lineHeight: 1.4,
                    }}>
                      {filePreview.content.length > 2000
                        ? filePreview.content.slice(0, 2000) + '\n\n... (truncated)'
                        : filePreview.content}
                    </pre>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {!selectedFile.isDirectory && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.babaAPI?.openPath?.(selectedFile.path)}
                >
                  Open in Default App
                </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText?.(selectedFile.path);
                  }}
                >
                  Copy Path
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 24 }}>
              Select a file to view details
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              padding: 4,
              zIndex: 1000,
              minWidth: 160,
            }}
          >
            {[
              { label: contextMenu.file.isDirectory ? 'Open' : 'Preview', action: () => handleFileClick(contextMenu.file) },
              { label: 'Copy Path', action: () => navigator.clipboard?.writeText?.(contextMenu.file.path) },
              ...(!contextMenu.file.isDirectory ? [{ label: 'Open in Default App', action: () => window.babaAPI?.openPath?.(contextMenu.file.path) }] : []),
            ].map((item, i) => (
              <button
                key={i}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11 }}
                onClick={() => { item.action(); setContextMenu(null); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
