const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data', 'content.json');
const PWD  = process.env.ADMIN_PASS || 'althujoori2025';

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

// ── Static files ──────────────────────────────────────────────────
app.get('/editor', (req,res)=>res.sendFile(path.join(__dirname,'editor.html')));
app.use(express.static(__dirname));
app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));

app.listen(PORT, ()=>console.log(`Running on port ${PORT}`));
