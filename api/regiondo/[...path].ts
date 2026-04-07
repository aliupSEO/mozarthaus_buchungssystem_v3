import { createHmac } from 'node:crypto';

const DEFAULT_REGIONDO_HOST = 'https://api.regiondo.com';
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function normalizeHost(raw: string | undefined): string {
  const t = (raw ?? '').trim().replace(/\/+$/, '');
  if (!t) return DEFAULT_REGIONDO_HOST;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  return `https://${t}`;
}

function regiondoPathFromParts(parts: string[]): string | null {
  const rest = parts.join('/').replace(/^\/+|\/+$/g, '');
  if (!rest) return null;
  if (rest === 'products') return '/v1/products';
  return `/v1/${rest}`;
}

function parsePathParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split('/').filter(Boolean);
}

function sign(publicKey: string, privateKey: string, queryString: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = timestamp + publicKey + queryString;
  const hash = createHmac('sha256', privateKey).update(payload).digest('hex');
  return { timestamp, hash };
}

export default async function handler(req: any, res: any) {
  try {
    if (!ALLOWED_METHODS.has(req.method || '')) {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const publicKey = process.env.REGIONDO_PUBLIC_KEY || process.env.VITE_REGIONDO_PUBLIC_KEY || '';
    const privateKey = process.env.REGIONDO_PRIVATE_KEY || process.env.VITE_REGIONDO_PRIVATE_KEY || '';

    if (!publicKey || !privateKey) {
      res.status(503).json({
        error:
          'Regiondo API keys not configured. Set REGIONDO_PUBLIC_KEY and REGIONDO_PRIVATE_KEY in Vercel Environment Variables.',
      });
      return;
    }

    const query = (req?.query ?? {}) as Record<string, string | string[] | undefined>;
    const regiondoHost = normalizeHost(process.env.REGIONDO_API_HOST || process.env.VITE_REGIONDO_API_HOST);
    const parts = parsePathParam(query.path);
    const path = regiondoPathFromParts(parts);

    if (!path) {
      res.status(400).json({ error: 'Missing Regiondo sub-path' });
      return;
    }

    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (k === 'path') continue;
      if (Array.isArray(v)) {
        for (const item of v) qp.append(k, item);
      } else if (v != null) {
        qp.append(k, String(v));
      }
    }

    const queryString = qp.toString();
    const { timestamp, hash } = sign(publicKey, privateKey, queryString);
    const target = queryString ? `${regiondoHost}${path}?${queryString}` : `${regiondoHost}${path}`;

    const headers: Record<string, string> = {
      'X-API-ID': publicKey,
      'X-API-TIME': timestamp,
      'X-API-HASH': hash,
      Accept: 'application/json',
      'Accept-Language': (query.store_locale as string) || 'de-AT',
      'User-Agent': 'Mozarthaus-Regiondo-Proxy/1.0',
    };

    const rawBody = ['GET', 'DELETE'].includes(req.method || '') ? undefined : req.body;
    let body: string | undefined;
    if (rawBody != null && rawBody !== '') {
      if (typeof rawBody === 'string') {
        body = rawBody;
      } else {
        body = JSON.stringify(rawBody);
        headers['Content-Type'] = (req.headers?.['content-type'] as string) || 'application/json';
      }
    }

    const response = await fetch(target, {
      method: req.method,
      headers,
      body,
    });
    const text = await response.text();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.status(response.status).send(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: 'Regiondo proxy handler crashed',
      detail,
      hint: 'Check Vercel function logs for stack trace and validate env variables.',
    });
  }
}
