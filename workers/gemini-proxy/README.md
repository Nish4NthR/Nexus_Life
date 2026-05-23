# gemini-proxy Cloudflare Worker

Forwards Gemini `generateContent` calls so the API key never enters the client bundle. Frontend authenticates with its existing Google OAuth access token (from Drive sign-in); the Worker verifies that token's email matches an allow-list before proxying.

This is what makes NexusLife safe to deploy publicly on GitHub Pages.

## How it gates access

1. Frontend → Worker with `Authorization: Bearer <google-access-token>` (the token already in `useDriveAuthStore`).
2. Worker calls `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=…` (free, no key).
3. If the response's `email` matches `ALLOWED_EMAIL` secret AND `email_verified` is true → proxy the call.
4. Otherwise → 403.
5. Results cached in KV for 5 minutes so each AI call only needs one tokeninfo lookup per 5 min of usage.

## One-time setup

```bash
cd workers/gemini-proxy
npm install
npx wrangler kv:namespace create TOKEN_CACHE      # prints the namespace `id`
```

Copy the printed `id` into `wrangler.toml`.

Set the two secrets:

```bash
npx wrangler secret put GEMINI_API_KEY            # your AI Studio key (the one in your .env currently)
npx wrangler secret put ALLOWED_EMAIL             # your Gmail (lowercase)
```

Deploy:

```bash
npx wrangler deploy
```

Copy the URL. Looks like `https://nexuslife-gemini-proxy.<your-subdomain>.workers.dev`.

## Frontend config

In NexusLife's root `.env`:

```
VITE_GEMINI_PROXY_URL=https://nexuslife-gemini-proxy.<your-subdomain>.workers.dev
```

And **remove** `VITE_GEMINI_API_KEY` entirely — the key now lives in the Worker.

Restart Vite.

## Test

```bash
# Should be 401 (no token)
curl -X POST "https://nexuslife-gemini-proxy.<your-subdomain>.workers.dev/v1beta/models/gemini-2.5-flash-lite:generateContent" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"hi"}]}]}'

# Should be 403 (bad token)
curl -X POST "https://nexuslife-gemini-proxy.<your-subdomain>.workers.dev/v1beta/models/gemini-2.5-flash-lite:generateContent" \
  -H "Authorization: Bearer notarealtoken" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"hi"}]}]}'
```

End-to-end test happens through the app itself: hit ↻ on any AI feature after signing in to NexusLife. If Gemini responds, the proxy is working.

## API

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/healthz` | GET | none | liveness ping |
| `/v1beta/models/<model>:generateContent` | POST | Bearer Google OAuth token | proxies to Gemini |

`<model>` accepts anything Gemini accepts (`gemini-2.5-flash-lite`, `gemini-2.5-flash`, `gemini-2.5-pro`, etc).

## Free-tier notes

- Cloudflare Workers free: 100k requests/day
- KV free: 100k reads / 1k writes — token cache hits use 1 read each
- Google `tokeninfo`: free, no key required
