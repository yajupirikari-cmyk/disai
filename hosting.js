
// ============================================================
// HOSTING FEATURE (Netlify)
// ============================================================

// --- Helpers ---
function getProj() {
    return state.projects.find(p => p.id === state.currentProjectId) || null;
}

async function getNlToken() {
    try {
        const val = await idbGet('netlify_token');
        return val || null;
    } catch { return null; }
}

async function saveNlToken(token) {
    await idbSet('netlify_token', token);
}

// Build a ZIP blob from project files
async function buildProjectZip() {
    const proj = getProj();
    if (!proj || !proj.files || !proj.files.length) throw new Error('ファイルがありません');
    const zip = new JSZip();
    proj.files.forEach(f => zip.file(f.name, f.content || ''));
    return zip.generateAsync({ type: 'blob' });
}

// Update deploy progress UI
function setDeployProgress(pct, text) {
    const fill = document.getElementById('deploy-progress-fill');
    const statusText = document.getElementById('deploy-status-text');
    if (fill) fill.style.width = pct + '%';
    if (statusText) statusText.textContent = text;
}

// Show deploy result
function showDeployResult(url) {
    const progressWrap = document.getElementById('deploy-progress-wrap');
    const resultDiv = document.getElementById('deploy-result');
    const modalTitle = document.getElementById('deploy-modal-title');
    const urlInput = document.getElementById('deploy-url-input');
    const closeBtn = document.getElementById('deploy-modal-close');
    const openBtn = document.getElementById('open-deploy-url-btn');

    if (progressWrap) progressWrap.classList.add('hidden');
    if (resultDiv) resultDiv.classList.remove('hidden');
    if (modalTitle) modalTitle.textContent = '公開完了';
    if (urlInput) urlInput.value = url;
    if (closeBtn) closeBtn.classList.remove('hidden');
    if (openBtn) { openBtn.href = url; }
}

// Deploy to Netlify
async function deployToNetlify(token, siteId) {
    setDeployProgress(10, 'ファイルをZIP化中...');
    const zipBlob = await buildProjectZip();

    setDeployProgress(40, 'Netlify にアップロード中...');

    const endpoint = siteId
        ? `https://api.netlify.com/api/v1/sites/${siteId}/deploys`
        : 'https://api.netlify.com/api/v1/sites';

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/zip'
        },
        body: zipBlob
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Netlify API error: ${res.status}`);
    }

    const data = await res.json();
    setDeployProgress(90, '完了処理中...');

    // For new sites, data has site_id and ssl_url
    // For existing sites (deploys endpoint), data is the deploy object with the site's url
    const newSiteId = data.site_id || siteId;
    const siteUrl = data.ssl_url || data.deploy_ssl_url || data.url || `https://${data.name}.netlify.app`;

    setDeployProgress(100, '公開完了');
    return { siteId: newSiteId, siteUrl };
}

// Save hosting config to project
async function saveHostingConfig(siteId, siteUrl) {
    const proj = getProj();
    if (!proj) return;
    proj.hosting = { provider: 'netlify', siteId, siteUrl };
    await save();
    // Show the manage button
    document.getElementById('hosting-manage-btn')?.classList.remove('hidden');
}

// --- Deploy button ---
document.getElementById('deploy-btn')?.addEventListener('click', async () => {
    const token = await getNlToken();
    if (!token) {
        toast('設定 > ホスティング から Netlify トークンを登録してください', 'warning');
        // Open settings to the hosting tab
        openModal('settings-modal');
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.modal-tab-content').forEach(t => t.classList.remove('active'));
        document.querySelector('.modal-tab[data-tab="hosting"]')?.classList.add('active');
        document.querySelector('.modal-tab-content[data-tab="hosting"]')?.classList.add('active');
        return;
    }

    const proj = getProj();
    if (!proj) { toast('プロジェクトを選択してください', 'warning'); return; }

    // Reset deploy modal state
    const progressWrap = document.getElementById('deploy-progress-wrap');
    const resultDiv = document.getElementById('deploy-result');
    const modalTitle = document.getElementById('deploy-modal-title');
    const closeBtn = document.getElementById('deploy-modal-close');
    if (progressWrap) progressWrap.classList.remove('hidden');
    if (resultDiv) resultDiv.classList.add('hidden');
    if (modalTitle) modalTitle.textContent = 'デプロイ中...';
    if (closeBtn) closeBtn.classList.add('hidden');
    setDeployProgress(0, 'ファイルを準備中...');

    openModal('deploy-modal');

    try {
        const existingSiteId = proj.hosting?.siteId || null;
        const { siteId, siteUrl } = await deployToNetlify(token, existingSiteId);
        await saveHostingConfig(siteId, siteUrl);
        showDeployResult(siteUrl);
    } catch (e) {
        toast('デプロイ失敗: ' + e.message, 'error');
        closeModal('deploy-modal');
    }
});

document.getElementById('deploy-modal-close')?.addEventListener('click', () => closeModal('deploy-modal'));

document.getElementById('copy-deploy-url-btn')?.addEventListener('click', () => {
    const url = document.getElementById('deploy-url-input')?.value;
    if (url) {
        navigator.clipboard.writeText(url).then(() => toast('URLをコピーしました'));
    }
});

