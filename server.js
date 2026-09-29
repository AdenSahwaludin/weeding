const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Friendly URL rewrites / shortcuts
    if (pathname === '/m01' || pathname === '/m01/') {
      res.writeHead(302, { Location: '/the.invisimple.id/m01/index.html' + parsedUrl.search });
      return res.end();
    }
    if (pathname === '/tamu' || pathname === '/tamu/') {
      pathname = '/tamu.html';
    }

    let filePath = path.normalize(path.join(ROOT_DIR, pathname));

    // Prevent directory traversal attacks
    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('403 Forbidden');
    }

    // Check if directory, serve index.html if exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <div style="font-family:sans-serif;text-align:center;padding:50px;">
          <h2>404 - Halaman Tidak Ditemukan</h2>
          <p><a href="/">Kembali ke Beranda</a> | <a href="/the.invisimple.id/m01/index.html">Buka Undangan</a> | <a href="/tamu.html">Buat Link Tamu</a></p>
        </div>
      `);
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range requests (crucial for smooth audio playback like musik.mp3)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      if (start >= stat.size || end >= stat.size) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stat.size}`
        });
        return res.end();
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error: ' + err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n Wedding Invitation Server is running!`);
  console.log(`➜  Local:           http://localhost:${PORT}/`);
  console.log(`➜  Undangan (m01):  http://localhost:${PORT}/the.invisimple.id/m01/index.html`);
  console.log(`➜  Shortcut m01:    http://localhost:${PORT}/m01`);
  console.log(`➜  Buat Link Tamu:  http://localhost:${PORT}/tamu.html\n`);
});
