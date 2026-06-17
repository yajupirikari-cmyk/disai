// ============================================================
// Discord Bot Builder - app.js  (完全版)
// ============================================================

// ===== STATE =====
const state = {
    projects: [],
    currentProjectId: null,
    currentFile: null,
    apiKeys: [],
    activeProvider: null,
    activeModel: '',
    deleteTarget: null,
    pendingApiKeyId: null,
};

// ===== PERSISTENCE =====
function saveState() {
    localStorage.setItem('dbb_projects', JSON.stringify(state.projects));
    localStorage.setItem('dbb_apiKeys', JSON.stringify(state.apiKeys));
    localStorage.setItem('dbb_activeProvider', state.activeProvider || '');
    localStorage.setItem('dbb_activeModel', state.activeModel || '');
}

function loadState() {
    try {
        state.projects = JSON.parse(localStorage.getItem('dbb_projects')) || [];
        state.apiKeys = JSON.parse(localStorage.getItem('dbb_apiKeys')) || [];
        state.activeProvider = localStorage.getItem('dbb_activeProvider') || null;
        state.activeModel = localStorage.getItem('dbb_activeModel') || '';
    } catch (e) {
        console.error('State load error:', e);
        state.projects = [];
        state.apiKeys = [];
    }
}

// ===== UTILS =====
function genId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
    return new Date(ts).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function getLanguage(filename) {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const map = {
        py: 'python', js: 'javascript', ts: 'typescript',
        json: 'json', sh: 'bash', bash: 'bash',
        md: 'markdown', yml: 'yaml', yaml: 'yaml',
        txt: 'plaintext', env: 'plaintext', toml: 'toml',
    };
    return map[ext] || 'plaintext';
}

