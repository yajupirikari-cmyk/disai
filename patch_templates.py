import re

with open('app.js', 'rb') as f:
    raw = f.read().decode('utf-8', 'ignore')

pattern = re.compile(
    r"document\.getElementById\('new-project-create'\)\.addEventListener\('click',\s*\(\)\s*=>\s*\{.*?"
    r"const proj\s*=\s*\{.*?\};\s*"
    r"state\.projects\.unshift\(proj\);\s*save\(\);\s*closeModal\('new-project-modal'\);\s*renderProjects\(\);\s*openProject\(proj\.id\);\s*"
    r"\}\);", 
    re.DOTALL
)

new_code = """document.getElementById('new-project-create').addEventListener('click', () => {
        const name = document.getElementById('project-name-input').value.trim();
        if (!name) return;
        const template = document.getElementById('project-template-select')?.value || 'vanilla';
        
        let initialFiles = [];
        if (template === 'vanilla' || template === 'tailwind') {
            initialFiles = [
                { name: 'index.html', content: '<!DOCTYPE html>\\n<html lang="ja">\\n<head>\\n  <meta charset="UTF-8">\\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\\n  <title>Document</title>\\n  <link rel="stylesheet" href="style.css">\\n</head>\\n<body>\\n  <h1>Hello ' + name + '</h1>\\n  <script src="app.js"><\\/script>\\n</body>\\n</html>' },
                { name: 'style.css', content: 'body {\\n  font-family: sans-serif;\\n  padding: 2rem;\\n}' },
                { name: 'app.js', content: 'console.log("Hello World");' }
            ];
        } else if (template === 'react') {
            initialFiles = [
                { name: 'index.html', content: '<!DOCTYPE html>\\n<html lang="ja">\\n<head>\\n  <meta charset="UTF-8">\\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\\n  <title>React App</title>\\n  <link rel="stylesheet" href="style.css">\\n</head>\\n<body>\\n  <div id="root"></div>\\n  <script type="text/babel" src="app.jsx"><\\/script>\\n</body>\\n</html>' },
                { name: 'style.css', content: 'body {\\n  font-family: sans-serif;\\n  padding: 2rem;\\n}' },
                { name: 'app.jsx', content: 'function App() {\\n  const [count, React_setCount] = React.useState(0);\\n  return (\\n    <div>\\n      <h1>Hello React</h1>\\n      <button onClick={() => React_setCount(c => c + 1)}>Count: {count}</button>\\n    </div>\\n  );\\n}\\n\\nconst root = ReactDOM.createRoot(document.getElementById("root"));\\nroot.render(<App />);' }
            ];
        } else if (template === 'vue') {
            initialFiles = [
                { name: 'index.html', content: '<!DOCTYPE html>\\n<html lang="ja">\\n<head>\\n  <meta charset="UTF-8">\\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\\n  <title>Vue App</title>\\n  <link rel="stylesheet" href="style.css">\\n</head>\\n<body>\\n  <div id="app">{{ message }}</div>\\n  <script src="app.js"><\\/script>\\n</body>\\n</html>' },
                { name: 'style.css', content: 'body {\\n  font-family: sans-serif;\\n  padding: 2rem;\\n}' },
                { name: 'app.js', content: 'const { createApp, ref } = Vue;\\n\\ncreateApp({\\n  setup() {\\n    const message = ref("Hello Vue!");\\n    return { message };\\n  }\\n}).mount("#app");' }
            ];
        } else {
            initialFiles = [{ name: 'main.py', content: '' }];
        }

        const proj = { id: genId(), name, template, createdAt: Date.now(), files: initialFiles, chatHistory: [] };
        state.projects.unshift(proj); save(); closeModal('new-project-modal'); renderProjects(); openProject(proj.id);
    });"""

if pattern.search(raw):
    raw = pattern.sub(new_code, raw)
    with open('app.js', 'wb') as f:
        f.write(raw.encode('utf-8'))
    print("Patched successfully")
else:
    print("Could not find pattern")
