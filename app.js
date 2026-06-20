// ============================================================
// AI Code Builder - app.js
// ============================================================

// ===== INDEXEDDB STORAGE LAYER =====
// Replaces localStorage as primary store (no 5MB limit, safer against
// accidental data loss). localStorage is kept only as a migration source
// and as an emergency last-resort mirror for small critical settings.
const IDB_NAME = 'acb_db';
const IDB_VERSION = 1;
const IDB_STORE = 'kv';
let _idbInstance = null;

function idbOpen() {
    return new Promise((resolve, reject) => {
        if (_idbInstance) { resolve(_idbInstance); return; }
        if (!window.indexedDB) { reject(new Error('IndexedDB not supported')); return; }
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => { _idbInstance = req.result; resolve(_idbInstance); };
        req.onerror = () => reject(req.error);
    });
}

async function idbSet(key, value) {
    try {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(value, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) { console.error('idbSet failed:', e); return false; }
}

async function idbGet(key) {
    try {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } catch (e) { console.error('idbGet failed:', e); return undefined; }
}

async function idbGetAllKeys() {
    try {
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).getAllKeys();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } catch (e) { return []; }
}

// ===== TEMPLATES =====
const TEMPLATES = [
    {
        id: 'discord-py',
        name: 'Discord Bot',
        desc: 'Python / discord.py v2',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        files: [
            { name: 'main.py', content: '# Discord Bot (Python)\n# AIに「コマンドBotを作って」などと指示してください\n' },
            { name: 'requirements.txt', content: 'discord.py>=2.3.0\npython-dotenv\n' },
            { name: '.env.example', content: 'DISCORD_TOKEN=your_token_here\n' },
        ]
    },
    {
        id: 'discord-js',
        name: 'Discord Bot',
        desc: 'Node.js / discord.js v14',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
        files: [
            { name: 'index.js', content: '// Discord Bot (Node.js)\n// AIに指示してください\n' },
            { name: 'package.json', content: '{\n  "name": "discord-bot",\n  "version": "1.0.0",\n  "main": "index.js",\n  "dependencies": {\n    "discord.js": "^14.0.0",\n    "dotenv": "^16.0.0"\n  }\n}\n' },
        ]
    },
    {
        id: 'webapp',
        name: 'Webアプリ',
        desc: 'HTML + CSS + JavaScript',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
        files: [
            { name: 'index.html', content: '<!DOCTYPE html>\n<html lang="ja">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Webアプリ</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n\n    <script src="app.js"></script>\n</body>\n</html>\n' },
            { name: 'style.css', content: '/* スタイル */\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: system-ui, sans-serif; }\n' },
            { name: 'app.js', content: '// メインスクリプト\n' },
        ]
    },
    {
        id: 'react',
        name: 'React アプリ',
        desc: 'Vite + React + TypeScript',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>`,
        files: [
            { name: 'App.tsx', content: 'import { useState } from "react"\n\nfunction App() {\n  const [count, setCount] = useState(0)\n  return (\n    <div>\n      <h1>React App</h1>\n      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>\n    </div>\n  )\n}\n\nexport default App\n' },
            { name: 'main.tsx', content: 'import { StrictMode } from "react"\nimport { createRoot } from "react-dom/client"\nimport App from "./App"\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode><App /></StrictMode>\n)\n' },
            { name: 'package.json', content: '{\n  "name": "react-app",\n  "scripts": { "dev": "vite", "build": "vite build" },\n  "dependencies": { "react": "^18.0.0", "react-dom": "^18.0.0" },\n  "devDependencies": { "@vitejs/plugin-react": "^4.0.0", "typescript": "^5.0.0", "vite": "^5.0.0" }\n}\n' },
        ]
    },
    {
        id: 'fastapi',
        name: 'REST API',
        desc: 'Python / FastAPI',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
        files: [
            { name: 'main.py', content: 'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef root():\n    return {"message": "Hello World"}\n' },
            { name: 'requirements.txt', content: 'fastapi>=0.100.0\nuvicorn[standard]\npydantic\n' },
        ]
    },
    {
        id: 'express',
        name: 'REST API',
        desc: 'Node.js / Express',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
        files: [
            { name: 'index.js', content: 'const express = require("express")\nconst app = express()\n\napp.use(express.json())\n\napp.get("/", (req, res) => {\n  res.json({ message: "Hello World" })\n})\n\napp.listen(3000, () => console.log("Server running on port 3000"))\n' },
            { name: 'package.json', content: '{\n  "name": "express-api",\n  "version": "1.0.0",\n  "main": "index.js",\n  "dependencies": { "express": "^4.18.0" }\n}\n' },
        ]
    },
    {
        id: 'cli',
        name: 'CLIツール',
        desc: 'Python コマンドラインアプリ',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
        files: [
            { name: 'main.py', content: 'import argparse\n\ndef main():\n    parser = argparse.ArgumentParser(description="CLIツール")\n    parser.add_argument("input", help="入力")\n    args = parser.parse_args()\n    print(f"入力: {args.input}")\n\nif __name__ == "__main__":\n    main()\n' },
        ]
    },
    {
        id: 'scraper',
        name: 'スクレイパー',
        desc: 'Python / BeautifulSoup',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
        files: [
            { name: 'scraper.py', content: 'import requests\nfrom bs4 import BeautifulSoup\n\ndef scrape(url: str):\n    res = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})\n    soup = BeautifulSoup(res.text, "html.parser")\n    return soup\n\nif __name__ == "__main__":\n    soup = scrape("https://example.com")\n    print(soup.title.text)\n' },
            { name: 'requirements.txt', content: 'requests\nbeautifulsoup4\n' },
        ]
    },
    {
        id: 'linebot',
        name: 'LINE Bot',
        desc: 'Python / LINE Messaging API',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
        files: [
            { name: 'main.py', content: 'from flask import Flask, request, abort\nfrom linebot.v3 import WebhookHandler\nfrom linebot.v3.messaging import ApiClient, Configuration, MessagingApi\nfrom linebot.v3.webhooks import MessageEvent, TextMessageContent\nimport os\n\napp = Flask(__name__)\nhandler = WebhookHandler(os.environ["LINE_CHANNEL_SECRET"])\n\n@app.route("/callback", methods=["POST"])\ndef callback():\n    signature = request.headers["X-Line-Signature"]\n    body = request.get_data(as_text=True)\n    handler.handle(body, signature)\n    return "OK"\n\n@handler.add(MessageEvent, message=TextMessageContent)\ndef handle_message(event):\n    # AIに返信ロジックを作ってもらってください\n    pass\n\nif __name__ == "__main__":\n    app.run(port=5000)\n' },
            { name: 'requirements.txt', content: 'flask\nline-bot-sdk\n' },
            { name: '.env.example', content: 'LINE_CHANNEL_SECRET=\nLINE_CHANNEL_ACCESS_TOKEN=\n' },
        ]
    },
    {
        id: 'dataanalysis',
        name: 'データ分析',
        desc: 'Python / pandas + matplotlib',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
        files: [
            { name: 'analysis.py', content: 'import pandas as pd\nimport matplotlib.pyplot as plt\n\n# データを読み込む\n# df = pd.read_csv("data.csv")\n\n# サンプルデータ\ndf = pd.DataFrame({"x": range(10), "y": [i**2 for i in range(10)]})\n\nprint(df.describe())\n\nplt.figure(figsize=(8, 5))\nplt.plot(df["x"], df["y"])\nplt.title("Sample Plot")\nplt.savefig("output.png")\nplt.show()\n' },
            { name: 'requirements.txt', content: 'pandas\nmatplotlib\nseaborn\nnumpy\n' },
        ]
    },
    {
        id: 'telegrambot',
        name: 'Telegram Bot',
        desc: 'Python / python-telegram-bot',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
        files: [
            { name: 'bot.py', content: 'from telegram import Update\nfrom telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes\nimport os\n\nasync def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):\n    await update.message.reply_text("Bot起動中")\n\nasync def echo(update: Update, ctx: ContextTypes.DEFAULT_TYPE):\n    await update.message.reply_text(update.message.text)\n\napp = ApplicationBuilder().token(os.environ["BOT_TOKEN"]).build()\napp.add_handler(CommandHandler("start", start))\napp.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))\napp.run_polling()\n' },
            { name: 'requirements.txt', content: 'python-telegram-bot>=20.0\npython-dotenv\n' },
            { name: '.env.example', content: 'BOT_TOKEN=your_token_here\n' },
        ]
    },
    {
        id: 'blank',
        name: '空白',
        desc: '何でも自由に',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
        files: [
            { name: 'main.py', content: '' },
        ]
    },
];

// ===== STATE =====
const state = {
    projects: [],
    currentProjectId: null,
    currentFile: null,
    apiKeys: [],
    activeProvider: null,
    activeModel: '',
    customPrompt: '',
    theme: 'dark',
    deleteTarget: null,
    pendingApiKeyId: null,
    monacoEditor: null,
    diffMode: false,
    prevFileContent: {},
    isStreaming: false,
    // Auto mode
    autoMode: {
        running: false,
        totalIter: 3,
        currentIter: 0,
        goal: '',
        stopRequested: false,
    },
    // Danger confirm
    pendingDangerFiles: null,
    pendingDangerCallback: null,
    // Max mode
    maxMode: false,
    // Last used template
    lastUsedTemplate: null,
    // Image attachments staged for the next message
    pendingImages: [], // [{ id, dataUrl, name }]
};

// ===== PERSISTENCE =====
// Debounced IndexedDB save — coalesces rapid edits into one write.
let _saveTimer = null;
let _saveInFlight = false;
let _lastSavedAt = null;

function save() {
    // Update localStorage mirror synchronously for small, critical settings
    // only (cheap, and lets us recover provider/model instantly even if
    // IndexedDB is unavailable). Project data is NOT mirrored here — it's
    // too large and is the whole reason we moved to IndexedDB.
    try {
        localStorage.setItem('acb_apiKeys', JSON.stringify(state.apiKeys));
        localStorage.setItem('acb_activeProvider', state.activeProvider || '');
        localStorage.setItem('acb_activeModel', state.activeModel || '');
        localStorage.setItem('acb_customPrompt', state.customPrompt || '');
        localStorage.setItem('acb_theme', state.theme || 'dark');
        localStorage.setItem('acb_maxMode', state.maxMode ? '1' : '0');
        localStorage.setItem('acb_lastTpl', state.lastUsedTemplate || '');
    } catch (e) { console.warn('localStorage mirror failed (non-critical):', e); }

    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(flushSaveToIDB, 400);
}

async function flushSaveToIDB() {
    if (_saveInFlight) { clearTimeout(_saveTimer); _saveTimer = setTimeout(flushSaveToIDB, 200); return; }
    _saveInFlight = true;
    try {
        await idbSet('projects', state.projects);
        await idbSet('apiKeys', state.apiKeys);
        await idbSet('settings', {
            activeProvider: state.activeProvider,
            activeModel: state.activeModel,
            customPrompt: state.customPrompt,
            theme: state.theme,
            maxMode: state.maxMode,
            lastUsedTemplate: state.lastUsedTemplate,
        });
        _lastSavedAt = Date.now();
        updateSaveIndicator(true);
    } catch (e) {
        console.error('IndexedDB save failed:', e);
        updateSaveIndicator(false);
        toast('保存に失敗しました。ストレージ容量を確認してください', 'error', 4000);
    } finally {
        _saveInFlight = false;
    }
}

function updateSaveIndicator(ok) {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    if (ok) {
        el.textContent = `保存済み ${fmtTime(_lastSavedAt)}`;
        el.classList.remove('save-indicator-error');
    } else {
        el.textContent = '保存失敗';
        el.classList.add('save-indicator-error');
    }
}

async function load() {
    try {
        let projects = await idbGet('projects');
        let apiKeys  = await idbGet('apiKeys');
        let settings = await idbGet('settings');

        // ---- One-time migration from localStorage (old versions) ----
        if (projects === undefined) {
            const lsProjects = localStorage.getItem('acb_projects') || localStorage.getItem('dbb_projects');
            if (lsProjects) {
                try { projects = JSON.parse(lsProjects); } catch { projects = []; }
                console.info('Migrated projects from localStorage to IndexedDB');
            }
        }
        if (apiKeys === undefined) {
            const lsKeys = localStorage.getItem('acb_apiKeys') || localStorage.getItem('dbb_apiKeys');
            if (lsKeys) { try { apiKeys = JSON.parse(lsKeys); } catch { apiKeys = []; } }
        }

        state.projects = Array.isArray(projects) ? projects : [];
        state.apiKeys  = Array.isArray(apiKeys) ? apiKeys : [];

        if (settings) {
            state.activeProvider   = settings.activeProvider || null;
            state.activeModel      = settings.activeModel || '';
            state.customPrompt     = settings.customPrompt || '';
            state.theme            = settings.theme || 'dark';
            state.maxMode          = !!settings.maxMode;
            state.lastUsedTemplate = settings.lastUsedTemplate || null;
        } else {
            state.activeProvider = localStorage.getItem('acb_activeProvider') || localStorage.getItem('dbb_activeProvider') || null;
            state.activeModel    = localStorage.getItem('acb_activeModel') || localStorage.getItem('dbb_activeModel') || '';
            state.customPrompt   = localStorage.getItem('acb_customPrompt') || localStorage.getItem('dbb_customPrompt') || '';
            state.theme          = localStorage.getItem('acb_theme') || localStorage.getItem('dbb_theme') || 'dark';
            state.maxMode        = localStorage.getItem('acb_maxMode') === '1';
            state.lastUsedTemplate = localStorage.getItem('acb_lastTpl') || null;
        }

        // If we migrated anything from localStorage, persist immediately to IDB
        if (projects !== undefined || apiKeys !== undefined) {
            await flushSaveToIDB();
        }
    } catch (e) {
        console.error('Load failed, falling back to empty state:', e);
        state.projects = []; state.apiKeys = [];
    }
}

// ===== AUTO BACKUP (snapshot history, protects against corruption) =====
const MAX_BACKUPS = 5;
const BACKUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes while active

async function createAutoBackup() {
    try {
        if (!state.projects || state.projects.length === 0) return;
        const snapshot = {
            ts: Date.now(),
            projects: state.projects,
            apiKeys: state.apiKeys.map(k => ({ ...k, key: k.key ? '***' : '' })), // never back up raw keys
        };
        let backups = await idbGet('backups');
        if (!Array.isArray(backups)) backups = [];
        backups.unshift(snapshot);
        backups = backups.slice(0, MAX_BACKUPS);
        await idbSet('backups', backups);
    } catch (e) { console.warn('Auto backup failed:', e); }
}

async function listBackups() {
    const backups = await idbGet('backups');
    return Array.isArray(backups) ? backups : [];
}

async function restoreBackup(ts) {
    const backups = await listBackups();
    const snap = backups.find(b => b.ts === ts);
    if (!snap) { toast('バックアップが見つかりません', 'error'); return; }
    state.projects = snap.projects;
    await flushSaveToIDB();
    renderProjects();
    toast(`${new Date(ts).toLocaleString('ja-JP')} の状態に復元しました`, 'warning', 4000);
}

function initAutoBackup() {
    createAutoBackup();
    setInterval(createAutoBackup, BACKUP_INTERVAL_MS);
    // Also snapshot right before the tab closes/refreshes
    window.addEventListener('beforeunload', () => { createAutoBackup(); });
}

// ===== UTILS =====
const genId = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36);
const fmtTime = ts => new Date(ts).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
const fmtDate = ts => new Date(ts).toLocaleDateString('ja-JP',{month:'short',day:'numeric'});
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const delay = ms => new Promise(r => setTimeout(r, ms));

function getLang(filename) {
    const ext = (filename||'').split('.').pop().toLowerCase();
    return {py:'python',js:'javascript',ts:'typescript',jsx:'javascript',tsx:'typescript',json:'json',sh:'shell',bash:'shell',md:'markdown',yml:'yaml',yaml:'yaml',txt:'plaintext',env:'plaintext',toml:'toml',html:'html',css:'css',rs:'rust',go:'go',rb:'ruby',java:'java',cpp:'cpp',c:'c',cs:'csharp'}[ext] || 'plaintext';
}

// ===== LINT / DIAGNOSTICS BADGES =====
// Reads Monaco's current diagnostics (markers) for the active model and
// reflects them in the status bar + the corresponding file tab. Monaco's
// markers come from its built-in language services (mainly useful for
// JSON/TS/JS — for plain-text languages like Python this will simply
// report 0, which is fine since we don't run a real linter here).
function updateLintBadges() {
    if (!state.monacoEditor || typeof monaco === 'undefined') return;
    const model = state.monacoEditor.getModel();
    if (!model) return;

    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    const errorCount = markers.filter(m => m.severity === monaco.MarkerSeverity.Error).length;
    const warningCount = markers.filter(m => m.severity === monaco.MarkerSeverity.Warning).length;

    // --- Status bar ---
    const bar = document.getElementById('editor-status-bar');
    const errEl = document.getElementById('status-errors');
    const warnEl = document.getElementById('status-warnings');
    if (bar && errEl && warnEl) {
        errEl.textContent = `エラー ${errorCount}`;
        warnEl.textContent = `警告 ${warningCount}`;
        bar.classList.remove('has-errors', 'has-warnings');
        if (errorCount > 0) bar.classList.add('has-errors');
        else if (warningCount > 0) bar.classList.add('has-warnings');
    }

    // --- Tab badge for the currently open file ---
    if (state.currentFile) {
        const tab = document.querySelector(`.file-tab[data-filename="${cssEscapeAttr(state.currentFile)}"]`);
        if (tab) {
            tab.querySelectorAll('.tab-error-badge, .tab-warn-badge').forEach(b => b.remove());
            if (errorCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'tab-error-badge';
                badge.textContent = errorCount > 99 ? '99+' : String(errorCount);
                tab.appendChild(badge);
            } else if (warningCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'tab-warn-badge';
                badge.textContent = warningCount > 99 ? '99+' : String(warningCount);
                tab.appendChild(badge);
            }
        }
    }
}

// Minimal attribute-value escaper for use inside querySelector strings.
function cssEscapeAttr(str) {
    return String(str).replace(/["\\]/g, '\\$&');
}

// ===== DANGER DETECTION =====
// Detects patterns that could be harmful in generated code
const DANGER_PATTERNS = [
    { re: /os\.system\s*\(|subprocess\.(run|Popen|call)\s*\(.*shell\s*=\s*True/i, msg: 'シェルコマンドの実行 (shell=True)' },
    { re: /rm\s+-rf|rmdir\s+\/|del\s+\/[Ss]/i, msg: 'ファイル・ディレクトリの強制削除コマンド' },
    { re: /eval\s*\(|exec\s*\(/i, msg: '動的コード実行 (eval/exec)' },
    { re: /import\s+ctypes|__import__\s*\(/i, msg: '低レベルシステムアクセス (ctypes)' },
    { re: /DROP\s+TABLE|DELETE\s+FROM\s+\w+\s*;/i, msg: 'データベースの破壊的操作' },
    { re: /localStorage\.clear\(\)|sessionStorage\.clear\(\)/i, msg: 'ストレージの全削除' },
    { re: /(https?:\/\/[^\s"']+)\s*\/\s*(token|password|secret|credential)/i, msg: '資格情報の外部送信の可能性' },
];

function detectDanger(code) {
    const found = [];
    for (const p of DANGER_PATTERNS) {
        if (p.re.test(code)) found.push(p.msg);
    }
    return found;
}

// ===== TOAST =====
function toast(msg, type = 'success', duration = 2500) {
    const icons = {
        success: '<svg class="icon icon-sm toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
        error:   '<svg class="icon icon-sm toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
        warning: '<svg class="icon icon-sm toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = (icons[type] || '') + esc(msg);
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 300); }, duration);
}

// ===== THEME =====
function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    document.querySelectorAll('.icon-sun').forEach(el => el.classList.toggle('hidden', isDark));
    document.querySelectorAll('.icon-moon').forEach(el => el.classList.toggle('hidden', !isDark));
    if (state.monacoEditor) monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    save();
}
function toggleTheme() { applyTheme(state.theme === 'dark' ? 'light' : 'dark'); }

// ===== SCREEN =====
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ===== MODALS =====
const openModal  = id => document.getElementById(id).classList.remove('hidden');
const closeModal = id => document.getElementById(id).classList.add('hidden');

// ===== MONACO EDITOR =====
function initMonaco() {
    return new Promise(resolve => {
        if (typeof monaco === 'undefined') {
            setTimeout(() => initMonaco().then(resolve), 200);
            return;
        }
        const isDark = state.theme === 'dark';
        state.monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
            value: '',
            language: 'python',
            theme: isDark ? 'vs-dark' : 'vs',
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'line',
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
        });

        state.monacoEditor.onDidChangeModelContent(() => {
            if (state.isStreaming) return;
            const proj = getProj();
            if (!proj || !state.currentFile) return;
            const file = proj.files.find(f => f.name === state.currentFile);
            if (file) { file.content = state.monacoEditor.getValue(); save(); }
            // Update lint badges after content change (debounced)
            clearTimeout(state._lintTimer);
            state._lintTimer = setTimeout(updateLintBadges, 800);
        });

        // Track cursor position in status bar
        state.monacoEditor.onDidChangeCursorPosition(e => {
            const pos = e.position;
            const el = document.getElementById('status-pos');
            if (el) el.textContent = `行 ${pos.lineNumber}, 列 ${pos.column}`;
        });

        // Listen for marker changes (Monaco diagnostics)
        monaco.editor.onDidChangeMarkers(() => {
            clearTimeout(state._lintTimer);
            state._lintTimer = setTimeout(updateLintBadges, 300);
        });

        resolve();
    });
}

function setEditorContent(content, filename) {
    if (!state.monacoEditor) return;
    const lang = getLang(filename);
    const model = state.monacoEditor.getModel();
    if (model) {
        monaco.editor.setModelLanguage(model, lang);
        state.monacoEditor.setValue(content || '');
    }
}

// ===== HOME =====
function renderTemplates() {
    const grid = document.getElementById('template-grid');
    grid.innerHTML = '';
    TEMPLATES.forEach(t => {
        const card = document.createElement('div');
        const isActive = state.lastUsedTemplate === t.id;
        card.className = 'template-card' + (isActive ? ' template-card--active' : '');
        card.title = t.name + ' — ' + t.desc;
        // icon is raw SVG (no class="icon" needed — styled by .template-icon svg)
        card.innerHTML = `
            <div class="template-icon">${t.icon}</div>
            <div class="template-name">${esc(t.name)}</div>
            <div class="template-desc">${esc(t.desc)}</div>
            ${isActive ? '<div class="template-active-dot"></div>' : ''}`;
        card.addEventListener('click', () => {
            state.lastUsedTemplate = t.id;
            createProjectFromTemplate(t);
        });
        grid.appendChild(card);
    });
}

function createProjectFromTemplate(template) {
    const proj = {
        id: genId(), name: template.name,
        createdAt: Date.now(),
        files: template.files.map(f => ({...f})),
        chatHistory: [],
    };
    state.projects.unshift(proj);
    save(); renderProjects(); openProject(proj.id);
    toast(`「${template.name}」テンプレートを適用しました`);
}

function renderProjects(filter = '') {
    const grid = document.getElementById('projects-grid');
    Array.from(grid.children).forEach(c => { if (c.id !== 'new-project-btn') c.remove(); });

    const list = filter
        ? state.projects.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
        : state.projects;

    list.forEach(proj => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-card-name">${esc(proj.name)}</div>
            <div class="project-card-meta">${proj.files.length} ファイル &middot; ${fmtDate(proj.createdAt)}</div>
            <div class="project-card-actions">
                <button class="project-card-action danger" title="削除">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>`;
        card.addEventListener('click', e => { if (!e.target.closest('.project-card-action')) openProject(proj.id); });
        card.querySelector('.project-card-action').addEventListener('click', e => {
            e.stopPropagation();
            confirmDelete('project', proj.id, null, `「${proj.name}」を削除しますか？この操作は元に戻せません。`);
        });
        grid.insertBefore(card, document.getElementById('new-project-btn'));
    });
}

