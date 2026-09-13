import { requireSupabase } from './supabase.js';

export async function currentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Your session has expired. Please sign in again.');
  return { client, user: data.user };
}

export function safeMessage(error, fallback) {
  console.error(fallback, error);
  return fallback;
}
