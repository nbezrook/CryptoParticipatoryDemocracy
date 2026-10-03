import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = pathname === '/src/model.js' ? path.join(root, 'src/model.js')
      : path.join(root, 'public', pathname === '/' ? 'index.html' : pathname);
    const resolved = await realpath(file);
    if (resolved !== path.join(root, 'src/model.js') && !resolved.startsWith(path.join(root, 'public') + path.sep)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const body = await readFile(resolved);
    res.writeHead(200, { 'Content-Type': types[path.extname(resolved)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => {
  console.log(`Federation Lab listening on port ${server.address().port}`);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
