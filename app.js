// ============================================================
// Discord Bot Builder - app.js (高性能版)
// ============================================================

// ===== TEMPLATES =====
const TEMPLATES = [
    {
        id: 'music', name: '音楽Bot', icon: '🎵',
        desc: '音楽再生・キュー管理',
        files: [
            { name: 'main.py', content: '# 音楽Bot - AIに「音楽Botを作って」と指示してください\n# このファイルはテンプレートです\n' },
            { name: 'requirements.txt', content: 'discord.py>=2.3.0\nyt-dlp\nPyNaCl\n' },
        ]
    },
    {
        id: 'moderation', name: '管理Bot', icon: '🛡️',
        desc: 'キック・BAN・ログ',
        files: [
            { name: 'main.py', content: '# 管理Bot - AIに「管理Botを作って」と指示してください\n' },
            { name: 'requirements.txt', content: 'discord.py>=2.3.0\n' },
        ]
    },
    {
        id: 'game', name: 'ゲームBot', icon: '🎮',
        desc: 'RPG・クイズ・ランキング',
        files: [
            { name: 'main.py', content: '# ゲームBot - AIに「ゲームBotを作って」と指示してください\n' },
            { name: 'requirements.txt', content: 'discord.py>=2.3.0\naiosqlite\n' },
        ]
    },
    {
        id: 'utility', name: 'ユーティリティ', icon: '🔧',
        desc: '翻訳・天気・リマインダー',
        files: [
            { name: 'main.py', content: '# ユーティリティBot - AIに「ユーティリティBotを作って」と指示してください\n' },
            { name: 'requirements.txt', content: 'discord.py>=2.3.0\nhttpx\n' },
        ]
    },
    {
        id: 'welcome', name: 'ウェルカムBot', icon: '👋',
        desc: '入退室メッセージ',
        files: [
            { name: 'main.py', content: '# ウェルカムBot - AIに「ウェルカムBotを作って」と指示してください\n' },
            { name: 'requirements.txt', content: 'discord.py>=2.3.0\n' },
        ]
    },
    {
        id: 'ai', name: 'AIチャットBot', icon: '🤖',
        desc: 'AI会話・質問応答',
        files: [
            { name: 'main.py', content: '# AI チャットBot - AIに「AI会話Botを作って」と指示してください\n' },
            { name: 'requirements.txt', content: 'discord.py>=2.3.0\nopenai\n' },
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
    monacoDiffEditor: null,
    diffMode: false,
    prevFileContent: {},   // { filename: lastContent }
    isStreaming: false,
};

// ===== PERSISTENCE =====
function save() {
    try {
        localStorage.setItem('dbb_projects', JSON.stringify(state.projects));
        localStorage.setItem('dbb_apiKeys', JSON.stringify(state.apiKeys));
        localStorage.setItem('dbb_activeProvider', state.activeProvider || '');
        localStorage.setItem('dbb_activeModel', state.activeModel || '');
        localStorage.setItem('dbb_customPrompt', state.customPrompt || '');
        localStorage.setItem('dbb_theme', state.theme || 'dark');
    } catch(e) { console.error('Save error:', e); }
}

function load() {
    try {
        state.projects     = JSON.parse(localStorage.getItem('dbb_projects')) || [];
        state.apiKeys      = JSON.parse(localStorage.getItem('dbb_apiKeys')) || [];
        state.activeProvider = localStorage.getItem('dbb_activeProvider') || null;
        state.activeModel  = localStorage.getItem('dbb_activeModel') || '';
        state.customPrompt = localStorage.getItem('dbb_customPrompt') || '';
        state.theme        = localStorage.getItem('dbb_theme') || 'dark';
    } catch(e) {
        state.projects = []; state.apiKeys = [];
    }
}

// ===== UTILS =====
const genId = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36);
const fmtTime = ts => new Date(ts).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
const fmtDate = ts => new Date(ts).toLocaleDateString('ja-JP',{month:'short',day:'numeric'});
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const delay = ms => new Promise(r => setTimeout(r, ms));

function getLang(filename) {
    const ext = (filename||'').split('.').pop().toLowerCase();
    return {py:'python',js:'javascript',ts:'typescript',json:'json',sh:'shell',bash:'shell',md:'markdown',yml:'yaml',yaml:'yaml',txt:'plaintext',env:'plaintext',toml:'toml'}[ext] || 'plaintext';
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
    el.innerHTML = icons[type] + esc(msg);
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
    if (state.monacoEditor) {
        monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    }
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
            // Monaco not loaded yet, retry
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

        // Save edits back to project
        state.monacoEditor.onDidChangeModelContent(() => {
            if (state.isStreaming) return;
            const proj = getProj();
            if (!proj || !state.currentFile) return;
            const file = proj.files.find(f => f.name === state.currentFile);
            if (file) { file.content = state.monacoEditor.getValue(); save(); }
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
        card.className = 'template-card';
        card.innerHTML = `<div class="template-icon">${t.icon}</div><div class="template-name">${esc(t.name)}</div><div class="template-desc">${esc(t.desc)}</div>`;
        card.addEventListener('click', () => createProjectFromTemplate(t));
        grid.appendChild(card);
    });
}

function createProjectFromTemplate(template) {
    const proj = {
        id: genId(), name: template.name + ' Bot',
        createdAt: Date.now(),
        files: template.files.map(f => ({...f})),
        chatHistory: [],
    };
    state.projects.unshift(proj);
    save();
    renderProjects();
    openProject(proj.id);
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

    // Reset chat
    const chatEl = document.getElementById('chat-messages');
    chatEl.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon"><svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="m2 14 6-6"/><path d="m14 20 8-8"/></svg></div>
            <p class="welcome-text">作りたいDiscordボットの内容を教えてください。</p>
            <p class="welcome-hint">例: 音楽再生機能のあるBotを作って</p>
        </div>`;
    (proj.chatHistory || []).forEach(m => appendMsg(m.role, m.content, m.time, false));

    state.diffMode = false;
    state.prevFileContent = {};

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
        tab.className = 'file-tab' + (file.name === state.currentFile ? ' active' : '');
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
    m.innerHTML = `<div class="tab-ctx-item" data-a="rename">ファイル名を変更</div><div class="tab-ctx-item" data-a="download">ダウンロード</div><div class="tab-ctx-item danger" data-a="delete">削除</div>`;
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

    // Save current editor content before switching
    if (state.monacoEditor && state.currentFile) {
        const cur = proj.files.find(f => f.name === state.currentFile);
        if (cur) { cur.content = state.monacoEditor.getValue(); save(); }
    }

    state.currentFile = name;
    renderTabs();
    showEditorForFile(file);
}

// ===== FILE OPS =====
function addFile(name) {
    const proj = getProj();
    if (!proj) return;
    if (proj.files.find(f => f.name === name)) { toast('同じ名前のファイルが既に存在します', 'error'); return; }
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
    if (proj.files.find(f => f.name === newName)) { toast('同じ名前のファイルが既に存在します', 'error'); return; }
    const file = proj.files.find(f => f.name === oldName);
    if (!file) return;
    file.name = newName;
    if (state.currentFile === oldName) {
        state.currentFile = newName;
        document.getElementById('current-file-name').textContent = newName;
    }
    save(); renderTabs();
    toast(`「${oldName}」を「${newName}」に変更しました`);
}

function downloadFile(filename) {
    const proj = getProj();
    if (!proj) return;
    const file = proj.files.find(f => f.name === filename);
    if (!file) return;
    const blob = new Blob([file.content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click(); URL.revokeObjectURL(a.href);
    toast(`「${filename}」をダウンロードしました`);
}

// ===== DELETE =====
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
        const proj = getProj();
        if (!proj) return;
        proj.files = proj.files.filter(f => f.name !== t.extra);
        save();
        if (state.currentFile === t.extra) {
            proj.files.length > 0 ? switchFile(proj.files[0].name) : showEmptyState();
        } else { renderTabs(); }
        toast(`「${t.extra}」を削除しました`, 'warning');
    }
    state.deleteTarget = null;
}

// ===== EXPORT / IMPORT =====
function exportProject() {
    const proj = getProj();
    if (!proj) return;

    // Save current editor content
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

function importProject(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const proj = JSON.parse(e.target.result);
            if (!proj.id || !proj.name || !Array.isArray(proj.files)) throw new Error('Invalid format');
            proj.id = genId(); // New ID to avoid collision
            proj.createdAt = Date.now();
            state.projects.unshift(proj);
            save(); renderProjects();
            toast(`「${proj.name}」をインポートしました`);
        } catch {
            toast('インポートに失敗しました。JSONファイルを確認してください', 'error');
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
        const prev = state.prevFileContent[state.currentFile] || '';
        const current = state.monacoEditor.getValue();

        // Destroy normal editor, show diff
        state.monacoEditor.updateOptions({ readOnly: true });
        btn.querySelector('span').textContent = '編集に戻る';
        btn.style.background = 'var(--accent-dim)';

        // Use inline diff via decorations (simplified)
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

    const lines = [];

    if (hasPy) {
        lines.push({ type: 'section', text: '=== Python Bot セットアップ ===' });
        lines.push({ type: 'comment', text: '# 仮想環境を作成' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'python -m venv venv' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'source venv/bin/activate  # Windowsは: venv\\Scripts\\activate' });
        if (hasReq) {
            lines.push({ type: 'comment', text: '# 依存パッケージをインストール' });
            lines.push({ type: 'cmd', prompt: '$', cmd: 'pip install -r requirements.txt' });
        } else {
            lines.push({ type: 'cmd', prompt: '$', cmd: 'pip install discord.py' });
        }
        lines.push({ type: 'comment', text: '# .envファイルにトークンを設定' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'echo "DISCORD_TOKEN=あなたのトークン" > .env' });
        lines.push({ type: 'comment', text: '# Botを起動' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'python main.py' });
    }

    if (hasJs) {
        lines.push({ type: 'section', text: '=== Node.js Bot セットアップ ===' });
        if (hasPkg) {
            lines.push({ type: 'cmd', prompt: '$', cmd: 'npm install' });
        } else {
            lines.push({ type: 'cmd', prompt: '$', cmd: 'npm install discord.js dotenv' });
        }
        lines.push({ type: 'cmd', prompt: '$', cmd: 'echo "DISCORD_TOKEN=あなたのトークン" > .env' });
        lines.push({ type: 'cmd', prompt: '$', cmd: 'node index.js' });
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
function openSettings() {
    renderApiKeysList();
    renderProviderSelect();
    document.getElementById('custom-prompt-input').value = state.customPrompt || '';
    openModal('settings-modal');
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

function saveSettings() {
    state.activeProvider = document.getElementById('active-provider-select').value || null;
    state.activeModel    = document.getElementById('active-model-input').value.trim();
    state.customPrompt   = document.getElementById('custom-prompt-input').value.trim();
    save(); updateBadge(); updateSendBtn();
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
    document.getElementById('send-btn').disabled = !(state.activeProvider && state.activeModel);
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

// ===== CHAT =====
function appendMsg(role, content, time, doSave = true) {
    const container = document.getElementById('chat-messages');
    container.querySelector('.welcome-message')?.remove();

    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    const formatted = esc(content).replace(/\n/g, '<br>');
    div.innerHTML = `<div class="chat-bubble">${formatted}</div><span class="chat-msg-time">${time || fmtTime(Date.now())}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (doSave) {
        const proj = getProj();
        if (proj) {
            if (!proj.chatHistory) proj.chatHistory = [];
            proj.chatHistory.push({ role, content, time: time || fmtTime(Date.now()) });
            if (proj.chatHistory.length > 60) proj.chatHistory = proj.chatHistory.slice(-60);
            save();
        }
    }
    return div;
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
    bubble.innerHTML = esc(content).replace(/\n/g, '<br>');
    document.getElementById('chat-messages').scrollTop = 99999;

    const proj = getProj();
    if (proj) {
        if (!proj.chatHistory) proj.chatHistory = [];
        proj.chatHistory.push({ role: 'assistant', content, time: fmtTime(Date.now()) });
        if (proj.chatHistory.length > 60) proj.chatHistory = proj.chatHistory.slice(-60);
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
        // Scroll to first match
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
        { 1: 'コードを生成中...', 2: 'バグチェック中...', 3: '最終確認中...' }[step] || '完了';
}

// ===== AI CALL (STREAMING) =====
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
            temperature: 0.2,
            max_tokens: 8192,
            stream: true,
        }),
    });

    if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j?.error?.message || errMsg; } catch {}
        if (res.status === 401 || res.status === 403)
            showNotif('APIキーエラー', `「${key.name}」のAPIキーが無効または期限切れです。\n${errMsg}`, key.id);
        else if (res.status === 429)
            showNotif('レート制限エラー', `「${key.name}」のAPIレート制限に達しました。\n${errMsg}`, key.id);
        else if (res.status === 402)
            showNotif('クレジット不足', `「${key.name}」のAPIクレジットが不足しています。\n${errMsg}`, key.id);
        throw new Error(errMsg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

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
            } catch {}
        }
    }
    return full;
}

