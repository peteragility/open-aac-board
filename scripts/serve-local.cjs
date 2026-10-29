const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../build');
const template = require('../infrastructure/hosting.json');
const csp = template.Resources.ResponseHeaders.Properties.ResponseHeadersPolicyConfig.SecurityHeadersConfig.ContentSecurityPolicy.ContentSecurityPolicy;
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build first.');
http.createServer((req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!path.extname(pathname)) pathname = '/index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400).end(); }
}).listen(3017, '127.0.0.1', () => console.log('Open AAC Board: http://127.0.0.1:3017'));
