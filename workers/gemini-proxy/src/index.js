/**
 * nexuslife-gemini-proxy — Cloudflare Worker (free tier).
 *
 * Proxies requests to OpenRouter so the API key stays server-side.
 * Auth: frontend sends CLIENT_SECRET in the X-Client-Secret header.
 *
 * Endpoint:
 *   POST /v1/chat/completions
 *     Headers: X-Client-Secret: <CLIENT_SECRET>
 *     Body:    OpenAI-compatible chat completions body
 *     Returns: OpenAI-compatible response
 *
 *   GET  /healthz  — liveness, no auth
 *
 * Secrets (set via `wrangler secret put`):
 *   OPENROUTER_API_KEY  — your OpenRouter key (sk-or-v1-...)
 *   CLIENT_SECRET       — long random hex the frontend sends
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const SITE_URL = 'https://nexuslife.vercel.app';
const SITE_NAME = 'NexusLife';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Client-Secret',
  'Access-Control-Max-Age': '86400',
};

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });

const text = (str, status = 200) =>
  new Response(str, {
    status,
    headers: { 'Content-Type': 'text/plain', ...corsHeaders },
  });

function checkSecret(request, env) {
  if (!env.CLIENT_SECRET) return false;
  const provided =
    request.headers.get('X-Client-Secret') ||
    new URL(request.url).searchParams.get('secret');
  return provided === env.CLIENT_SECRET;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/healthz') {
      return text('ok');
    }

    if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
      if (!checkSecret(request, env)) {
        return json({ error: 'forbidden — invalid client secret' }, { status: 403 });
      }

      if (!env.OPENROUTER_API_KEY) {
        return json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
      }

      const body = await request.text();

      let upstream;
      try {
        upstream = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': SITE_URL,
            'X-Title': SITE_NAME,
          },
          body,
        });
      } catch (err) {
        console.error('[gemini-proxy] upstream fetch failed', err);
        return json({ error: `upstream fetch failed: ${err.message}` }, { status: 502 });
      }

      const respBody = await upstream.text();
      return new Response(respBody, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return json({ error: 'not found' }, { status: 404 });
  },
};
