import http from 'node:http';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 8080);
const root = join(process.cwd(), 'dist');
const oauthServer = (process.env.APPID_OAUTH_SERVER_URL || '').replace(/\/$/, '');
const clientId = process.env.APPID_CLIENT_ID || '';
const clientSecret = process.env.APPID_CLIENT_SECRET || '';
const baseUrl = (process.env.APP_BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const authDisabled = process.env.AUTH_DISABLED === 'true';

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const [key, ...value] = part.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}

function b64url(value) { return Buffer.from(value).toString('base64url'); }
function sign(value) { return createHmac('sha256', sessionSecret).update(value).digest('base64url'); }
function sessionFor(user) {
  const body = b64url(JSON.stringify({ ...user, exp: Date.now() + 8 * 60 * 60 * 1000 }));
  return `${body}.${sign(body)}`;
}
function readSession(req) {
  const raw = cookies(req).ss_session;
  if (!raw) return null;
  const [body, signature] = raw.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try { const data = JSON.parse(Buffer.from(body, 'base64url')); return data.exp > Date.now() ? data : null; } catch { return null; }
}
function setCookie(res, name, value, options = '') {
  res.setHeader('Set-Cookie', `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${baseUrl.startsWith('https:') ? '; Secure' : ''}${options}`);
}
function redirect(res, location) { res.writeHead(302, { Location: location }); res.end(); }

async function beginLogin(req, res) {
  if (!oauthServer || !clientId || !clientSecret) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    return res.end('Google authentication is not configured yet.');
  }
  const state = randomBytes(20).toString('base64url');
  const verifier = randomBytes(40).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  setCookie(res, 'ss_oauth', `${state}.${verifier}`, '; Max-Age=600');
  const params = new URLSearchParams({
    client_id: clientId, response_type: 'code', redirect_uri: `${baseUrl}/auth/callback`,
    scope: 'openid profile email', state, code_challenge: challenge, code_challenge_method: 'S256'
  });
  redirect(res, `${oauthServer}/authorization?${params}`);
}

async function finishLogin(req, res, url) {
  const stored = cookies(req).ss_oauth || '';
  const divider = stored.indexOf('.');
  const expectedState = stored.slice(0, divider), verifier = stored.slice(divider + 1);
  if (!url.searchParams.get('code') || !expectedState || url.searchParams.get('state') !== expectedState) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }); return res.end('Invalid authentication response.');
  }
  const form = new URLSearchParams({
    grant_type: 'authorization_code', code: url.searchParams.get('code'),
    redirect_uri: `${baseUrl}/auth/callback`, code_verifier: verifier
  });
  const tokenResponse = await fetch(`${oauthServer}/token`, {
    method: 'POST', headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    }, body: form
  });
  if (!tokenResponse.ok) { res.writeHead(502, { 'Content-Type': 'text/plain' }); return res.end('Authentication token exchange failed.'); }
  const tokens = await tokenResponse.json();
  const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString());
  setCookie(res, 'ss_session', sessionFor({ name: payload.name || payload.email || 'Google user', email: payload.email || '' }), '; Max-Age=28800');
  setCookie(res, 'ss_oauth', '', '; Max-Age=0');
  redirect(res, '/');
}

async function serveFile(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(root, safePath);
  try {
    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control': requested === '/index.html' ? 'no-store' : 'public, max-age=3600' });
    res.end(file);
  } catch {
    const fallback = await readFile(join(root, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(fallback);
  }
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, baseUrl);
    if (url.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}'); }
    if (url.pathname === '/login') return beginLogin(req, res);
    if (url.pathname === '/auth/callback') return finishLogin(req, res, url);
    if (url.pathname === '/logout') { setCookie(res, 'ss_session', '', '; Max-Age=0'); return redirect(res, '/login'); }
    if (url.pathname === '/api/me') {
      const user = authDisabled ? { name: 'Demo user', email: '' } : readSession(req);
      res.writeHead(user ? 200 : 401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(user || { error: 'unauthorized' }));
    }
    if (!authDisabled && !readSession(req)) return redirect(res, '/login');
    return serveFile(req, res, url.pathname);
  } catch (error) {
    console.error(error); res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal server error.');
  }
}).listen(port, '0.0.0.0', () => console.log(`SyndromeScope listening on ${port}`));