// ===== PROJECT =====
function openProject(id) {
    const proj = state.projects.find(p => p.id === id);
    if (!proj) return;
    state.currentProjectId = id;
    document.getElementById('project-title').textContent = proj.name;
    clearPendingImages();

    const chatEl = document.getElementById('chat-messages');
    chatEl.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon"><svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>
            <p class="welcome-text">作りたいものを教えてください。</p>
            <p class="welcome-hint">AIがコードを生成・改善します</p>
        </div>`;
    proj.chatHistory = cleanHistory(proj.chatHistory);
    save();
    (proj.chatHistory || []).forEach(m => appendMsg(m.role, m.content, m.time, false, m.images));

    state.diffMode = false;
    state.prevFileContent = {};
    state.lastApplySnapshot = null;
    if (_lastSavedAt) updateSaveIndicator(true);

    if (proj.files.length > 0) {
        state.currentFile = proj.files[0].name;
        renderTabs();
        showEditorForFile(proj.files[0]);
    } else {
        showEmptyState();
    }

    updateSendBtn();
    updateBadge();
    showScreen('editor-screen');
}

function getProj() { return state.projects.find(p => p.id === state.currentProjectId); }

function showEditorForFile(file) {
    document.getElementById('code-empty-state').classList.add('hidden');
    document.getElementById('monaco-editor').style.display = 'block';
    document.getElementById('current-file-name').textContent = file.name;
    setEditorContent(file.content, file.name);
    generateTerminalCommands();
    // Status bar
    const sb = document.getElementById('editor-status-bar');
    if (sb) {
        sb.classList.remove('hidden');
        const langEl = document.getElementById('status-lang');
        if (langEl) langEl.textContent = getLang(file.name);
    }
    setTimeout(updateLintBadges, 500);
}

function showEmptyState() {
    document.getElementById('code-empty-state').classList.remove('hidden');
    document.getElementById('monaco-editor').style.display = 'none';
    document.getElementById('file-tabs').innerHTML = '';
    document.getElementById('current-file-name').textContent = '';
    state.currentFile = null;
}

// ===== TABS =====
function renderTabs() {
    const proj = getProj();
    if (!proj) return;
    const container = document.getElementById('file-tabs');
    container.innerHTML = '';
    proj.files.forEach(file => {
        const tab = document.createElement('div');
        const isEmpty = !file.content || file.content.trim() === '';
        tab.className = 'file-tab' + (file.name === state.currentFile ? ' active' : '') + (isEmpty ? ' stale' : '');
        tab.title = isEmpty ? `${file.name} (内容なし)` : file.name;
        tab.dataset.filename = file.name;
        tab.innerHTML = `
            <span>${esc(file.name)}</span>
            <span class="file-tab-close"><svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>`;
        tab.addEventListener('click', e => { if (!e.target.closest('.file-tab-close')) switchFile(file.name); });
        tab.querySelector('.file-tab-close').addEventListener('click', e => {
            e.stopPropagation();
            confirmDelete('file', null, file.name, `「${file.name}」を削除しますか？`);
        });
        tab.addEventListener('contextmenu', e => { e.preventDefault(); showTabCtx(e.clientX, e.clientY, file.name); });
        container.appendChild(tab);
    });
}

function showTabCtx(x, y, filename) {
    removeTabCtx();
    const m = document.createElement('div');
    m.className = 'tab-ctx-menu'; m.id = 'tab-ctx-menu';
    m.style.cssText = `left:${x}px;top:${y}px`;
    m.innerHTML = `
        <div class="tab-ctx-item" data-a="rename">名前を変更</div>
        <div class="tab-ctx-item" data-a="download">ダウンロード</div>
        <div class="tab-ctx-item danger" data-a="delete">削除</div>`;
    m.querySelector('[data-a="rename"]').onclick  = () => { removeTabCtx(); openRenameModal(filename); };
    m.querySelector('[data-a="download"]').onclick = () => { removeTabCtx(); downloadFile(filename); };
    m.querySelector('[data-a="delete"]').onclick  = () => { removeTabCtx(); confirmDelete('file', null, filename, `「${filename}」を削除しますか？`); };
    document.body.appendChild(m);
    setTimeout(() => document.addEventListener('click', removeTabCtx, { once: true }), 0);
}
function removeTabCtx() { document.getElementById('tab-ctx-menu')?.remove(); }

function switchFile(name) {
    const proj = getProj();
    if (!proj) return;
    const file = proj.files.find(f => f.name === name);
    if (!file) return;

    if (state.monacoEditor && state.currentFile) {
        const cur = proj.files.find(f => f.name === state.currentFile);
        if (cur) { cur.content = state.monacoEditor.getValue(); save(); }
    }

    state.currentFile = name;
    renderTabs();
    showEditorForFile(file);
}

function addFile(name) {
    const proj = getProj();
    if (!proj) return;
    if (proj.files.find(f => f.name === name)) { toast(`「${name}」はすでに存在します`, 'error'); return; }
    proj.files.push({ name, content: '' });
    save(); renderTabs(); switchFile(name);
    toast(`「${name}」を追加しました`);
}

function openRenameModal(filename) {
    state.deleteTarget = { type: 'rename', filename };
    document.getElementById('rename-file-input').value = filename;
    openModal('rename-file-modal');
}

function renameFile(oldName, newName) {
    const proj = getProj();
    if (!proj) return;
    if (proj.files.find(f => f.name === newName)) { toast(`「${newName}」はすでに存在します`, 'error'); return; }
    const file = proj.files.find(f => f.name === oldName);
    if (!file) return;
    file.name = newName;
    if (state.currentFile === oldName) {
        state.currentFile = newName;
        document.getElementById('current-file-name').textContent = newName;
        setEditorContent(file.content, newName);
    }
    save(); renderTabs();
    toast(`「${oldName}」を「${newName}」に変更しました`);
}

function downloadFile(filename) {
    const proj = getProj();
    if (!proj) return;
    const file = proj.files.find(f => f.name === filename);
    if (!file) return;
    const content = (filename === state.currentFile && state.monacoEditor)
        ? state.monacoEditor.getValue() : file.content;
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename; a.click(); URL.revokeObjectURL(a.href);
    toast(`「${filename}」をダウンロードしました`);
}

// ===== CLEANUP TABS =====
function openCleanupModal() {
    const proj = getProj();
    if (!proj) return;
    const list = document.getElementById('cleanup-file-list');
    list.innerHTML = '';
    if (proj.files.length === 0) { toast('ファイルがありません', 'warning'); return; }

    proj.files.forEach(file => {
        const isEmpty = !file.content || file.content.trim() === '';
        const item = document.createElement('label');
        item.className = 'cleanup-file-item';
        item.innerHTML = `
            <input type="checkbox" value="${esc(file.name)}" ${isEmpty ? 'checked' : ''}>
            <span class="cleanup-file-name">${esc(file.name)}</span>
            <span class="cleanup-file-size">${file.content ? file.content.length + ' chars' : '0'}</span>
            ${isEmpty ? '<span class="cleanup-file-empty">内容なし</span>' : ''}`;
        const cb = item.querySelector('input');
        cb.addEventListener('change', () => item.classList.toggle('selected', cb.checked));
        if (isEmpty) item.classList.add('selected');
        list.appendChild(item);
    });
    openModal('cleanup-modal');
}

function executeCleanup() {
    const proj = getProj();
    if (!proj) return;
    const checks = document.querySelectorAll('#cleanup-file-list input[type="checkbox"]:checked');
    const toDelete = Array.from(checks).map(c => c.value);
    if (toDelete.length === 0) { toast('削除するファイルが選択されていません', 'warning'); return; }

    const names = toDelete.join('、');
    confirmDelete('files-bulk', null, toDelete, `以下のファイルを削除しますか？\n${names}`);
    closeModal('cleanup-modal');
}

// ===== DELETE CONFIRM =====
function confirmDelete(type, id, extra, message) {
    state.deleteTarget = { type, id, extra };
    document.getElementById('delete-confirm-message').textContent = message;
    openModal('delete-confirm-modal');
}

function executeDelete() {
    const t = state.deleteTarget;
    if (!t) return;
    if (t.type === 'project') {
        const name = state.projects.find(p => p.id === t.id)?.name;
        state.projects = state.projects.filter(p => p.id !== t.id);
        save(); renderProjects();
        toast(`「${name}」を削除しました`, 'warning');
    } else if (t.type === 'file') {
        deleteSingleFile(t.extra);
    } else if (t.type === 'files-bulk') {
        const proj = getProj();
        if (!proj) return;
        t.extra.forEach(name => {
            proj.files = proj.files.filter(f => f.name !== name);
        });
        save();
        if (t.extra.includes(state.currentFile)) {
            proj.files.length > 0 ? switchFile(proj.files[0].name) : showEmptyState();
        } else { renderTabs(); }
        toast(`${t.extra.length}個のファイルを削除しました`, 'warning');
    }
    state.deleteTarget = null;
}

function deleteSingleFile(filename) {
    const proj = getProj();
    if (!proj) return;
    proj.files = proj.files.filter(f => f.name !== filename);
    save();
    if (state.currentFile === filename) {
        proj.files.length > 0 ? switchFile(proj.files[0].name) : showEmptyState();
    } else { renderTabs(); }
    toast(`「${filename}」を削除しました`, 'warning');
}

// ===== EXPORT / IMPORT =====
function exportProject() {
    const proj = getProj();
    if (!proj) return;
    if (state.monacoEditor && state.currentFile) {
        const file = proj.files.find(f => f.name === state.currentFile);
        if (file) file.content = state.monacoEditor.getValue();
    }
    const data = JSON.stringify(proj, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${proj.name.replace(/\s+/g, '_')}_backup.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast(`「${proj.name}」をエクスポートしました`);
}

// ===== ZIP DOWNLOAD =====
async function downloadProjectZip() {
    const proj = getProj();
    if (!proj) return;

    // Save current editor content first
    if (state.monacoEditor && state.currentFile) {
        const file = proj.files.find(f => f.name === state.currentFile);
        if (file) file.content = state.monacoEditor.getValue();
    }

    if (proj.files.length === 0) { toast('ファイルがありません', 'warning'); return; }

    // Build ZIP using JSZip (loaded dynamically if needed)
    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();
        const folderName = proj.name.replace(/\s+/g, '_').replace(/[^\w\-_.]/g, '') || 'project';
        const folder = zip.folder(folderName);

        proj.files.forEach(file => {
            folder.file(file.name, file.content || '');
        });

        // Add README with run instructions if not present
        if (!proj.files.find(f => f.name === 'README.md')) {
            const hasPy = proj.files.some(f => f.name.endsWith('.py'));
            const hasJs = proj.files.some(f => f.name.endsWith('.js'));
            const readmeContent = [
                `# ${proj.name}`,
                '',
                '## セットアップ',
                hasPy ? '```bash\npip install -r requirements.txt\npython main.py\n```' : '',
                hasJs ? '```bash\nnpm install\nnode index.js\n```' : '',
                '',
                `生成日: ${new Date().toLocaleDateString('ja-JP')}`,
            ].join('\n');
            folder.file('README.md', readmeContent);
        }

        const blob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${folderName}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast(`「${proj.name}」をZIPでダウンロードしました (${proj.files.length}ファイル)`);
    } catch (err) {
        console.error(err);
        toast('ZIPの生成に失敗しました: ' + err.message, 'error');
    }
}

