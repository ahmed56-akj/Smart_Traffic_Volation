const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'violations.json');

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    // on Vercel filesystem is read-only in production serverless functions; this is primarily for local dev
  }
}

function sendJSON(res, status, obj) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = status;
  res.end(JSON.stringify(obj));
}

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end('OK');
  }

  if (req.method === 'GET') {
    const list = readData();
    return sendJSON(res, 200, { data: list });
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const list = readData();
        const id = 'TG-' + Date.now().toString(36).toUpperCase();
        const base = parseInt(payload.base || 0, 10) || 0;
        const fee = Math.round(base * 0.05);
        const total = base + fee;
        const v = {
          id,
          plate: (payload.plate || '').toUpperCase(),
          owner: payload.owner || 'Unknown',
          type: payload.type || 'unknown',
          base, fee, total,
          status: 'unpaid',
          timestamp: new Date().toISOString(),
          notes: payload.notes || ''
        };
        list.push(v);
        writeData(list);
        return sendJSON(res, 201, { data: v });
      } catch (err) {
        return sendJSON(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
};
