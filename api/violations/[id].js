const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'violations.json');

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch (e) { return []; }
}
function writeData(data) { try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) {} }
function sendJSON(res, status, obj) { res.setHeader('Content-Type', 'application/json'); res.setHeader('Access-Control-Allow-Origin','*'); res.statusCode = status; res.end(JSON.stringify(obj)); }

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') return res.end('OK');
  const parts = req.url.split('/').filter(Boolean);
  const id = parts[parts.length - 1];
  const list = readData();
  const v = list.find(x => x.id === id);
  if (!v) return sendJSON(res, 404, { error: 'Not found' });

  if (req.method === 'GET') return sendJSON(res, 200, { data: v });

  if (req.method === 'POST') {
    // support actions such as /api/violations/:id/pay via query or body.action
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const payload = body ? JSON.parse(body) : {};
      const action = payload.action || req.query && req.query.action;
      if (action === 'pay' || payload.pay) {
        v.status = 'paid';
        v.payments = v.payments || [];
        v.payments.push({ time: new Date().toISOString(), meta: payload.meta || {} });
        writeData(list);
        return sendJSON(res, 200, { data: v });
      }
      return sendJSON(res, 400, { error: 'Invalid action' });
    });
    return;
  }

  res.statusCode = 405; res.end('Method not allowed');
};
