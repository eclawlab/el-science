// EL Science — Standalone PhET Lab Server
// Serves only the PhET interactive simulations (no tutor).
// Uses auto-discovered slug->category mapping for O(1) lookups.

// Load .env
const path = require('path');
const fs = require('fs');
(function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
})();

const express = require('express');

const app = express();
const LAB_ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',       '.css': 'text/css',
  '.js':   'text/javascript',  '.mjs': 'text/javascript',
  '.ts':   'text/javascript',
  '.json': 'application/json', '.png': 'image/png',
  '.jpg':  'image/jpeg',       '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',        '.svg': 'image/svg+xml',
  '.ico':  'image/x-icon',     '.webp': 'image/webp',
  '.mp3':  'audio/mpeg',       '.wav': 'audio/wav',
  '.ogg':  'audio/ogg',        '.woff': 'font/woff',
  '.woff2':'font/woff2',       '.ttf':  'font/ttf',
};

// Auto-discover slug -> category mapping
const CATEGORY_DIRS = ['forces-and-motion', 'energy-and-heat', 'light-and-sound', 'matter-and-chemistry', 'life-and-earth', 'electricity-and-magnets', 'framework'];
const slugToCategory = {};
for (const cat of CATEGORY_DIRS) {
  const catPath = path.join(LAB_ROOT, cat);
  if (fs.existsSync(catPath)) {
    try {
      for (const entry of fs.readdirSync(catPath)) {
        if (fs.statSync(path.join(catPath, entry)).isDirectory()) {
          slugToCategory[entry] = cat;
        }
      }
    } catch { /* skip */ }
  }
}

app.use((req, res, next) => {
  const segments = req.path.split('/').filter(Boolean);
  if (segments.length < 1) return next();

  const first = segments[0];
  const cat = slugToCategory[first];
  if (!cat) return next();

  const rest = segments.slice(1).join('/');
  const filePath = path.join(LAB_ROOT, cat, first, rest);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(LAB_ROOT + path.sep) && resolved !== LAB_ROOT) { res.status(403).send('Forbidden'); return; }

  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) return next();
    const ext = path.extname(resolved).toLowerCase();
    res.set({
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(resolved).pipe(res);
  });
});

const PORT = process.env.PORT || 3903;
app.listen(PORT, () => {
  console.log(`EL Science Lab server running at http://localhost:${PORT}`);
});
