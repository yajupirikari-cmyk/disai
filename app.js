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

// ===== CRYPTO UTILS =====
const CRYPTO_KEY_ID = 'acb_crypto_key';

async function getOrGenerateCryptoKey() {
    let keyData = localStorage.getItem(CRYPTO_KEY_ID);
    if (!keyData) {
        const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const exported = await crypto.subtle.exportKey('jwk', key);
        localStorage.setItem(CRYPTO_KEY_ID, JSON.stringify(exported));
        return key;
    } else {
        const jwk = JSON.parse(keyData);
        return await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
    }
}

async function encryptData(data) {
    try {
        const key = await getOrGenerateCryptoKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(data));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
        return {
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encrypted)),
            _encrypted: true
        };
    } catch (e) { console.error('Encrypt failed', e); return data; }
}

async function decryptData(encryptedObj) {
    if (!encryptedObj || !encryptedObj._encrypted) return encryptedObj;
    try {
        const key = await getOrGenerateCryptoKey();
        const iv = new Uint8Array(encryptedObj.iv);
        const data = new Uint8Array(encryptedObj.data);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) { console.error('Decrypt failed', e); return []; }
}

async function idbSet(key, value) {
    try {
        let finalValue = value;
        if (key === 'apiKeys' || key === 'netlify_token') {
            finalValue = await encryptData(value);
        }
        const db = await idbOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(finalValue, key);
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
            req.onsuccess = async () => {
                let res = req.result;
                if ((key === 'apiKeys' || key === 'netlify_token') && res && res._encrypted) {
                    res = await decryptData(res) || (key === 'apiKeys' ? [] : null);
                }
                resolve(res);
            };
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
            { name: 'main.py', content: '# Discord Bot (Python)\n# AI縺ｫ縲後さ繝槭Φ繝隠ot繧剃ｽ懊▲縺ｦ縲阪↑縺ｩ縺ｨ謖・､ｺ縺励※縺上□縺輔＞\n' },
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
            { name: 'index.js', content: '// Discord Bot (Node.js)\n// AI縺ｫ謖・､ｺ縺励※縺上□縺輔＞\n' },
            { name: 'package.json', content: '{\n  "name": "discord-bot",\n  "version": "1.0.0",\n  "main": "index.js",\n  "dependencies": {\n    "discord.js": "^14.0.0",\n    "dotenv": "^16.0.0"\n  }\n}\n' },
        ]
    },
    {
        id: 'webapp',
        name: 'Web繧｢繝励Μ',
        desc: 'HTML + CSS + JavaScript',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
        files: [
            { name: 'index.html', content: '<!DOCTYPE html>\n<html lang="ja">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Web繧｢繝励Μ</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n\n    <script src="app.js"></script>\n</body>\n</html>\n' },
            { name: 'style.css', content: '/* 繧ｹ繧ｿ繧､繝ｫ */\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: system-ui, sans-serif; }\n' },
            { name: 'app.js', content: '// 繝｡繧､繝ｳ繧ｹ繧ｯ繝ｪ繝励ヨ\n' },
        ]
    },
    {
        id: 'react',
        name: 'React 繧｢繝励Μ',
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
        name: 'CLI繝・・繝ｫ',
        desc: 'Python 繧ｳ繝槭Φ繝峨Λ繧､繝ｳ繧｢繝励Μ',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
        files: [
            { name: 'main.py', content: 'import argparse\n\ndef main():\n    parser = argparse.ArgumentParser(description="CLI繝・・繝ｫ")\n    parser.add_argument("input", help="蜈･蜉・)\n    args = parser.parse_args()\n    print(f"蜈･蜉・ {args.input}")\n\nif __name__ == "__main__":\n    main()\n' },
        ]
    },
    {
        id: 'scraper',
        name: '繧ｹ繧ｯ繝ｬ繧､繝代・',
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
            { name: 'main.py', content: 'from flask import Flask, request, abort\nfrom linebot.v3 import WebhookHandler\nfrom linebot.v3.messaging import ApiClient, Configuration, MessagingApi\nfrom linebot.v3.webhooks import MessageEvent, TextMessageContent\nimport os\n\napp = Flask(__name__)\nhandler = WebhookHandler(os.environ["LINE_CHANNEL_SECRET"])\n\n@app.route("/callback", methods=["POST"])\ndef callback():\n    signature = request.headers["X-Line-Signature"]\n    body = request.get_data(as_text=True)\n    handler.handle(body, signature)\n    return "OK"\n\n@handler.add(MessageEvent, message=TextMessageContent)\ndef handle_message(event):\n    # AI縺ｫ霑比ｿ｡繝ｭ繧ｸ繝・け繧剃ｽ懊▲縺ｦ繧ゅｉ縺｣縺ｦ縺上□縺輔＞\n    pass\n\nif __name__ == "__main__":\n    app.run(port=5000)\n' },
            { name: 'requirements.txt', content: 'flask\nline-bot-sdk\n' },
            { name: '.env.example', content: 'LINE_CHANNEL_SECRET=\nLINE_CHANNEL_ACCESS_TOKEN=\n' },
        ]
    },
    {
        id: 'dataanalysis',
        name: '繝・・繧ｿ蛻・梵',
        desc: 'Python / pandas + matplotlib',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
        files: [
            { name: 'analysis.py', content: 'import pandas as pd\nimport matplotlib.pyplot as plt\n\n# 繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧\n# df = pd.read_csv("data.csv")\n\n# 繧ｵ繝ｳ繝励Ν繝・・繧ｿ\ndf = pd.DataFrame({"x": range(10), "y": [i**2 for i in range(10)]})\n\nprint(df.describe())\n\nplt.figure(figsize=(8, 5))\nplt.plot(df["x"], df["y"])\nplt.title("Sample Plot")\nplt.savefig("output.png")\nplt.show()\n' },
            { name: 'requirements.txt', content: 'pandas\nmatplotlib\nseaborn\nnumpy\n' },
        ]
    },
    {
        id: 'telegrambot',
        name: 'Telegram Bot',
        desc: 'Python / python-telegram-bot',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
        files: [
            { name: 'bot.py', content: 'from telegram import Update\nfrom telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes\nimport os\n\nasync def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):\n    await update.message.reply_text("Bot襍ｷ蜍穂ｸｭ")\n\nasync def echo(update: Update, ctx: ContextTypes.DEFAULT_TYPE):\n    await update.message.reply_text(update.message.text)\n\napp = ApplicationBuilder().token(os.environ["BOT_TOKEN"]).build()\napp.add_handler(CommandHandler("start", start))\napp.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))\napp.run_polling()\n' },
            { name: 'requirements.txt', content: 'python-telegram-bot>=20.0\npython-dotenv\n' },
            { name: '.env.example', content: 'BOT_TOKEN=your_token_here\n' },
        ]
    },
    {
        id: 'blank',
        name: '遨ｺ逋ｽ',
        desc: '菴輔〒繧り・逕ｱ縺ｫ',
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
// Debounced IndexedDB save 窶・coalesces rapid edits into one write.
let _saveTimer = null;
let _saveInFlight = false;
let _lastSavedAt = null;

function save() {
    // Update localStorage mirror synchronously for small, critical settings
    // only (cheap, and lets us recover provider/model instantly even if
    // IndexedDB is unavailable). Project data is NOT mirrored here 窶・it's
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
        toast('菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆縲ゅせ繝医Ξ繝ｼ繧ｸ螳ｹ驥上ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞', 'error', 4000);
    } finally {
        _saveInFlight = false;
    }
}

