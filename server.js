const express = require('express');
const fs      = require('fs');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data', 'content.json');
const ADMIN_PASS = process.env.ADMIN_PASS || 'althujoori2025';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ── Read content ─────────────────────────────────────────────────
function readContent() {
  try {
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch(e) {
    return {};
  }
}

// ── Write content (atomic) ────────────────────────────────────────
function writeContent(data) {
  const tmp = DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA);
}

// ── API: get all content ──────────────────────────────────────────
app.get('/api/content', (req, res) => {
  res.json(readContent());
});

// ── API: get single section ───────────────────────────────────────
app.get('/api/content/:section', (req, res) => {
  const all = readContent();
  const section = req.params.section;
  if (all[section] !== undefined) {
    res.json(all[section]);
  } else {
    res.status(404).json({ error: 'Section not found' });
  }
});

// ── API: save section (requires password) ─────────────────────────
app.post('/api/content/:section', (req, res) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  const section = req.params.section;
  const all = readContent();
  all[section] = req.body;
  writeContent(all);
  console.log(`[${new Date().toISOString()}] Saved section: ${section}`);
  res.json({ ok: true, section, saved: new Date().toISOString() });
});

// ── API: save entire content ──────────────────────────────────────
app.post('/api/content', (req, res) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  writeContent(req.body);
  console.log(`[${new Date().toISOString()}] Full content saved`);
  res.json({ ok: true, saved: new Date().toISOString() });
});

// ── API: add property ─────────────────────────────────────────────
app.post('/api/properties', (req, res) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorised' });
  const all = readContent();
  if (!all.properties) all.properties = [];
  const newProp = { ...req.body, id: 'p' + Date.now() };
  all.properties.push(newProp);
  writeContent(all);
  res.json({ ok: true, property: newProp });
});

// ── API: update property ──────────────────────────────────────────
app.put('/api/properties/:id', (req, res) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorised' });
  const all = readContent();
  const idx = (all.properties || []).findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  all.properties[idx] = { ...all.properties[idx], ...req.body };
  writeContent(all);
  res.json({ ok: true });
});

// ── API: delete property ──────────────────────────────────────────
app.delete('/api/properties/:id', (req, res) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorised' });
  const all = readContent();
  all.properties = (all.properties || []).filter(p => p.id !== req.params.id);
  writeContent(all);
  res.json({ ok: true });
});

// ── Serve editor ──────────────────────────────────────────────────
app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

// ── Serve index.html for all non-API routes ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Althujoori server running on port ${PORT}`);
});
