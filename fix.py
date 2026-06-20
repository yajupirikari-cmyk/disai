import re

with open('app.js', 'rb') as f:
    c = f.read()

c = re.sub(
    b"querySelectorAll\\(b?'\\.tos-link'\\)\\.forEach\\(el => el\\.addEventListener\\(b?'click', \\(e\\) => \\{\\s*e\\.preventDefault\\(\\);\\s*document\\.getElementById\\(b?'tos-content'\\)\\.innerHTML = TOS_CONTENT;\\s*openModal\\(b?'tos-modal'\\);\\s*}\\);",
    b"querySelectorAll('.tos-link').forEach(el => el.addEventListener('click', (e) => {\\n    e.preventDefault();\\n    document.getElementById('tos-content').innerHTML = TOS_CONTENT;\\n    openModal('tos-modal');\\n}));",
    c
)

c = re.sub(
    b"querySelectorAll\\(b?'\\.transparency-link'\\)\\.forEach\\(el => el\\.addEventListener\\(b?'click', \\(e\\) => \\{\\s*e\\.preventDefault\\(\\);\\s*document\\.getElementById\\(b?'transparency-content'\\)\\.innerHTML = TRANSPARENCY_CONTENT;\\s*openModal\\(b?'transparency-modal'\\);\\s*}\\);",
    b"querySelectorAll('.transparency-link').forEach(el => el.addEventListener('click', (e) => {\\n    e.preventDefault();\\n    document.getElementById('transparency-content').innerHTML = TRANSPARENCY_CONTENT;\\n    openModal('transparency-modal');\\n}));",
    c
)

with open('app.js', 'wb') as f:
    f.write(c)
