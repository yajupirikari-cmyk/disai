with open('index.html', 'r', encoding='utf-8') as f:
    raw = f.read()

raw = raw.replace('<script src="hosting.js"></script>', '<script src="hosting.js"></script>\\n    <script src="multi_file.js"></script>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(raw)
print("Updated index.html")
