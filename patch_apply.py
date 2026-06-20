import re

with open('app.js', 'r', encoding='utf-8') as f:
    raw = f.read()

pattern = re.compile(r"(const syntaxOk = await checkSyntaxAndConfirm\(parsedFiles\);.*?^\s*\})", re.MULTILINE | re.DOTALL)

new_code = """\\1

    // --- Show Diff Modal ---
    if (typeof showDiffModal === 'function') {
        const diffOk = await showDiffModal(parsedFiles, rawResponse);
        if (!diffOk) {
            toast('適用をキャンセルしました。', 'info');
            return;
        }
    }"""

if pattern.search(raw):
    raw = pattern.sub(new_code, raw)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(raw)
    print("Patched app.js successfully")
else:
    print("Could not find pattern")