function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== SCREEN =====
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ===== MODALS =====
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ===== HOME =====
function renderProjects() {
    const grid = document.getElementById('projects-grid');
    Array.from(grid.children).forEach(c => { if (c.id !== 'new-project-btn') c.remove(); });

    [...state.projects].forEach(proj => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-card-name">${escHtml(proj.name)}</div>
            <div class="project-card-meta">${proj.files.length} ファイル &middot; ${formatDate(proj.createdAt)}</div>
            <div class="project-card-actions">
                <button class="project-card-action danger" title="削除">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                </button>
            </div>`;
        card.addEventListener('click', e => {
            if (e.target.closest('.project-card-action')) return;
            openProject(proj.id);
        });
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

    // Reset chat UI
    const chatEl = document.getElementById('chat-messages');
    chatEl.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">
                <svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/>
                    <path d="m2 14 6-6"/><path d="m14 20 8-8"/>
                </svg>
            </div>
            <p class="welcome-text">作りたいDiscordボットの内容を教えてください。</p>
            <p class="welcome-hint">例: 音楽再生機能のあるBotを作って</p>
        </div>`;

    // Restore chat history
    (proj.chatHistory || []).forEach(m => appendChatMessage(m.role, m.content, m.time, false));

    // Files
    if (proj.files.length > 0) {
        state.currentFile = proj.files[0].name;
        renderTabs();
        renderCode(proj.files[0].content, proj.files[0].name);
    } else {
        showCodeEmpty();
    }

    updateSendButton();
    updateProviderBadge();
    showScreen('editor-screen');
}

function getCurrentProject() {
    return state.projects.find(p => p.id === state.currentProjectId);
}

// ===== TABS =====
function renderTabs() {
    const proj = getCurrentProject();
    if (!proj) return;
    const container = document.getElementById('file-tabs');
    container.innerHTML = '';

    proj.files.forEach(file => {
        const tab = document.createElement('div');
        tab.className = 'file-tab' + (file.name === state.currentFile ? ' active' : '');
        tab.innerHTML = `
            <span class="file-tab-name">${escHtml(file.name)}</span>
            <span class="file-tab-close">
                <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
            </span>`;
        tab.addEventListener('click', e => {
            if (e.target.closest('.file-tab-close')) return;
            switchFile(file.name);
        });
        tab.querySelector('.file-tab-close').addEventListener('click', e => {
            e.stopPropagation();
            confirmDelete('file', null, file.name, `「${file.name}」を削除しますか？`);
        });
        tab.addEventListener('contextmenu', e => {
            e.preventDefault();
            showTabCtxMenu(e.clientX, e.clientY, file.name);
        });
        container.appendChild(tab);
    });
}

function showTabCtxMenu(x, y, filename) {
    removeTabCtxMenu();
    const menu = document.createElement('div');
    menu.className = 'tab-ctx-menu';
    menu.id = 'tab-ctx-menu';
    menu.style.cssText = `left:${x}px;top:${y}px`;
    menu.innerHTML = `
        <div class="tab-ctx-item" data-a="rename">ファイル名を変更</div>
        <div class="tab-ctx-item danger" data-a="delete">削除</div>`;
    menu.querySelector('[data-a="rename"]').onclick = () => { removeTabCtxMenu(); openRenameModal(filename); };
    menu.querySelector('[data-a="delete"]').onclick = () => { removeTabCtxMenu(); confirmDelete('file', null, filename, `「${filename}」を削除しますか？`); };
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', removeTabCtxMenu, { once: true }), 0);
}
function removeTabCtxMenu() { document.getElementById('tab-ctx-menu')?.remove(); }

function switchFile(name) {
    const proj = getCurrentProject();
    if (!proj) return;
    const file = proj.files.find(f => f.name === name);
    if (!file) return;
    state.currentFile = name;
    document.getElementById('current-file-name').textContent = name;
    renderTabs();
    renderCode(file.content, name);
}

function renderCode(content, filename) {
    const codeEl   = document.getElementById('code-content');
    const lineNums  = document.getElementById('line-numbers');
    const empty    = document.getElementById('code-empty-state');
    const display  = document.getElementById('code-display');

    if (!content || !content.trim()) {
        empty.classList.remove('hidden');
        display.style.display = 'none';
        return;
    }
    empty.classList.add('hidden');
    display.style.display = 'flex';

    codeEl.className = `language-${getLanguage(filename)}`;
    codeEl.textContent = content;
    if (window.hljs) hljs.highlightElement(codeEl);

    const lines = content.split('\n').length;
    lineNums.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
}

function showCodeEmpty() {
    document.getElementById('code-empty-state').classList.remove('hidden');
    document.getElementById('code-display').style.display = 'none';
    document.getElementById('file-tabs').innerHTML = '';
    document.getElementById('current-file-name').textContent = '';
    state.currentFile = null;
}

// ===== FILE OPS =====
function addFile(name) {
    const proj = getCurrentProject();
    if (!proj) return;
    if (proj.files.find(f => f.name === name)) { alert('同じ名前のファイルが既に存在します。'); return; }
    proj.files.push({ name, content: '' });
    saveState();
    renderTabs();
    switchFile(name);
}

function openRenameModal(filename) {
    state.deleteTarget = { type: 'rename', filename };
    document.getElementById('rename-file-input').value = filename;
    openModal('rename-file-modal');
}

function renameFile(oldName, newName) {
    const proj = getCurrentProject();
    if (!proj) return;
    if (proj.files.find(f => f.name === newName)) { alert('同じ名前のファイルが既に存在します。'); return; }
    const file = proj.files.find(f => f.name === oldName);
    if (!file) return;
    file.name = newName;
    if (state.currentFile === oldName) {
        state.currentFile = newName;
        document.getElementById('current-file-name').textContent = newName;
    }
    saveState();
    renderTabs();
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
        state.projects = state.projects.filter(p => p.id !== t.id);
        saveState();
        renderProjects();
    } else if (t.type === 'file') {
        const proj = getCurrentProject();
        if (!proj) return;
        proj.files = proj.files.filter(f => f.name !== t.extra);
        saveState();
        if (state.currentFile === t.extra) {
            proj.files.length > 0 ? switchFile(proj.files[0].name) : showCodeEmpty();
        } else {
            renderTabs();
        }
    }
    state.deleteTarget = null;
}

