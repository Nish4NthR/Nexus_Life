/**
 * upi-receiver — Cloudflare Worker (free tier).
 *
 * Acts as a tiny SMS inbox queue. IFTTT/Automate POSTs raw UPI SMS bodies.
 * NexusLife frontend polls, parses with Claude, then deletes after confirming.
 *
 * Endpoints (all require X-API-Secret header — or ?secret= for curl debugging):
 *   POST   /sms         → enqueue an SMS. body: { body, sender?, receivedAt? }
 *   GET    /sms         → list all pending entries
 *   DELETE /sms/:id     → drop a single entry (after frontend has processed it)
 *   GET    /healthz     → liveness check (no auth)
 *
 * Storage: Cloudflare KV namespace bound as `SMS_QUEUE`.
 * Key format: `sms:<uuid>`. Value: JSON entry.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Secret',
  'Access-Control-Max-Age': '86400',
};

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, max-age=0',
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });

const text = (str, status = 200) =>
  new Response(str, {
    status,
    headers: { 'Content-Type': 'text/plain', ...corsHeaders },
  });

function checkAuth(request, env) {
  const url = new URL(request.url);
  const provided =
    request.headers.get('X-API-Secret') || url.searchParams.get('secret');
  return env.SHARED_SECRET && provided === env.SHARED_SECRET;
}

function uid() {
  return crypto.randomUUID();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight — no auth required
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/healthz') {
      return text('ok');
    }

    // Everything else needs the shared secret
    if (!checkAuth(request, env)) {
      return json({ error: 'unauthorized' }, { status: 401 });
    }

    // POST /sms — IFTTT/Automate enqueues a new SMS
    if (request.method === 'POST' && url.pathname === '/sms') {
      let body;
      try {
        body = await request.json();
      } catch {
        // Tolerate IFTTT/Automate sending text/plain or form-encoded
        const raw = await request.text().catch(() => '');
        body = { body: raw };
      }
      const smsBody = (body.body || body.text || '').toString().trim();
      if (!smsBody) {
        return json({ error: 'empty SMS body' }, { status: 400 });
      }
      const entry = {
        id: uid(),
        body: smsBody,
        sender: body.sender ? String(body.sender) : null,
        receivedAt: body.receivedAt || new Date().toISOString(),
      };
      // 30-day expiry so a forgotten entry doesn't stick around forever
      await env.SMS_QUEUE.put(`sms:${entry.id}`, JSON.stringify(entry), {
        expirationTtl: 60 * 60 * 24 * 30,
      });
      return json({ ok: true, id: entry.id });
    }

    // GET /sms — frontend polls
    if (request.method === 'GET' && url.pathname === '/sms') {
      const list = await env.SMS_QUEUE.list({ prefix: 'sms:' });
      const entries = await Promise.all(
        list.keys.map(async ({ name }) => {
          const raw = await env.SMS_QUEUE.get(name);
          try {
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })
      );
      const clean = entries
        .filter(Boolean)
        .sort((a, b) => (a.receivedAt < b.receivedAt ? -1 : 1));
      return json({ entries: clean, count: clean.length });
    }

    // DELETE /sms/:id — frontend confirms and removes
    const deleteMatch = url.pathname.match(/^\/sms\/([\w-]+)$/);
    if (request.method === 'DELETE' && deleteMatch) {
      const id = deleteMatch[1];
      await env.SMS_QUEUE.delete(`sms:${id}`);
      return json({ ok: true, id });
    }

    return json({ error: 'not found' }, { status: 404 });
  },
};
