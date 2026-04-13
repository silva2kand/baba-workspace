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
        [title, category, source, String(content || '').substring(0, 50000)],
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
            content: String(r.content || '').substring(0, 400),
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
        "SELECT id,title,category,source,content,created_at FROM items ORDER BY id DESC LIMIT ?",
        [n],
        (err, rows) => {
          if (err) reject(err);
          else resolve((rows || []).map((r) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            source: r.source,
            content: String(r.content || '').substring(0, 400),
            created_at: r.created_at,
          })));
        }
      );
    });
  }

  hasSource(source) {
    return new Promise((resolve, reject) => {
      this.conn.get(
        "SELECT COUNT(*) as count FROM items WHERE source = ?",
        [String(source || '')],
        (err, row) => {
          if (err) reject(err);
          else resolve((row?.count || 0) > 0);
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
const MASTER_MEMORY_SEED_VERSION = '2026-04-13';
const MASTER_MEMORY_SEED_MARKER = `SEED VERSION: ${MASTER_MEMORY_SEED_VERSION}`;
const MASTER_MEMORY_BASE_TEMPLATE = `# BABA - MASTER ORGANISED INDEX
SEED VERSION: 2026-04-13
Memory | Skills | Knowledges - Complete, Additive, Always Updated

MEMORY (Silva Profile)

Identity Core
- Current legal name: Silva Kandasamy
- Previous names: Shiva Kandasamy (2010-2024), Siyanthan Kandasamy (pre-2010)
- Residence: UK, Lancaster area
- Primary address: Newton Newsagent, 3 Langdale Place, Lancaster, LA1 3NS

Properties Portfolio
- 3 Langdale Place: home + business
- 6F Steamer Street: rented out
- 16 Howlish View: deposit dispute

Business Entity
- Silva Retail Ltd (trading as Newton Newsagent)

Memory Architecture
- identity
- semantic
- episodic (emails, documents, finance, property, business, tasks)
- procedural
- preferences
- goals
- tools
- emails
- documents
- finance
- property
- business
- tasks

Memory Rules
- Always add memory on top of existing memory
- Never reset or overwrite unless Silva explicitly asks
- Grow memory every day and every task
- Keep memory updated automatically

SKILLS (Baba Capability Pack)

Core Claws
- NemoClaw: deep reasoning and long-chain analysis
- CashClaw: money opportunities and profit estimation
- AbacusClaw: numbers, risk, forecasting
- MiroFish: swarm simulation and future scenario testing
- MemoryVault: long-term identity and semantic recall
- OperatorCore: PC, web, and app automation
- VoiceCore: speech pipeline support

10-Head MoE Experts
- Strategy
- Technical
- Security
- Product
- Data
- Risk
- Operations
- Experience
- Compliance
- Automation

Silva Custom Skill Pack
- silva-mission-control
- silva-full-system-operator
- silva-local-model-switchboard
- silva-memory-vault
- silva-browser-agent
- silva-pc-operator
- silva-email-agent
- silva-file-docs-agent
- silva-vision-lab
- silva-voice-pipeline
- silva-devops
- silva-deep-research
- silva-accounting
- silva-uk-legal
- silva-safety-governor
- silva-content-studio
- silva-cctv-ops
- silva-audio-studio
- silva-pos-watch
- silva-pm-vault

Agent Roles
- Watchers
- Workers
- Planners
- Sentinels
- Coder
- Reviewer
- Tester
- Researcher
- Architect
- Investigator
- Risk Analyst
- Opportunity Scanner
- Document Parser
- Email Handler
- Voice Agent
- Browser Agent
- PC Operator
- Automation Engineer
- Content Creator
- Compliance Checker
- Strategy Advisor
- Data Analyst
- Mission Control Coordinator

KNOWLEDGES (Baba Domain Stack)

Model Stack
- ReasoningCore: Llama-3.1-8B
- CodeCore: Qwen2.5-Coder-14B
- VisionCore: Qwen2.5-VL-7B (OCR enabled)

System Stack
- CoWork OS (daemon, heartbeat, SQLite, secure settings)
- Jan (primary), Ollama, LM Studio
- Local-first providers by default

Open Integrations (Additive)
- MiroFish -> SimulationCore
- DeepAgents -> DeepAgentCore
- The Agency -> AgencyCore
- ContextHub -> ContextCore
- OpenDataLoader -> DataCore

Domain Knowledge
- UK legal-style reasoning (non-professional guidance)
- Accounting-style analysis
- Business strategy and opportunity scanning
- Investigation and cross-examination
- Property and finance reasoning
- Retail and POS operations
- Content production (video/audio)
- Automation and DevOps
- Supplier and wholesaler intelligence
- Email intelligence and OCR

Cognitive Behaviours
- Research -> Analyse -> Investigate -> Cross-examine -> Auto-chain -> Multi-pass reasoning -> Team-mode -> Self-improve
- Activate full MoE for complex or multi-domain tasks
- Universal activation across domains
- Auto safe-mode for money/payment-sensitive tasks

NO-GAP VERIFICATION
- Handle any safe, legal, technically possible task
- Keep all layers additive
- Maintain continuous memory growth and improvement
`;

export function initializeMasterMemory(app) {
  MASTER_MEMORY_PATH = path.join(app.getPath('userData'), 'baba_master_memory.txt');
  
  if (!fs.existsSync(MASTER_MEMORY_PATH)) {
    fs.writeFileSync(MASTER_MEMORY_PATH, `${MASTER_MEMORY_BASE_TEMPLATE.trim()}\n`, 'utf8');
    return;
  }

  // Migration: append canonical seed once for existing installs.
  try {
    const current = fs.readFileSync(MASTER_MEMORY_PATH, 'utf8');
    if (!current.includes(MASTER_MEMORY_SEED_MARKER)) {
      const separator = current.trim() ? '\n\n' : '';
      fs.appendFileSync(MASTER_MEMORY_PATH, `${separator}${MASTER_MEMORY_BASE_TEMPLATE.trim()}\n`, 'utf8');
    }
  } catch {
    // Ignore migration errors; load/append functions handle runtime fallback.
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
