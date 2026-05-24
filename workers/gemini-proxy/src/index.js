/**
 * gemini-proxy — Cloudflare Worker (free tier).
 *
 * Forwards Gemini API calls so the API key stays server-side.
 * Auth: frontend sends a shared secret in the X-Client-Secret header.
 *
 * Endpoints:
 *   POST /v1beta/models/<model>:generateContent
 *     Headers: X-Client-Secret: <CLIENT_SECRET>
 *     Body:    raw Gemini generateContent body (passed through unchanged)
 *     Returns: Gemini response unchanged
 *
 *   GET  /healthz  — liveness, no auth
 *
 * Secrets (set via `wrangler secret put`):
 *   GEMINI_API_KEY   — your AI Studio key
 *   CLIENT_SECRET    — a long random hex string the frontend sends
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Secret',
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
  if (!env.CLIENT_SECRET) return false; // secret not set → deny all
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

    // Match Gemini-style path:  /v1beta/models/<model>:generateContent
    const m = url.pathname.match(/^\/v1beta\/models\/([\w.-]+):generateContent$/);
    if (request.method === 'POST' && m) {
      const model = m[1];

      if (!checkSecret(request, env)) {
        return json({ error: 'forbidden — invalid client secret' }, { status: 403 });
      }

      if (!env.GEMINI_API_KEY) {
        return json({ error: 'GEMINI_API_KEY not configured on the proxy' }, { status: 500 });
      }

      const body = await request.text();
      const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

      let upstream;
      try {
        upstream = await fetch(upstreamUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } catch (err) {
        console.error('[gemini-proxy] upstream fetch failed', err);
        return json({ error: 'upstream fetch failed' }, { status: 502 });
      }

      const respBody = await upstream.text();
      return new Response(respBody, {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    return json({ error: 'not found' }, { status: 404 });
  },
};
