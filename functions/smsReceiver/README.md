# smsReceiver Cloud Function

Tiny HTTP function that takes a raw SMS from IFTTT / Automate and appends it to `sms-queue.json` in your GCS bucket. NexusLife polls that file every 60s.

## Deploy

```bash
gcloud functions deploy smsReceiver \
  --gen2 --runtime nodejs20 --region asia-south1 \
  --source . --entry-point smsReceiver \
  --trigger-http --allow-unauthenticated \
  --set-env-vars BUCKET_NAME=nexuslife-data,SHARED_SECRET=pick-a-long-random-string
```

Grab the printed URL and put it in your frontend `.env` as `VITE_WEBHOOK_URL`.

## IFTTT setup (Android SMS → Webhook)

1. Create an applet: **If** Android SMS *Any new SMS matches search* → search for `UPI` (or `debited|credited|UPI` if your bank's pattern differs).
2. **Then** Webhooks → Make a web request:
   - **URL:** the deployed function URL
   - **Method:** POST
   - **Content Type:** application/json
   - **Body:**
     ```json
     {
       "secret": "pick-a-long-random-string",
       "body":   "{{Text}}",
       "sender": "{{FromNumber}}",
       "receivedAt": "{{ReceivedAt}}"
     }
     ```

## Automate (alternative, more control)

Use a "Cloud receive SMS" flow that POSTs the same JSON shape.

## Bucket prerequisites

- A bucket named `nexuslife-data` (or whatever you set as `BUCKET_NAME`).
- The Cloud Function's runtime service account needs **Storage Object Admin** on that bucket.

## Testing

```bash
curl -X POST "$URL" \
  -H 'content-type: application/json' \
  -d '{"secret":"pick-a-long-random-string","body":"Rs. 245.00 debited from a/c **1234 on 22-05-26 at SWIGGY UPI Ref 123. Avl Bal Rs.18,432.00"}'
```

Response: `{"ok":true,"id":"...","queueSize":1}`