function updateSaveIndicator(ok) {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    if (ok) {
        el.textContent = `菫晏ｭ俶ｸ医∩ ${fmtTime(_lastSavedAt)}`;
        el.classList.remove('save-indicator-error');
    } else {
        el.textContent = '菫晏ｭ伜､ｱ謨・;
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
    if (!snap) { toast('繝舌ャ繧ｯ繧｢繝・・縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ', 'error'); return; }
    state.projects = snap.projects;
    await flushSaveToIDB();
    renderProjects();
    toast(`${new Date(ts).toLocaleString('ja-JP')} 縺ｮ迥ｶ諷九↓蠕ｩ蜈・＠縺ｾ縺励◆`, 'warning', 4000);
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
// JSON/TS/JS 窶・for plain-text languages like Python this will simply
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
        errEl.textContent = `繧ｨ繝ｩ繝ｼ ${errorCount}`;
        warnEl.textContent = `隴ｦ蜻・${warningCount}`;
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
    { re: /os\.system\s*\(|subprocess\.(run|Popen|call)\s*\(.*shell\s*=\s*True/i, msg: '繧ｷ繧ｧ繝ｫ繧ｳ繝槭Φ繝峨・螳溯｡・(shell=True)' },
    { re: /rm\s+-rf|rmdir\s+\/|del\s+\/[Ss]/i, msg: '繝輔ぃ繧､繝ｫ繝ｻ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蠑ｷ蛻ｶ蜑企勁繧ｳ繝槭Φ繝・ },
    { re: /eval\s*\(|exec\s*\(/i, msg: '蜍慕噪繧ｳ繝ｼ繝牙ｮ溯｡・(eval/exec)' },
    { re: /import\s+ctypes|__import__\s*\(/i, msg: '菴弱Ξ繝吶Ν繧ｷ繧ｹ繝・Β繧｢繧ｯ繧ｻ繧ｹ (ctypes)' },
    { re: /DROP\s+TABLE|DELETE\s+FROM\s+\w+\s*;/i, msg: '繝・・繧ｿ繝吶・繧ｹ縺ｮ遐ｴ螢顔噪謫堺ｽ・ },
    { re: /localStorage\.clear\(\)|sessionStorage\.clear\(\)/i, msg: '繧ｹ繝医Ξ繝ｼ繧ｸ縺ｮ蜈ｨ蜑企勁' },
    { re: /(https?:\/\/[^\s"']+)\s*\/\s*(token|password|secret|credential)/i, msg: '雉・�ｼ諠・�ｱ縺ｮ螟夜Κ騾∽ｿ｡縺ｮ蜿ｯ閭ｽ諤ｧ' },
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
            if (el) el.textContent = `陦・${pos.lineNumber}, 蛻・${pos.column}`;
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
        card.title = t.name + ' 窶・' + t.desc;
        // icon is raw SVG (no class="icon" needed 窶・styled by .template-icon svg)
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
    toast(`縲・{template.name}縲阪ユ繝ｳ繝励Ξ繝ｼ繝医ｒ驕ｩ逕ｨ縺励∪縺励◆`);
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
            <div class="project-card-meta">${proj.files.length} 繝輔ぃ繧､繝ｫ &middot; ${fmtDate(proj.createdAt)}</div>
            <div class="project-card-actions">
                <button class="project-card-action danger" title="蜑企勁">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>`;
        card.addEventListener('click', e => { if (!e.target.closest('.project-card-action')) openProject(proj.id); });
        card.querySelector('.project-card-action').addEventListener('click', e => {
            e.stopPropagation();
            confirmDelete('project', proj.id, null, `縲・{proj.name}縲阪ｒ蜑企勁縺励∪縺吶°・溘％縺ｮ謫堺ｽ懊・蜈・↓謌ｻ縺帙∪縺帙ｓ縲Ａ);
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
            <p class="welcome-text">菴懊ｊ縺溘＞繧ゅ・繧呈蕗縺医※縺上□縺輔＞縲・/p>
            <p class="welcome-hint">AI縺後さ繝ｼ繝峨ｒ逕滓・繝ｻ謾ｹ蝟・＠縺ｾ縺・/p>
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
    if (typeof refreshHostingUI !== 'undefined') refreshHostingUI();
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
        tab.title = isEmpty ? `${file.name} (蜀・ｮｹ縺ｪ縺・` : file.name;
        tab.dataset.filename = file.name;
        tab.innerHTML = `
            <span>${esc(file.name)}</span>
            <span class="file-tab-close"><svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>`;
        tab.addEventListener('click', e => { if (!e.target.closest('.file-tab-close')) switchFile(file.name); });
        tab.querySelector('.file-tab-close').addEventListener('click', e => {
            e.stopPropagation();
            confirmDelete('file', null, file.name, `縲・{file.name}縲阪ｒ蜑企勁縺励∪縺吶°・歔);
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
        <div class="tab-ctx-item" data-a="rename">蜷榊燕繧貞､画峩</div>
        <div class="tab-ctx-item" data-a="download">繝繧ｦ繝ｳ繝ｭ繝ｼ繝・/div>
        <div class="tab-ctx-item danger" data-a="delete">蜑企勁</div>`;
    m.querySelector('[data-a="rename"]').onclick  = () => { removeTabCtx(); openRenameModal(filename); };
    m.querySelector('[data-a="download"]').onclick = () => { removeTabCtx(); downloadFile(filename); };
    m.querySelector('[data-a="delete"]').onclick  = () => { removeTabCtx(); confirmDelete('file', null, filename, `縲・{filename}縲阪ｒ蜑企勁縺励∪縺吶°・歔); };
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
    if (proj.files.find(f => f.name === name)) { toast(`縲・{name}縲阪・縺吶〒縺ｫ蟄伜惠縺励∪縺兪, 'error'); return; }
    proj.files.push({ name, content: '' });
    save(); renderTabs(); switchFile(name);
    toast(`縲・{name}縲阪ｒ霑ｽ蜉�縺励∪縺励◆`);
}

function openRenameModal(filename) {
    state.deleteTarget = { type: 'rename', filename };
    document.getElementById('rename-file-input').value = filename;
    openModal('rename-file-modal');
}

function renameFile(oldName, newName) {
    const proj = getProj();
    if (!proj) return;
    if (proj.files.find(f => f.name === newName)) { toast(`縲・{newName}縲阪・縺吶〒縺ｫ蟄伜惠縺励∪縺兪, 'error'); return; }
    const file = proj.files.find(f => f.name === oldName);
    if (!file) return;
    file.name = newName;
    if (state.currentFile === oldName) {
        state.currentFile = newName;
        document.getElementById('current-file-name').textContent = newName;
        setEditorContent(file.content, newName);
    }
    save(); renderTabs();
    toast(`縲・{oldName}縲阪ｒ縲・{newName}縲阪↓螟画峩縺励∪縺励◆`);
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
    toast(`縲・{filename}縲阪ｒ繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｾ縺励◆`);
}

// ===== CLEANUP TABS =====
function openCleanupModal() {
    const proj = getProj();
    if (!proj) return;
    const list = document.getElementById('cleanup-file-list');
    list.innerHTML = '';
    if (proj.files.length === 0) { toast('繝輔ぃ繧､繝ｫ縺後≠繧翫∪縺帙ｓ', 'warning'); return; }

    proj.files.forEach(file => {
        const isEmpty = !file.content || file.content.trim() === '';
        const item = document.createElement('label');
        item.className = 'cleanup-file-item';
        item.innerHTML = `
            <input type="checkbox" value="${esc(file.name)}" ${isEmpty ? 'checked' : ''}>
            <span class="cleanup-file-name">${esc(file.name)}</span>
            <span class="cleanup-file-size">${file.content ? file.content.length + ' chars' : '0'}</span>
            ${isEmpty ? '<span class="cleanup-file-empty">蜀・ｮｹ縺ｪ縺・/span>' : ''}`;
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
    if (toDelete.length === 0) { toast('蜑企勁縺吶ｋ繝輔ぃ繧､繝ｫ縺碁∈謚槭＆繧後※縺・∪縺帙ｓ', 'warning'); return; }

    const names = toDelete.join('縲・);
    confirmDelete('files-bulk', null, toDelete, `莉･荳九・繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺吶°・歃n${names}`);
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
        toast(`縲・{name}縲阪ｒ蜑企勁縺励∪縺励◆`, 'warning');
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
        toast(`${t.extra.length}蛟九・繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆`, 'warning');
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
    toast(`縲・{filename}縲阪ｒ蜑企勁縺励∪縺励◆`, 'warning');
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
    toast(`縲・{proj.name}縲阪ｒ繧ｨ繧ｯ繧ｹ繝昴・繝医＠縺ｾ縺励◆`);
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

    if (proj.files.length === 0) { toast('繝輔ぃ繧､繝ｫ縺後≠繧翫∪縺帙ｓ', 'warning'); return; }

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
                '## 繧ｻ繝・ヨ繧｢繝・・',
                hasPy ? '```bash\npip install -r requirements.txt\npython main.py\n```' : '',
                hasJs ? '```bash\nnpm install\nnode index.js\n```' : '',
                '',
                `逕滓・譌･: ${new Date().toLocaleDateString('ja-JP')}`,
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
        toast(`縲・{proj.name}縲阪ｒZIP縺ｧ繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｾ縺励◆ (${proj.files.length}繝輔ぃ繧､繝ｫ)`);
    } catch (err) {
        console.error(err);
        toast('ZIP縺ｮ逕滓・縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ' + err.message, 'error');
    }
}

function loadJSZip() {
    return new Promise((resolve, reject) => {
        if (window.JSZip) { resolve(window.JSZip); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error('JSZip縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆'));
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
            toast(`縲・{proj.name}縲阪ｒ繧､繝ｳ繝昴・繝医＠縺ｾ縺励◆`);
        } catch {
            toast('繧､繝ｳ繝昴・繝医↓螟ｱ謨励＠縺ｾ縺励◆', 'error');
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
        btn.querySelector('span').textContent = '邱ｨ髮・↓謌ｻ繧・;
        btn.style.background = 'var(--accent-dim)';
        toast('蟾ｮ蛻・｡ｨ遉ｺ繝｢繝ｼ繝・(蜑榊屓縺ｮAI逕滓・縺ｨ縺ｮ豈碑ｼ・', 'warning');
    } else {
        state.monacoEditor.updateOptions({ readOnly: false });
        btn.querySelector('span').textContent = '蟾ｮ蛻・;
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
        lines.push({ type: 'section', text: '=== Python 繧ｻ繝・ヨ繧｢繝・・ ===' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'python -m venv venv' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'source venv/bin/activate' });
        if (hasReq) lines.push({ type: 'cmd', prompt: '$', cmd: 'pip install -r requirements.txt' });
        const mainPy = proj.files.find(f => f.name === 'main.py') ? 'main.py' : proj.files.find(f => f.name.endsWith('.py'))?.name;
        if (mainPy) lines.push({ type: 'cmd', prompt: '$', cmd: `python ${mainPy}` });
    }
    if (hasJs) {
        lines.push({ type: 'section', text: '=== Node.js 繧ｻ繝・ヨ繧｢繝・・ ===' });
        lines.push({ type: 'cmd', prompt: '$', cmd: hasPkg ? 'npm install' : 'npm init -y' });
        const mainJs = proj.files.find(f => f.name === 'index.js') ? 'index.js' : proj.files.find(f => f.name.endsWith('.js'))?.name;
        if (mainJs) lines.push({ type: 'cmd', prompt: '$', cmd: `node ${mainJs}` });
    }
    if (hasHtml) {
        lines.push({ type: 'section', text: '=== 繝ｭ繝ｼ繧ｫ繝ｫ繧ｵ繝ｼ繝舌・ ===' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'python -m http.server 8080' });
    }
    if (lines.length === 0) {
        lines.push({ type: 'comment', text: '# 繧ｳ繝ｼ繝峨′逕滓・縺輔ｌ繧九→螳溯｡後さ繝槭Φ繝峨′陦ｨ遉ｺ縺輔ｌ縺ｾ縺・ });
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
            <div class="usage-stat-label">譛ｬ譌･縺ｮ謗ｨ螳壹ヨ繝ｼ繧ｯ繝ｳ</div>
        </div>
        <div class="usage-stat-card">
            <div class="usage-stat-value">${usage.requests.toLocaleString()}</div>
            <div class="usage-stat-label">譛ｬ譌･縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝域焚</div>
        </div>
        <div class="usage-stat-card">
            <div class="usage-stat-value">${usage.prompt.toLocaleString()} / ${usage.completion.toLocaleString()}</div>
            <div class="usage-stat-label">蜈･蜉・/ 蜃ｺ蜉・/div>
        </div>`;
}

async function renderDataTab() {
    const backups = await listBackups();
    const list = document.getElementById('backup-list');

    if (backups.length === 0) {
        list.innerHTML = '<p class="section-desc">縺ｾ縺�繝舌ャ繧ｯ繧｢繝・・縺後≠繧翫∪縺帙ｓ・・蛻・＃縺ｨ縺ｫ閾ｪ蜍穂ｽ懈・縺輔ｌ縺ｾ縺呻ｼ・/p>';
    } else {
        list.innerHTML = backups.map(b => `
            <div class="backup-item">
                <div class="backup-item-info">
                    <span class="backup-item-time">${new Date(b.ts).toLocaleString('ja-JP')}</span>
                    <span class="backup-item-meta">${b.projects.length} 繝励Ο繧ｸ繧ｧ繧ｯ繝・/span>
                </div>
                <button class="backup-item-restore" data-ts="${b.ts}">蠕ｩ蜈・/button>
            </div>`).join('');

        list.querySelectorAll('.backup-item-restore').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('迴ｾ蝨ｨ縺ｮ繝・・繧ｿ繧偵％縺ｮ繝舌ャ繧ｯ繧｢繝・・譎らせ縺ｮ迥ｶ諷九↓荳頑嶌縺阪＠縺ｾ縺吶ゅｈ繧阪＠縺・〒縺吶°・・)) return;
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
            infoEl.innerHTML = `<b>繧ｹ繝医Ξ繝ｼ繧ｸ菴ｿ逕ｨ驥・</b> ${usedMB} MB / ${quotaMB} MB&nbsp;&nbsp;`
                + `<b>繝励Ο繧ｸ繧ｧ繧ｯ繝域焚:</b> ${state.projects.length}莉ｶ&nbsp;&nbsp;`
                + `<b>譛邨ゆｿ晏ｭ・</b> ${_lastSavedAt ? fmtTime(_lastSavedAt) : '譛ｪ菫晏ｭ・}`;
        } else {
            infoEl.innerHTML = `<b>繝励Ο繧ｸ繧ｧ繧ｯ繝域焚:</b> ${state.projects.length}莉ｶ`;
        }
    } catch {
        infoEl.innerHTML = `<b>繝励Ο繧ｸ繧ｧ繧ｯ繝域焚:</b> ${state.projects.length}莉ｶ`;
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
                <span class="api-key-label">蜷榊燕</span>
                <input class="api-key-name-input" type="text" value="${esc(key.name)}" placeholder="萓・ Groq" data-id="${key.id}" data-field="name">
                <button class="api-key-delete" data-id="${key.id}" title="蜑企勁">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
            <div class="api-key-row">
                <span class="api-key-label">URL</span>
                <input class="api-key-url-input" type="text" value="${esc(key.baseUrl)}" placeholder="https://api.groq.com/openai/v1" data-id="${key.id}" data-field="baseUrl">
            </div>
            <div class="api-key-row">
                <span class="api-key-label">API繧ｭ繝ｼ</span>
                <input class="api-key-value-input" type="password" value="${esc(key.key)}" placeholder="sk-..." data-id="${key.id}" data-field="key">
            </div>
            <div class="api-key-hint">OpenAI莠呈鋤API蟇ｾ蠢・(Groq / OpenAI / OpenRouter 遲・</div>`;
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
    sel.innerHTML = '<option value="">-- 繝励Ο繝舌う繝繝ｼ繧帝∈謚・--</option>';
    state.apiKeys.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k.id; opt.textContent = k.name || '(辟｡蜷・';
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
    toast('險ｭ螳壹ｒ菫晏ｭ倥＠縺ｾ縺励◆');
}

function updateBadge() {
    const badge = document.getElementById('active-provider-badge');
    const key = state.activeProvider ? state.apiKeys.find(k => k.id === state.activeProvider) : null;
    if (key) {
        badge.textContent = key.name + (state.activeModel ? ' / ' + state.activeModel : '');
        badge.classList.add('active');
    } else {
        badge.textContent = '譛ｪ險ｭ螳・; badge.classList.remove('active');
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
    /縺薙ｓ縺ｫ縺｡縺ｯ[・・]?\s*Discord[繝懊・]繝・ヨ髢狗匱縺ｮ蟆る摩螳ｶ/,
    /Discord繝懊ャ繝磯幕逋ｺ.*蟆る摩螳ｶ.*繧｢繧ｷ繧ｹ繧ｿ繝ｳ繝・,
    /菴懊ｊ縺溘＞.*Discord繝懊ャ繝・*蜀・ｮｹ繧呈蕗縺医※/,
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
const MAX_IMAGE_DIMENSION = 1568; // resize long edge to this 窶・keeps payload reasonable

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Resize/recompress large images client-side before they ever touch the
// network 窶・keeps API payloads small and avoids hitting provider limits.
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
        toast(`逕ｻ蜒上・1繝｡繝・そ繝ｼ繧ｸ縺ｫ縺､縺肴怙螟ｧ${MAX_IMAGES_PER_MESSAGE}譫壹∪縺ｧ縺ｧ縺兪, 'warning');
    }
    const slotsLeft = MAX_IMAGES_PER_MESSAGE - state.pendingImages.length;
    const toProcess = files.slice(0, Math.max(0, slotsLeft));

    for (const file of toProcess) {
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            toast(`縲・{file.name}縲阪・${MAX_IMAGE_SIZE_MB}MB繧定ｶ・∴縺ｦ縺・∪縺兪, 'error');
            continue;
        }
        try {
            const raw = await fileToDataUrl(file);
            const resized = await resizeImageDataUrl(raw);
            state.pendingImages.push({ id: genId(), dataUrl: resized, name: file.name });
        } catch (e) {
            console.error('Image processing failed:', e);
            toast(`縲・{file.name}縲阪・隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨励＠縺ｾ縺励◆`, 'error');
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
            <button class="image-preview-remove" data-id="${img.id}" title="蜑企勁">
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
    if (query && found === 0) toast('隕九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆', 'warning');
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
        { 1: '繧ｳ繝ｼ繝峨ｒ逕滓・荳ｭ...', 2: '繝舌げ繧呈､懆ｨｼ荳ｭ...', 3: '譛邨ら｢ｺ隱堺ｸｭ...' }[step] || '螳御ｺ・;
}

// ===== AI CALL (STREAMING) =====
// ===== USAGE / COST TRACKING (best-effort, estimated) =====
// Token counts from streaming APIs aren't always available, so we estimate
// using a simple chars/4 heuristic when an explicit `usage` object isn't
// returned. This is intentionally approximate 窶・good enough for a warning
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
        toast(`譛ｬ譌･縺ｮ謗ｨ螳壹ヨ繝ｼ繧ｯ繝ｳ菴ｿ逕ｨ驥上′荳企剞(${limit.toLocaleString()})繧定ｶ・∴縺ｾ縺励◆`, 'warning', 5000);
    }
}

async function callAIStream(messages, onChunk) {
    const key = state.apiKeys.find(k => k.id === state.activeProvider);
    if (!key) throw new Error('API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ縲りｨｭ螳壹°繧臥匳骭ｲ縺励※縺上□縺輔＞縲・);

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
            showNotif('API繧ｭ繝ｼ繧ｨ繝ｩ繝ｼ', `縲・{key.name}縲阪・API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｾ縺溘・譛滄剞蛻・ｌ縺ｧ縺吶・n${errMsg}`, key.id);
        else if (res.status === 429)
            showNotif('繝ｬ繝ｼ繝亥宛髯・, `縲・{key.name}縲阪・繝ｬ繝ｼ繝亥宛髯舌↓驕斐＠縺ｾ縺励◆縲・n${errMsg}`, key.id);
        else if (res.status === 402)
            showNotif('繧ｯ繝ｬ繧ｸ繝・ヨ荳崎ｶｳ', `縲・{key.name}縲阪・繧ｯ繝ｬ繧ｸ繝・ヨ縺御ｸ崎ｶｳ縺励※縺・∪縺吶・n${errMsg}`, key.id);
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

    // Record usage 窶・use provider-reported usage if available, otherwise estimate.
    const promptTokens = usageObj?.prompt_tokens ?? estimateTokens(messages.map(m => m.content).join('\n'));
    const completionTokens = usageObj?.completion_tokens ?? estimateTokens(full);
    recordUsage(promptTokens, completionTokens);

    return full;
}

async function callAI(messages) {
    const key = state.apiKeys.find(k => k.id === state.activeProvider);
    if (!key) throw new Error('API繧ｭ繝ｼ縺瑚ｨｭ螳壹＆繧後※縺・∪縺帙ｓ縲・);
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
            showNotif('API繧ｭ繝ｼ繧ｨ繝ｩ繝ｼ', `縲・{key.name}縲阪・API繧ｭ繝ｼ縺檎┌蜉ｹ縺ｧ縺吶・n${errMsg}`, key.id);
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
縲占・蜍募渚蠕ｩ繝｢繝ｼ繝峨・縺薙ｌ縺ｯ閾ｪ蜍募渚蠕ｩ縺ｮ ${iterNum}/${totalIter} 蝗樒岼縺ｧ縺吶・${goal ? `逶ｮ讓・ ${goal}` : ''}
蜑榊屓縺ｮ蜃ｺ蜉帙ｒ謇ｹ蛻､逧・↓隕狗峩縺励√ヰ繧ｰ繝ｻ繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繝ｻ蜿ｯ隱ｭ諤ｧ繧呈隼蝟・＠縺ｦ縺上□縺輔＞縲・繧ｳ繝ｼ繝牙・菴薙ｒ蜀榊・蜉帙＠縺ｦ縺上□縺輔＞縲Ａ : '';

    const maxNote = state.maxMode ? `
縲信AX MODE 窶・譛鬮倡ｲｾ蠎ｦ繝｢繝ｼ繝峨・縺ゅ↑縺溘・莉翫∵怙鬮俶ｰｴ貅悶・繧ｨ繝ｳ繧ｸ繝九い繝ｪ繝ｳ繧ｰ繧呈ｱゅａ繧峨ｌ縺ｦ縺・∪縺吶ゆｻ･荳九・繝励Ο繧ｻ繧ｹ繧貞ｿ・★螳溯｡後＠縺ｦ縺上□縺輔＞:

STEP 1 窶・隕∽ｻｶ縺ｮ豺ｱ蝣繧・
  - 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ陦ｨ髱｢逧・↑隕∵ｱゅ・閭悟ｾ後↓縺ゅｋ譛ｬ雉ｪ逧・↑繝九・繧ｺ繧堤音螳壹☆繧・  - 繧ｨ繝・ず繧ｱ繝ｼ繧ｹ繝ｻ蠅・阜蛟､繝ｻ諠ｳ螳壼､悶・蜈･蜉帙ｒ蛻玲嫌縺吶ｋ

STEP 2 窶・險ｭ險医・讀懆ｨ・
  - 蟆代↑縺上→繧・縺､縺ｮ繧｢繝励Ο繝ｼ繝√ｒ鬆ｭ縺ｮ荳ｭ縺ｧ豈碑ｼ・＠縲∵怙蝟・ｒ驕ｸ謚槭☆繧・  - 驕ｸ繧薙□逅・罰繧・縲・譁・〒隱ｬ譏弱☆繧・
STEP 3 窶・繧ｳ繝ｼ繝臥函謌・
  - 蝙句ｮ牙・繝ｻnull螳牙・繝ｻ繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繧貞ｮ悟・縺ｫ螳溯｣・☆繧・  - 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ繧呈э隴倥＠縲＾(nﾂｲ)莉･荳翫・蜃ｦ逅・・蝗樣∩縺吶ｋ
  - 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝ｪ繧ｹ繧ｯ・・QL繧､繝ｳ繧ｸ繧ｧ繧ｯ繧ｷ繝ｧ繝ｳ繝ｻXSS遲会ｼ峨ｒ謗帝勁縺吶ｋ

STEP 4 窶・閾ｪ蟾ｱ謇ｹ蛻､:
  - 逕滓・縺励◆繧ｳ繝ｼ繝峨ｒ謇ｹ蛻､逧・↓繝ｬ繝薙Η繝ｼ縺励∵ｽ懷惠繝舌げ繧・縺､莉･荳頑欠鞫倥＠縺ｦ菫ｮ豁｣縺吶ｋ
  - 縲後％縺ｮ繧ｳ繝ｼ繝峨・蠑ｱ轤ｹ縺ｯ・溘阪→閾ｪ蝠上＠縺ｦ謾ｹ蝟・ｒ蜉�縺医ｋ

STEP 5 窶・譛邨ょ・蜉・
  - 荳願ｨ倥☆縺ｹ縺ｦ繧貞渚譏�縺励◆螳悟・縺ｪ繧ｳ繝ｼ繝峨ｒ蜃ｺ蜉帙☆繧・  - 繧ｳ繝｡繝ｳ繝医・驥崎ｦ√↑邂・園縺ｮ縺ｿ縲∫ｰ｡貎斐↓險倩ｿｰ縺吶ｋ` : '';

    const base = `縺ゅ↑縺溘・蜆ｪ遘縺ｪ繧ｽ繝輔ヨ繧ｦ繧ｧ繧｢繧ｨ繝ｳ繧ｸ繝九い縺ｧ縺吶・繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ隕∵悍縺ｫ蠢懊§縺ｦ繧ｳ繝ｼ繝峨ｒ逕滓・繝ｻ謾ｹ蝟・＠縺ｾ縺吶１ython / JavaScript / TypeScript / Rust / Go / HTML / CSS 縺ｪ縺ｩ縲√←繧薙↑險隱槭・繝輔Ξ繝ｼ繝�繝ｯ繝ｼ繧ｯ縺ｫ繧ょｯｾ蠢懊＠縺ｾ縺吶・${autoNote}
${maxNote}

縲宣㍾隕√↑蛻ｶ邏・・- 閾ｪ蟾ｱ邏ｹ莉九・邨ｶ蟇ｾ縺ｫ縺励↑縺・〒縺上□縺輔＞縲ゅ後％繧薙↓縺｡縺ｯ縲阪↑縺ｩ縺ｮ謖ｨ諡ｶ繧ゆｸ崎ｦ√〒縺・- 蟆る摩蛻・㍽繧貞錐荵励ｉ縺ｪ縺・〒縺上□縺輔＞・井ｾ・縲轡iscord繝懊ャ繝磯幕逋ｺ縺ｮ蟆る摩螳ｶ縲阪↑縺ｩ・・- 邨ｵ譁・ｭ励・菴ｿ逕ｨ縺励↑縺・〒縺上□縺輔＞
- 譛蛻昴・繝｡繝・そ繝ｼ繧ｸ縺九ｉ縺吶＄譛ｬ鬘後↓蜈･縺｣縺ｦ縺上□縺輔＞

縲舌・繝ｭ繧ｸ繧ｧ繧ｯ繝亥錐縲・{proj?.name || '譛ｪ險ｭ螳・}

縲舌さ繝ｼ繝臥函謌舌Ν繝ｼ繝ｫ縲・1. 繧ｳ繝ｼ繝峨ｒ蜃ｺ蜉帙☆繧句燕縺ｫ縲∝ｿ・★蜀・Κ縺ｧ隕狗峩縺励※縺上□縺輔＞・医ヰ繧ｰ繝ｻ蝙九お繝ｩ繝ｼ繝ｻ隲也炊繧ｨ繝ｩ繝ｼ繝ｻ繧､繝ｳ繝昴・繝域ｼ上ｌ・・2. 繧ｳ繝ｼ繝峨ヶ繝ｭ繝・け縺ｮ逶ｴ蜑阪↓蠢・★縲後ヵ繧｡繧､繝ｫ: 繝輔ぃ繧､繝ｫ蜷阪阪→險倩ｼ峨＠縺ｦ縺上□縺輔＞
   萓・
   繝輔ぃ繧､繝ｫ: main.py
   \`\`\`python
   繧ｳ繝ｼ繝・   \`\`\`
3. 隍・焚繝輔ぃ繧､繝ｫ縺悟ｿ・ｦ√↑蝣ｴ蜷医・縺吶∋縺ｦ蜃ｺ蜉帙＠縺ｦ縺上□縺輔＞
4. 譌｢蟄倥ヵ繧｡繧､繝ｫ縺後≠繧句�ｴ蜷医・縺昴・蜀・ｮｹ繧貞ｿ・★閠・・縺励※謨ｴ蜷域ｧ繧剃ｿ昴▲縺ｦ縺上□縺輔＞
5. 險ｭ螳壹ヵ繧｡繧､繝ｫ・・equirements.txt, package.json遲会ｼ峨′蠢・ｦ√↑蝣ｴ蜷医・荳邱偵↓蜃ｺ蜉帙＠縺ｦ縺上□縺輔＞
6. 縲仙ｿ・�医台ｸ崎ｦ√↓縺ｪ縺｣縺溘ヵ繧｡繧､繝ｫ縺ｯ豈主屓蠢・★蜑企勁縺励※縺上□縺輔＞縲ょ炎髯､縺吶ｋ繝輔ぃ繧､繝ｫ縺ｯ莉･荳九・蠖｢蠑上〒譏守､ｺ縺励※縺上□縺輔＞:
   DELETE: 蜑企勁縺吶ｋ繝輔ぃ繧､繝ｫ蜷・   萓・ DELETE: old_utils.py
   繝ｪ繝輔ぃ繧ｯ繧ｿ繝ｪ繝ｳ繧ｰ繧・ｵｱ蜷医〒繝輔ぃ繧､繝ｫ縺御ｸ崎ｦ√↓縺ｪ縺｣縺溷�ｴ蜷医ｂ蠢・★蜑企勁謖・､ｺ繧貞・縺励※縺上□縺輔＞縲・
縲千樟蝨ｨ縺ｮ繝輔ぃ繧､繝ｫ縲・${filesStr || '(縺ｾ縺�繝輔ぃ繧､繝ｫ縺ｯ縺ゅｊ縺ｾ縺帙ｓ)'}

縺吶∋縺ｦ縺ｮ蝗樒ｭ斐・譌･譛ｬ隱槭〒縲∫ｰ｡貎斐↓隱ｬ譏弱＠縺ｦ縺上□縺輔＞縲Ａ;

    return state.customPrompt ? state.customPrompt + '\n\n' + base : base;
}

// ===== MARKDOWN RENDERER =====
function renderMarkdown(text) {
    // Escape HTML
    let s = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Fenced code blocks 窶・extract and protect them
    const blocks = [];
    s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const idx = blocks.length;
        blocks.push(`<div class="md-codeblock"><div class="md-codeblock-header"><span class="md-lang">${lang || 'code'}</span><button class="md-copy-btn" onclick="copyMdCode(this)">繧ｳ繝斐・</button></div><pre class="md-pre"><code>${code.trimEnd()}</code></pre></div>`);
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
        btn.textContent = '繧ｳ繝斐・貂・;
        setTimeout(() => btn.textContent = '繧ｳ繝斐・', 1500);
    }).catch(() => {});
}

// ===== PARSE & APPLY FILES =====
function parseFiles(text) {
    const files = [];
    const re = /繝輔ぃ繧､繝ｫ[:・咯\s*(\S+)\s*\n```(?:\w*)\n([\s\S]*?)```/g;
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
            '讀懷・縺輔ｌ縺溯ｦ∫ｴ�:\n' + dangers.map(d => '- ' + d).join('\n');
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

// Bracket/paren/brace balance check 窶・language agnostic, catches truncated
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
                    return { ok: false, reason: `${li + 1}陦檎岼: 縲・{ch}縲阪↓蟇ｾ蠢懊☆繧矩幕縺肴峡蠑ｧ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ` };
                }
            }
        }
    }
    if (stack.length > 0) {
        const unclosed = stack[stack.length - 1];
        return { ok: false, reason: `${unclosed.line}陦檎岼: 縲・{unclosed.ch}縲阪′髢峨§繧峨ｌ縺ｦ縺・∪縺帙ｓ` };
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
            return { ok: false, reason: `${i + 1}陦檎岼: 繧ｿ繝悶→繧ｹ繝壹・繧ｹ縺梧ｷｷ蝨ｨ縺励※縺・∪縺兪 };
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
                    return { ok: false, reason: `${i + 1}陦檎岼: 縲・縲阪・蠕後↓繧､繝ｳ繝・Φ繝医＆繧後◆繝悶Ο繝・け縺後≠繧翫∪縺帙ｓ` };
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
        if (!balance.ok) { issues.push({ filename: filename || '(辟｡蜷阪ヵ繧｡繧､繝ｫ)', reason: balance.reason }); return; }

        if (lang === 'python') {
            const indent = checkPythonIndentation(code);
            if (!indent.ok) { issues.push({ filename: filename || '(辟｡蜷阪ヵ繧｡繧､繝ｫ)', reason: indent.reason }); return; }
        }
        if (lang === 'json') {
            const json = checkJsonSyntax(code);
            if (!json.ok) { issues.push({ filename: filename || '(辟｡蜷阪ヵ繧｡繧､繝ｫ)', reason: json.reason }); return; }
        }
    });
    return issues;
}

function checkSyntaxAndConfirm(parsedFiles) {
    const issues = validateSyntax(parsedFiles);
    if (issues.length === 0) return Promise.resolve(true);

    return new Promise(resolve => {
        document.getElementById('syntax-confirm-detail').textContent =
            issues.map(i => `${i.filename}\n  竊・${i.reason}`).join('\n\n');
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
    if (!dangerOk) { toast('繧ｳ繝ｼ繝峨・驕ｩ逕ｨ繧偵く繝｣繝ｳ繧ｻ繝ｫ縺励∪縺励◆', 'warning'); return; }

    const syntaxOk = await checkSyntaxAndConfirm(parsedFiles);
    if (!syntaxOk) {
        toast('讒区枚繧ｨ繝ｩ繝ｼ縺ｮ縺溘ａ驕ｩ逕ｨ繧偵く繝｣繝ｳ繧ｻ繝ｫ縺励∪縺励◆縲ょ燕縺ｮ迥ｶ諷九ｒ邯ｭ謖√＠縺ｾ縺・, 'warning', 4000);
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
            toast(`荳崎ｦ√ヵ繧｡繧､繝ｫ繧貞炎髯､: ${deleted.join(', ')}`, 'warning');
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
    if (!state.activeProvider || !state.activeModel) { toast('險ｭ螳壹°繧陰PI繧ｭ繝ｼ縺ｨ繝｢繝・Ν繧堤匳骭ｲ縺励※縺上□縺輔＞', 'error'); return; }

    input.value = ''; input.style.height = '';
    clearPendingImages();
    appendMsg('user', text || '(逕ｻ蜒上・縺ｿ)', null, true, images.length ? images : null);

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
        messages.push({ role: 'user', content: `[閾ｪ蜍募渚蠕ｩ ${iterNum}/${totalIter}] ${goal || '繧ｳ繝ｼ繝峨ｒ縺輔ｉ縺ｫ謾ｹ蝟・＠縺ｦ縺上□縺輔＞縲ゅヰ繧ｰ繧剃ｿｮ豁｣縺励√お繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ繧貞ｼｷ蛹悶＠縺ｦ縺上□縺輔＞縲・}` });
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
            if (!isAutoIter) toast(`${files.length}蛟九・繝輔ぃ繧､繝ｫ繧呈峩譁ｰ縺励∪縺励◆`);
        }

        return fullResponse;
    } catch (err) {
        hideTyping();
        hideProg();
        document.getElementById('streaming-msg')?.remove();
        if (err.message && err.message.includes('image') && err.message.match(/support|vision|multimodal/i)) {
            appendMsg('assistant', `繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:\n${err.message}\n\n縺薙・繝｢繝・Ν縺ｯ逕ｻ蜒擾ｼ・ision・峨↓蟇ｾ蠢懊＠縺ｦ縺・↑縺・庄閭ｽ諤ｧ縺後≠繧翫∪縺吶ら判蜒丞ｯｾ蠢懊Δ繝・Ν・井ｾ・ gpt-4o, llama-3.2-90b-vision遲会ｼ峨↓蛻・ｊ譖ｿ縺医※縺上□縺輔＞縲Ａ);
        } else {
            appendMsg('assistant', `繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:\n${err.message}`);
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
        toast('險ｭ螳壹°繧陰PI繧ｭ繝ｼ縺ｨ繝｢繝・Ν繧堤匳骭ｲ縺励※縺上□縺輔＞', 'error');
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

    appendSystemMsg(`閾ｪ蜍募渚蠕ｩ繝｢繝ｼ繝蛾幕蟋・窶・${totalIter}蝗槭・諤晁・ｒ陦後＞縺ｾ縺・{goal ? '縲ら岼讓・ ' + goal : ''}`);

    try {
        for (let i = 1; i <= totalIter; i++) {
            if (state.autoMode.stopRequested) break;

            state.autoMode.currentIter = i;
            document.getElementById('auto-iter-current').textContent = i;
            document.getElementById('auto-mode-label').textContent = `隨ｬ${i}蝗・諤晁・ｸｭ...`;

            appendSystemMsg(`[ 諤晁・${i}/${totalIter} ] 謾ｹ蝟・ｸｭ...`);

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
            ? `閾ｪ蜍募渚蠕ｩ繧貞●豁｢縺励∪縺励◆ (${done}/${totalIter}蝗槫ｮ御ｺ・`
            : `閾ｪ蜍募渚蠕ｩ縺悟ｮ御ｺ・＠縺ｾ縺励◆ (${totalIter}蝗槭・諤晁・ｒ螳溯｡・`
        );
        if (!stopped) toast(`閾ｪ蜍募渚蠕ｩ螳御ｺ・窶・${totalIter}蝗槭・謾ｹ蝟・ｒ螳滓命縺励∪縺励◆`);
    }
}

function stopAutoMode() {
    state.autoMode.stopRequested = true;
    document.getElementById('auto-mode-label').textContent = '蛛懈ｭ｢荳ｭ...';
}

// ===== MAX MODE =====
function toggleMaxMode() {
    state.maxMode = !state.maxMode;
    save();
    applyMaxModeUI();
    if (state.maxMode) {
        toast('MAX 繝｢繝ｼ繝・ON 窶・譛鬮倡ｲｾ蠎ｦ縺ｧ蠢懃ｭ斐＠縺ｾ縺・, 'warning', 3000);
    } else {
        toast('MAX 繝｢繝ｼ繝・OFF', 'success');
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
        toast('蜃ｦ逅・ｸｭ縺ｯ螳溯｡後〒縺阪∪縺帙ｓ', 'warning');
        return;
    }
    if (!state.activeProvider || !state.activeModel) {
        toast('險ｭ螳壹°繧陰PI繧ｭ繝ｼ縺ｨ繝｢繝・Ν繧堤匳骭ｲ縺励※縺上□縺輔＞', 'error');
        return;
    }
    const proj = getProj();
    if (!proj) return;

    const hasCode = proj.files.some(f => f.content && f.content.trim().length > 10);
    if (!hasCode) {
        toast('譛驕ｩ蛹悶☆繧九さ繝ｼ繝峨′縺ゅｊ縺ｾ縺帙ｓ', 'warning');
        return;
    }

    // Build a comprehensive optimization prompt
    const filesStr = proj.files.filter(f => f.content).map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n');
    const optimizePrompt = `莉･荳九・繧ｳ繝ｼ繝峨ｒ3縺､縺ｮ隕ｳ轤ｹ縺九ｉ蛻・梵繝ｻ譛驕ｩ蛹悶＠縺ｦ縺上□縺輔＞縲・
縲先怙驕ｩ蛹悶・隕ｳ轤ｹ縲・1. 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ 窶・荳崎ｦ√↑蜃ｦ逅・・髱槫柑邇・↑繧｢繝ｫ繧ｴ繝ｪ繧ｺ繝�繝ｻ蜀鈴聞縺ｪ繝ｫ繝ｼ繝励ｒ謾ｹ蝟・2. 繧ｻ繧ｭ繝･繝ｪ繝・ぅ 窶・閼・ｼｱ諤ｧ繝ｻ繧､繝ｳ繧ｸ繧ｧ繧ｯ繧ｷ繝ｧ繝ｳ繝ｪ繧ｹ繧ｯ繝ｻ荳埼←蛻・↑蜈･蜉帶､懆ｨｼ繧剃ｿｮ豁｣
3. 蜿ｯ隱ｭ諤ｧ繝ｻ菫晏ｮ域ｧ 窶・蜻ｽ蜷阪・讒矩�繝ｻ繧ｳ繝｡繝ｳ繝医・髢｢謨ｰ縺ｮ蛻・牡繧呈隼蝟・
縲先焔鬆・・- 蜷・ｦｳ轤ｹ縺ｧ蝠城｡檎せ繧堤音螳壹＠縺ｦ隱ｬ譏弱＠縺ｦ縺上□縺輔＞
- 謾ｹ蝟・＠縺溘さ繝ｼ繝峨ｒ縲後ヵ繧｡繧､繝ｫ: 繝輔ぃ繧､繝ｫ蜷阪榊ｽ｢蠑上〒蜃ｺ蜉帙＠縺ｦ縺上□縺輔＞
- 螟画峩邂・園縺ｮ逅・罰繧堤ｰ｡貎斐↓隱ｬ譏弱＠縺ｦ縺上□縺輔＞

縲仙ｯｾ雎｡繧ｳ繝ｼ繝峨・${filesStr}`;

    appendSystemMsg('閾ｪ蜍墓怙驕ｩ蛹悶ｒ髢句ｧ九＠縺ｾ縺・窶・繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ / 繧ｻ繧ｭ繝･繝ｪ繝・ぅ / 蜿ｯ隱ｭ諤ｧ縺ｮ3霆ｸ縺ｧ蛻・梵荳ｭ...');

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
            toast(`譛驕ｩ蛹門ｮ御ｺ・窶・${files.length}蛟九・繝輔ぃ繧､繝ｫ繧呈峩譁ｰ縺励∪縺励◆`);
        } else {
            toast('譛驕ｩ蛹門・譫舌′螳御ｺ・＠縺ｾ縺励◆');
        }

        // Save to history
        const p = getProj();
        if (p) {
            if (!p.chatHistory) p.chatHistory = [];
            p.chatHistory.push({ role: 'user', content: '[閾ｪ蜍墓怙驕ｩ蛹望', time: fmtTime(Date.now()) });
            p.chatHistory.push({ role: 'assistant', content: fullResponse, time: fmtTime(Date.now()) });
            save();
        }
    } catch (err) {
        hideTyping(); hideProg();
        document.getElementById('streaming-msg')?.remove();
        appendMsg('assistant', `繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:\n${err.message}`);
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
        toast('繧ｳ繝ｼ繝峨ｒ繧ｳ繝斐・縺励∪縺励◆');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = content; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        toast('繧ｳ繝ｼ繝峨ｒ繧ｳ繝斐・縺励∪縺励◆');
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
                    if (f) { f.content = state.monacoEditor.getValue(); save(); toast('菫晏ｭ倥＠縺ｾ縺励◆'); }
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
            toast('蜈・↓謌ｻ縺帙ｋ螟画峩縺後≠繧翫∪縺帙ｓ', 'warning');
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
        toast('逶ｴ蜑阪・AI螟画峩繧貞・縺ｫ謌ｻ縺励∪縺励◆', 'warning');
    });

    // Clear chat
    document.getElementById('clear-chat-btn').addEventListener('click', () => {
        const proj = getProj();
        if (!proj) return;
        proj.chatHistory = []; save();
        const chatEl = document.getElementById('chat-messages');
        chatEl.innerHTML = `<div class="welcome-message"><div class="welcome-icon"><svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div><p class="welcome-text">菴懊ｊ縺溘＞繧ゅ・繧呈蕗縺医※縺上□縺輔＞縲・/p><p class="welcome-hint">AI縺後さ繝ｼ繝峨ｒ逕滓・繝ｻ謾ｹ蝟・＠縺ｾ縺・/p></div>`;
        toast('繝√Ε繝・ヨ螻･豁ｴ繧偵け繝ｪ繧｢縺励∪縺励◆', 'warning');
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
        toast('莉頑律縺ｮ菴ｿ逕ｨ驥上ｒ繝ｪ繧ｻ繝・ヨ縺励∪縺励◆');
    });
    document.getElementById('add-api-key-btn').addEventListener('click', () => {
        state.apiKeys.push({ id: genId(), name: '', baseUrl: '', key: '' });
        renderApiKeysList(); renderProviderSelect();
    });
    document.getElementById('reset-prompt-btn').addEventListener('click', () => {
        document.getElementById('custom-prompt-input').value = '';
        toast('繧ｷ繧ｹ繝・Β繝励Ο繝ｳ繝励ヨ繧偵ョ繝輔か繝ｫ繝医↓謌ｻ縺励∪縺励◆');
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
            toast(`${model} 繧帝∈謚槭＠縺ｾ縺励◆縲・PI繧ｭ繝ｼ繧貞・蜉帙＠縺ｦ縺上□縺輔＞`);
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
            toast('API繧ｭ繝ｼ繧貞炎髯､縺励∪縺励◆', 'warning');
        }
        hideNotif();
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); });
    });
}

document.addEventListener('DOMContentLoaded', init);

// ===== ERROR LOG COLLECTION =====
state.errorLogs = [];
const MAX_LOGS = 100;
function logError(errStr) {
    state.errorLogs.push({ time: new Date().toISOString(), error: errStr });
    if (state.errorLogs.length > MAX_LOGS) state.errorLogs.shift();
}
window.addEventListener('error', e => {
    logError(`[Window Error] ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`);
});
window.addEventListener('unhandledrejection', e => {
    logError(`[Unhandled Rejection] ${e.reason}`);
});
const origConsoleError = console.error;
console.error = function(...args) {
    logError(`[Console Error] ${args.join(' ')}`);
    origConsoleError.apply(console, args);
};

document.getElementById('export-logs-btn')?.addEventListener('click', () => {
    if (state.errorLogs.length === 0) { toast('繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ縺ｯ縺ゅｊ縺ｾ縺帙ｓ', 'success'); return; }
    const blob = new Blob([JSON.stringify(state.errorLogs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `error_logs_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ繧偵お繧ｯ繧ｹ繝昴・繝医＠縺ｾ縺励◆');
});

// ===== PREVIEW LOGIC =====
document.getElementById('preview-btn')?.addEventListener('click', () => {
    const proj = getProj();
    if (!proj) return;
    const htmlFile = proj.files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) {
        toast('繝励Ξ繝薙Η繝ｼ縺ｫ縺ｯ HTML 繝輔ぃ繧､繝ｫ縺悟ｿ・ｦ√〒縺・, 'warning');
        return;
    }
    openModal('preview-modal');
    refreshPreview();
});

document.getElementById('preview-close')?.addEventListener('click', () => closeModal('preview-modal'));
document.getElementById('preview-refresh')?.addEventListener('click', refreshPreview);

function refreshPreview() {
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) return;
    const proj = getProj();
    if (!proj) return;
    
    let htmlContent = proj.files.find(f => f.name.endsWith('.html'))?.content || '';
    const cssContent = proj.files.find(f => f.name.endsWith('.css'))?.content || '';
    const jsContent = proj.files.find(f => f.name.endsWith('.js'))?.content || '';
    
    // Inject CSS
    if (cssContent && !htmlContent.includes('<style id="injected-css">')) {
        htmlContent = htmlContent.replace('</head>', `<style id="injected-css">\n${cssContent}\n</style></head>`);
    }
    // Inject JS
    if (jsContent && !htmlContent.includes('<script id="injected-js">')) {
        htmlContent = htmlContent.replace('</body>', `<script id="injected-js">\n${jsContent}\n</script></body>`);
    }
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);
}

// ===== TOS AND TRANSPARENCY REPORT =====
const TOS_CONTENT = `
<h3>AI Code Builder 蛻ｩ逕ｨ隕冗ｴ・/h3>
${Array.from({length: 30}).map((_, i) => `<p><strong>隨ｬ${i + 1}譚｡</strong><br>譛ｬ繧ｵ繝ｼ繝薙せ縺ｮ蛻ｩ逕ｨ縺ｫ縺ゅ◆繧翫√Θ繝ｼ繧ｶ繝ｼ縺ｯ髢｢騾｣縺吶ｋ豕穂ｻ､縺翫ｈ縺ｳ蜈ｬ蠎剰憶菫励ｒ驕ｵ螳医☆繧九ｂ縺ｮ縺ｨ縺励∪縺吶りｩｳ邏ｰ縺ｪ隕丞ｮ・{i+1}縺ｫ縺､縺・※縺薙％縺ｫ螳壹ａ縺ｾ縺吶・/p>`).join('')}
`;

const TRANSPARENCY_CONTENT = `
<h3>騾乗・諤ｧ繝ｬ繝昴・繝・/h3>
<p>AI Code Builder 縺ｯ縲√Θ繝ｼ繧ｶ繝ｼ縺ｮ繝励Λ繧､繝舌す繝ｼ縺ｨ繝・・繧ｿ繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧堤ｬｬ荳縺ｫ閠・∴縺ｦ縺・∪縺吶・/p>
<ul>
<li>繝・・繧ｿ縺ｮ蛻ｩ逕ｨ: 逕滓・縺輔ｌ縺溘さ繝ｼ繝峨ｄ繝√Ε繝・ヨ螻･豁ｴ縺ｯ縲√Δ繝・Ν縺ｮ蟄ｦ鄙偵↓縺ｯ菴ｿ逕ｨ縺輔ｌ縺ｾ縺帙ｓ縲・/li>
<li>證怜捷蛹・ 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮAPI繧ｭ繝ｼ縺ｯ繝悶Λ繧ｦ繧ｶ蜀・〒繝ｭ繝ｼ繧ｫ繝ｫ縺ｫ證怜捷蛹厄ｼ・ES-GCM・峨＆繧後※菫晏ｭ倥＆繧後∝､夜Κ繧ｵ繝ｼ繝舌・縺ｫ縺ｯ騾∽ｿ｡縺輔ｌ縺ｾ縺帙ｓ縲・/li>
<li>騾壻ｿ｡蜈・ 謖・ｮ壹＆繧後◆LLM繝励Ο繝舌う繝繝ｼ・・penAI, Groq遲会ｼ峨・API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医∈縺ｮ縺ｿ逶ｴ謗･騾壻ｿ｡繧定｡後＞縺ｾ縺吶・/li>
</ul>
`;

document.querySelectorAll('.tos-link').forEach(el => el.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('tos-content').innerHTML = TOS_CONTENT;
    openModal('tos-modal');
}));
document.getElementById('tos-close')?.addEventListener('click', () => closeModal('tos-modal'));

document.querySelectorAll('.transparency-link').forEach(el => el.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('transparency-content').innerHTML = TRANSPARENCY_CONTENT;
    openModal('transparency-modal');
}));
document.getElementById('transparency-close')?.addEventListener('click', () => closeModal('transparency-modal'));

// ===== MONACO ENHANCEMENTS =====
// Inject enhancements directly by hooking into monaco if available, or wait for it.
function enhanceMonaco() {
    if (typeof monaco === 'undefined') {
        setTimeout(enhanceMonaco, 500);
        return;
    }
    
    // TS/JS Compiler Options
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true
    });

    // Simple Snippets for JS
    monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: function(model, position) {
            var word = model.getWordUntilPosition(position);
            var range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };
            var suggestions = [
                {
                    label: 'clog',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'console.log($1);',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Log to console',
                    range: range
                },
                {
                    label: 'fetch',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'fetch(\\'$1\\')\\n\\t.then(res => res.json())\\n\\t.then(data => {\\n\\t\\t$2\\n\\t});',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Fetch API',
                    range: range
                }
            ];
            return { suggestions: suggestions };
        }
    });
}
enhanceMonaco();
