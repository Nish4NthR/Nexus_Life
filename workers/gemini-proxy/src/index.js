/**
 * gemini-proxy — Cloudflare Worker (free tier).
 *
 * Forwards Gemini API calls so the API key stays server-side. Frontend
 * authenticates with its existing Google OAuth access token (from Drive
 * sign-in) — the Worker verifies via Google's tokeninfo endpoint and only
 * proxies calls whose token belongs to the allow-listed email.
 *
 * Endpoints:
 *   POST /v1beta/models/<model>:generateContent
 *     Headers: Authorization: Bearer <google-oauth-access-token>
 *     Body:    raw Gemini generateContent body (passed through unchanged)
 *     Returns: Gemini response unchanged
 *
 *   GET  /healthz  — liveness, no auth
 *
 * KV `TOKEN_CACHE` caches tokeninfo lookups for 5 minutes so we don't pay a
 * round-trip per AI call.
 *
 * Secrets (set via `wrangler secret put`):
 *   GEMINI_API_KEY   — your AI Studio key
 *   ALLOWED_EMAIL    — the Google account allowed to call this proxy (e.g. nishanth@gmail.com)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

async function verifyToken(token, env) {
  if (!token) return false;

  // Cache by token-prefix so identical tokens reuse the lookup
  const cacheKey = `tok:${token.slice(0, 48)}`;
  const cached = await env.TOKEN_CACHE.get(cacheKey);
  if (cached === 'ok') return true;
  if (cached === 'no') return false;

  let info;
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) {
      await env.TOKEN_CACHE.put(cacheKey, 'no', { expirationTtl: 60 });
      return false;
    }
    info = await res.json();
  } catch (err) {
    console.error('[gemini-proxy] tokeninfo fetch failed', err);
    return false;
  }

  const emailOk =
    info.email &&
    info.email.toLowerCase() === String(env.ALLOWED_EMAIL || '').toLowerCase();
  const verified = info.email_verified === 'true' || info.email_verified === true;
  const ok = emailOk && verified;

  // Cache positive for 5 min, negative for 60s to avoid hammering on bad tokens
  await env.TOKEN_CACHE.put(cacheKey, ok ? 'ok' : 'no', {
    expirationTtl: ok ? 300 : 60,
  });
  return ok;
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

    // Match Gemini-style path so frontend can plug in trivially:
    //   /v1beta/models/<model>:generateContent
    const m = url.pathname.match(/^\/v1beta\/models\/([\w.-]+):generateContent$/);
    if (request.method === 'POST' && m) {
      const model = m[1];

      // Bearer token auth
      const auth = request.headers.get('Authorization') || '';
      if (!auth.startsWith('Bearer ')) {
        return json({ error: 'missing or malformed Authorization header' }, { status: 401 });
      }
      const token = auth.slice('Bearer '.length).trim();

      const allowed = await verifyToken(token, env);
      if (!allowed) {
        return json(
          { error: 'forbidden — token does not belong to the allowed account' },
          { status: 403 }
        );
      }

      // Forward the request body verbatim to Gemini
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