function loadJSZip() {
    return new Promise((resolve, reject) => {
        if (window.JSZip) { resolve(window.JSZip); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error('JSZipの読み込みに失敗しました'));
        document.head.appendChild(script);
    });
}

function importProject(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const proj = JSON.parse(e.target.result);
            if (!proj.id || !proj.name || !Array.isArray(proj.files)) throw new Error('Invalid format');
            proj.id = genId();
            proj.createdAt = Date.now();
            state.projects.unshift(proj);
            save(); renderProjects();
            toast(`「${proj.name}」をインポートしました`);
        } catch {
            toast('インポートに失敗しました', 'error');
        }
    };
    reader.readAsText(file);
}

// ===== DIFF MODE =====
function toggleDiff() {
    const proj = getProj();
    if (!proj || !state.currentFile) return;
    state.diffMode = !state.diffMode;
    const btn = document.getElementById('diff-toggle-btn');
    if (state.diffMode) {
        state.monacoEditor.updateOptions({ readOnly: true });
        btn.querySelector('span').textContent = '編集に戻る';
        btn.style.background = 'var(--accent-dim)';
        toast('差分表示モード (前回のAI生成との比較)', 'warning');
    } else {
        state.monacoEditor.updateOptions({ readOnly: false });
        btn.querySelector('span').textContent = '差分';
        btn.style.background = '';
    }
}

