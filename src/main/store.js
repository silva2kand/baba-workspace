import fs from 'node:fs';
import path from 'node:path';

let STORE_DIR;
let STORE_PATH;

export function initializeStorePaths(app) {
  STORE_DIR = app.getPath('userData');
  STORE_PATH = path.join(STORE_DIR, 'baba_store.json');
  // Ensure directory exists
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

const DEFAULT_STATE = {
  // Existing
  wikiEntries: [
    {
      id: "seed-hmrc-1",
      title: "HMRC Dispute Playbook",
      category: "playbook",
      content: "HMRC Dispute Protocol:\n\n1. ALWAYS confirm the deadline date first.\n2. Fetch the corresponding tax band assessment.\n3. Identify any clerical mismatches between the issued bill and the internal system.\n4. Draft a formal challenge referencing the specific assessment ID.\n5. Wait for operator approval before submitting via Open Exo.\n\nEscalation: If HMRC replies with a denial, immediately route to Solicitor Agent.",
      lastUpdated: new Date().toISOString().split('T')[0],
      tags: ["tax", "hmrc", "dispute", "finance"]
    },
    {
      id: "seed-property-1",
      title: "Property Law Contexts",
      category: "knowledge",
      content: "Commercial Property Completion Standards:\n\n- Completion dates must be strictly adhered to.\n- Ensure funds are cleared 48 hours prior to the completion date.\n- Validate signatures against the Law Society registry.\n- Cross-reference property ID with the Land Registry portal.",
      lastUpdated: new Date().toISOString().split('T')[0],
      tags: ["property", "legal", "real-estate"]
    },
    {
      id: "seed-vat-1",
      title: "VAT Return Preparation",
      category: "playbook",
      content: "Standard VAT Return Flow:\n\n1. Aggregate all supplier invoices from the current period.\n2. Calculate total input and output VAT.\n3. Match with Bank feed data.\n4. Generate Draft Return.\n5. Request Approval.\n6. File via HMRC portal connector.",
      lastUpdated: new Date().toISOString().split('T')[0],
      tags: ["tax", "vat", "finance"]
    },
    {
      id: "seed-util-1",
      title: "Utilities Invoice Scraping",
      category: "knowledge",
      content: "Target Fields for Utility Bills:\n- Provider (BT, EDF, Thames Water)\n- Statement Month\n- Total Amount Due\n- Unexpected surcharges (Flag if > 15% increase month-over-month).",
      lastUpdated: new Date().toISOString().split('T')[0],
      tags: ["utilities", "finance", "audit"]
    },
    {
      id: "seed-insur-1",
      title: "Insurance Claim Processing",
      category: "playbook",
      content: "Insurance Claim Verification:\n\n1. Receive initial claim alert (e.g. Water Damage).\n2. Dispatch Claws to verify timestamp of incident vs coverage start date.\n3. Prepare documented evidence timeline.\n4. Automatically draft the notification of claim to the carrier.",
      lastUpdated: new Date().toISOString().split('T')[0],
      tags: ["insurance", "legal"]
    },
    {
      id: "seed-contract-1",
      title: "Contract Dispute Template",
      category: "template",
      content: "Dear [Carrier/Supplier/Entity],\n\nWe are writing formally to contest the recent [assessment/charge/action] dated [Date], reference number [Ref].\n\nOur internal audit reveals the following discrepancies:\n[INSERT CLAWS FINDINGS]\n\nWe request an immediate pause on any adverse actions while this is being reviewed.\n\nYours sincerely,\n[Agent Name] for [Business]",
      lastUpdated: new Date().toISOString().split('T')[0],
      tags: ["legal", "contract", "template"]
    }
  ],
  connections: [],
  cases: [],
  settings: {
    email: {
      outlookClientId: '',
      outlookTenant: 'common',
      gmailClientId: '',
    }
  },

  // NEW: Persistent task storage
  tasks: [],

  // NEW: Persistent email cache
  emails: [],

  // NEW: Scheduler history
  schedulerHistory: [],

  // NEW: Chat threads
  chatThreads: [],

  // NEW: Radar alerts
  radarAlerts: [],

  // NEW: Approved actions
  approvals: [],

  // NEW: System evolution log
  evolutionLog: [],

  // NEW: User preferences
  preferences: {
    theme: 'warm-light',
    density: 'comfortable',
    motion: 'balanced',
    defaultAgent: 'brain',
    autoSaveEnabled: true,
  },

  // NEW: Metadata
  metadata: {
    version: '0.9.2',
    lastBackup: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
};

export function loadStore(app) {
  if (!STORE_DIR) initializeStorePaths(app);
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load store:', err);
  }
  
  // Return seed data if none
  saveStore(DEFAULT_STATE);
  return DEFAULT_STATE;
}

export function saveStore(data, app) {
  if (!STORE_DIR && app) initializeStorePaths(app);
  try {
    // Update metadata timestamp
    if (data.metadata) {
      data.metadata.updatedAt = new Date().toISOString();
    }
    
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to save store:', err);
    return false;
  }
}

// Helper: Update specific store field without loading/saving entire store
export function updateStoreField(fieldName, fieldValue, app) {
  if (!STORE_DIR) initializeStorePaths(app);
  const store = loadStore(app);
  store[fieldName] = fieldValue;
  return saveStore(store, app);
}

// Helper: Get specific store field
export function getStoreField(fieldName, app) {
  if (!STORE_DIR) initializeStorePaths(app);
  const store = loadStore(app);
  return store[fieldName];
}

// Helper: Backup store to a timestamped file
export function backupStore(app) {
  if (!STORE_DIR) initializeStorePaths(app);
  const store = loadStore(app);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(STORE_DIR, `baba_store_backup_${timestamp}.json`);
  
  try {
    fs.writeFileSync(backupPath, JSON.stringify(store, null, 2));
    store.metadata.lastBackup = new Date().toISOString();
    saveStore(store, app);
    return { success: true, path: backupPath };
  } catch (err) {
    console.error('Failed to backup store:', err);
    return { success: false, error: String(err) };
  }
}

// Expose store directory for IPC handlers
export function getStoreDirectory() {
  return STORE_DIR;
}
