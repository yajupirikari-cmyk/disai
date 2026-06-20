with open('app.js', 'rb') as f:
    raw = f.read()

import re
# Find all function definitions
funcs = re.findall(rb'function (\w+)', raw)
# Filter ones related to save/project/store
for f in funcs:
    name = f.decode('utf-8', 'ignore')
    if any(k in name.lower() for k in ['save', 'project', 'store', 'persist', 'idb', 'write']):
        print(name)
