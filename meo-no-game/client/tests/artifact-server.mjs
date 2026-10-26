import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('../../test-report/play-flight');
http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.end();
  if (req.method === 'GET' && req.url === '/capture.js') {
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(fs.readFileSync('tests/capture-audio.js'));
  }
  if (req.method !== 'POST' || !/^\/[a-z0-9-]+\.(webm|json)$/.test(req.url)) { res.statusCode = 404; return res.end(); }
  const chunks = []; let bytes = 0;
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 20e6) { res.statusCode = 413; return res.end(); } chunks.push(chunk); }
  fs.writeFileSync(path.join(root, req.url.slice(1)), Buffer.concat(chunks));
  res.end('saved');
}).listen(4190, '127.0.0.1', () => console.log('Review artifact collector: 4190'));
