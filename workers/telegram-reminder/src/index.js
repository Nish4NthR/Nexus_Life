/**
 * nexuslife-telegram-reminder — Cloudflare Worker (free tier).
 *
 * Sends scheduled Telegram messages with inline-button actions and exposes a
 * webhook that captures button taps into a KV queue. The NexusLife frontend
 * can later poll `/queue` (auth: X-API-Secret) to pick up and apply those
 * actions (e.g. "Habits done", "Set mood: amazing").
 *
 * Endpoints (auth via X-API-Secret unless noted):
 *   POST   /webhook    — Telegram posts updates here (no shared-secret auth;
 *                        protected by a path-token instead, see setwebhook).
 *   GET    /queue      — frontend polls for pending actions
 *   DELETE /queue/:key — frontend acks an action it has applied
 *   GET    /test       — fire an immediate test message (auth required)
 *   GET    /setwebhook — register this Worker's URL with Telegram (auth required)
 *   GET    /healthz    — liveness check, no auth
 *
 * Cron triggers (configured in wrangler.toml):
 *   "30 2 * * *"  → 08:00 IST morning ping
 *   "30 15 * * *" → 21:00 IST evening ping
 */

const APP_URL = 'https://nexuslife.vercel.app';

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

async function tg(env, method, body) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    console.error('[telegram] error', method, data);
  }
  return data;
}

