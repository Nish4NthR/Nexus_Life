/**
 * smsReceiver — Google Cloud Function (Node.js 20, HTTP trigger)
 *
 * Receives a POST from IFTTT / Automate with the raw SMS body, and appends
 * an entry to sms-queue.json in the configured GCS bucket. The NexusLife
 * frontend polls that file every 60s and processes new entries with Claude.
 *
 * Deploy:
 *   gcloud functions deploy smsReceiver \
 *     --gen2 --runtime nodejs20 --region asia-south1 \
 *     --source . --entry-point smsReceiver \
 *     --trigger-http --allow-unauthenticated \
 *     --set-env-vars BUCKET_NAME=nexuslife-data,SHARED_SECRET=pick-a-long-random-string
 *
 * IFTTT webhook body (JSON):
 *   {
 *     "secret": "pick-a-long-random-string",
 *     "body":   "<<< raw SMS text >>>",
 *     "sender": "VK-HDFCBK",          // optional
 *     "receivedAt": "2026-05-22T08:30:00Z" // optional, ISO8601
 *   }
 */

import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';

const BUCKET_NAME = process.env.BUCKET_NAME || 'nexuslife-data';
const QUEUE_FILE = 'sms-queue.json';
const SHARED_SECRET = process.env.SHARED_SECRET || '';

const storage = new Storage();

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

async function readQueue(bucket) {
  const file = bucket.file(QUEUE_FILE);
  const [exists] = await file.exists();
  if (!exists) return [];
  const [buf] = await file.download();
  try {
    const parsed = JSON.parse(buf.toString('utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(bucket, queue) {
  const file = bucket.file(QUEUE_FILE);
  await file.save(JSON.stringify(queue, null, 2), {
    contentType: 'application/json',
    resumable: false,
    metadata: { cacheControl: 'no-cache, max-age=0' },
  });
}

export const smsReceiver = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const payload = req.body || {};

  if (SHARED_SECRET && payload.secret !== SHARED_SECRET) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const body = (payload.body || payload.text || '').toString().trim();
  if (!body) {
    res.status(400).json({ error: 'empty SMS body' });
    return;
  }

  const entry = {
    id: randomUUID(),
    body,
    sender: payload.sender ? String(payload.sender) : null,
    receivedAt: payload.receivedAt || new Date().toISOString(),
    status: 'pending',
  };

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const queue = await readQueue(bucket);
    queue.push(entry);
    await writeQueue(bucket, queue);

    res.status(200).json({ ok: true, id: entry.id, queueSize: queue.length });
  } catch (err) {
    console.error('smsReceiver failed:', err);
    res.status(500).json({ error: 'storage write failed', detail: err.message });
  }
};