// ===== SETTINGS =====
function openSettings() {
    renderApiKeysList();
    renderProviderSelect();
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
                <input class="api-key-name-input" type="text" value="${escHtml(key.name)}" placeholder="例: Groq" data-id="${key.id}" data-field="name">
                <button class="api-key-delete" data-id="${key.id}" title="削除">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                </button>
            </div>
            <div class="api-key-row">
                <span class="api-key-label">API URL</span>
                <input class="api-key-url-input" type="text" value="${escHtml(key.baseUrl)}" placeholder="例: https://api.groq.com/openai/v1" data-id="${key.id}" data-field="baseUrl">
            </div>
            <div class="api-key-row">
                <span class="api-key-label">APIキー</span>
                <input class="api-key-value-input" type="password" value="${escHtml(key.key)}" placeholder="sk-..." data-id="${key.id}" data-field="key">
            </div>
            <div class="api-key-hint">Groq / OpenAI / OpenRouter など OpenAI互換API対応</div>`;

        entry.querySelectorAll('input[data-field]').forEach(inp => {
            inp.addEventListener('input', () => {
                const k = state.apiKeys.find(a => a.id === inp.dataset.id);
                if (k) k[inp.dataset.field] = inp.value;
            });
        });
        entry.querySelector('.api-key-delete').addEventListener('click', e => {
            const id = e.currentTarget.dataset.id;
            state.apiKeys = state.apiKeys.filter(k => k.id !== id);
            renderApiKeysList();
            renderProviderSelect();
        });
        list.appendChild(entry);
    });
}

function renderProviderSelect() {
    const sel = document.getElementById('active-provider-select');
    sel.innerHTML = '<option value="">-- プロバイダーを選択 --</option>';
    state.apiKeys.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k.id;
        opt.textContent = k.name || '(無名)';
        if (k.id === state.activeProvider) opt.selected = true;
        sel.appendChild(opt);
    });
    document.getElementById('active-model-input').value = state.activeModel || '';
}

function saveSettings() {
    state.activeProvider = document.getElementById('active-provider-select').value || null;
    state.activeModel = document.getElementById('active-model-input').value.trim();
    saveState();
    updateProviderBadge();
    updateSendButton();
    closeModal('settings-modal');
}

function updateProviderBadge() {
    const badge = document.getElementById('active-provider-badge');
    const key = state.activeProvider ? state.apiKeys.find(k => k.id === state.activeProvider) : null;
    if (key) {
        badge.textContent = key.name + (state.activeModel ? ' / ' + state.activeModel : '');
        badge.classList.add('active');
    } else {
        badge.textContent = '未設定';
        badge.classList.remove('active');
    }
}

function updateSendButton() {
    document.getElementById('send-btn').disabled = !(state.activeProvider && state.activeModel);
}

// ===== NOTIFICATION =====
function showNotification(title, message, apiKeyId) {
    state.pendingApiKeyId = apiKeyId || null;
    document.getElementById('notification-title').textContent = title;
    document.getElementById('notification-message').textContent = message;
    document.getElementById('notification-banner').classList.remove('hidden');
}
function hideNotification() {
    document.getElementById('notification-banner').classList.add('hidden');
    state.pendingApiKeyId = null;
}

// ===== CHAT =====
function appendChatMessage(role, content, time, save = true) {
    const container = document.getElementById('chat-messages');
    container.querySelector('.welcome-message')?.remove();

    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    // Convert newlines to <br> for display
    const formatted = escHtml(content).replace(/\n/g, '<br>');
    div.innerHTML = `
        <div class="chat-bubble">${formatted}</div>
        <span class="chat-msg-time">${time || formatTime(Date.now())}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (save) {
        const proj = getCurrentProject();
        if (proj) {
            if (!proj.chatHistory) proj.chatHistory = [];
            proj.chatHistory.push({ role, content, time: time || formatTime(Date.now()) });
            // Keep only last 40 messages to avoid bloating localStorage
            if (proj.chatHistory.length > 40) proj.chatHistory = proj.chatHistory.slice(-40);
            saveState();
        }
    }
}

function showTyping() {
    const c = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'chat-msg chat-msg--assistant';
    div.innerHTML = `<div class="chat-typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
}
function hideTyping() { document.getElementById('typing-indicator')?.remove(); }

// ===== PROGRESS =====
function showProgress() { document.getElementById('review-progress').classList.remove('hidden'); setProgress(1, 0); }
function hideProgress() { document.getElementById('review-progress').classList.add('hidden'); }
function setProgress(step, pct) {
    document.querySelectorAll('.review-step').forEach(s => {
        s.classList.remove('active', 'done');
        const n = parseInt(s.dataset.step);
        if (n < step) s.classList.add('done');
        else if (n === step) s.classList.add('active');
    });
    document.getElementById('progress-fill').style.width = pct + '%';
    const labels = { 1: 'コードを生成中...', 2: 'バグチェック中...', 3: '最終確認中...' };
    document.getElementById('progress-text').textContent = labels[step] || '完了';
}

// ===== AI CALL =====
async function callAI(messages) {
    const key = state.apiKeys.find(k => k.id === state.activeProvider);
    if (!key) throw new Error('APIキーが設定されていません。設定から登録してください。');

    const base = key.baseUrl.replace(/\/$/, '');
    const url  = base.endsWith('/chat/completions') ? base : base + '/chat/completions';

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key.key}`,
        },
        body: JSON.stringify({
            model: state.activeModel,
            messages,
            temperature: 0.2,
            max_tokens: 8192,
        }),
    });

    if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); errMsg = j?.error?.message || errMsg; } catch {}

        if (res.status === 401 || res.status === 403) {
            showNotification('APIキーエラー', `「${key.name}」のAPIキーが無効または期限切れです。\nエラー: ${errMsg}`, key.id);
        } else if (res.status === 429) {
            showNotification('レート制限エラー', `「${key.name}」のAPIレート制限に達しました。しばらく待ってから再試行してください。\nエラー: ${errMsg}`, key.id);
        } else if (res.status === 402) {
            showNotification('クレジット不足', `「${key.name}」のAPIクレジットが不足しています。\nエラー: ${errMsg}`, key.id);
        }

        throw new Error(errMsg);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