// Non-streaming fallback
async function callAI(messages) {
    const key = state.apiKeys.find(k => k.id === state.activeProvider);
    if (!key) throw new Error('APIキーが設定されていません。');

    const base = key.baseUrl.replace(/\/$/, '');
    const url  = base.endsWith('/chat/completions') ? base : base + '/chat/completions';

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.key}` },
        body: JSON.stringify({ model: state.activeModel, messages, temperature: 0.2, max_tokens: 8192 }),
    });

    if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        const errMsg = j?.error?.message || `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403)
            showNotif('APIキーエラー', `「${key.name}」のAPIキーが無効です。\n${errMsg}`, key.id);
        throw new Error(errMsg);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

// ===== SYSTEM PROMPT =====
function buildSysPrompt() {
    const proj = getProj();
    const filesStr = (proj?.files || []).filter(f => f.content).map(f => `=== ${f.name} ===\n${f.content}`).join('\n\n');

    const base = `あなたはDiscordボット開発の専門家AIアシスタントです。
ユーザーの要望に応じてDiscordボットのコードを生成・改善します。

【プロジェクト名】${proj?.name || '未設定'}

【コード生成ルール】
1. コードを出力する前に、必ず3回内部で見直してください（バグ・型エラー・論理エラー・インポート漏れを確認）
2. コードブロックの直前に必ず「ファイル: ファイル名」と記載してください
   例:
   ファイル: main.py
   \`\`\`python
   コード
   \`\`\`
3. Python は discord.py (v2.x)、JavaScript は discord.js (v14) を使用
4. 複数ファイルが必要な場合はすべて出力
5. 既存ファイルがある場合はその内容を必ず考慮して整合性を保つ
6. requirements.txt や .env.example が必要な場合は一緒に出力

【現在のファイル】
${filesStr || '(まだファイルはありません)'}

すべての回答は日本語で、わかりやすく説明してください。`;

    return state.customPrompt ? state.customPrompt + '\n\n' + base : base;
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

function applyFiles(parsedFiles) {
    const proj = getProj();
    if (!proj || parsedFiles.length === 0) return;

    parsedFiles.forEach(({ filename, code }) => {
        const name = filename || state.currentFile || 'main.py';
        // Save previous content for diff
        const existing = proj.files.find(f => f.name === name);
        if (existing) {
            state.prevFileContent[name] = existing.content;
            existing.content = code;
        } else {
            proj.files.push({ name, content: code });
        }
    });

    save(); renderTabs();

    const firstName = parsedFiles[0].filename || state.currentFile || proj.files[0]?.name;
    if (firstName) {
        state.currentFile = firstName;
        const file = proj.files.find(f => f.name === firstName);
        if (file) showEditorForFile(file);
    }
    generateTerminalCommands();
}

// ===== SEND MESSAGE =====
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || state.isStreaming) return;
    if (!state.activeProvider || !state.activeModel) { toast('設定からAPIキーとモデルを登録してください', 'error'); return; }

    input.value = ''; input.style.height = '';
    appendMsg('user', text);

    const proj = getProj();
    if (!proj) return;

    const history = (proj.chatHistory || []).map(m => ({ role: m.role, content: m.content }));
    const messages = [{ role: 'system', content: buildSysPrompt() }, ...history];

    state.isStreaming = true;
    document.getElementById('send-btn').disabled = true;
    showProg(); setProg(1, 20);

    try {
        await delay(200);
        setProg(1, 50);

        // Try streaming first
        let fullResponse = '';
        const streamBubble = appendStreamingMsg();

        try {
            fullResponse = await callAIStream(messages, (partial) => {
                streamBubble.innerHTML = esc(partial).replace(/\n/g, '<br>');
                document.getElementById('chat-messages').scrollTop = 99999;
                setProg(2, 70);
            });
        } catch (streamErr) {
            // Fallback to non-streaming if streaming not supported
            console.warn('Streaming failed, falling back:', streamErr.message);
            showTyping();
            fullResponse = await callAI(messages);
            hideTyping();
            // Remove streaming bubble
            document.getElementById('streaming-msg')?.remove();
        }

        setProg(3, 90); await delay(150); setProg(3, 100);
        hideProg();

        finalizeStreamingMsg(streamBubble, fullResponse);

        const files = parseFiles(fullResponse);
        if (files.length > 0) {
            applyFiles(files);
            toast(`${files.length}個のファイルを更新しました`);
        }

    } catch (err) {
        hideTyping();
        hideProg();
        document.getElementById('streaming-msg')?.remove();
        appendMsg('assistant', `エラーが発生しました:\n${err.message}\n\n設定からAPIキーとモデル名を確認してください。`);
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
    // Get current editor content
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
            if (e.key === 's' || e.key === 'S') { e.preventDefault(); const proj = getProj(); if (proj && state.monacoEditor && state.currentFile) { const f = proj.files.find(f=>f.name===state.currentFile); if(f){f.content=state.monacoEditor.getValue();save();toast('保存しました');} } }
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
            document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`.modal-tab-content[data-tab="${tabId}"]`).classList.add('active');
        });
    });
}