// ===== TERMINAL / COMMANDS =====
function generateTerminalCommands() {
    const proj = getProj();
    if (!proj) return;
    const hasPy  = proj.files.some(f => f.name.endsWith('.py'));
    const hasJs  = proj.files.some(f => f.name.endsWith('.js') || f.name.endsWith('.ts'));
    const hasReq = proj.files.some(f => f.name === 'requirements.txt');
    const hasPkg = proj.files.some(f => f.name === 'package.json');
    const hasHtml = proj.files.some(f => f.name.endsWith('.html'));

    const lines = [];
    if (hasPy) {
        lines.push({ type: 'section', text: '=== Python セットアップ ===' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'python -m venv venv' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'source venv/bin/activate' });
        if (hasReq) lines.push({ type: 'cmd', prompt: '$', cmd: 'pip install -r requirements.txt' });
        const mainPy = proj.files.find(f => f.name === 'main.py') ? 'main.py' : proj.files.find(f => f.name.endsWith('.py'))?.name;
        if (mainPy) lines.push({ type: 'cmd', prompt: '$', cmd: `python ${mainPy}` });
    }
    if (hasJs) {
        lines.push({ type: 'section', text: '=== Node.js セットアップ ===' });
        lines.push({ type: 'cmd', prompt: '$', cmd: hasPkg ? 'npm install' : 'npm init -y' });
        const mainJs = proj.files.find(f => f.name === 'index.js') ? 'index.js' : proj.files.find(f => f.name.endsWith('.js'))?.name;
        if (mainJs) lines.push({ type: 'cmd', prompt: '$', cmd: `node ${mainJs}` });
    }
    if (hasHtml) {
        lines.push({ type: 'section', text: '=== ローカルサーバー ===' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'python -m http.server 8080' });
    }
    if (lines.length === 0) {
        lines.push({ type: 'comment', text: '# コードが生成されると実行コマンドが表示されます' });
    }

    const content = document.getElementById('terminal-content');
    content.innerHTML = lines.map(l => {
        if (l.type === 'section') return `<div class="terminal-line section">${esc(l.text)}</div>`;
        if (l.type === 'comment') return `<div class="terminal-line comment">${esc(l.text)}</div>`;
        return `<div class="terminal-line"><span class="prompt">${esc(l.prompt)} </span><span class="cmd">${esc(l.cmd)}</span></div>`;
    }).join('');

    document.getElementById('terminal-panel').classList.add('visible');
}

// ===== SETTINGS =====
async function openSettings() {
    renderApiKeysList();
    renderProviderSelect();
    document.getElementById('custom-prompt-input').value = state.customPrompt || '';
    openModal('settings-modal');
    await renderUsageTab();
    await renderDataTab();
}

async function renderUsageTab() {
    const usage = await getTodayUsage();
    const settings = await idbGet('settings');
    const limit = (settings && settings.usageLimit) || 0;

    document.getElementById('usage-limit-input').value = limit || '';

    const totalToday = usage.prompt + usage.completion;
    const overLimit = limit > 0 && totalToday >= limit;

    const grid = document.getElementById('usage-stats-grid');
    grid.innerHTML = `
        <div class="usage-stat-card ${overLimit ? 'over-limit' : ''}">
            <div class="usage-stat-value">${totalToday.toLocaleString()}</div>
            <div class="usage-stat-label">本日の推定トークン</div>
        </div>
        <div class="usage-stat-card">
            <div class="usage-stat-value">${usage.requests.toLocaleString()}</div>
            <div class="usage-stat-label">本日のリクエスト数</div>
        </div>
        <div class="usage-stat-card">
            <div class="usage-stat-value">${usage.prompt.toLocaleString()} / ${usage.completion.toLocaleString()}</div>
            <div class="usage-stat-label">入力 / 出力</div>
        </div>`;
}

async function renderDataTab() {
    const backups = await listBackups();
    const list = document.getElementById('backup-list');

    if (backups.length === 0) {
        list.innerHTML = '<p class="section-desc">まだバックアップがありません（5分ごとに自動作成されます）</p>';
    } else {
        list.innerHTML = backups.map(b => `
            <div class="backup-item">
                <div class="backup-item-info">
                    <span class="backup-item-time">${new Date(b.ts).toLocaleString('ja-JP')}</span>
                    <span class="backup-item-meta">${b.projects.length} プロジェクト</span>
                </div>
                <button class="backup-item-restore" data-ts="${b.ts}">復元</button>
            </div>`).join('');

        list.querySelectorAll('.backup-item-restore').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('現在のデータをこのバックアップ時点の状態に上書きします。よろしいですか？')) return;
                await restoreBackup(parseInt(btn.dataset.ts));
                closeModal('settings-modal');
            });
        });
    }

    // Storage usage estimate
    const infoEl = document.getElementById('storage-info');
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            const usedMB = ((est.usage || 0) / 1024 / 1024).toFixed(1);
            const quotaMB = ((est.quota || 0) / 1024 / 1024).toFixed(0);
            infoEl.innerHTML = `<b>ストレージ使用量:</b> ${usedMB} MB / ${quotaMB} MB&nbsp;&nbsp;`
                + `<b>プロジェクト数:</b> ${state.projects.length}件&nbsp;&nbsp;`
                + `<b>最終保存:</b> ${_lastSavedAt ? fmtTime(_lastSavedAt) : '未保存'}`;
        } else {
            infoEl.innerHTML = `<b>プロジェクト数:</b> ${state.projects.length}件`;
        }
    } catch {
        infoEl.innerHTML = `<b>プロジェクト数:</b> ${state.projects.length}件`;
    }
}

function renderApiKeysList() {
    const list = document.getElementById('api-keys-list');
    list.innerHTML = '';
    state.apiKeys.forEach(key => {
        const entry = document.createElement('div');
        entry.className = 'api-key-entry';
        entry.innerHTML = `
            <div class="api-key-row">
                <span class="api-key-label">名前</span>
                <input class="api-key-name-input" type="text" value="${esc(key.name)}" placeholder="例: Groq" data-id="${key.id}" data-field="name">
                <button class="api-key-delete" data-id="${key.id}" title="削除">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
            <div class="api-key-row">
                <span class="api-key-label">URL</span>
                <input class="api-key-url-input" type="text" value="${esc(key.baseUrl)}" placeholder="https://api.groq.com/openai/v1" data-id="${key.id}" data-field="baseUrl">
            </div>
            <div class="api-key-row">
                <span class="api-key-label">APIキー</span>
                <input class="api-key-value-input" type="password" value="${esc(key.key)}" placeholder="sk-..." data-id="${key.id}" data-field="key">
            </div>
            <div class="api-key-hint">OpenAI互換API対応 (Groq / OpenAI / OpenRouter 等)</div>`;
        entry.querySelectorAll('input[data-field]').forEach(inp => {
            inp.addEventListener('input', () => {
                const k = state.apiKeys.find(a => a.id === inp.dataset.id);
                if (k) k[inp.dataset.field] = inp.value;
            });
        });
        entry.querySelector('.api-key-delete').addEventListener('click', e => {
            state.apiKeys = state.apiKeys.filter(k => k.id !== e.currentTarget.dataset.id);
            renderApiKeysList(); renderProviderSelect();
        });
        list.appendChild(entry);
    });
}

function renderProviderSelect() {
    const sel = document.getElementById('active-provider-select');
    sel.innerHTML = '<option value="">-- プロバイダーを選択 --</option>';
    state.apiKeys.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k.id; opt.textContent = k.name || '(無名)';
        if (k.id === state.activeProvider) opt.selected = true;
        sel.appendChild(opt);
    });
    document.getElementById('active-model-input').value = state.activeModel || '';
}

async function saveSettings() {
    state.activeProvider = document.getElementById('active-provider-select').value || null;
    state.activeModel    = document.getElementById('active-model-input').value.trim();
    state.customPrompt   = document.getElementById('custom-prompt-input').value.trim();
    save(); updateBadge(); updateSendBtn();

    // Usage limit is stored directly in settings (not part of the debounced
    // `state` mirror) so we update it via the settings object explicitly.
    const limitVal = parseInt(document.getElementById('usage-limit-input').value, 10);
    try {
        const settings = (await idbGet('settings')) || {};
        settings.usageLimit = isNaN(limitVal) ? 0 : limitVal;
        await idbSet('settings', settings);
    } catch (e) { console.warn('Failed to save usage limit:', e); }

    closeModal('settings-modal');
    toast('設定を保存しました');
}

function updateBadge() {
    const badge = document.getElementById('active-provider-badge');
    const key = state.activeProvider ? state.apiKeys.find(k => k.id === state.activeProvider) : null;
    if (key) {
        badge.textContent = key.name + (state.activeModel ? ' / ' + state.activeModel : '');
        badge.classList.add('active');
    } else {
        badge.textContent = '未設定'; badge.classList.remove('active');
    }
}

function updateSendBtn() {
    document.getElementById('send-btn').disabled = !(state.activeProvider && state.activeModel) || state.isStreaming;
}

// ===== NOTIFICATION =====
function showNotif(title, message, apiKeyId) {
    state.pendingApiKeyId = apiKeyId || null;
    document.getElementById('notification-title').textContent = title;
    document.getElementById('notification-message').textContent = message;
    document.getElementById('notification-banner').classList.remove('hidden');
}
function hideNotif() {
    document.getElementById('notification-banner').classList.add('hidden');
    state.pendingApiKeyId = null;
}

// ===== CHAT HISTORY MIGRATION =====
// Strip old Discord-Bot-specialist boilerplate from saved chat history
const STALE_PATTERNS = [
    /こんにちは[！!]?\s*Discord[ボボ]ット開発の専門家/,
    /Discordボット開発.*専門家.*アシスタント/,
    /作りたい.*Discordボット.*内容を教えて/,
];
function cleanHistory(history) {
    return (history || []).filter(m => {
        if (m.role !== 'assistant') return true;
        return !STALE_PATTERNS.some(re => re.test(m.content));
    });
}