// --- Save Netlify Token ---
document.getElementById('save-netlify-token-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('netlify-token-input');
    const status = document.getElementById('netlify-token-status');
    const token = input?.value.trim();
    if (!token) { toast('トークンを入力してください', 'warning'); return; }
    await saveNlToken(token);
    if (input) input.value = '';
    if (status) { status.textContent = '保存しました'; setTimeout(() => { status.textContent = ''; }, 3000); }
    toast('Netlify トークンを保存しました');
});

// Load token into input on settings open
function loadNetlifyTokenToSettings() {
    getNlToken().then(token => {
        const input = document.getElementById('netlify-token-input');
        if (input && token) input.placeholder = '設定済み（変更する場合のみ入力）';
    });
}

// Intercept settings modal open to load token placeholder
const _origSettingsOpenHandler = document.getElementById('settings-btn-editor');
document.getElementById('settings-btn-editor')?.addEventListener('click', () => {
    setTimeout(loadNetlifyTokenToSettings, 100);
});

// --- Hosting Manage button ---
document.getElementById('hosting-manage-btn')?.addEventListener('click', () => {
    const proj = getProj();
    if (!proj || !proj.hosting) return;

    const urlInput = document.getElementById('hosting-current-url');
    const openLink = document.getElementById('hosting-open-url');
    const domainInput = document.getElementById('hosting-domain-input');

    if (urlInput) urlInput.value = proj.hosting.siteUrl || '';
    if (openLink) openLink.href = proj.hosting.siteUrl || '#';
    if (domainInput) domainInput.value = proj.hosting.customDomain || '';

    // Render env vars
    renderEnvVars(proj.hosting.envVars || {});

    openModal('hosting-modal');
});

document.getElementById('hosting-modal-close')?.addEventListener('click', () => closeModal('hosting-modal'));

// --- Re-deploy from manage modal ---
document.getElementById('hosting-redeploy-btn')?.addEventListener('click', async () => {
    closeModal('hosting-modal');
    document.getElementById('deploy-btn')?.click();
});

// --- Domain save ---
document.getElementById('hosting-domain-save-btn')?.addEventListener('click', async () => {
    const proj = getProj();
    if (!proj || !proj.hosting) return;
    const domain = document.getElementById('hosting-domain-input')?.value.trim();
    if (!domain) { toast('ドメインを入力してください', 'warning'); return; }

    const token = await getNlToken();
    if (!token) { toast('Netlify トークンが設定されていません', 'warning'); return; }

    try {
        const res = await fetch(`https://api.netlify.com/api/v1/sites/${proj.hosting.siteId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ custom_domain: domain })
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        proj.hosting.customDomain = domain;
        await save();
        toast('独自ドメインを設定しました');
    } catch (e) {
        toast('ドメイン設定失敗: ' + e.message, 'error');
    }
});

// --- Env vars UI ---
function renderEnvVars(envVars) {
    const list = document.getElementById('env-vars-list');
    if (!list) return;
    list.innerHTML = '';
    Object.entries(envVars).forEach(([k, v]) => addEnvVarRow(k, v));
}

function addEnvVarRow(key = '', value = '') {
    const list = document.getElementById('env-vars-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'env-var-row';
    row.innerHTML = `
        <input type="text" class="input env-key" placeholder="KEY" value="${key}">
        <input type="text" class="input env-val" placeholder="VALUE" value="${value}">
        <button class="btn btn-icon-sm env-remove-btn" title="削除">
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
    `;
    row.querySelector('.env-remove-btn').addEventListener('click', () => row.remove());
    list.appendChild(row);
}

document.getElementById('add-env-var-btn')?.addEventListener('click', () => addEnvVarRow());

// --- Save env vars to Netlify ---
document.getElementById('hosting-env-save-btn')?.addEventListener('click', async () => {
    const proj = getProj();
    if (!proj || !proj.hosting) return;
    const token = await getNlToken();
    if (!token) { toast('Netlify トークンが設定されていません', 'warning'); return; }

    const rows = document.querySelectorAll('#env-vars-list .env-var-row');
    const envVars = {};
    rows.forEach(row => {
        const k = row.querySelector('.env-key')?.value.trim();
        const v = row.querySelector('.env-val')?.value.trim();
        if (k) envVars[k] = v || '';
    });

    try {
        const res = await fetch(`https://api.netlify.com/api/v1/sites/${proj.hosting.siteId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                build_settings: { env: envVars }
            })
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        proj.hosting.envVars = envVars;
        await save();
        toast('環境変数を保存しました');
    } catch (e) {
        toast('環境変数の保存失敗: ' + e.message, 'error');
    }
});

// Show manage button if current project already has hosting info
function refreshHostingUI() {
    const proj = getProj();
    const manageBtn = document.getElementById('hosting-manage-btn');
    if (manageBtn) {
        if (proj && proj.hosting?.siteId) {
            manageBtn.classList.remove('hidden');
        } else {
            manageBtn.classList.add('hidden');
        }
    }
}
// Hook into project switching - call refreshHostingUI whenever project changes
// This patches the existing openProject if available
const _origOpenProject = typeof openProject !== 'undefined' ? openProject : null;