async function sendReminder(env, kind) {
  if (!env.TELEGRAM_CHAT_ID) {
    console.warn('[reminder] TELEGRAM_CHAT_ID not set — skipping');
    return;
  }

  const morning = kind === 'morning';
  const message = morning
    ? '🌱 *Good morning, Nishanth.*\n\nA fresh day. Stack one win, then another.\nWhat will today be?'
    : '🌙 *Evening check-in.*\n\nHow did today go? Log what you completed and reflect for two minutes.';

  const keyboard = morning
    ? [
        // Habit logging
        [{ text: '✅ All habits done', callback_data: 'habit:all' }],
        // Mood row
        [
          { text: '😄 Amazing', callback_data: 'mood:amazing' },
          { text: '✨ Good',    callback_data: 'mood:good' },
          { text: '🌗 Okay',   callback_data: 'mood:okay' },
          { text: '🌧 Bad',    callback_data: 'mood:bad' },
          { text: '💀 Terrible', callback_data: 'mood:terrible' },
        ],
        // Quick-open deep links
        [
          { text: '🏃 Habits',   url: `${APP_URL}/habits` },
          { text: '🎯 Goals',    url: `${APP_URL}/goals` },
          { text: '📚 Learning', url: `${APP_URL}/learning` },
        ],
        [
          { text: '💸 Expenses', url: `${APP_URL}/expenses` },
          { text: '📓 Journal',  url: `${APP_URL}/journal` },
          { text: '📊 Dashboard', url: APP_URL },
        ],
      ]
    : [
        // Habit + journal
        [
          { text: '✅ All habits done',  callback_data: 'habit:all' },
          { text: '📝 Open Journal',     callback_data: 'journal:open' },
        ],
        // Full mood row
        [
          { text: '😄 Amazing',  callback_data: 'mood:amazing' },
          { text: '✨ Good',     callback_data: 'mood:good' },
          { text: '🌗 Okay',    callback_data: 'mood:okay' },
          { text: '🌧 Bad',     callback_data: 'mood:bad' },
          { text: '💀 Terrible', callback_data: 'mood:terrible' },
        ],
        // Quick-open deep links
        [
          { text: '🏃 Habits',   url: `${APP_URL}/habits` },
          { text: '🎯 Goals',    url: `${APP_URL}/goals` },
          { text: '📚 Learning', url: `${APP_URL}/learning` },
        ],
        [
          { text: '💸 Expenses', url: `${APP_URL}/expenses` },
          { text: '📓 Journal',  url: `${APP_URL}/journal` },
          { text: '📊 Dashboard', url: APP_URL },
        ],
      ];

  await tg(env, 'sendMessage', {
    chat_id: env.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function handleCallback(env, callback) {
  const action = callback.data;
  const key = `action:${Date.now()}:${callback.id}`;
  await env.ACTION_QUEUE.put(
    key,
    JSON.stringify({
      action,
      from: callback.from?.username || callback.from?.first_name || 'unknown',
      messageId: callback.message?.message_id,
      timestamp: new Date().toISOString(),
    }),
    { expirationTtl: 60 * 60 * 24 * 7 } // 7-day TTL
  );

  // Acknowledge immediately so Telegram doesn't show a spinner
  await tg(env, 'answerCallbackQuery', {
    callback_query_id: callback.id,
    text: '✓ Queued — open NexusLife to apply',
  });
}

export default {
  // Cron handler — fires per the triggers in wrangler.toml
  async scheduled(event, env) {
    // event.cron contains the cron expression that triggered this run.
    // Morning vs evening determined by hour in the cron string.
    const isMorning = event.cron.startsWith('30 2');
    await sendReminder(env, isMorning ? 'morning' : 'evening');
  },

  // HTTP handler — Telegram webhook + frontend queue polling + admin endpoints
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/healthz') {
      return text('ok');
    }

    // Telegram webhook — protected by path token, not header (Telegram can't set headers)
    if (request.method === 'POST' && url.pathname.startsWith('/webhook/')) {
      const provided = url.pathname.slice('/webhook/'.length);
      if (provided !== env.WEBHOOK_PATH_TOKEN) {
        return json({ error: 'invalid webhook token' }, { status: 401 });
      }
      const update = await request.json().catch(() => ({}));
      if (update.callback_query) {
        await handleCallback(env, update.callback_query);
      }
      return json({ ok: true });
    }

    // Everything below requires the shared secret
    if (!checkAuth(request, env)) {
      return json({ error: 'unauthorized' }, { status: 401 });
    }

    // Fire a test reminder immediately
    if (url.pathname === '/test') {
      const kind = url.searchParams.get('kind') === 'evening' ? 'evening' : 'morning';
      await sendReminder(env, kind);
      return json({ ok: true, kind });
    }

    // Register the webhook URL with Telegram
    if (url.pathname === '/setwebhook') {
      if (!env.WEBHOOK_PATH_TOKEN) {
        return json({ error: 'WEBHOOK_PATH_TOKEN secret not set' }, { status: 400 });
      }
      const webhookUrl = `${url.origin}/webhook/${env.WEBHOOK_PATH_TOKEN}`;
      const res = await tg(env, 'setWebhook', {
        url: webhookUrl,
        allowed_updates: ['callback_query', 'message'],
      });
      return json({ ok: res.ok, webhook: webhookUrl, result: res });
    }

    // Get the chat ID — call after starting a chat with the bot
    if (url.pathname === '/whoami') {
      const res = await tg(env, 'getUpdates', { offset: -1 });
      const chats = (res.result || [])
        .map((u) => u.message?.chat || u.callback_query?.message?.chat)
        .filter(Boolean);
      return json({ result: res, chats });
    }

    // Frontend polls this to pick up pending actions
    if (request.method === 'GET' && url.pathname === '/queue') {
      const list = await env.ACTION_QUEUE.list({ prefix: 'action:' });
      const actions = await Promise.all(
        list.keys.map(async ({ name }) => {
          const raw = await env.ACTION_QUEUE.get(name);
          try {
            return { key: name, ...JSON.parse(raw) };
          } catch {
            return null;
          }
        })
      );
      const clean = actions.filter(Boolean).sort((a, b) =>
        a.timestamp < b.timestamp ? -1 : 1
      );
      return json({ actions: clean, count: clean.length });
    }

    // Frontend acks an action it has applied
    const delMatch = url.pathname.match(/^\/queue\/(action:[\w:-]+)$/);
    if (request.method === 'DELETE' && delMatch) {
      await env.ACTION_QUEUE.delete(delMatch[1]);
      return json({ ok: true });
    }

    return json({ error: 'not found' }, { status: 404 });
  },
};
