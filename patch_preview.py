import re

with open('app.js', 'rb') as f:
    raw = f.read().decode('utf-8', 'ignore')

pattern = re.compile(
    r"function refreshPreview\(\) \{.*?"
    r"iframe\.src = URL\.createObjectURL\(blob\);\s*"
    r"\}", 
    re.DOTALL
)

new_code = """function refreshPreview() {
    const iframe = document.getElementById('preview-iframe');
    if (!iframe) return;
    const proj = getProj();
    if (!proj) return;
    
    let htmlContent = proj.files.find(f => f.name.endsWith('.html'))?.content || '';
    const cssContent = proj.files.find(f => f.name.endsWith('.css'))?.content || '';
    
    // Find JS/JSX content
    const jsFile = proj.files.find(f => f.name.endsWith('.js') || f.name.endsWith('.jsx') || f.name.endsWith('.ts') || f.name.endsWith('.tsx'));
    const jsContent = jsFile?.content || '';
    const isJsx = jsFile && (jsFile.name.endsWith('.jsx') || jsFile.name.endsWith('.tsx'));
    
    // Auto-inject frameworks based on template if missing
    let headInjects = '';
    const tpl = proj.template || 'vanilla';
    
    if (tpl === 'tailwind' && !htmlContent.includes('cdn.tailwindcss.com')) {
        headInjects += '<script src="https://cdn.tailwindcss.com"></script>\\n';
    } else if (tpl === 'react') {
        if (!htmlContent.includes('react.development.js')) {
            headInjects += '<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>\\n';
            headInjects += '<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>\\n';
        }
        if (!htmlContent.includes('@babel/standalone')) {
            headInjects += '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\\n';
        }
    } else if (tpl === 'vue' && !htmlContent.includes('vue.global.js')) {
        headInjects += '<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>\\n';
    }
    
    if (headInjects) {
        htmlContent = htmlContent.replace('</head>', `${headInjects}</head>`);
    }
    
    // Remove local script tags pointing to app.js/app.jsx to avoid 404s in blob
    htmlContent = htmlContent.replace(/<script[^>]*src=["'].*?(?:app\\.js|app\\.jsx)["'][^>]*><\\/script>/gi, '');
    
    // Inject CSS
    if (cssContent && !htmlContent.includes('<style id="injected-css">')) {
        htmlContent = htmlContent.replace('</head>', `<style id="injected-css">\\n${cssContent}\\n</style></head>`);
    }
    // Inject JS
    if (jsContent && !htmlContent.includes('<script id="injected-js"')) {
        const scriptType = (tpl === 'react' || isJsx) ? 'text/babel' : 'text/javascript';
        htmlContent = htmlContent.replace('</body>', `<script id="injected-js" type="${scriptType}">\\n${jsContent}\\n</script></body>`);
    }
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);
}"""

if pattern.search(raw):
    raw = pattern.sub(new_code, raw)
    with open('app.js', 'wb') as f:
        f.write(raw.encode('utf-8'))
    print("Patched successfully")
else:
    print("Could not find pattern")