// ===== CHAT =====
function appendMsg(role, content, time, doSave = true, images = null) {
    const container = document.getElementById('chat-messages');
    container.querySelector('.welcome-message')?.remove();

    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    const rendered = role === 'assistant' ? renderMarkdown(content) : esc(content).replace(/\n/g, '<br>');

    const imagesHtml = (images && images.length > 0)
        ? `<div class="chat-msg-images">${images.map(img => `<img src="${img.dataUrl}" alt="${esc(img.name || 'image')}" data-lightbox="1">`).join('')}</div>`
        : '';

    div.innerHTML = `${imagesHtml}<div class="chat-bubble">${rendered}</div><span class="chat-msg-time">${time || fmtTime(Date.now())}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    div.querySelectorAll('img[data-lightbox]').forEach(img => {
        img.addEventListener('click', () => openLightbox(img.src));
    });

    if (doSave) {
        const proj = getProj();
        if (proj) {
            if (!proj.chatHistory) proj.chatHistory = [];
            proj.chatHistory.push({ role, content, time: time || fmtTime(Date.now()), images: images || undefined });
            if (proj.chatHistory.length > 80) proj.chatHistory = proj.chatHistory.slice(-80);
            save();
        }
    }
    return div;
}

function openLightbox(src) {
    const box = document.createElement('div');
    box.className = 'image-lightbox';
    box.innerHTML = `<img src="${src}">`;
    box.addEventListener('click', () => box.remove());
    document.body.appendChild(box);
}

// ===== IMAGE ATTACHMENTS =====
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGES_PER_MESSAGE = 4;
const MAX_IMAGE_DIMENSION = 1568; // resize long edge to this — keeps payload reasonable

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Resize/recompress large images client-side before they ever touch the
// network — keeps API payloads small and avoids hitting provider limits.
function resizeImageDataUrl(dataUrl, maxDim = MAX_IMAGE_DIMENSION) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width <= maxDim && height <= maxDim) { resolve(dataUrl); return; }
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(dataUrl); // fall back to original on decode failure
        img.src = dataUrl;
    });
}

async function addImageFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    if (state.pendingImages.length + files.length > MAX_IMAGES_PER_MESSAGE) {
        toast(`画像は1メッセージにつき最大${MAX_IMAGES_PER_MESSAGE}枚までです`, 'warning');
    }
    const slotsLeft = MAX_IMAGES_PER_MESSAGE - state.pendingImages.length;
    const toProcess = files.slice(0, Math.max(0, slotsLeft));

    for (const file of toProcess) {
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            toast(`「${file.name}」は${MAX_IMAGE_SIZE_MB}MBを超えています`, 'error');
            continue;
        }
        try {
            const raw = await fileToDataUrl(file);
            const resized = await resizeImageDataUrl(raw);
            state.pendingImages.push({ id: genId(), dataUrl: resized, name: file.name });
        } catch (e) {
            console.error('Image processing failed:', e);
            toast(`「${file.name}」の読み込みに失敗しました`, 'error');
        }
    }
    renderImagePreviews();
}

function removePendingImage(id) {
    state.pendingImages = state.pendingImages.filter(img => img.id !== id);
    renderImagePreviews();
}

function renderImagePreviews() {
    const area = document.getElementById('image-preview-area');
    const btn = document.getElementById('attach-image-btn');
    if (state.pendingImages.length === 0) {
        area.classList.add('hidden');
        area.innerHTML = '';
        btn.classList.remove('has-images');
        return;
    }
    area.classList.remove('hidden');
    btn.classList.add('has-images');
    area.innerHTML = state.pendingImages.map(img => `
        <div class="image-preview-item">
            <img src="${img.dataUrl}" alt="${esc(img.name)}">
            <button class="image-preview-remove" data-id="${img.id}" title="削除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        </div>`).join('');
    area.querySelectorAll('.image-preview-remove').forEach(b => {
        b.addEventListener('click', () => removePendingImage(b.dataset.id));
    });
}

function clearPendingImages() {
    state.pendingImages = [];
    renderImagePreviews();
}

function initImageAttachments() {
    const attachBtn = document.getElementById('attach-image-btn');
    const fileInput = document.getElementById('image-input');
    const chatInput = document.getElementById('chat-input');
    const chatPanel = document.querySelector('.chat-panel');

    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', e => {
        if (e.target.files.length) addImageFiles(e.target.files);
        e.target.value = '';
    });

    // Paste image directly into the textarea
    chatInput.addEventListener('paste', e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const imageItems = Array.from(items).filter(i => i.type.startsWith('image/'));
        if (imageItems.length === 0) return;
        e.preventDefault();
        const files = imageItems.map(i => i.getAsFile()).filter(Boolean);
        addImageFiles(files);
    });

    // Drag & drop images onto the chat panel
    ['dragenter', 'dragover'].forEach(evt => {
        chatPanel.addEventListener(evt, e => {
            if (Array.from(e.dataTransfer?.types || []).includes('Files')) {
                e.preventDefault();
                chatPanel.classList.add('image-drag-over');
            }
        });
    });
    ['dragleave', 'drop'].forEach(evt => {
        chatPanel.addEventListener(evt, e => {
            if (evt === 'drop') e.preventDefault();
            chatPanel.classList.remove('image-drag-over');
        });
    });
    chatPanel.addEventListener('drop', e => {
        const files = e.dataTransfer?.files;
        if (files && files.length) addImageFiles(files);
    });
}

function appendSystemMsg(text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg--system';
    div.innerHTML = `<div class="chat-bubble">${esc(text)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function appendStreamingMsg() {
    const container = document.getElementById('chat-messages');
    container.querySelector('.welcome-message')?.remove();
    const div = document.createElement('div');
    div.className = 'chat-msg chat-msg--assistant';
    div.id = 'streaming-msg';
    div.innerHTML = `<div class="chat-bubble streaming-cursor"></div><span class="chat-msg-time">${fmtTime(Date.now())}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div.querySelector('.chat-bubble');
}

function finalizeStreamingMsg(bubble, content) {
    const div = document.getElementById('streaming-msg');
    if (!div) return;
    div.removeAttribute('id');
    bubble.classList.remove('streaming-cursor');
    bubble.innerHTML = renderMarkdown(content);
    document.getElementById('chat-messages').scrollTop = 99999;

    const proj = getProj();
    if (proj) {
        if (!proj.chatHistory) proj.chatHistory = [];
        proj.chatHistory.push({ role: 'assistant', content, time: fmtTime(Date.now()) });
        if (proj.chatHistory.length > 80) proj.chatHistory = proj.chatHistory.slice(-80);
        save();
    }
}

function showTyping() {
    const c = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.id = 'typing-indicator'; div.className = 'chat-msg chat-msg--assistant';
    div.innerHTML = `<div class="chat-typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    c.appendChild(div); c.scrollTop = 99999;
}
function hideTyping() { document.getElementById('typing-indicator')?.remove(); }

// ===== CHAT SEARCH =====
function searchChat(query) {
    const msgs = document.querySelectorAll('.chat-msg');
    let found = 0;
    msgs.forEach(m => {
        m.classList.remove('highlight');
        if (query && m.textContent.toLowerCase().includes(query.toLowerCase())) {
            m.classList.add('highlight'); found++;
        }
    });
    if (query && found === 0) toast('見つかりませんでした', 'warning');
    else if (query) {
        const first = document.querySelector('.chat-msg.highlight');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ===== PROGRESS =====
function showProg()  { document.getElementById('review-progress').classList.remove('hidden'); setProg(1, 0); }
function hideProg()  { document.getElementById('review-progress').classList.add('hidden'); }
function setProg(step, pct) {
    document.querySelectorAll('.review-step').forEach(s => {
        s.classList.remove('active','done');
        const n = parseInt(s.dataset.step);
        if (n < step) s.classList.add('done');
        else if (n === step) s.classList.add('active');
    });
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-text').textContent =
        { 1: 'コードを生成中...', 2: 'バグを検証中...', 3: '最終確認中...' }[step] || '完了';
}

// ===== AI CALL (STREAMING) =====
// ===== USAGE / COST TRACKING (best-effort, estimated) =====
// Token counts from streaming APIs aren't always available, so we estimate
// using a simple chars/4 heuristic when an explicit `usage` object isn't
// returned. This is intentionally approximate — good enough for a warning
// threshold, not for billing reconciliation.
function estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
}

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function recordUsage(promptTokens, completionTokens) {
    try {
        let usage = await idbGet('usage');
        if (!usage || typeof usage !== 'object') usage = {};
        const key = todayKey();
        if (!usage[key]) usage[key] = { prompt: 0, completion: 0, requests: 0 };
        usage[key].prompt += promptTokens;
        usage[key].completion += completionTokens;
        usage[key].requests += 1;

        // Keep only the last 14 days to avoid unbounded growth
        const keys = Object.keys(usage).sort();
        if (keys.length > 14) {
            keys.slice(0, keys.length - 14).forEach(k => delete usage[k]);
        }

        await idbSet('usage', usage);
        checkUsageLimit(usage[key]);
        return usage[key];
    } catch (e) { console.warn('recordUsage failed:', e); }
}

async function getTodayUsage() {
    const usage = await idbGet('usage');
    const key = todayKey();
    return (usage && usage[key]) || { prompt: 0, completion: 0, requests: 0 };
}

async function getUsageLimit() {
    const settings = await idbGet('settings');
    return (settings && settings.usageLimit) || 0;
}

async function checkUsageLimit(todayUsage) {
    const limit = await getUsageLimit();
    if (!limit || limit <= 0) return;
    const total = todayUsage.prompt + todayUsage.completion;
    if (total >= limit && !state._usageWarningShownToday) {
        state._usageWarningShownToday = true;
        toast(`本日の推定トークン使用量が上限(${limit.toLocaleString()})を超えました`, 'warning', 5000);
    }
}

async function callAIStream(messages, onChunk) {
    const key = state.apiKeys.find(k => k.id === state.activeProvider);
    if (!key) throw new Error('APIキーが設定されていません。設定から登録してください。');

    const base = key.baseUrl.replace(/\/$/, '');
    const url  = base.endsWith('/chat/completions') ? base : base + '/chat/completions';

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.key}` },
        body: JSON.stringify({
            model: state.activeModel,
            messages,
            temperature: state.maxMode ? 0 : 0.2,
            max_tokens: state.maxMode ? 16000 : 8192,
            stream: true,
        }),
    });

    if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j?.error?.message || errMsg; } catch {}
        if (res.status === 401 || res.status === 403)
            showNotif('APIキーエラー', `「${key.name}」のAPIキーが無効または期限切れです。\n${errMsg}`, key.id);
        else if (res.status === 429)
            showNotif('レート制限', `「${key.name}」のレート制限に達しました。\n${errMsg}`, key.id);
        else if (res.status === 402)
            showNotif('クレジット不足', `「${key.name}」のクレジットが不足しています。\n${errMsg}`, key.id);
        throw new Error(errMsg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    let usageObj = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
                const j = JSON.parse(data);
                const delta = j.choices?.[0]?.delta?.content || '';
                if (delta) { full += delta; onChunk(full); }
                if (j.usage) usageObj = j.usage; // some providers send usage on final chunk
            } catch {}
        }
    }

    // Record usage — use provider-reported usage if available, otherwise estimate.
    const promptTokens = usageObj?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join('\n'));
    const completionTokens = usageObj?.completion_tokens ?? estimateTokens(full);
    recordUsage(promptTokens, completionTokens);

    return full;
}

async function callAI(messages) {
    const key = state.apiKeys.find(k => k.id === state.activeProvider);
    if (!key) throw new Error('APIキーが設定されていません。');
    const base = key.baseUrl.replace(/\/$/, '');
    const url  = base.endsWith('/chat/completions') ? base : base + '/chat/completions';
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.key}` },
        body: JSON.stringify({ model: state.activeModel, messages, temperature: state.maxMode ? 0 : 0.2, max_tokens: state.maxMode ? 16000 : 8192 }),
    });
    if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        const errMsg = j?.error?.message || `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403)
            showNotif('APIキーエラー', `「${key.name}」のAPIキーが無効です。\n${errMsg}`, key.id);
        throw new Error(errMsg);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    const promptTokens = data.usage?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join('\n'));
    const completionTokens = data.usage?.completion_tokens ?? estimateTokens(content);
    recordUsage(promptTokens, completionTokens);

    return content;
}

