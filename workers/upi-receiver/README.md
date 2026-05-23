# upi-receiver Cloudflare Worker

Tiny SMS queue. IFTTT/Automate POSTs raw UPI SMS bodies here; NexusLife polls.

## One-time setup

```bash
cd workers/upi-receiver
npm install
npx wrangler login                                  # browser pops to authenticate
npx wrangler kv:namespace create SMS_QUEUE          # prints the namespace `id`
```

Copy the printed `id` into `wrangler.toml` (replace `REPLACE_WITH_KV_ID`).

Set the shared secret (use the SAME value as `VITE_UPI_API_SECRET` in the frontend `.env`):

```bash
npx wrangler secret put SHARED_SECRET
```

You'll be prompted to paste the secret. Pick a long random string (e.g. `openssl rand -hex 32`).

## Deploy

```bash
npx wrangler deploy
```

Prints a URL like `https://nexuslife-upi-receiver.<your-subdomain>.workers.dev`. Copy it.

Add to the frontend `.env`:

```
VITE_UPI_API_URL=https://nexuslife-upi-receiver.<your-subdomain>.workers.dev
VITE_UPI_API_SECRET=<same secret you set above>
```

## API

All endpoints require `X-API-Secret: <secret>` (or `?secret=` for curl debugging).

- `POST /sms` — IFTTT posts here. Body: `{ "body": "<raw SMS>", "sender": "VK-HDFCBK", "receivedAt": "..." }`
- `GET /sms` — frontend polls. Returns `{ entries: [...], count: N }`.
- `DELETE /sms/:id` — frontend removes after confirming.
- `GET /healthz` — no auth, returns `ok`.

## IFTTT setup (Android SMS → Webhook)

1. Create an applet: **If** Android SMS *Any new SMS matches search* → search `UPI` (or your bank's pattern: `debited|credited|UPI`).
2. **Then** Webhooks → Make a web request:
   - **URL:** `https://nexuslife-upi-receiver.<your-subdomain>.workers.dev/sms?secret=<YOUR_SECRET>`
   - **Method:** POST
   - **Content Type:** application/json
   - **Body:**
     ```json
     {
       "body":   "{{Text}}",
       "sender": "{{FromNumber}}",
       "receivedAt": "{{ReceivedAt}}"
     }
     ```

(Putting the secret in the URL is required because IFTTT's free tier doesn't let you set custom headers. The worker accepts it either way.)

## Test

```bash
URL=https://nexuslife-upi-receiver.<your-subdomain>.workers.dev
SECRET=your-secret-here

# enqueue
curl -X POST "$URL/sms" \
  -H "X-API-Secret: $SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"body":"Rs.245.00 debited from a/c **1234 on 22-05-26 at SWIGGY UPI Ref 12345. Avl Bal Rs.18,432.00","sender":"VK-HDFCBK"}'

# list
curl "$URL/sms" -H "X-API-Secret: $SECRET"

# delete (paste the id from list)
curl -X DELETE "$URL/sms/<id>" -H "X-API-Secret: $SECRET"
```

## Free-tier limits (Cloudflare)

- Workers: 100,000 requests / day (you'll use ~1,440/day from polling alone — well within)
- KV: 100k reads / 1k writes / day, 1GB storage — plenty for personal UPI volume
- No credit card required.
