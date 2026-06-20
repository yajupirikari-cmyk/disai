
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
    if (state.errorLogs.length === 0) { toast('エラーログはありません', 'success'); return; }
    const blob = new Blob([JSON.stringify(state.errorLogs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `error_logs_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('エラーログをエクスポートしました');
});

// ===== PREVIEW LOGIC =====
document.getElementById('preview-btn')?.addEventListener('click', () => {
    const proj = getProj();
    if (!proj) return;
    const htmlFile = proj.files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) {
        toast('プレビューには HTML ファイルが必要です', 'warning');
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
<h3>AI Code Builder 利用規約</h3>
${Array.from({length: 30}).map((_, i) => `<p><strong>第${i + 1}条</strong><br>本サービスの利用にあたり、ユーザーは関連する法令および公序良俗を遵守するものとします。詳細な規定${i+1}についてここに定めます。</p>`).join('')}
`;

const TRANSPARENCY_CONTENT = `
<h3>透明性レポート</h3>
<p>AI Code Builder は、ユーザーのプライバシーとデータセキュリティを第一に考えています。</p>
<ul>
<li>データの利用: 生成されたコードやチャット履歴は、モデルの学習には使用されません。</li>
<li>暗号化: ユーザーのAPIキーはブラウザ内でローカルに暗号化（AES-GCM）されて保存され、外部サーバーには送信されません。</li>
<li>通信先: 指定されたLLMプロバイダー（OpenAI, Groq等）のAPIエンドポイントへのみ直接通信を行います。</li>
</ul>
`;

document.getElementById('tos-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('tos-content').innerHTML = TOS_CONTENT;
    openModal('tos-modal');
});
document.getElementById('tos-close')?.addEventListener('click', () => closeModal('tos-modal'));

document.getElementById('transparency-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('transparency-content').innerHTML = TRANSPARENCY_CONTENT;
    openModal('transparency-modal');
});
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