// ===== SYSTEM PROMPT =====
function buildSysPrompt(isAutoIter = false, iterNum = 0, totalIter = 1, goal = '') {
    const proj = getProj();
    const filesStr = (proj?.files || []).filter(f => f.content).map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n');

    const autoNote = isAutoIter ? `
【自動反復モード】
これは自動反復の ${iterNum}/${totalIter} 回目です。
${goal ? `目標: ${goal}` : ''}
前回の出力を批判的に見直し、バグ・エラーハンドリング・可読性を改善してください。
コード全体を再出力してください。` : '';

    const maxNote = state.maxMode ? `
【MAX MODE — 最高精度モード】
あなたは今、最高水準のエンジニアリングを求められています。以下のプロセスを必ず実行してください:

STEP 1 — 要件の深堀り:
  - ユーザーの表面的な要求の背後にある本質的なニーズを特定する
  - エッジケース・境界値・想定外の入力を列挙する

STEP 2 — 設計の検討:
  - 少なくとも2つのアプローチを頭の中で比較し、最善を選択する
  - 選んだ理由を1〜2文で説明する

STEP 3 — コード生成:
  - 型安全・null安全・エラーハンドリングを完全に実装する
  - パフォーマンスを意識し、O(n²)以上の処理は回避する
  - セキュリティリスク（SQLインジェクション・XSS等）を排除する

STEP 4 — 自己批判:
  - 生成したコードを批判的にレビューし、潜在バグを1つ以上指摘して修正する
  - 「このコードの弱点は？」と自問して改善を加える

STEP 5 — 最終出力:
  - 上記すべてを反映した完全なコードを出力する
  - コメントは重要な箇所のみ、簡潔に記述する` : '';

    const base = `あなたは優秀なソフトウェアエンジニアです。
ユーザーの要望に応じてコードを生成・改善します。Python / JavaScript / TypeScript / Rust / Go / HTML / CSS など、どんな言語・フレームワークにも対応します。
${autoNote}
${maxNote}

【重要な制約】
- 自己紹介は絶対にしないでください。「こんにちは」などの挨拶も不要です
- 専門分野を名乗らないでください（例:「Discordボット開発の専門家」など）
- 絵文字は使用しないでください
- 最初のメッセージからすぐ本題に入ってください

【プロジェクト名】${proj?.name || '未設定'}

【コード生成ルール】
1. コードを出力する前に、必ず内部で見直してください（バグ・型エラー・論理エラー・インポート漏れ）
2. コードブロックの直前に必ず「ファイル: ファイル名」と記載してください
   例:
   ファイル: main.py
   \`\`\`python
   コード
   \`\`\`
3. 複数ファイルが必要な場合はすべて出力してください
4. 既存ファイルがある場合はその内容を必ず考慮して整合性を保ってください
5. 設定ファイル（requirements.txt, package.json等）が必要な場合は一緒に出力してください
6. 【必須】不要になったファイルは毎回必ず削除してください。削除するファイルは以下の形式で明示してください:
   DELETE: 削除するファイル名
   例: DELETE: old_utils.py
   リファクタリングや統合でファイルが不要になった場合も必ず削除指示を出してください。

【現在のファイル】
${filesStr || '(まだファイルはありません)'}

すべての回答は日本語で、簡潔に説明してください。`;

    return state.customPrompt ? state.customPrompt + '\n\n' + base : base;
}

// ===== MARKDOWN RENDERER =====
function renderMarkdown(text) {
    // Escape HTML
    let s = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Fenced code blocks — extract and protect them
    const blocks = [];
    s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const idx = blocks.length;
        blocks.push(`<div class="md-codeblock"><div class="md-codeblock-header"><span class="md-lang">${lang || 'code'}</span><button class="md-copy-btn" onclick="copyMdCode(this)">コピー</button></div><pre class="md-pre"><code>${code.trimEnd()}</code></pre></div>`);
        return `\x00BLOCK${idx}\x00`;
    });

    // Inline code
    s = s.replace(/`([^`\n]+)`/g, '<code class="md-inline">$1</code>');

    // Bold
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // Headers
    s = s.replace(/^### (.+)$/gm, '<p class="md-h3">$1</p>');
    s = s.replace(/^## (.+)$/gm, '<p class="md-h2">$1</p>');
    s = s.replace(/^# (.+)$/gm, '<p class="md-h1">$1</p>');

    // Lists
    s = s.replace(/^[-*] (.+)$/gm, '<div class="md-li">$1</div>');
    s = s.replace(/^\d+\. (.+)$/gm, '<div class="md-li">$1</div>');

    // Line breaks (not around block placeholders)
    s = s.replace(/\n/g, '<br>');
    s = s.replace(/<br>(\x00BLOCK)/g, '$1');
    s = s.replace(/(\x00)<br>/g, '$1');

    // Restore code blocks
    s = s.replace(/\x00BLOCK(\d+)\x00/g, (_, i) => blocks[parseInt(i)]);

    return s;
}

function copyMdCode(btn) {
    const code = btn.closest('.md-codeblock').querySelector('code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'コピー済';
        setTimeout(() => btn.textContent = 'コピー', 1500);
    }).catch(() => {});
}

// ===== PARSE & APPLY FILES =====
function parseFiles(text) {
    const files = [];
    const re = /ファイル[:：]\s*(\S+)\s*\n```(?:\w*)\n([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(text)) !== null) files.push({ filename: m[1].trim(), code: m[2].trim() });
    if (files.length === 0) {
        const re2 = /```(?:\w+)\n([\s\S]*?)```/g;
        while ((m = re2.exec(text)) !== null) files.push({ filename: null, code: m[1].trim() });
    }
    return files;
}

function parseDeleteFiles(text) {
    // Parse "DELETE: filename" lines from AI response
    const toDelete = [];
    const re = /^DELETE:\s*(\S+)/gm;
    let m;
    while ((m = re.exec(text)) !== null) {
        const name = m[1].trim();
        if (name) toDelete.push(name);
    }
    return toDelete;
}

// Returns a promise that resolves true (apply) or false (cancel)
function checkDangerAndConfirm(parsedFiles) {
    const allCode = parsedFiles.map(f => f.code).join('\n');
    const dangers = detectDanger(allCode);
    if (dangers.length === 0) return Promise.resolve(true);

    return new Promise(resolve => {
        document.getElementById('danger-confirm-detail').textContent =
            '検出された要素:\n' + dangers.map(d => '- ' + d).join('\n');
        openModal('danger-confirm-modal');

        const onOk = () => {
            closeModal('danger-confirm-modal');
            cleanup();
            resolve(true);
        };
        const onCancel = () => {
            closeModal('danger-confirm-modal');
            cleanup();
            resolve(false);
        };
        const cleanup = () => {
            document.getElementById('danger-confirm-ok').removeEventListener('click', onOk);
            document.getElementById('danger-confirm-cancel').removeEventListener('click', onCancel);
            document.getElementById('danger-confirm-close').removeEventListener('click', onCancel);
        };
        document.getElementById('danger-confirm-ok').addEventListener('click', onOk);
        document.getElementById('danger-confirm-cancel').addEventListener('click', onCancel);
        document.getElementById('danger-confirm-close').addEventListener('click', onCancel);
    });
}

// ===== SYNTAX VALIDATION (best-effort, catches obvious AI mistakes) =====
function getFileSyntaxLang(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    if (ext === 'py') return 'python';
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return 'javascript';
    if (ext === 'json') return 'json';
    return null;
}

// Bracket/paren/brace balance check — language agnostic, catches truncated
// or malformed code blocks regardless of language.
function checkBracketBalance(code) {
    const pairs = { '(': ')', '[': ']', '{': '}' };
    const closers = { ')': '(', ']': '[', '}': '{' };
    const stack = [];
    let inString = null;   // ' " ` or null
    let inComment = false; // single-line # or //
    const lines = code.split('\n');

    for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        inComment = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const prev = line[i - 1];
            if (inComment) continue;
            if (inString) {
                if (ch === inString && prev !== '\\') inString = null;
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
            if (ch === '#') { inComment = true; continue; }
            if (ch === '/' && line[i + 1] === '/') { inComment = true; continue; }
            if (pairs[ch]) stack.push({ ch, line: li + 1 });
            else if (closers[ch]) {
                const top = stack.pop();
                if (!top || top.ch !== closers[ch]) {
                    return { ok: false, reason: `${li + 1}行目: 「${ch}」に対応する開き括弧が見つかりません` };
                }
            }
        }
    }
    if (stack.length > 0) {
        const unclosed = stack[stack.length - 1];
        return { ok: false, reason: `${unclosed.line}行目: 「${unclosed.ch}」が閉じられていません` };
    }
    return { ok: true };
}

// Python-specific: indentation must be consistent (no tabs+spaces mix per
// block, and no obviously broken dedent). Best-effort, not a full parser.
function checkPythonIndentation(code) {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const leading = line.match(/^[ \t]*/)[0];
        if (leading.includes('\t') && leading.includes(' ')) {
            return { ok: false, reason: `${i + 1}行目: タブとスペースが混在しています` };
        }
    }
    // Check that any line ending with ':' is followed by an indented block
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const trimmed = line.trimEnd();
        if (/:\s*$/.test(trimmed) && trimmed.trim() !== '' && !trimmed.trim().startsWith('#')) {
            const curIndent = (line.match(/^[ \t]*/)[0] || '').length;
            let j = i + 1;
            while (j < lines.length && lines[j].trim() === '') j++;
            if (j < lines.length) {
                const nextIndent = (lines[j].match(/^[ \t]*/)[0] || '').length;
                if (nextIndent <= curIndent) {
                    return { ok: false, reason: `${i + 1}行目: 「:」の後にインデントされたブロックがありません` };
                }
            }
        }
    }
    return { ok: true };
}

function checkJsonSyntax(code) {
    try { JSON.parse(code); return { ok: true }; }
    catch (e) { return { ok: false, reason: e.message }; }
}

// Returns array of { filename, reason } for files that look broken.
function validateSyntax(parsedFiles) {
    const issues = [];
    parsedFiles.forEach(({ filename, code }) => {
        if (!code || !code.trim()) return;
        const lang = getFileSyntaxLang(filename);

        const balance = checkBracketBalance(code);
        if (!balance.ok) { issues.push({ filename: filename || '(無名ファイル)', reason: balance.reason }); return; }

        if (lang === 'python') {
            const indent = checkPythonIndentation(code);
            if (!indent.ok) { issues.push({ filename: filename || '(無名ファイル)', reason: indent.reason }); return; }
        }
        if (lang === 'json') {
            const json = checkJsonSyntax(code);
            if (!json.ok) { issues.push({ filename: filename || '(無名ファイル)', reason: json.reason }); return; }
        }
    });
    return issues;
}

function checkSyntaxAndConfirm(parsedFiles) {
    const issues = validateSyntax(parsedFiles);
    if (issues.length === 0) return Promise.resolve(true);

    return new Promise(resolve => {
        document.getElementById('syntax-confirm-detail').textContent =
            issues.map(i => `${i.filename}\n  → ${i.reason}`).join('\n\n');
        openModal('syntax-confirm-modal');

        const onOk = () => { closeModal('syntax-confirm-modal'); cleanup(); resolve(true); };
        const onCancel = () => { closeModal('syntax-confirm-modal'); cleanup(); resolve(false); };
        const cleanup = () => {
            document.getElementById('syntax-confirm-ok').removeEventListener('click', onOk);
            document.getElementById('syntax-confirm-cancel').removeEventListener('click', onCancel);
            document.getElementById('syntax-confirm-close').removeEventListener('click', onCancel);
        };
        document.getElementById('syntax-confirm-ok').addEventListener('click', onOk);
        document.getElementById('syntax-confirm-cancel').addEventListener('click', onCancel);
        document.getElementById('syntax-confirm-close').addEventListener('click', onCancel);
    });
}

