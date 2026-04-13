// ELECTRON ESM WORKAROUND - ONLY WAY THAT WORKS
import * as electron from 'electron';
const app = electron.default.app;
const BrowserWindow = electron.default.BrowserWindow;
const ipcMain = electron.default.ipcMain;
const Tray = electron.default.Tray;
const Menu = electron.default.Menu;
const nativeImage = electron.default.nativeImage;
const screen = electron.default.screen;
const shell = electron.default.shell;
const safeStorage = electron.default.safeStorage;

// Initialize store paths immediately once app is available
import {
  initializeStorePaths,
  loadStore,
  saveStore,
  getStoreField,
  updateStoreField,
  backupStore,
} from './store.js';
import { initializeBrainPaths, BrainIndex, initializeMasterMemory, loadMasterMemory, appendMasterMemory, injectMasterMemory } from './brain.js';
import os from 'node:os';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rendererDevUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const rendererProdHtml = path.join(__dirname, '../../dist/index.html');

let mainWindow = null;
let tray = null;
let popupWindows = {};
let isQuitting = false;  // ← tracks real quit intent

function setStoreField(fieldName, fieldValue) {
  // Defensive fallback in case a stale runtime build is missing the helper import.
  if (typeof updateStoreField === 'function') {
    return updateStoreField(fieldName, fieldValue, app);
  }
  const store = loadStore(app);
  store[fieldName] = fieldValue;
  return saveStore(store, app);
}

function getSecretsPath() {
  return path.join(app.getPath('userData'), 'baba_secrets.json');
}

function readSecretsFile() {
  try {
    const p = getSecretsPath();
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw || '{}') || {};
  } catch {
    return {};
  }
}

function writeSecretsFile(data) {
  const p = getSecretsPath();
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return true;
}

function encryptJson(value) {
  const json = JSON.stringify(value);
  if (safeStorage?.isEncryptionAvailable?.()) {
    const buf = safeStorage.encryptString(json);
    return { enc: true, data: buf.toString('base64') };
  }
  return { enc: false, data: json };
}

function decryptJson(payload) {
  if (!payload) return null;
  try {
    if (payload.enc && safeStorage?.isEncryptionAvailable?.()) {
      const buf = Buffer.from(payload.data, 'base64');
      return JSON.parse(safeStorage.decryptString(buf));
    }
    return JSON.parse(payload.data);
  } catch {
    return null;
  }
}

function normalizeEmailTokenStore(secrets) {
  if (!secrets.emailTokens) secrets.emailTokens = {};
  for (const providerId of Object.keys(secrets.emailTokens)) {
    const entry = secrets.emailTokens[providerId];
    if (!entry) continue;
    if (entry?.enc !== undefined && entry?.data !== undefined) {
      const decoded = decryptJson(entry);
      const account = String(decoded?.account || providerId);
      secrets.emailTokens[providerId] = { [account]: entry };
    }
  }
  return secrets;
}

function getEmailTokens(providerId, account) {
  const secrets = normalizeEmailTokenStore(readSecretsFile());
  const providerStore = secrets?.emailTokens?.[providerId];
  if (!providerStore) return null;
  const key = account ? String(account) : Object.keys(providerStore)[0];
  return decryptJson(providerStore?.[key]) || null;
}

function setEmailTokens(providerId, account, tokens) {
  const secrets = normalizeEmailTokenStore(readSecretsFile());
  if (!secrets.emailTokens[providerId]) secrets.emailTokens[providerId] = {};
  const key = String(account || tokens?.account || providerId);
  secrets.emailTokens[providerId][key] = encryptJson(tokens);
  writeSecretsFile(secrets);
  return true;
}

function clearEmailTokens(providerId, account) {
  const secrets = normalizeEmailTokenStore(readSecretsFile());
  if (!secrets?.emailTokens?.[providerId]) return true;
  if (account) {
    delete secrets.emailTokens[providerId][String(account)];
    if (Object.keys(secrets.emailTokens[providerId]).length === 0) delete secrets.emailTokens[providerId];
  } else {
    delete secrets.emailTokens[providerId];
  }
  writeSecretsFile(secrets);
  return true;
}

function base64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function makePkce() {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge, method: 'S256' };
}

function createLoopbackServer(expectedState) {
  return new Promise((resolve, reject) => {
    let resolveCode;
    let rejectCode;

    const codePromise = new Promise((res, rej) => {
      resolveCode = res;
      rejectCode = rej;
    });

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        if (url.pathname !== '/') {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body style="font-family: system-ui; padding: 24px;"><h3>Connected</h3><p>You can close this window.</p></body></html>');

        if (error) {
          try { server.close(); } catch { }
          rejectCode(new Error(String(error)));
          return;
        }
        if (!code || state !== expectedState) return;
        try { server.close(); } catch { }
        resolveCode({ code: String(code) });
      } catch { }
    });

    const timeout = setTimeout(() => {
      try { server.close(); } catch { }
      rejectCode(new Error('OAuth timeout'));
    }, 5 * 60 * 1000);

    server.on('error', (err) => {
      clearTimeout(timeout);
      try { server.close(); } catch { }
      rejectCode(err);
      reject(err);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const redirectUri = `http://localhost:${port}`;
      resolve({
        redirectUri,
        waitForCode: async () => {
          try {
            return await codePromise;
          } finally {
            clearTimeout(timeout);
          }
        },
      });
    });
  });
}

