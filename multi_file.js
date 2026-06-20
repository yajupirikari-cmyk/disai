// ============================================================
// MULTI-FILE UI & DIFF (Phase 2)
// ============================================================

// --- File Tree ---
function renderFileTree() {
    const proj = getProj();
    const treeEl = document.getElementById('file-tree');
    if (!proj || !treeEl) return;

    treeEl.innerHTML = '';
    proj.files.forEach(f => {
        const item = document.createElement('div');
        item.className = 'tree-item' + (state.currentFile === f.name ? ' active' : '');
        item.innerHTML = `
            <span class="tree-item-icon">
                <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            </span>
            <span class="tree-item-name">${esc(f.name)}</span>
        `;
        item.addEventListener('click', () => {
            switchFile(f.name);
        });
        treeEl.appendChild(item);
    });
}

// Hook into switchFile and renderTabs to update tree
// ※ app.js では renderFiles ではなく renderTabs が正しい関数名
const _origSwitchFile = switchFile;
switchFile = function(filename) {
    _origSwitchFile(filename);
    renderFileTree();
};

const _origRenderTabs = renderTabs;
renderTabs = function() {
    _origRenderTabs();
    renderFileTree();
};

document.getElementById('add-file-sidebar-btn')?.addEventListener('click', () => {
    document.getElementById('add-tab-btn')?.click();
});

// --- Diff UI ---
let pendingDiffFiles = [];
let pendingRawResponse = '';
let diffResolve = null;

async function showDiffModal(files, rawResponse) {
    return new Promise(resolve => {
        pendingDiffFiles = files;
        pendingRawResponse = rawResponse;
        diffResolve = resolve;

        renderDiffFileList();
        openModal('diff-modal');
    });
}

function renderDiffFileList() {
    const list = document.getElementById('diff-file-list');
    const proj = getProj();
    if (!list || !proj) return;
    
    list.innerHTML = '';
    const scrollArea = document.getElementById('diff-scroll-area');
    const header = document.getElementById('diff-content-header');
    if (scrollArea) scrollArea.innerHTML = '';
    if (header) header.textContent = 'ファイルを選択して差分を確認';

    pendingDiffFiles.forEach((f, idx) => {
        const isNew = !proj.files.find(pf => pf.name === f.filename);
        
        const item = document.createElement('div');
        item.className = 'diff-file-item';
        
        let badge = '<span class="diff-badge mod">MODIFIED</span>';
        if (isNew) badge = '<span class="diff-badge add">NEW</span>';

        item.innerHTML = `
            <div class="diff-file-name">
                <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                ${esc(f.filename)}
            </div>
            ${badge}
        `;
        
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            document.querySelectorAll('.diff-file-item').forEach(el => el.style.borderColor = 'var(--border)');
            item.style.borderColor = 'var(--accent)';
            renderDiffContent(f);
        });

        list.appendChild(item);
        
        if (idx === 0) item.click();
    });
}

function renderDiffContent(fileObj) {
    const header = document.getElementById('diff-content-header');
    const scrollArea = document.getElementById('diff-scroll-area');
    if (!header || !scrollArea) return;
    
    header.textContent = fileObj.filename;
    
    const proj = getProj();
    const oldFile = proj.files.find(f => f.name === fileObj.filename);
    const oldCode = oldFile ? oldFile.content : '';
    const newCode = fileObj.code;
    
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    let html = '';
    
    if (!oldFile) {
        newLines.forEach((l, i) => {
            html += `<div class="diff-line add"><div class="diff-line-num">${i+1}</div><div class="diff-line-text">+ ${esc(l)}</div></div>`;
        });
    } else {
        newLines.forEach((l, i) => {
            const isChanged = oldLines[i] !== l;
            const cls = isChanged ? 'add' : '';
            const prefix = isChanged ? '+' : ' ';
            html += `<div class="diff-line ${cls}"><div class="diff-line-num">${i+1}</div><div class="diff-line-text">${prefix} ${esc(l)}</div></div>`;
        });
    }
    
    scrollArea.innerHTML = html;
}

document.getElementById('diff-modal-accept')?.addEventListener('click', () => {
    closeModal('diff-modal');
    if (diffResolve) diffResolve(true);
});

document.getElementById('diff-modal-reject')?.addEventListener('click', () => {
    closeModal('diff-modal');
    if (diffResolve) diffResolve(false);
});
