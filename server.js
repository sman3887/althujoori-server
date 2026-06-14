const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const PWD  = process.env.ADMIN_PASS || 'althujoori2025';

// ── Persistent content storage ────────────────────────────────────
// If a Railway Volume is mounted at /data, store content there so it
// SURVIVES redeploys. Otherwise fall back to the local data folder.
// The bundled defaults (data/content.json) are used to seed the
// persistent file ONLY on first run - after that, your edits are kept.
// Railway auto-sets RAILWAY_VOLUME_MOUNT_PATH when a volume is attached.
// We also check common mount paths as a fallback. Falls back to local /data
// if no volume is mounted (so it still works without a volume).
const VOLUME_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
  || process.env.DATA_DIR
  || (fs.existsSync('/app/data') ? '/app/data' : null)
  || (fs.existsSync('/data') ? '/data' : null);
const PERSIST_DIR = VOLUME_PATH || path.join(__dirname, 'data');
const DATA         = path.join(PERSIST_DIR, 'content.json');
const SEED         = path.join(__dirname, 'data', 'content.json');  // bundled defaults

// Ensure the persistent directory exists
try { fs.mkdirSync(PERSIST_DIR, { recursive: true }); } catch(e){}

// Seed the persistent file from defaults ONLY if it doesn't exist yet
if (!fs.existsSync(DATA)) {
  try {
    const seed = fs.readFileSync(SEED, 'utf8');
    fs.writeFileSync(DATA, seed);
    console.log('Seeded content.json at', DATA);
  } catch(e){
    console.error('Could not seed content.json:', e.message);
  }
}
console.log('Using content file:', DATA);

app.use(express.json({ limit: '10mb' }));

// ── Helpers ───────────────────────────────────────────────────────
function read()  { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
function write(d){ const t=DATA+'.tmp'; fs.writeFileSync(t,JSON.stringify(d,null,2)); fs.renameSync(t,DATA); }
function auth(req,res){ if(req.headers['x-admin-password']!==PWD){ res.status(401).json({error:'Unauthorised'}); return false; } return true; }

// ── API ───────────────────────────────────────────────────────────
app.get( '/api/content',         (req,res)=>res.json(read()));
app.get( '/api/content/:s',      (req,res)=>{ const d=read(); res.json(d[req.params.s]||{}); });
app.post('/api/content/:s',      (req,res)=>{ if(!auth(req,res))return; const d=read(); d[req.params.s]=req.body; write(d); console.log('Saved:',req.params.s); res.json({ok:true}); });
app.post('/api/properties',      (req,res)=>{ if(!auth(req,res))return; const d=read(); d.properties=d.properties||[]; const p={...req.body,id:'p'+Date.now()}; d.properties.push(p); write(d); res.json({ok:true,property:p}); });
app.put( '/api/properties/:id',  (req,res)=>{ if(!auth(req,res))return; const d=read(); const i=d.properties.findIndex(p=>p.id===req.params.id); if(i<0)return res.status(404).json({error:'Not found'}); d.properties[i]={...d.properties[i],...req.body}; write(d); res.json({ok:true}); });
app.delete('/api/properties/:id',(req,res)=>{ if(!auth(req,res))return; const d=read(); d.properties=d.properties.filter(p=>p.id!==req.params.id); write(d); res.json({ok:true}); });

// ── Backup / Restore (download or upload all your content) ─────────
app.get('/api/backup', (req,res)=>{
  res.setHeader('Content-Disposition','attachment; filename="althujoori-content-backup.json"');
  res.json(read());
});
app.post('/api/restore', (req,res)=>{ if(!auth(req,res))return; write(req.body); console.log('Content restored from backup'); res.json({ok:true}); });

// ── Static files ──────────────────────────────────────────────────
app.get('/editor', (req,res)=>res.sendFile(path.join(__dirname,'editor.html')));
app.use(express.static(__dirname));
app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));

app.listen(PORT, ()=>console.log(`Running on port ${PORT}`));
