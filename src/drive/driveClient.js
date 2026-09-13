import { requireSupabase } from '../lib/supabase.js';

// Compatibility API: existing stores still read/write JSON-shaped records, but
// the source of truth is now a user-scoped Supabase row protected by RLS.
export class DriveError extends Error {
  constructor(message, options = {}) { super(message); this.name = 'DataError'; Object.assign(this, options); }
}

export async function readJSON(filename, fallback = null) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new DriveError('You must be signed in to load your data.');
  const { data, error } = await client.from('user_data').select('data').eq('user_id', user.id).eq('filename', filename).maybeSingle();
  if (error) throw new DriveError(`Unable to load ${filename}.`, { cause: error });
  return data?.data ?? fallback;
}

export async function writeJSON(filename, value) {
  const client = requireSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new DriveError('You must be signed in to save your data.');
  const { error } = await client.from('user_data').upsert({ user_id: user.id, filename, data: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,filename' });
  if (error) throw new DriveError(`Unable to save ${filename}.`, { cause: error });
  return { ok: true };
}

export async function updateJSON(filename, updater, fallback = []) {
  const current = await readJSON(filename, fallback);
  const next = updater(current ?? fallback);
  await writeJSON(filename, next);
  return next;
}

export function resetDriveCache() {}

export const FILES = Object.freeze({
  habits: 'habits.json', habitLogs: 'habit-logs.json', badHabits: 'bad-habits.json',
  expenses: 'expenses.json', budgets: 'budgets.json', goals: 'goals.json', moods: 'moods.json',
  journal: 'journal.json', profile: 'profile.json', learning: 'learning.json',
  learningLogs: 'learning-logs.json', smsQueue: 'sms-queue.json',
});
export { DriveError as GCSError };