async function oauthPkceFlow({ authUrlBase, tokenUrl, clientId, scopes, extraAuthParams, extraTokenParams }) {
  const state = base64Url(crypto.randomBytes(18));
  const pkce = makePkce();
  const loopback = await createLoopbackServer(state);
  const authUrl = new URL(authUrlBase);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', loopback.redirectUri);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', pkce.challenge);
  authUrl.searchParams.set('code_challenge_method', pkce.method);
  for (const [k, v] of Object.entries(extraAuthParams || {})) {
    authUrl.searchParams.set(k, String(v));
  }

  await shell.openExternal(authUrl.toString());
  const { code } = await loopback.waitForCode();

  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', loopback.redirectUri);
  body.set('code_verifier', pkce.verifier);
  body.set('scope', scopes.join(' '));
  for (const [k, v] of Object.entries(extraTokenParams || {})) {
    body.set(k, String(v));
  }

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const now = Date.now();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: now + (Number(json.expires_in || 0) * 1000),
    scope: json.scope,
    token_type: json.token_type,
    id_token: json.id_token,
  };
}

async function refreshAccessToken({ tokenUrl, clientId, refreshToken, scopes, extraTokenParams }) {
  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);
  if (scopes?.length) body.set('scope', scopes.join(' '));
  for (const [k, v] of Object.entries(extraTokenParams || {})) {
    body.set(k, String(v));
  }

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const now = Date.now();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token || refreshToken,
    expires_at: now + (Number(json.expires_in || 0) * 1000),
    scope: json.scope,
    token_type: json.token_type,
    id_token: json.id_token,
  };
}

async function graphGet(accessToken, url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
  if (!res.ok) throw new Error(`Graph error (${res.status}): ${await res.text()}`);
  return res.json();
}

async function gmailGet(accessToken, url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
  if (!res.ok) throw new Error(`Gmail error (${res.status}): ${await res.text()}`);
  return res.json();
}

