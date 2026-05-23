# telegram-reminder Cloudflare Worker

Sends NexusLife daily reminders to Telegram with inline buttons. Button taps land in a KV action queue that the frontend can later poll and apply.

## Architecture

```
[Cron 8am IST] ──┐
[Cron 9pm IST] ──┴──► sendMessage(text + inline buttons) ──► Your phone
                                                              │
                                                       (tap button)
                                                              ▼
[Telegram webhook] ───► /webhook/<token> ───► KV queue ◄─── Frontend polls
                                                              (applies action)
```

> ⚠️  Never paste real tokens, secrets, or chat IDs into this README or any committed file. Everything sensitive belongs in Worker secrets (`wrangler secret put`).

## One-time setup

### 1. Create the Telegram bot

- Open Telegram, message [@BotFather](https://t.me/BotFather).
- Send `/newbot`, follow the prompts. **Save the bot token in your password manager — do not paste it anywhere in the repo.**
- Start a chat with your new bot and send any message (e.g. "hi") — this is needed before the bot can message you.

### 2. Deploy this Worker

```bash
cd workers/telegram-reminder
npm install
npx wrangler login                                # browser pops to authenticate
npx wrangler kv:namespace create ACTION_QUEUE     # prints the namespace `id`
```

Copy the printed `id` into `wrangler.toml` (replace `REPLACE_WITH_KV_ID`).

Set the four secrets:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN        # paste the bot token
npx wrangler secret put TELEGRAM_CHAT_ID          # see step 3 below
npx wrangler secret put SHARED_SECRET             # openssl rand -hex 32
npx wrangler secret put WEBHOOK_PATH_TOKEN        # openssl rand -hex 16
```

For `TELEGRAM_CHAT_ID` you can put a placeholder for now and fix it after step 3.

Deploy:

```bash
npx wrangler deploy
```

Copy the printed URL — you'll need it. Looks like `https://nexuslife-telegram-reminder.<your-subdomain>.workers.dev`.

### 3. Find your chat ID

After your bot is deployed and you've sent it at least one message:

```bash
curl "https://nexuslife-telegram-reminder.<your-subdomain>.workers.dev/whoami?secret=<your SHARED_SECRET>"
```

Look for a `chat.id` in the response (a positive or negative integer). Save it.

If `TELEGRAM_CHAT_ID` was a placeholder before, set it for real now:

```bash
npx wrangler secret put TELEGRAM_CHAT_ID
```

### 4. Register the webhook

This tells Telegram to POST button-tap events to your Worker:

```bash
curl "https://nexuslife-telegram-reminder.<your-subdomain>.workers.dev/setwebhook?secret=<your SHARED_SECRET>"
```

Should return `{"ok":true, "webhook": "https://.../webhook/<token>"}`.

### 5. Test

Fire a morning ping right now:

```bash
curl "https://nexuslife-telegram-reminder.<your-subdomain>.workers.dev/test?secret=<your SHARED_SECRET>"
```

You should get a Telegram message on your phone with the buttons. Tap one — it'll respond "✓ Queued — open NexusLife to apply" and the action ends up in KV.

You can confirm via:

```bash
curl "https://nexuslife-telegram-reminder.<your-subdomain>.workers.dev/queue?secret=<your SHARED_SECRET>"
```

## Reminders schedule

Defaults in `wrangler.toml`:

- `30 2 * * *` → 08:00 IST morning
- `30 15 * * *` → 21:00 IST evening

Edit the cron expressions to taste. Cloudflare uses UTC — convert before saving.

## API

All endpoints require `X-API-Secret` header (or `?secret=`) unless noted.

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/healthz` | GET | none | liveness ping |
| `/webhook/<token>` | POST | path token | Telegram posts here |
| `/test?kind=morning\|evening` | GET | secret | fire a test reminder |
| `/setwebhook` | GET | secret | (re-)register Telegram webhook |
| `/whoami` | GET | secret | dump recent updates so you can find your chat.id |
| `/queue` | GET | secret | list pending actions from button taps |
| `/queue/:key` | DELETE | secret | ack an action after frontend applies it |

## Free-tier notes

- Cloudflare Workers free: 100k requests/day, 3 cron triggers (we use 2)
- KV free: 100k reads / 1k writes / 1k deletes per day — plenty
- Telegram Bot API: free, no rate limits at this volume
