import sqlite3 from 'sqlite3';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';

let BRAIN_DB_PATH;
let chroma = null;
let chromaCol = null;

export function initializeBrainPaths(app) {
  BRAIN_DB_PATH = path.join(app.getPath('userData'), 'brain.db');
  
  // Try to load ChromaDB if available
  try {
    // We'll add ChromaDB support later, start with SQLite first
    chroma = null;
  } catch {
    chroma = null;
  }
}

export class BrainIndex {
  constructor() {
    this.conn = new sqlite3.Database(BRAIN_DB_PATH);
    this._initDb();
  }

  _initDb() {
    this.conn.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, category TEXT, source TEXT,
        content TEXT, summary TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  ingest(title, category, content, source = "") {
    return new Promise((resolve, reject) => {
      this.conn.run(
        "INSERT INTO items (title,category,source,content) VALUES (?,?,?,?)",
        [title, category, source, content.substring(0, 50000)],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  search(q) {
    return new Promise((resolve, reject) => {
      const qlike = `%${q}%`;
      this.conn.all(
        "SELECT id,title,category,source,content,created_at FROM items WHERE title LIKE ? OR content LIKE ? OR category LIKE ? ORDER BY id DESC LIMIT 40",
        [qlike, qlike, qlike],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(r => ({
            id: r.id,
            title: r.title,
            category: r.category,
            source: r.source,
            content: r.content.substring(0, 400),
            created_at: r.created_at
          })));
        }
      );
    });
  }

  stats() {
    return new Promise((resolve, reject) => {
      this.conn.get("SELECT COUNT(*) as total FROM items", (err, totalRow) => {
        if (err) reject(err);
        this.conn.all("SELECT category,COUNT(*) as count FROM items GROUP BY category", (err, cats) => {
          if (err) reject(err);
          const byCategory = {};
          cats.forEach(c => byCategory[c.category] = c.count);
          resolve({ total: totalRow.total, byCategory });
        });
      });
    });
  }

  recent(n = 20) {
    return new Promise((resolve, reject) => {
      this.conn.all(
        "SELECT id,title,category,source,created_at FROM items ORDER BY id DESC LIMIT ?",
        [n],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  close() {
    this.conn.close();
  }
}

// Master Memory system
let MASTER_MEMORY_PATH;
let _masterMemoryCache = { mtime: null, text: "" };

export function initializeMasterMemory(app) {
  MASTER_MEMORY_PATH = path.join(app.getPath('userData'), 'baba_master_memory.txt');
  
  if (!fs.existsSync(MASTER_MEMORY_PATH)) {
    const defaultTemplate = `# BABA - MASTER ORGANISED INDEX
Memory | Skills | Knowledges - Additive, No Overwrite

Identity:
- Current legal name: Silva Kandasamy
- Previous names: Shiva Kandasamy (2010-2024), Siyanthan Kandasamy (pre-2010)
- Residence: UK (Lancaster area)
- Primary address: Newton Newsagent, 3 Langdale Place, Lancaster, LA1 3NS

Properties:
- 3 Langdale Place (home + business)
- 6F Steamer Street (rented)
- 16 Howlish View (deposit dispute)

Business:
- Silva Retail Ltd (trading as Newton Newsagent)

Memory Rules:
- Always append on top of existing memory
- Never reset/overwrite unless Silva explicitly asks
- Keep memory updated continuously
`;
    fs.writeFileSync(MASTER_MEMORY_PATH, defaultTemplate, 'utf8');
  }
}

export function loadMasterMemory(force = false) {
  try {
    const mtime = fs.statSync(MASTER_MEMORY_PATH).mtimeMs;
    
    if (force || mtime !== _masterMemoryCache.mtime) {
      const txt = fs.readFileSync(MASTER_MEMORY_PATH, 'utf8').trim();
      _masterMemoryCache = { mtime, text: txt };
    }
    return _masterMemoryCache.text;
  } catch {
    return "";
  }
}

export function appendMasterMemory(text) {
  if (!text.trim()) return false;
  try {
    fs.appendFileSync(MASTER_MEMORY_PATH, `\n\n${text.trim()}\n`, 'utf8');
    loadMasterMemory(true);
    return true;
  } catch {
    return false;
  }
}

export function injectMasterMemory(systemText) {
  const master = loadMasterMemory();
  if (!master) return systemText || "";
  
  const prefix = `BABA MASTER MEMORY (persistent, local-first, additive-only):
- Treat this as top-level context.
- Never overwrite this memory unless user explicitly asks.
- Extend memory additively when new approved facts arrive.

`;
  
  const tail = (systemText || "").trim();
  if (tail) {
    return `${prefix}${master}\n\n${tail}`;
  }
  return `${prefix}${master}`;
}