const { createHmac } = require('crypto');

const DEFAULT_REGIONDO_HOST = 'https://api.regiondo.com';
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function normalizeHost(raw) {
  const t = String(raw || '').trim().replace(/\/+$/, '');
  if (!t) return DEFAULT_REGIONDO_HOST;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return `https://${t}`;
}

function normalizeSecret(raw) {
  return String(raw || '').trim();
}

function parsePathParam(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split('/').filter(Boolean);
}

function partsFromUrl(req) {
  const base = 'http://localhost';
  const pathname = new URL(req.url || '/', base).pathname;
  const prefix = '/api/regiondo/';
  if (!pathname.startsWith(prefix)) return [];
  return pathname.slice(prefix.length).split('/').filter(Boolean);
}

function rawQueryFromUrl(req) {
  const base = 'http://localhost';
  const search = new URL(req.url || '/', base).search;
  return search.startsWith('?') ? search.slice(1) : search;
}

function regiondoPathFromParts(parts) {
  const rest = parts.join('/').replace(/^\/+|\/+$/g, '');
  if (!rest) return null;
  if (rest === 'products') return '/v1/products';
  return `/v1/${rest}`;
}

function sign(publicKey, privateKey, queryString) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = timestamp + publicKey + queryString;
  const hash = createHmac('sha256', privateKey).update(payload).digest('hex');
  return { timestamp, hash };
}

module.exports = async function handler(req, res) {
  try {
    const method = req && req.method ? req.method : '';
    if (!ALLOWED_METHODS.has(method)) {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const publicKey = normalizeSecret(process.env.REGIONDO_PUBLIC_KEY || process.env.VITE_REGIONDO_PUBLIC_KEY);
    const privateKey = normalizeSecret(process.env.REGIONDO_PRIVATE_KEY || process.env.VITE_REGIONDO_PRIVATE_KEY);
    if (!publicKey || !privateKey) {
      res.status(503).json({
        error:
          'Regiondo API keys not configured. Set REGIONDO_PUBLIC_KEY and REGIONDO_PRIVATE_KEY in Vercel Environment Variables.',
      });
      return;
    }

    const query = (req && req.query) || {};
    const regiondoHost = normalizeHost(process.env.REGIONDO_API_HOST || process.env.VITE_REGIONDO_API_HOST);
    const parts = partsFromUrl(req);
    if (parts.length === 0) {
      const fallback = parsePathParam(query.path);
      if (fallback.length > 0) {
        parts.push(...fallback);
      }
    }
    const path = regiondoPathFromParts(parts);
    if (!path) {
      res.status(400).json({ error: 'Missing Regiondo sub-path' });
      return;
    }

    const queryString = rawQueryFromUrl(req);
    const queryParams = new URLSearchParams(queryString);
    const { timestamp, hash } = sign(publicKey, privateKey, queryString);
    const target = queryString ? `${regiondoHost}${path}?${queryString}` : `${regiondoHost}${path}`;

    const headers = {
      'X-API-ID': publicKey,
      'X-API-TIME': timestamp,
      'X-API-HASH': hash,
      Accept: 'application/json',
      'Accept-Language': String(queryParams.get('store_locale') || 'de-AT'),
      'User-Agent': 'Mozarthaus-Regiondo-Proxy/1.0',
    };

    let body;
    if (!['GET', 'DELETE'].includes(method) && req.body != null && req.body !== '') {
      if (typeof req.body === 'string') {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
        headers['Content-Type'] = (req.headers && req.headers['content-type']) || 'application/json';
      }
    }

    const response = await fetch(target, {
      method,
      headers,
      body,
    });
    const text = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.status(response.status).send(text);
  } catch (error) {
    res.status(500).json({
      error: 'Regiondo proxy handler crashed',
      detail: error && error.message ? error.message : String(error),
    });
  }
};