function psQuote(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function getWindowsPowerShellExe() {
  const root = process.env.SystemRoot || 'C:\\Windows';
  return path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

async function runPowerShellJson(script) {
  const { exec } = require('child_process');
  const psExe = getWindowsPowerShellExe();
  return await new Promise((resolve, reject) => {
    exec(
      `"${psExe}" -STA -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 25_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || stdout || error.message || error)));
          return;
        }
        try {
          resolve(JSON.parse(stdout || '[]'));
        } catch (e) {
          reject(new Error(`PowerShell JSON parse failed: ${String(e?.message || e)}; raw=${String(stdout || '').slice(0, 500)}`));
        }
      }
    );
  });
}

async function outlookComSync({ maxResults, account }) {
  if (process.platform !== 'win32') return [];
  const max = Math.max(1, Math.min(Number(maxResults || 50), 200));
  const script = `
    $ErrorActionPreference = "Stop"
    $max = ${max}
    $ol = New-Object -ComObject Outlook.Application
    $ns = $ol.GetNamespace("MAPI")
    $results = @()
    $inboxAccessed = $false

    foreach ($store in $ns.Stores) {
      try {
        $inbox = $store.GetDefaultFolder(6)
        if (-not $inbox) { continue }
        $inboxAccessed = $true
        $items = $inbox.Items
        $items.Sort("[ReceivedTime]", $true)
        $count = 0
        foreach ($item in $items) {
          if ($null -eq $item) { continue }
          if ($item.Class -ne 43) { continue }
          $body = $item.Body
          $preview = ""
          if ($body) {
            $len = [Math]::Min(200, $body.Length)
            $preview = $body.Substring(0, $len)
          }
          $fromVal = ""
          try { $fromVal = [string]$item.SenderEmailAddress } catch {}
          if (-not $fromVal) { $fromVal = [string]$item.SenderName }
          $results += [pscustomobject]@{
            id = [string]$item.EntryID
            from = [string]$fromVal
            subject = [string]$item.Subject
            preview = [string]$preview
            folder = "inbox"
            account = [string]$store.DisplayName
            date = [string]$item.ReceivedTime
            isRead = [bool](-not $item.UnRead)
          }
          $count++
          if ($count -ge $max) { break }
        }
      } catch {}
    }
    if (-not $inboxAccessed) { throw "Could not access Inbox via Outlook COM. Use Classic Outlook and ensure a profile is configured." }
    $results | ConvertTo-Json -Depth 4
  `;
  return await runPowerShellJson(script);
}

async function outlookComMarkRead({ messageId }) {
  if (process.platform !== 'win32') throw new Error('Outlook desktop integration requires Windows');
  const script = `
    $ErrorActionPreference = "Stop"
    $entryId = ${psQuote(messageId)}
    $ol = New-Object -ComObject Outlook.Application
    $ns = $ol.GetNamespace("MAPI")
    $item = $ns.GetItemFromID($entryId)
    if ($item) {
      $item.UnRead = $false
      $item.Save() | Out-Null
    }
    "{\\"ok\\":true}"
  `;
  const out = await new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const psExe = getWindowsPowerShellExe();
    exec(
      `"${psExe}" -STA -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`,
      { maxBuffer: 2 * 1024 * 1024, timeout: 20_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || stdout || error.message || error)));
          return;
        }
        resolve(stdout || '{"ok":true}');
      }
    );
  });
  try {
    return JSON.parse(String(out));
  } catch {
    return { ok: true };
  }
}

async function outlookComSend({ to, subject, body }) {
  if (process.platform !== 'win32') throw new Error('Outlook desktop integration requires Windows');
  const script = `
    $ErrorActionPreference = "Stop"
    $to = ${psQuote(to)}
    $subject = ${psQuote(subject)}
    $body = ${psQuote(body)}
    $ol = New-Object -ComObject Outlook.Application
    $mail = $ol.CreateItem(0)
    $mail.To = $to
    $mail.Subject = $subject
    $mail.Body = $body
    $mail.Send() | Out-Null
    "{\\"ok\\":true}"
  `;
  const out = await new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const psExe = getWindowsPowerShellExe();
    exec(
      `"${psExe}" -STA -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`,
      { maxBuffer: 2 * 1024 * 1024, timeout: 20_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || stdout || error.message || error)));
          return;
        }
        resolve(stdout || '{"ok":true}');
      }
    );
  });
  try {
    return JSON.parse(String(out));
  } catch {
    return { ok: true };
  }
}

async function outlookComStatus() {
  if (process.platform !== 'win32') return { ok: false, error: 'Outlook desktop integration requires Windows' };
  const script = `
    $ErrorActionPreference = "Stop"
    $ol = New-Object -ComObject Outlook.Application
    $ns = $ol.GetNamespace("MAPI")
    $stores = @()
    foreach ($s in $ns.Stores) { try { $stores += [string]$s.DisplayName } catch {} }
    try {
      $inbox = $ns.GetDefaultFolder(6)
      if (-not $inbox) { throw "Inbox not available" }
    } catch {
      throw "Could not access Inbox via Outlook COM. Use Classic Outlook and ensure a profile is configured."
    }
    [pscustomobject]@{ ok = $true; stores = $stores } | ConvertTo-Json -Depth 4
  `;
  try {
    const res = await runPowerShellJson(script);
    const stores = Array.isArray(res?.stores) ? res.stores.map((x) => String(x)) : [];
    return { ok: true, stores };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

function gmailEncodeRawMessage({ to, subject, body, from }) {
  const lines = [];
  if (from) lines.push(`From: ${from}`);
  lines.push(`To: ${to}`);
  lines.push(`Subject: ${subject}`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('');
  lines.push(body || '');

  const raw = lines.join('\r\n');
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

// ── Debug hook ──────────────────────────────────────────────────
function attachWindowDebug(win, label) {
  win.webContents.on('did-fail-load', (_, code, desc, url) => {
    console.error(`[${label}] did-fail-load code=${code} url=${url} desc=${desc}`);
  });
  win.webContents.on('render-process-gone', (_, details) => {
    console.error(`[${label}] render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
}

const LAUNCHABLE_APPS = Object.freeze({
  outlook: 'outlook.exe',
  whatsapp: 'WhatsApp.exe',
  chrome: 'chrome.exe',
  edge: 'msedge.exe',
  excel: 'excel.exe',
  word: 'winword.exe',
  explorer: 'explorer.exe',
  notepad: 'notepad.exe',
  calculator: 'calc.exe',
  terminal: 'wt.exe',
  wt: 'wt.exe',
  powershell: 'powershell.exe',
  taskmgr: 'taskmgr.exe',
  taskmanager: 'taskmgr.exe',
  regedit: 'regedit.exe',
  teams: 'teams.exe',
});

const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function isSafeExternalUrl(raw) {
  try {
    const parsed = new URL(String(raw || ''));
    return SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function normalizePathForCompare(p) {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isPathWithin(rootPath, targetPath) {
  const root = normalizePathForCompare(rootPath);
  const target = normalizePathForCompare(targetPath);
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function getAllowedFsRoots() {
  return [
    app.getPath('home'),
    app.getPath('desktop'),
    app.getPath('documents'),
    app.getPath('downloads'),
    app.getPath('userData'),
    process.cwd(),
  ].filter(Boolean);
}

function sanitizeFsPath(rawPath) {
  if (typeof rawPath !== 'string') return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  try {
    return path.resolve(trimmed);
  } catch {
    return null;
  }
}

function isAllowedFsPath(targetPath) {
  const roots = getAllowedFsRoots();
  return roots.some((root) => isPathWithin(root, targetPath));
}

// ── Main window ─────────────────────────────────────────────────
function createMainWindow(isDev) {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1400, screenWidth),
    height: Math.min(900, screenHeight),
    minWidth: 900,
    minHeight: 600,
    x: 0,
    y: 0,
    title: 'Baba Workspace',
    // Use a fallback icon path — nativeImage.createEmpty() crashes on some systems
    icon: path.join(__dirname, '../renderer/assets/icon.png'),
    backgroundColor: '#0f1117',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1117',
      symbolColor: '#7c818c',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  attachWindowDebug(mainWindow, 'main');

  if (isDev) {
    mainWindow.loadURL(rendererDevUrl);
    // Open devtools detached so it doesn't block the UI
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(rendererProdHtml);
  }

  // Hide to tray instead of closing — unless isQuitting is true
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Tray ─────────────────────────────────────────────────────────
function createTray() {
  // Safe tray icon: try file first, fall back to a 1x1 PNG buffer
  let icon;
  try {
    const iconPath = path.join(__dirname, '../renderer/assets/icon.png');
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error('icon empty');
  } catch {
    // Minimal valid 16x16 PNG so tray doesn't crash
    const { createCanvas } = (() => { try { return require('canvas'); } catch { return null; } })() || {};
    if (createCanvas) {
      const canvas = createCanvas(16, 16);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#4f5cff';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('B', 3, 12);
      icon = nativeImage.createFromDataURL(canvas.toDataURL());
    } else {
      // Fallback: 1×1 transparent PNG
      const buf = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      icon = nativeImage.createFromBuffer(buf);
    }
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Baba', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'New Task', click: () => mainWindow?.webContents.send('navigate', 'new-task') },
    { type: 'separator' },
    {
      label: 'Quit Baba',
      click: () => {
        isQuitting = true;
        // Close all popups cleanly
        Object.values(popupWindows).forEach((w) => { try { w.destroy(); } catch { } });
        popupWindows = {};
        if (mainWindow) {
          mainWindow.destroy();
          mainWindow = null;
        }
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Baba Workspace');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ── App startup — only ONE whenReady call ────────────────────────
let brainIndex;

app.whenReady().then(() => {
  initializeStorePaths(app);
  initializeBrainPaths(app);
  initializeMasterMemory(app);
  brainIndex = new BrainIndex();

  const isDev = !app.isPackaged && process.env.FORCE_PROD !== '1';
  createMainWindow(isDev);
  createTray();

  // Handle Windows Auto-Start
  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true, // Start minimized to tray
    });
  }
});

// ── IPC handlers ─────────────────────────────────────────────────
ipcMain.handle('open-popup', (event, windowId, opts) => {
  const isDev = !app.isPackaged && process.env.FORCE_PROD !== '1';
  return createPopupWindow(windowId, opts, isDev);
});

ipcMain.handle('close-popup', (event, windowId) => {
  if (popupWindows[windowId]) {
    popupWindows[windowId].close();
    return true;
  }
  return false;
});

ipcMain.handle('resize-popup', (event, windowId, dimensions) => {
  const win = popupWindows[windowId];
  if (win) {
    if (dimensions.width) win.setSize(dimensions.width, dimensions.height || win.getSize()[1]);
    if (dimensions.height) win.setSize(win.getSize()[0], dimensions.height);
    return true;
  }
  return false;
});

ipcMain.handle('focus-popup', (event, windowId) => {
  const win = popupWindows[windowId];
  if (!win) return false;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return true;
});

ipcMain.handle('minimize-popup', (event, windowId, minimize = true) => {
  const win = popupWindows[windowId];
  if (!win) return false;
  if (minimize) {
    win.minimize();
    return true;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return true;
});

ipcMain.handle('get-system-info', () => {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const cpuUsage = 100 - ~~(100 * idle / total);

  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    cpuCount: cpus.length,
    cpuUsage: cpuUsage,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    memoryUsage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
    networkLatency: Math.floor(Math.random() * 20) + 10, // Latency isn't an OS prop, just mock ping
    uptime: os.uptime(),
  };
});

ipcMain.handle('system:store-load', () => {
  return loadStore(app);
});

ipcMain.handle('system:store-save', (event, data) => {
  return saveStore(data, app);
});

// NEW: Store field operations for granular updates
ipcMain.handle('system:store-field-get', (event, fieldName) => {
  return getStoreField(fieldName, app);
});

ipcMain.handle('system:store-field-set', (event, fieldName, fieldValue) => {
  return setStoreField(fieldName, fieldValue);
});

// NEW: Store backup
ipcMain.handle('system:store-backup', () => {
  return backupStore(app);
});

ipcMain.handle('system:scan-apps', async () => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    // Minimal reliable powershell scanner that fetches DisplayName, DisplayIcon, and Publisher
    const psScript = `
      Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object { $_.DisplayName } | Select-Object -Property DisplayName, Publisher, DisplayVersion | Select-Object -First 50 | ConvertTo-Json
    `;
    exec(`powershell -Command "${psScript}"`, (error, stdout) => {
      if (error) {
        console.error('App scan failed:', error);
        resolve([]);
      } else {
        try {
          resolve(JSON.parse(stdout || '[]'));
        } catch {
          resolve([]);
        }
      }
    });
  });
});

ipcMain.handle('system:launch-app', async (event, appId) => {
  const requestedId = String(appId || '').trim().toLowerCase();
  if (requestedId === 'settings' || requestedId === 'ms-settings' || requestedId === 'ms-settings:') {
    try {
      await shell.openExternal('ms-settings:');
      return true;
    } catch {
      return false;
    }
  }
  const command = LAUNCHABLE_APPS[requestedId];
  if (!command) {
    console.warn(`Blocked launch request for unknown appId: ${String(appId)}`);
    return false;
  }
  try {
    try {
      await shell.openExternal(`shell:AppsFolder\\${command}`);
      return true;
    } catch { }

    const { spawn } = require('child_process');
    return await new Promise((resolve) => {
      const child = spawn(command, [], { detached: true, stdio: 'ignore', shell: false });
      child.once('error', () => resolve(false));
      child.once('spawn', () => {
        child.unref();
        resolve(true);
      });
    });
  } catch (err) {
    console.error(`Failed to launch ${appId}:`, err);
    return false;
  }
});

ipcMain.handle('system:open-url', async (event, url) => {
  const safeUrl = String(url || '').trim();
  if (!isSafeExternalUrl(safeUrl)) {
    console.warn(`Blocked open-url request for unsafe URL: ${safeUrl}`);
    return false;
  }
  try {
    await shell.openExternal(safeUrl);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('system:open-path', async (event, targetPath) => {
  const safePath = sanitizeFsPath(targetPath);
  if (!safePath || !isAllowedFsPath(safePath)) {
    console.warn(`Blocked open-path request: ${String(targetPath)}`);
    return false;
  }
  try {
    const errText = await shell.openPath(safePath);
    return errText === '';
  } catch {
    return false;
  }
});

// Brain Index handlers
ipcMain.handle('brain:ingest', async (event, title, category, content, source) => {
  return await brainIndex.ingest(title, category, content, source);
});

ipcMain.handle('brain:search', async (event, query) => {
  return await brainIndex.search(query);
});

ipcMain.handle('brain:stats', async () => {
  return await brainIndex.stats();
});

ipcMain.handle('brain:recent', async (event, n) => {
  return await brainIndex.recent(n);
});

// Master Memory handlers
ipcMain.handle('memory:load', async () => {
  return loadMasterMemory();
});

ipcMain.handle('memory:append', async (event, text) => {
  return appendMasterMemory(text);
});

// ── MiroFish Simulation IPC handlers ──────────────────────────────
const MIROFISH_DEFAULT_URL = 'http://localhost:8000';

async function miroFishRequest(path, options = {}) {
  const url = `${MIROFISH_DEFAULT_URL}${path}`;
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers,
      body,
      timeout: 30000,
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`MiroFish API error (${res.statusCode}): ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('MiroFish request timeout')); });

    if (body) req.write(body);
    req.end();
  });
}

ipcMain.handle('mirofish:health', async () => {
  try {
    const res = await miroFishRequest('/api/health');
    return { status: 'connected', dockerRunning: true, version: res.version, lastChecked: Date.now() };
  } catch (err) {
    return { status: 'disconnected', dockerRunning: false, lastChecked: Date.now(), error: err.message };
  }
});

ipcMain.handle('mirofish:create-simulation', async (event, job) => {
  return miroFishRequest('/api/simulations', {
    method: 'POST',
    body: {
      id: job.id,
      name: job.name,
      type: job.type,
      input_source: job.inputSource,
      input_content: job.inputContent,
      agent_count: job.agentCount,
    },
  });
});

ipcMain.handle('mirofish:simulation-status', async (event, simulationId) => {
  return miroFishRequest(`/api/simulations/${simulationId}/status`);
});

ipcMain.handle('mirofish:simulation-report', async (event, simulationId) => {
  return miroFishRequest(`/api/simulations/${simulationId}/report`);
});

ipcMain.handle('mirofish:cancel-simulation', async (event, simulationId) => {
  try {
    await miroFishRequest(`/api/simulations/${simulationId}/cancel`, { method: 'POST' });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('mirofish:list-simulations', async () => {
  return miroFishRequest('/api/simulations');
});

ipcMain.handle('mirofish:build-graph', async (event, content, sourceType) => {
  return miroFishRequest('/api/graph/build', {
    method: 'POST',
    body: { content, source_type: sourceType },
  });
});

ipcMain.handle('mirofish:query-graph', async (event, query) => {
  return miroFishRequest('/api/graph/query', {
    method: 'POST',
    body: { query },
  });
});

ipcMain.handle('email:connect', async (event, providerId, settings) => {
  if (providerId !== 'outlook' && providerId !== 'gmail') throw new Error('Unknown email provider');

  const emailSettings = settings?.email || {};

  if (providerId === 'outlook') {
    const clientId = String(emailSettings.outlookClientId || '').trim();
    const tenant = String(emailSettings.outlookTenant || 'common').trim() || 'common';
    if (!clientId) throw new Error('Outlook client ID missing in Settings → Email Connectors');

    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.ReadWrite.Shared',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.Send.Shared',
    ];
    const tokens = await oauthPkceFlow({
      authUrlBase: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      clientId,
      scopes,
      extraAuthParams: { prompt: 'select_account' },
    });

    const me = await graphGet(tokens.access_token, 'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName');
    const account = String(me?.mail || me?.userPrincipalName || 'outlook');
    setEmailTokens('outlook', account, { ...tokens, account, clientId, tenant });
    return { connected: true, account };
  }

  {
    const clientId = String(emailSettings.gmailClientId || '').trim();
    if (!clientId) throw new Error('Gmail client ID missing in Settings → Email Connectors');

    const scopes = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.send'];
    const tokens = await oauthPkceFlow({
      authUrlBase: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId,
      scopes,
      extraAuthParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
    });

    const info = await gmailGet(tokens.access_token, 'https://www.googleapis.com/oauth2/v3/userinfo');
    const account = String(info?.email || 'gmail');
    setEmailTokens('gmail', account, { ...tokens, account, clientId });
    return { connected: true, account };
  }
});

ipcMain.handle('email:disconnect', async (event, providerId) => {
  if (providerId !== 'outlook' && providerId !== 'gmail') return false;
  clearEmailTokens(providerId);
  return true;
});

ipcMain.handle('email:desktop-status', async () => {
  return await outlookComStatus();
});

ipcMain.handle('email:sync', async (event, providerId, options) => {
  if (providerId !== 'outlook' && providerId !== 'gmail') throw new Error('Unknown email provider');

  const maxResults = Math.max(1, Math.min(Number(options?.maxResults || 50), 200));
  const account = options?.account ? String(options.account) : undefined;
  if (providerId === 'outlook' && options?.desktop) {
    return await outlookComSync({ maxResults, account });
  }
  const tokens = getEmailTokens(providerId, account);
  if (!tokens?.access_token) {
    if (providerId === 'outlook') {
      return await outlookComSync({ maxResults, account });
    }
    return [];
  }

  const now = Date.now();
  const emailSettings = options?.settings?.email || {};

  let currentTokens = tokens;
  if (Number(tokens.expires_at || 0) && Number(tokens.expires_at) < now + 60_000 && tokens.refresh_token) {
    if (providerId === 'outlook') {
      const clientId = String(tokens.clientId || emailSettings.outlookClientId || '').trim();
      const tenant = String(tokens.tenant || emailSettings.outlookTenant || 'common').trim() || 'common';
      const scopes = [
        'openid',
        'profile',
        'email',
        'offline_access',
        'https://graph.microsoft.com/User.Read',
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.Read.Shared',
      ];
      currentTokens = await refreshAccessToken({
        tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        clientId,
        refreshToken: tokens.refresh_token,
        scopes,
      });
      currentTokens = { ...currentTokens, account: tokens.account, clientId, tenant };
      setEmailTokens('outlook', String(tokens.account || account || 'outlook'), currentTokens);
    } else {
      const clientId = String(tokens.clientId || emailSettings.gmailClientId || '').trim();
      const scopes = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly'];
      currentTokens = await refreshAccessToken({
        tokenUrl: 'https://oauth2.googleapis.com/token',
        clientId,
        refreshToken: tokens.refresh_token,
        scopes,
      });
      currentTokens = { ...currentTokens, account: tokens.account, clientId };
      setEmailTokens('gmail', String(tokens.account || account || 'gmail'), currentTokens);
    }
  }

  if (providerId === 'outlook') {
    let data;
    try {
      data = await graphGet(
        currentTokens.access_token,
        `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${maxResults}&$select=id,subject,bodyPreview,receivedDateTime,from,isRead&$orderby=receivedDateTime desc`
      );
    } catch {
      data = await graphGet(
        currentTokens.access_token,
        `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$select=id,subject,bodyPreview,receivedDateTime,from,isRead&$orderby=receivedDateTime desc`
      );
    }
    const items = Array.isArray(data?.value) ? data.value : [];
    const mapped = items.map((m) => ({
      id: String(m.id),
      from: String(m?.from?.emailAddress?.name || m?.from?.emailAddress?.address || 'Unknown'),
      subject: String(m?.subject || ''),
      preview: String(m?.bodyPreview || ''),
      folder: 'inbox',
      account: String(currentTokens.account || 'outlook'),
      date: String(m?.receivedDateTime || ''),
      isRead: Boolean(m?.isRead),
    }));
    if (mapped.length > 0) return mapped;
    return await outlookComSync({ maxResults, account: currentTokens.account || account });
  }

  const list = await gmailGet(
    currentTokens.access_token,
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`
  );
  const ids = Array.isArray(list?.messages) ? list.messages.map((x) => x.id).filter(Boolean) : [];
  const out = [];

  for (const id of ids) {
    const msg = await gmailGet(
      currentTokens.access_token,
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
    );
    const headers = Array.isArray(msg?.payload?.headers) ? msg.payload.headers : [];
    const getHeader = (name) => String(headers.find((h) => String(h.name).toLowerCase() === name)?.value || '');
    const from = getHeader('from') || 'Unknown';
    const subject = getHeader('subject') || '';
    const date = getHeader('date') || '';
    out.push({
      id: String(msg.id),
      from,
      subject,
      preview: String(msg?.snippet || ''),
      folder: 'inbox',
      account: String(currentTokens.account || 'gmail'),
      date,
      isRead: !(Array.isArray(msg?.labelIds) ? msg.labelIds.includes('UNREAD') : false),
    });
  }

  return out;
});

ipcMain.handle('email:mark-read', async (event, providerId, payload) => {
  if (providerId !== 'outlook' && providerId !== 'gmail') throw new Error('Unknown email provider');
  const messageId = String(payload?.messageId || '');
  if (!messageId) throw new Error('messageId missing');
  const account = payload?.account ? String(payload.account) : undefined;
  const tokens = getEmailTokens(providerId, account);
  if (!tokens?.access_token) {
    if (providerId === 'outlook') return await outlookComMarkRead({ messageId });
    throw new Error(`Not connected to ${providerId}`);
  }

  if (providerId === 'outlook') {
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) throw new Error(`Graph error (${res.status}): ${await res.text()}`);
      return { ok: true };
    } catch {
      return await outlookComMarkRead({ messageId });
    }
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  });
  if (!res.ok) throw new Error(`Gmail error (${res.status}): ${await res.text()}`);
  return { ok: true };
});

ipcMain.handle('email:send', async (event, providerId, payload) => {
  if (providerId !== 'outlook' && providerId !== 'gmail') throw new Error('Unknown email provider');
  const to = String(payload?.to || '').trim();
  const subject = String(payload?.subject || '').trim();
  const body = String(payload?.body || '');
  const account = payload?.account ? String(payload.account) : undefined;
  if (!to) throw new Error('to missing');
  if (!subject) throw new Error('subject missing');

  const tokens = getEmailTokens(providerId, account);
  if (!tokens?.access_token) {
    if (providerId === 'outlook') return await outlookComSend({ to, subject, body });
    throw new Error(`Not connected to ${providerId}`);
  }

  if (providerId === 'outlook') {
    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: 'Text', content: body },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: 'true',
        }),
      });
      if (!res.ok) throw new Error(`Graph error (${res.status}): ${await res.text()}`);
      return { ok: true };
    } catch {
      return await outlookComSend({ to, subject, body });
    }
  }

  const raw = gmailEncodeRawMessage({ to, subject, body });
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail error (${res.status}): ${await res.text()}`);
  return { ok: true };
});

// ── Filesystem IPC handlers ──────────────────────────────────────
ipcMain.handle('fs:listDir', async (event, dirPath) => {
  try {
    const safeDirPath = sanitizeFsPath(dirPath);
    if (!safeDirPath || !isAllowedFsPath(safeDirPath)) {
      return { files: [], error: 'Access denied for requested directory.' };
    }

    const entries = await fs.promises.readdir(safeDirPath, { withFileTypes: true });
    const files = (await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(safeDirPath, entry.name);
      let stat;
      try {
        stat = await fs.promises.stat(fullPath);
      } catch {
        return null;
      }
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        size: stat ? stat.size : 0,
        modified: stat ? stat.mtimeMs : 0,
        path: fullPath,
        extension: entry.isFile() ? path.extname(entry.name).slice(1).toLowerCase() : undefined,
      };
    }))).filter(Boolean);
    return { files, error: null };
  } catch (err) {
    return { files: [], error: String(err.message || err) };
  }
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const safeFilePath = sanitizeFsPath(filePath);
    if (!safeFilePath || !isAllowedFsPath(safeFilePath)) {
      return { content: null, error: 'Access denied for requested file.' };
    }

    // Only allow reading text-based files (prevent binary file issues)
    const ext = path.extname(safeFilePath).toLowerCase();
    const textExtensions = ['.txt', '.md', '.json', '.xml', '.html', '.htm', '.css', '.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.yaml', '.yml', '.csv', '.sql', '.log', '.env', '.ini', '.cfg', '.conf', '.bat', '.sh', '.ps1'];

    if (!textExtensions.includes(ext)) {
      return { content: null, error: `Preview not available for .${ext.slice(1)} files. Open in default app instead.` };
    }

    // Limit file size to 5MB for reading
    const stat = await fs.promises.stat(safeFilePath);
    if (stat.size > 5 * 1024 * 1024) {
      return { content: null, error: `File too large to preview (${(stat.size / 1024 / 1024).toFixed(1)} MB)` };
    }

    const content = await fs.promises.readFile(safeFilePath, 'utf-8');
    return { content, error: null };
  } catch (err) {
    return { content: null, error: String(err.message || err) };
  }
});

ipcMain.handle('fs:getFileInfo', async (event, filePath) => {
  try {
    const safeFilePath = sanitizeFsPath(filePath);
    if (!safeFilePath || !isAllowedFsPath(safeFilePath)) {
      return { error: 'Access denied for requested file.' };
    }
    const stat = await fs.promises.stat(safeFilePath);
    return {
      name: path.basename(safeFilePath),
      path: safeFilePath,
      isDirectory: stat.isDirectory(),
      size: stat.size,
      created: stat.birthtimeMs,
      modified: stat.mtimeMs,
      accessed: stat.atimeMs,
      extension: path.extname(safeFilePath).slice(1).toLowerCase(),
    };
  } catch (err) {
    return { error: String(err.message || err) };
  }
});

// ── Popup windows ────────────────────────────────────────────────
function createPopupWindow(windowId, opts, isDev) {
  if (popupWindows[windowId]) {
    popupWindows[windowId].focus();
    return popupWindows[windowId];
  }

  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: opts.width || 500,
    height: opts.height || 600,
    minWidth: opts.minWidth || 400,
    minHeight: opts.minHeight || 300,
    x: screenWidth - (opts.width || 500) - 20,
    y: 60,
    title: opts.title || windowId,
    backgroundColor: '#0f1117',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1117',
      symbolColor: '#7c818c',
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    alwaysOnTop: opts.alwaysOnTop || false,
    show: false,
  });

  attachWindowDebug(win, `popup:${windowId}`);

  if (isDev) {
    win.loadURL(`${rendererDevUrl}?popup=${windowId}`);
  } else {
    win.loadFile(rendererProdHtml, { query: { popup: windowId } });
  }

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { delete popupWindows[windowId]; });

  popupWindows[windowId] = win;
  return win;
}

// ── Error logging IPC handler ───────────────────────────────────
ipcMain.handle('log:error', async (_event, payload) => {
  try {
    const logDir = app.getPath('userData');
    const logFile = path.join(logDir, 'error.log');
    const timestamp = new Date().toISOString();
    const { name = 'Unknown', message = 'No message', stack = 'No stack' } = payload || {};
    const entry = [
      `[${timestamp}]`,
      `Component: ${name}`,
      `Message: ${message}`,
      `Stack: ${stack}`,
      '─'.repeat(80),
      '',
    ].join('\n');
    await fs.promises.appendFile(logFile, entry, 'utf-8');
  } catch (err) {
    // Fallback to console if file write fails
    console.error('[log:error] Failed to write to error log:', err);
  }
});

// ── Native Notification IPC handlers ─────────────────────────────
const { Notification: ElectronNotification } = electron.default;
const notificationHistory = [];
const activeNotifications = new Map();

ipcMain.handle('notify:send', async (event, { title, body, icon, type, onClickTarget }) => {
  const id = crypto.randomUUID();
  const notification = new ElectronNotification({
    title: title || 'Baba Workspace',
    body: body || '',
    icon: icon || path.join(__dirname, '../renderer/assets/icon.png'),
    urgency: type === 'error' ? 'critical' : type === 'warning' ? 'normal' : 'low',
  });

  const record = {
    id,
    title,
    body,
    icon,
    type: type || 'info',
    timestamp: Date.now(),
    read: false,
    onClickTarget: onClickTarget || null,
  };

  notification.on('click', () => {
    activeNotifications.set(id, { ...record, clicked: true });
    if (onClickTarget) {
      mainWindow?.webContents.send('notification:click', { id, target: onClickTarget });
    }
    mainWindow?.focus();
    mainWindow?.show();
  });

  notification.on('close', () => {
    activeNotifications.delete(id);
  });

  notification.show();
  activeNotifications.set(id, record);
  notificationHistory.unshift(record);

  // Keep history capped at 200
  if (notificationHistory.length > 200) {
    notificationHistory.length = 200;
  }

  // Notify renderer about new notification
  mainWindow?.webContents.send('notification:new', record);

  return { id, success: true };
});

ipcMain.handle('notify:get-history', () => {
  return [...notificationHistory];
});

ipcMain.handle('notify:mark-read', (event, ids) => {
  const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
  for (const item of notificationHistory) {
    if (idSet.has(item.id)) {
      item.read = true;
    }
  }
  return { success: true };
});

ipcMain.handle('notify:clear-history', () => {
  notificationHistory.length = 0;
  return { success: true };
});

// ── App lifecycle ────────────────────────────────────────────────
// On Windows: all-windows-closed fires when tray is also gone, but we use isQuitting flag
app.on('window-all-closed', () => {
  // Do NOT quit here — the tray keeps the app alive
  // Only quit when user explicitly clicks "Quit Baba" in tray menu
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
