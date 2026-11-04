"""Reproducible source export, excluding runtime state and secrets."""
from pathlib import Path
import json, zipfile
root=Path(__file__).resolve().parent.parent
out=root/'public/crossed-source.zip'
files=[]
for folder in ['app','db','drizzle','lib','public','scripts','worker','tests']:
    files.extend(p for p in (root/folder).rglob('*') if p.is_file() and p.suffix not in ['.zip','.pyc'] and '__pycache__' not in p.parts and p.name not in ['maplibre-worker.js','maplibre-gl-shared.mjs'])
for name in ['firebase.json','firestore.rules','firestore.indexes.json','vercel.json','LICENSE','NOTICE.md','README.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','next.config.ts','postcss.config.mjs','drizzle.config.ts','eslint.config.mjs','cloudflare-env.d.ts','map-worker.d.ts','.gitignore','.npmrc']:
    p=root/name
    if p.exists():files.append(p)
for name in ['docs/demo-adaptations.json','docs/DEMO-EDITORIAL.md']:
    p=root/name
    if p.exists():files.append(p)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(set(files)):
        rel='crossed-web/'+str(p.relative_to(root))
        info=zipfile.ZipInfo(rel,(2026,11,4,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,p.read_bytes())
    z.writestr('crossed-web/.openai/hosting.json',json.dumps({'d1':'DB','r2':None},indent=2)+'\n')
print(f'{out}: {out.stat().st_size:,} bytes, {len(files)} source files')