async function applyFiles(parsedFiles, rawResponse = '') {
    const proj = getProj();
    if (!proj || parsedFiles.length === 0) return;

    const dangerOk = await checkDangerAndConfirm(parsedFiles);
    if (!dangerOk) { toast('コードの適用をキャンセルしました', 'warning'); return; }

    const syntaxOk = await checkSyntaxAndConfirm(parsedFiles);
    if (!syntaxOk) {
        toast('構文エラーのため適用をキャンセルしました。前の状態を維持します', 'warning', 4000);
        return;
    }

    // --- Snapshot for rollback before any mutation ---
    const rollbackSnapshot = JSON.parse(JSON.stringify(proj.files));

    // --- Delete files AI requested ---
    const toDelete = parseDeleteFiles(rawResponse);
    if (toDelete.length > 0) {
        const deleted = [];
        toDelete.forEach(name => {
            const idx = proj.files.findIndex(f => f.name === name);
            if (idx !== -1) {
                proj.files.splice(idx, 1);
                deleted.push(name);
                // If the deleted file was active, reset
                if (state.currentFile === name) state.currentFile = null;
            }
        });
        if (deleted.length > 0) {
            toast(`不要ファイルを削除: ${deleted.join(', ')}`, 'warning');
        }
    }

    // --- Apply updated/new files ---
    parsedFiles.forEach(({ filename, code }) => {
        const name = filename || state.currentFile || 'main.py';
        const existing = proj.files.find(f => f.name === name);
        if (existing) {
            state.prevFileContent[name] = existing.content;
            existing.content = code;
        } else {
            proj.files.push({ name, content: code });
        }
    });

    // Keep the pre-apply snapshot so the user can manually revert via
    // the "last AI change" rollback if the result turns out wrong even
    // though it passed syntax checks.
    state.lastApplySnapshot = { projectId: proj.id, files: rollbackSnapshot, ts: Date.now() };

    save(); renderTabs();

    const firstName = parsedFiles[0].filename || state.currentFile || proj.files[0]?.name;
    if (firstName) {
        state.currentFile = firstName;
        const file = proj.files.find(f => f.name === firstName);
        if (file) showEditorForFile(file);
    } else if (proj.files.length > 0) {
        switchFile(proj.files[0].name);
    }
    generateTerminalCommands();

}

// ===== SEND MESSAGE =====
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    const images = state.pendingImages.slice();
    if (!text && images.length === 0) return;
    if (state.isStreaming) return;
    if (!state.activeProvider || !state.activeModel) { toast('設定からAPIキーとモデルを登録してください', 'error'); return; }

    input.value = ''; input.style.height = '';
    clearPendingImages();
    appendMsg('user', text || '(画像のみ)', null, true, images.length ? images : null);

    await runAI(text, false, 1, 1, '', images);
}

// Builds the OpenAI-compatible content array for a message that may
// include images. If there are no images, returns the plain string so
// providers/models without vision support keep working unchanged.
function buildUserContent(text, images) {
    if (!images || images.length === 0) return text;
    const content = [];
    if (text) content.push({ type: 'text', text });
    images.forEach(img => {
        content.push({ type: 'image_url', image_url: { url: img.dataUrl } });
    });
    return content;
}

async function runAI(userText, isAutoIter = false, iterNum = 1, totalIter = 1, goal = '', images = null) {
    const proj = getProj();
    if (!proj) return;

    // Build history, converting any past messages that carried images into
    // the multi-part content format so the model keeps visual context.
    const history = (proj.chatHistory || []).slice(-20).map(m => ({
        role: m.role,
        content: m.images && m.images.length ? buildUserContent(m.content, m.images) : m.content,
    }));
    const sysPrompt = buildSysPrompt(isAutoIter, iterNum, totalIter, goal);
    const messages = [{ role: 'system', content: sysPrompt }, ...history];
    if (isAutoIter) {
        // Add iteration instruction
        messages.push({ role: 'user', content: `[自動反復 ${iterNum}/${totalIter}] ${goal || 'コードをさらに改善してください。バグを修正し、エラーハンドリングを強化してください。'}` });
    }

    state.isStreaming = true;
    updateSendBtn();
    showProg(); setProg(1, 20);

    try {
        await delay(200);
        setProg(1, 50);

        let fullResponse = '';
        const streamBubble = appendStreamingMsg();

        try {
            fullResponse = await callAIStream(messages, (partial) => {
                streamBubble.innerHTML = esc(partial).replace(/\n/g, '<br>');
                document.getElementById('chat-messages').scrollTop = 99999;
                setProg(2, 70);
            });
        } catch (streamErr) {
            console.warn('Streaming failed, falling back:', streamErr.message);
            showTyping();
            fullResponse = await callAI(messages);
            hideTyping();
            document.getElementById('streaming-msg')?.remove();
        }

        setProg(3, 90); await delay(150); setProg(3, 100);
        hideProg();

        finalizeStreamingMsg(streamBubble, fullResponse);

        const files = parseFiles(fullResponse);
        if (files.length > 0) {
            await applyFiles(files, fullResponse);
            if (!isAutoIter) toast(`${files.length}個のファイルを更新しました`);
        }

        return fullResponse;
    } catch (err) {
        hideTyping();
        hideProg();
        document.getElementById('streaming-msg')?.remove();
        if (err.message && err.message.includes('image') && err.message.match(/support|vision|multimodal/i)) {
            appendMsg('assistant', `エラーが発生しました:\n${err.message}\n\nこのモデルは画像（Vision）に対応していない可能性があります。画像対応モデル（例: gpt-4o, llama-3.2-90b-vision等）に切り替えてください。`);
        } else {
            appendMsg('assistant', `エラーが発生しました:\n${err.message}`);
        }
        toast(err.message, 'error');
        throw err;
    } finally {
        state.isStreaming = false;
        updateSendBtn();
    }
}

// ===== AUTO ITERATION MODE =====
function openAutoModeModal() {
    openModal('auto-mode-modal');
}

async function startAutoMode() {
    const totalIter = parseInt(document.getElementById('auto-iter-slider').value) || 3;
    const goal = document.getElementById('auto-goal-input').value.trim();
    closeModal('auto-mode-modal');

    if (!state.activeProvider || !state.activeModel) {
        toast('設定からAPIキーとモデルを登録してください', 'error');
        return;
    }

    state.autoMode.running = true;
    state.autoMode.totalIter = totalIter;
    state.autoMode.currentIter = 0;
    state.autoMode.goal = goal;
    state.autoMode.stopRequested = false;

    // Show auto mode bar
    document.getElementById('auto-mode-bar').classList.remove('hidden');
    document.getElementById('auto-iter-total').textContent = totalIter;
    document.getElementById('chat-input').disabled = true;

    appendSystemMsg(`自動反復モード開始 — ${totalIter}回の思考を行います${goal ? '。目標: ' + goal : ''}`);

    try {
        for (let i = 1; i <= totalIter; i++) {
            if (state.autoMode.stopRequested) break;

            state.autoMode.currentIter = i;
            document.getElementById('auto-iter-current').textContent = i;
            document.getElementById('auto-mode-label').textContent = `第${i}回 思考中...`;

            appendSystemMsg(`[ 思考 ${i}/${totalIter} ] 改善中...`);

            await runAI('', true, i, totalIter, goal);

            if (i < totalIter && !state.autoMode.stopRequested) {
                await delay(800);
            }
        }
    } catch (err) {
        console.error('Auto mode error:', err);
    } finally {
        state.autoMode.running = false;
        document.getElementById('auto-mode-bar').classList.add('hidden');
        document.getElementById('chat-input').disabled = false;
        const stopped = state.autoMode.stopRequested;
        const done = state.autoMode.currentIter;
        appendSystemMsg(stopped
            ? `自動反復を停止しました (${done}/${totalIter}回完了)`
            : `自動反復が完了しました (${totalIter}回の思考を実行)`
        );
        if (!stopped) toast(`自動反復完了 — ${totalIter}回の改善を実施しました`);
    }
}

function stopAutoMode() {
    state.autoMode.stopRequested = true;
    document.getElementById('auto-mode-label').textContent = '停止中...';
}

// ===== MAX MODE =====
function toggleMaxMode() {
    state.maxMode = !state.maxMode;
    save();
    applyMaxModeUI();
    if (state.maxMode) {
        toast('MAX モード ON — 最高精度で応答します', 'warning', 3000);
    } else {
        toast('MAX モード OFF', 'success');
    }
}

function applyMaxModeUI() {
    const btn = document.getElementById('max-mode-btn');
    const sendBtn = document.getElementById('send-btn');
    const inputArea = document.querySelector('.chat-input-area');
    const badge = document.getElementById('max-mode-badge');

    if (state.maxMode) {
        btn.classList.add('max-mode-active');
        sendBtn.classList.add('send-btn-max');
        inputArea.classList.add('input-area-max');
        badge.classList.remove('hidden');
    } else {
        btn.classList.remove('max-mode-active');
        sendBtn.classList.remove('send-btn-max');
        inputArea.classList.remove('input-area-max');
        badge.classList.add('hidden');
    }
}

// ===== AUTO OPTIMIZE =====
async function autoOptimize() {
    if (state.isStreaming || state.autoMode.running) {
        toast('処理中は実行できません', 'warning');
        return;
    }
    if (!state.activeProvider || !state.activeModel) {
        toast('設定からAPIキーとモデルを登録してください', 'error');
        return;
    }
    const proj = getProj();
    if (!proj) return;

    const hasCode = proj.files.some(f => f.content && f.content.trim().length > 10);
    if (!hasCode) {
        toast('最適化するコードがありません', 'warning');
        return;
    }

    // Build a comprehensive optimization prompt
    const filesStr = proj.files.filter(f => f.content).map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n');
    const optimizePrompt = `以下のコードを3つの観点から分析・最適化してください。

【最適化の観点】
1. パフォーマンス — 不要な処理・非効率なアルゴリズム・冗長なループを改善
2. セキュリティ — 脆弱性・インジェクションリスク・不適切な入力検証を修正
3. 可読性・保守性 — 命名・構造・コメント・関数の分割を改善

【手順】
- 各観点で問題点を特定して説明してください
- 改善したコードを「ファイル: ファイル名」形式で出力してください
- 変更箇所の理由を簡潔に説明してください

【対象コード】
${filesStr}`;

    appendSystemMsg('自動最適化を開始します — パフォーマンス / セキュリティ / 可読性の3軸で分析中...');

    const proj2 = getProj();
    const history = (proj2.chatHistory || []).slice(-6).map(m => ({ role: m.role, content: m.content }));
    const sysPrompt = buildSysPrompt();
    const messages = [
        { role: 'system', content: sysPrompt },
        ...history,
        { role: 'user', content: optimizePrompt },
    ];

    state.isStreaming = true;
    updateSendBtn();
    showProg(); setProg(1, 20);

    try {
        await delay(200);
        setProg(1, 50);
        let fullResponse = '';
        const streamBubble = appendStreamingMsg();

        try {
            fullResponse = await callAIStream(messages, (partial) => {
                streamBubble.innerHTML = esc(partial).replace(/\n/g, '<br>');
                document.getElementById('chat-messages').scrollTop = 99999;
                setProg(2, 70);
            });
        } catch {
            showTyping();
            fullResponse = await callAI(messages);
            hideTyping();
            document.getElementById('streaming-msg')?.remove();
        }

        setProg(3, 90); await delay(150); setProg(3, 100);
        hideProg();
        finalizeStreamingMsg(streamBubble, fullResponse);

        const files = parseFiles(fullResponse);
        if (files.length > 0) {
            await applyFiles(files, fullResponse);
            toast(`最適化完了 — ${files.length}個のファイルを更新しました`);
        } else {
            toast('最適化分析が完了しました');
        }

        // Save to history
        const p = getProj();
        if (p) {
            if (!p.chatHistory) p.chatHistory = [];
            p.chatHistory.push({ role: 'user', content: '[自動最適化]', time: fmtTime(Date.now()) });
            p.chatHistory.push({ role: 'assistant', content: fullResponse, time: fmtTime(Date.now()) });
            save();
        }
    } catch (err) {
        hideTyping(); hideProg();
        document.getElementById('streaming-msg')?.remove();
        appendMsg('assistant', `エラーが発生しました:\n${err.message}`);
        toast(err.message, 'error');
    } finally {
        state.isStreaming = false;
        updateSendBtn();
    }
}

