// Server statis mini tanpa dependensi — untuk menjalankan & mengembangkan game.
//   node server.mjs         -> mode biasa        (http://localhost:5173)
//   node server.mjs --dev   -> mode debug: live reload (browser refresh otomatis
//                              setiap ada file berubah) + tanpa cache.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 5173;
const DEV = process.argv.includes('--dev');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ogg': 'audio/ogg',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8'
};

// --- live reload (khusus mode dev) ---
const clients = new Set();
if (DEV) {
  let timer = null;
  watch(ROOT, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { for (const res of clients) res.write('data: reload\n\n'); }, 150);
  });
}
const RELOAD_SNIPPET = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;

createServer(async (req, res) => {
  if (DEV && req.url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/') path = '/index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) throw new Error('di luar root');
    let data = await readFile(file);
    if (DEV && extname(file) === '.html') {
      data = Buffer.from(data.toString('utf8').replace('</body>', RELOAD_SNIPPET + '</body>'));
    }
    const headers = { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' };
    if (DEV) headers['Cache-Control'] = 'no-store';
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 - tidak ditemukan');
  }
}).listen(PORT, () => {
  console.log(`Yuki Valley berjalan di http://localhost:${PORT}` + (DEV ? '  (mode DEV: live reload aktif — edit file, browser refresh sendiri)' : ''));
});