// ===== INIT =====
async function init() {
    load();
    applyTheme(state.theme);
    renderTemplates();
    renderProjects();
    updateBadge();
    updateSendBtn();
    initResizer();
    initShortcuts();
    initModalTabs();

    // Init Monaco
    await initMonaco();

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

    // Project search
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

    // Clear chat
    document.getElementById('clear-chat-btn').addEventListener('click', () => {
        const proj = getProj();
        if (!proj) return;
        proj.chatHistory = []; save();
        const chatEl = document.getElementById('chat-messages');
        chatEl.innerHTML = `<div class="welcome-message"><div class="welcome-icon"><svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="m2 14 6-6"/><path d="m14 20 8-8"/></svg></div><p class="welcome-text">作りたいDiscordボットの内容を教えてください。</p><p class="welcome-hint">例: 音楽再生機能のあるBotを作って</p></div>`;
        toast('チャット履歴をクリアしました', 'warning');
    });

    // Add File
    document.getElementById('add-tab-btn').addEventListener('click', () => { document.getElementById('add-file-input').value = ''; openModal('add-file-modal'); });
    document.getElementById('add-file-close').addEventListener('click',  () => closeModal('add-file-modal'));
    document.getElementById('add-file-cancel').addEventListener('click', () => closeModal('add-file-modal'));
    document.getElementById('add-file-create').addEventListener('click', () => { const n = document.getElementById('add-file-input').value.trim(); if(n){addFile(n);closeModal('add-file-modal');} });
    document.getElementById('add-file-input').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('add-file-create').click(); });

    // Rename File
    document.getElementById('rename-file-close').addEventListener('click',  () => closeModal('rename-file-modal'));
    document.getElementById('rename-file-cancel').addEventListener('click', () => closeModal('rename-file-modal'));
    document.getElementById('rename-file-save').addEventListener('click', () => {
        const newName = document.getElementById('rename-file-input').value.trim();
        if (newName && state.deleteTarget) { renameFile(state.deleteTarget.filename, newName); state.deleteTarget = null; closeModal('rename-file-modal'); }
    });
    document.getElementById('rename-file-input').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('rename-file-save').click(); });

    // Delete Confirm
    document.getElementById('delete-confirm-close').addEventListener('click',  () => closeModal('delete-confirm-modal'));
    document.getElementById('delete-confirm-cancel').addEventListener('click', () => closeModal('delete-confirm-modal'));
    document.getElementById('delete-confirm-ok').addEventListener('click', () => { executeDelete(); closeModal('delete-confirm-modal'); });

    // Settings
    document.getElementById('settings-close').addEventListener('click',  () => closeModal('settings-modal'));
    document.getElementById('settings-cancel').addEventListener('click', () => closeModal('settings-modal'));
    document.getElementById('settings-save').addEventListener('click', saveSettings);
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
            // Find or create matching API key
            let key = state.apiKeys.find(k => k.baseUrl === url);
            if (!key) {
                key = { id: genId(), name: new URL(url).hostname.split('.')[1] || url, baseUrl: url, key: '' };
                state.apiKeys.push(key);
            }
            state.activeProvider = key.id;
            state.activeModel = model;
            renderApiKeysList();
            renderProviderSelect();
            // Switch to AI tab
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