// ===== SYSTEM PROMPT =====
function buildSystemPrompt() {
    const proj = getCurrentProject();
    const filesStr = (proj?.files || [])
        .filter(f => f.content)
        .map(f => `=== ${f.name} ===\n${f.content}`)
        .join('\n\n');

    return `あなたはDiscordボット開発の専門家AIアシスタントです。
ユーザーの要望に応じてDiscordボットのコードを生成・改善します。

【プロジェクト名】${proj?.name || '未設定'}

【コード生成ルール】
1. コードを出力する前に、必ず3回見直してください（バグ・型エラー・論理エラー・インポート漏れを確認）
2. コードブロックの直前に必ず「ファイル: ファイル名」と記載してください
   例:
   ファイル: main.py
   \`\`\`python
   コード
   \`\`\`
3. Python の場合は discord.py (v2.x)、JavaScript の場合は discord.js (v14) を使用してください
4. 複数ファイルが必要な場合はすべて出力してください
5. 既存ファイルがある場合はその内容を必ず考慮して、整合性を保ってください
6. requirements.txt や .env.example が必要な場合は一緒に出力してください

【現在のファイル】
${filesStr || '(まだファイルはありません)'}

すべての回答は日本語で、わかりやすく説明してください。`;
}

// ===== PARSE RESPONSE =====
function parseFiles(text) {
    const files = [];
    // Match "ファイル: name\n```lang\ncode\n```"
    const re = /ファイル[:：]\s*(\S+)\s*\n```(?:\w*)\n([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        files.push({ filename: m[1].trim(), code: m[2].trim() });
    }
    // Fallback: unnamed code blocks
    if (files.length === 0) {
        const re2 = /```(?:\w+)\n([\s\S]*?)```/g;
        while ((m = re2.exec(text)) !== null) {
            files.push({ filename: null, code: m[1].trim() });
        }
    }
    return files;
}

function applyFiles(parsedFiles) {
    const proj = getCurrentProject();
    if (!proj || parsedFiles.length === 0) return;

    parsedFiles.forEach(({ filename, code }) => {
        const name = filename || state.currentFile || 'main.py';
        const existing = proj.files.find(f => f.name === name);
        if (existing) {
            existing.content = code;
        } else {
            proj.files.push({ name, content: code });
        }
    });

    saveState();
    renderTabs();

    const firstName = parsedFiles[0].filename || state.currentFile || proj.files[0]?.name;
    if (firstName) switchFile(firstName);
}

// ===== SEND =====
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text) return;
    if (!state.activeProvider || !state.activeModel) return;

    input.value = '';
    input.style.height = '';
    appendChatMessage('user', text);

    const proj = getCurrentProject();
    if (!proj) return;

    // Build messages array: system + full history (including just-sent user msg)
    const history = (proj.chatHistory || []).map(m => ({ role: m.role, content: m.content }));
    const messages = [{ role: 'system', content: buildSystemPrompt() }, ...history];

    showTyping();
    showProgress();

    try {
        setProgress(1, 20);
        await delay(300);
        setProgress(1, 50);

        const response = await callAI(messages);

        setProgress(2, 70);
        await delay(250);
        setProgress(3, 90);
        await delay(200);
        setProgress(3, 100);

        hideTyping();
        hideProgress();

        const files = parseFiles(response);
        if (files.length > 0) applyFiles(files);

        // Trim long responses for chat display
        const display = response.length > 2000
            ? response.slice(0, 2000) + '\n\n...(続きはエディタのコードを確認してください)'
            : response;
        appendChatMessage('assistant', display);

    } catch (err) {
        hideTyping();
        hideProgress();
        appendChatMessage('assistant', `エラーが発生しました:\n${err.message}\n\n設定からAPIキーとモデル名を確認してください。`);
    }
}

// ===== COPY CODE =====
function copyCode() {
    const proj = getCurrentProject();
    if (!proj || !state.currentFile) return;
    const file = proj.files.find(f => f.name === state.currentFile);
    if (!file?.content) return;
    navigator.clipboard.writeText(file.content).then(() => {
        const span = document.querySelector('#copy-code-btn span');
        const orig = span.textContent;
        span.textContent = 'コピー完了!';
        setTimeout(() => { span.textContent = orig; }, 1500);
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = file.content;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
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
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const w = Math.max(280, Math.min(startW + (e.clientX - startX), window.innerWidth - 280));
        panel.style.width = w + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// ===== TEXTAREA =====
function initTextarea() {
    const ta = document.getElementById('chat-input');
    ta.addEventListener('input', () => {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    });
    ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
}

// ===== INIT =====
function init() {
    loadState();
    renderProjects();
    updateProviderBadge();
    updateSendButton();
    initResizer();
    initTextarea();

    // Home
    document.getElementById('new-project-btn').addEventListener('click', () => {
        document.getElementById('project-name-input').value = '';
        openModal('new-project-modal');
    });
    document.getElementById('settings-btn-home').addEventListener('click', openSettings);

    // New Project
    document.getElementById('new-project-close').addEventListener('click',  () => closeModal('new-project-modal'));
    document.getElementById('new-project-cancel').addEventListener('click', () => closeModal('new-project-modal'));
    document.getElementById('new-project-create').addEventListener('click', () => {
        const name = document.getElementById('project-name-input').value.trim();
        if (!name) return;
        const proj = { id: genId(), name, createdAt: Date.now(), files: [{ name: 'main.py', content: '' }], chatHistory: [] };
        state.projects.unshift(proj);
        saveState();
        closeModal('new-project-modal');
        renderProjects();
        openProject(proj.id);
    });
    document.getElementById('project-name-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('new-project-create').click();
    });

    // Editor
    document.getElementById('home-btn').addEventListener('click', () => { showScreen('home-screen'); renderProjects(); });
    document.getElementById('settings-btn-editor').addEventListener('click', openSettings);
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('copy-code-btn').addEventListener('click', copyCode);

    // Add File
    document.getElementById('add-tab-btn').addEventListener('click', () => {
        document.getElementById('add-file-input').value = '';
        openModal('add-file-modal');
    });
    document.getElementById('add-file-close').addEventListener('click',   () => closeModal('add-file-modal'));
    document.getElementById('add-file-cancel').addEventListener('click',  () => closeModal('add-file-modal'));
    document.getElementById('add-file-create').addEventListener('click',  () => {
        const name = document.getElementById('add-file-input').value.trim();
        if (!name) return;
        addFile(name);
        closeModal('add-file-modal');
    });
    document.getElementById('add-file-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('add-file-create').click();
    });

    // Rename File
    document.getElementById('rename-file-close').addEventListener('click',  () => closeModal('rename-file-modal'));
    document.getElementById('rename-file-cancel').addEventListener('click', () => closeModal('rename-file-modal'));
    document.getElementById('rename-file-save').addEventListener('click', () => {
        const newName = document.getElementById('rename-file-input').value.trim();
        if (!newName || !state.deleteTarget) return;
        renameFile(state.deleteTarget.filename, newName);
        state.deleteTarget = null;
        closeModal('rename-file-modal');
    });
    document.getElementById('rename-file-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('rename-file-save').click();
    });

    // Delete Confirm
    document.getElementById('delete-confirm-close').addEventListener('click',  () => closeModal('delete-confirm-modal'));
    document.getElementById('delete-confirm-cancel').addEventListener('click', () => closeModal('delete-confirm-modal'));
    document.getElementById('delete-confirm-ok').addEventListener('click', () => {
        executeDelete();
        closeModal('delete-confirm-modal');
    });

    // Settings
    document.getElementById('settings-close').addEventListener('click',  () => closeModal('settings-modal'));
    document.getElementById('settings-cancel').addEventListener('click', () => closeModal('settings-modal'));
    document.getElementById('settings-save').addEventListener('click', saveSettings);
    document.getElementById('add-api-key-btn').addEventListener('click', () => {
        state.apiKeys.push({ id: genId(), name: '', baseUrl: '', key: '' });
        renderApiKeysList();
        renderProviderSelect();
    });

    // Notification
    document.getElementById('notification-close').addEventListener('click', hideNotification);
    document.getElementById('notification-dismiss-btn').addEventListener('click', hideNotification);
    document.getElementById('notification-delete-btn').addEventListener('click', () => {
        if (state.pendingApiKeyId) {
            state.apiKeys = state.apiKeys.filter(k => k.id !== state.pendingApiKeyId);
            if (state.activeProvider === state.pendingApiKeyId) { state.activeProvider = null; state.activeModel = ''; }
            saveState();
            updateProviderBadge();
            updateSendButton();
        }
        hideNotification();
    });

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); });
    });
}

document.addEventListener('DOMContentLoaded', init);