// ===== COPY CODE =====
function copyCode() {
    const proj = getProj();
    if (!proj || !state.currentFile) return;
    const content = state.monacoEditor ? state.monacoEditor.getValue() : (proj.files.find(f => f.name === state.currentFile)?.content || '');
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
        toast('コードをコピーしました');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = content; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        toast('コードをコピーしました');
    });
}

// ===== RESIZER =====
function initResizer() {
    const resizer = document.getElementById('panel-resizer');
    const panel   = document.querySelector('.editor-panel');
    let dragging = false, startX = 0, startW = 0;
    resizer.addEventListener('mousedown', e => {
        dragging = true; startX = e.clientX; startW = panel.offsetWidth;
        resizer.classList.add('dragging');
        document.body.style.cssText += 'cursor:col-resize;user-select:none';
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        panel.style.width = Math.max(280, Math.min(startW + e.clientX - startX, window.innerWidth - 260)) + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false; resizer.classList.remove('dragging');
        document.body.style.cursor = ''; document.body.style.userSelect = '';
    });
}

// ===== KEYBOARD SHORTCUTS =====
function initShortcuts() {
    document.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'h' || e.key === 'H') { e.preventDefault(); document.getElementById('home-btn')?.click(); }
            if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                const proj = getProj();
                if (proj && state.monacoEditor && state.currentFile) {
                    const f = proj.files.find(f => f.name === state.currentFile);
                    if (f) { f.content = state.monacoEditor.getValue(); save(); toast('保存しました'); }
                }
            }
        }
    });

    const ta = document.getElementById('chat-input');
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

// ===== MODAL TABS =====
function initModalTabs() {
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            const modal = tab.closest('.modal');
            modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            modal.querySelector(`.modal-tab-content[data-tab="${tabId}"]`).classList.add('active');
        });
    });
}

// ===== INIT =====
async function init() {
    await load();
    initAutoBackup();
    applyTheme(state.theme);
    renderTemplates();
    renderProjects();
    updateBadge();
    updateSendBtn();
    initResizer();
    initShortcuts();
    initModalTabs();
    initImageAttachments();

    await initMonaco();

    // Auto-iter slider
    const slider = document.getElementById('auto-iter-slider');
    const display = document.getElementById('auto-iter-display');
    slider.addEventListener('input', () => { display.textContent = slider.value; });

    // Home
    document.getElementById('new-project-btn').addEventListener('click', () => {
        document.getElementById('project-name-input').value = '';
        openModal('new-project-modal');
    });
    document.getElementById('settings-btn-home').addEventListener('click', openSettings);
    document.getElementById('theme-btn-home').addEventListener('click', toggleTheme);
    document.getElementById('theme-btn-editor').addEventListener('click', toggleTheme);
    document.getElementById('import-project-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
    document.getElementById('import-file-input').addEventListener('change', e => { if (e.target.files[0]) importProject(e.target.files[0]); e.target.value = ''; });
    document.getElementById('project-search').addEventListener('input', e => renderProjects(e.target.value));

    // New Project
    document.getElementById('new-project-close').addEventListener('click', () => closeModal('new-project-modal'));
    document.getElementById('new-project-cancel').addEventListener('click', () => closeModal('new-project-modal'));
    document.getElementById('new-project-create').addEventListener('click', () => {
        const name = document.getElementById('project-name-input').value.trim();
        if (!name) return;
        const proj = { id: genId(), name, createdAt: Date.now(), files: [{ name: 'main.py', content: '' }], chatHistory: [] };
        state.projects.unshift(proj); save(); closeModal('new-project-modal'); renderProjects(); openProject(proj.id);
    });
    document.getElementById('project-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('new-project-create').click(); });

    // Editor
    document.getElementById('home-btn').addEventListener('click', () => {
        if (state.monacoEditor && state.currentFile) {
            const proj = getProj();
            if (proj) { const f = proj.files.find(f=>f.name===state.currentFile); if(f) f.content=state.monacoEditor.getValue(); save(); }
        }
        showScreen('home-screen'); renderProjects();
    });
    document.getElementById('settings-btn-editor').addEventListener('click', openSettings);
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('copy-code-btn').addEventListener('click', copyCode);
    document.getElementById('download-file-btn').addEventListener('click', () => { if(state.currentFile) downloadFile(state.currentFile); });
    document.getElementById('diff-toggle-btn').addEventListener('click', toggleDiff);
    document.getElementById('zip-download-btn').addEventListener('click', downloadProjectZip);
    document.getElementById('export-project-btn').addEventListener('click', exportProject);
    document.getElementById('terminal-close').addEventListener('click', () => document.getElementById('terminal-panel').classList.remove('visible'));

    // Chat search
    document.getElementById('chat-search-btn').addEventListener('click', () => {
        document.getElementById('chat-search-bar').classList.toggle('hidden');
        if (!document.getElementById('chat-search-bar').classList.contains('hidden'))
            document.getElementById('chat-search-input').focus();
    });
    document.getElementById('chat-search-close').addEventListener('click', () => {
        document.getElementById('chat-search-bar').classList.add('hidden');
        searchChat('');
    });
    document.getElementById('chat-search-input').addEventListener('input', e => searchChat(e.target.value));

    // Revert last AI change
    document.getElementById('revert-last-btn').addEventListener('click', () => {
        const proj = getProj();
        if (!proj) return;
        const snap = state.lastApplySnapshot;
        if (!snap || snap.projectId !== proj.id) {
            toast('元に戻せる変更がありません', 'warning');
            return;
        }
        proj.files = JSON.parse(JSON.stringify(snap.files));
        state.lastApplySnapshot = null;
        save(); renderTabs();
        if (proj.files.length > 0) {
            switchFile(proj.files[0].name);
        } else {
            showEmptyState();
        }
        generateTerminalCommands();
        toast('直前のAI変更を元に戻しました', 'warning');
    });

    // Clear chat
    document.getElementById('clear-chat-btn').addEventListener('click', () => {
        const proj = getProj();
        if (!proj) return;
        proj.chatHistory = []; save();
        const chatEl = document.getElementById('chat-messages');
        chatEl.innerHTML = `<div class="welcome-message"><div class="welcome-icon"><svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div><p class="welcome-text">作りたいものを教えてください。</p><p class="welcome-hint">AIがコードを生成・改善します</p></div>`;
        toast('チャット履歴をクリアしました', 'warning');
    });

    // Auto mode
    document.getElementById('auto-mode-btn').addEventListener('click', openAutoModeModal);
    document.getElementById('auto-mode-close').addEventListener('click', () => closeModal('auto-mode-modal'));
    document.getElementById('auto-mode-cancel').addEventListener('click', () => closeModal('auto-mode-modal'));
    document.getElementById('auto-mode-start').addEventListener('click', startAutoMode);
    document.getElementById('auto-mode-stop-btn').addEventListener('click', stopAutoMode);

    // Max mode
    document.getElementById('max-mode-btn').addEventListener('click', toggleMaxMode);
    applyMaxModeUI();

    // Auto optimize
    document.getElementById('auto-optimize-btn').addEventListener('click', autoOptimize);

    // Add File
    document.getElementById('add-tab-btn').addEventListener('click', () => { document.getElementById('add-file-input').value = ''; openModal('add-file-modal'); });
    document.getElementById('add-file-close').addEventListener('click', () => closeModal('add-file-modal'));
    document.getElementById('add-file-cancel').addEventListener('click', () => closeModal('add-file-modal'));
    document.getElementById('add-file-create').addEventListener('click', () => { const n = document.getElementById('add-file-input').value.trim(); if(n){addFile(n);closeModal('add-file-modal');} });
    document.getElementById('add-file-input').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('add-file-create').click(); });

    // Cleanup Tabs
    document.getElementById('cleanup-tabs-btn').addEventListener('click', openCleanupModal);
    document.getElementById('cleanup-close').addEventListener('click', () => closeModal('cleanup-modal'));
    document.getElementById('cleanup-cancel').addEventListener('click', () => closeModal('cleanup-modal'));
    document.getElementById('cleanup-delete-selected').addEventListener('click', executeCleanup);

    // Rename File
    document.getElementById('rename-file-close').addEventListener('click', () => closeModal('rename-file-modal'));
    document.getElementById('rename-file-cancel').addEventListener('click', () => closeModal('rename-file-modal'));
    document.getElementById('rename-file-save').addEventListener('click', () => {
        const newName = document.getElementById('rename-file-input').value.trim();
        if (newName && state.deleteTarget) { renameFile(state.deleteTarget.filename, newName); state.deleteTarget = null; closeModal('rename-file-modal'); }
    });
    document.getElementById('rename-file-input').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('rename-file-save').click(); });

    // Delete Confirm
    document.getElementById('delete-confirm-close').addEventListener('click', () => closeModal('delete-confirm-modal'));
    document.getElementById('delete-confirm-cancel').addEventListener('click', () => closeModal('delete-confirm-modal'));
    document.getElementById('delete-confirm-ok').addEventListener('click', () => { executeDelete(); closeModal('delete-confirm-modal'); });

    // Settings
    document.getElementById('settings-close').addEventListener('click', () => closeModal('settings-modal'));
    document.getElementById('settings-cancel').addEventListener('click', () => closeModal('settings-modal'));
    document.getElementById('settings-save').addEventListener('click', saveSettings);
    document.getElementById('usage-reset-btn').addEventListener('click', async () => {
        let usage = await idbGet('usage');
        if (!usage) usage = {};
        usage[todayKey()] = { prompt: 0, completion: 0, requests: 0 };
        await idbSet('usage', usage);
        state._usageWarningShownToday = false;
        await renderUsageTab();
        toast('今日の使用量をリセットしました');
    });
    document.getElementById('add-api-key-btn').addEventListener('click', () => {
        state.apiKeys.push({ id: genId(), name: '', baseUrl: '', key: '' });
        renderApiKeysList(); renderProviderSelect();
    });
    document.getElementById('reset-prompt-btn').addEventListener('click', () => {
        document.getElementById('custom-prompt-input').value = '';
        toast('システムプロンプトをデフォルトに戻しました');
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            const model = btn.dataset.model;
            let key = state.apiKeys.find(k => k.baseUrl === url);
            if (!key) {
                key = { id: genId(), name: new URL(url).hostname.split('.')[1] || url, baseUrl: url, key: '' };
                state.apiKeys.push(key);
            }
            state.activeProvider = key.id;
            state.activeModel = model;
            renderApiKeysList();
            renderProviderSelect();
            document.querySelector('.modal-tab[data-tab="ai"]').click();
            toast(`${model} を選択しました。APIキーを入力してください`);
        });
    });

    // Notification
    document.getElementById('notification-close').addEventListener('click', hideNotif);
    document.getElementById('notification-dismiss-btn').addEventListener('click', hideNotif);
    document.getElementById('notification-delete-btn').addEventListener('click', () => {
        if (state.pendingApiKeyId) {
            state.apiKeys = state.apiKeys.filter(k => k.id !== state.pendingApiKeyId);
            if (state.activeProvider === state.pendingApiKeyId) { state.activeProvider = null; state.activeModel = ''; }
            save(); updateBadge(); updateSendBtn();
            toast('APIキーを削除しました', 'warning');
        }
        hideNotif();
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); });
    });
}

document.addEventListener('DOMContentLoaded', init);
