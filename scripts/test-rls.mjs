import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load local test configuration without adding dotenv or placing secrets in
// frontend VITE_ variables. Existing shell variables always take precedence.
for (const filename of ['.env.test', '.env.local', '.env']) {
  const envPath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are intentionally server/test
// variables. They are never read from VITE_ variables or frontend code.
const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error('Missing SUPABASE_URL. Set it as a server-side test environment variable.');
}
if (!anonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY for the authenticated test clients).');
}
if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Set the server-only service-role key; never use SUPABASE_ANON_KEY for admin setup.');
}

function looksLikeAnonJwt(key) {
  try {
    const payload = key.split('.')[1];
    if (!payload) return false;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.role === 'anon' || decoded.role === 'authenticated';
  } catch {
    return false;
  }
}

if (looksLikeAnonJwt(serviceRoleKey)) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY contains an anon/authenticated key. Use the server-only service_role key from Supabase Settings → API.');
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const users = {
  a: { email: `rls-user-a-${runId}@example.com`, password: `NexusRlsA!${runId}` },
  b: { email: `rls-user-b-${runId}@example.com`, password: `NexusRlsB!${runId}` },
};
let userA;
let userB;

function client() {
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(credentials) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  assert.equal(error, null, `authenticated sign-in failed: ${error?.message}`);
  assert.ok(data.user?.id && data.session?.access_token, 'authenticated session was not returned');
  return { supabase, user: data.user };
}

async function verifyAdminClient() {
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    throw new Error(`Supabase admin client is not authorized. Check SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL. (${error.code || 'unknown'}: ${error.message})`);
  }
}

async function insert(supabase, table, row) {
  const { data, error } = await supabase.from(table).insert(row).select('*').single();
  assert.equal(error, null, `${table} insert failed: ${error?.message}`);
  assert.ok(data && (table === 'user_data' ? data.filename : data.id), `${table} insert did not return a row`);
  return data;
}

async function selectOwn(supabase, table, id) {
  const column = table === 'user_data' ? 'filename' : 'id';
  const { data, error } = await supabase.from(table).select('*').eq(column, id).maybeSingle();
  assert.equal(error, null, `${table} own select failed: ${error?.message}`);
  assert.equal(data?.[column], id, `${table} owner could not read their own row`);
}

async function assertCrossUserHidden(supabase, table, id) {
  const column = table === 'user_data' ? 'filename' : 'id';
  const { data, error } = await supabase.from(table).select('*').eq(column, id);
  assert.equal(error, null, `${table} cross-user select returned an unexpected database error: ${error?.message}`);
  assert.equal(data.length, 0, `${table} cross-user SELECT leaked row ${id}`);
}

async function assertCrossUserMutationBlocked(supabase, table, id, patch) {
  const column = table === 'user_data' ? 'filename' : 'id';
  const update = await supabase.from(table).update(patch).eq(column, id).select(column);
  assert.equal(update.error, null, `${table} cross-user UPDATE returned an unexpected error: ${update.error?.message}`);
  assert.equal(update.data.length, 0, `${table} cross-user UPDATE affected row ${id}`);

  const remove = await supabase.from(table).delete().eq(column, id).select(column);
  assert.equal(remove.error, null, `${table} cross-user DELETE returned an unexpected error: ${remove.error?.message}`);
  assert.equal(remove.data.length, 0, `${table} cross-user DELETE affected row ${id}`);
}

async function assertBlocked(operation, label) {
  const result = await operation();
  assert.ok(
    result.error,
    `${label} unexpectedly succeeded; RLS policy is too permissive (status=${result.status}, data=${JSON.stringify(result.data)})`
  );
}

function crossUserUpdatePatch(table) {
  return {
    user_data: { data: { owner: 'cross-user attack' } },
    habits: { name: 'cross-user attack' },
    habit_logs: { date: '2099-03-01' },
    expenses: { note: 'cross-user attack' },
    budgets: { monthly_limit: 999 },
    goals: { title: 'cross-user attack' },
    milestones: { title: 'cross-user attack' },
    profiles: { display_name: 'cross-user attack' },
  }[table];
}

async function updateOwn(supabase, table, key, patch) {
  const column = table === 'user_data' ? 'filename' : 'id';
  const { data, error } = await supabase.from(table).update(patch).eq(column, key).select(column).single();
  assert.equal(error, null, `${table} owner UPDATE failed: ${error?.message}`);
  assert.equal(data?.[column], key, `${table} owner UPDATE did not affect its own row`);
}

async function deleteOwn(supabase, table, key) {
  const column = table === 'user_data' ? 'filename' : 'id';
  const { data, error } = await supabase.from(table).delete().eq(column, key).select(column).single();
  assert.equal(error, null, `${table} owner DELETE failed: ${error?.message}`);
  assert.equal(data?.[column], key, `${table} owner DELETE did not affect its own row`);
}

async function main() {
  console.log(`Running authenticated RLS tests (${runId})`);

  await verifyAdminClient();

  // Admin is used only for disposable account provisioning and final cleanup.
  const createdA = await admin.auth.admin.createUser({ ...users.a, email_confirm: true, user_metadata: { full_name: 'RLS User A' } });
  assert.equal(createdA.error, null, `could not create User A: ${createdA.error?.message}`);
  userA = createdA.data.user;
  const createdB = await admin.auth.admin.createUser({ ...users.b, email_confirm: true, user_metadata: { full_name: 'RLS User B' } });
  assert.equal(createdB.error, null, `could not create User B: ${createdB.error?.message}`);
  userB = createdB.data.user;

  const a = await signIn(users.a);
  const b = await signIn(users.b);

  // Profiles and compatibility data are also user-owned and must be isolated.
  const profileA = await a.supabase.from('profiles').select('*').eq('id', userA.id).single();
  assert.equal(profileA.error, null, `User A profile SELECT failed: ${profileA.error?.message}`);
  const profileUpdate = await a.supabase.from('profiles').update({ display_name: 'RLS User A Updated' }).eq('id', userA.id).select('id').single();
  assert.equal(profileUpdate.error, null, `User A profile UPDATE failed: ${profileUpdate.error?.message}`);
  await deleteOwn(a.supabase, 'profiles', userA.id);
  const profileRestore = await a.supabase.from('profiles').insert({ id: userA.id, display_name: 'RLS User A Restored' }).select('id').single();
  assert.equal(profileRestore.error, null, `User A profile restore failed: ${profileRestore.error?.message}`);
  await assertCrossUserHidden(b.supabase, 'profiles', userA.id);
  await assertCrossUserMutationBlocked(b.supabase, 'profiles', userA.id, { display_name: 'attacked' });

  const dataA = await insert(a.supabase, 'user_data', { user_id: userA.id, filename: `rls-${runId}-a.json`, data: { owner: 'A' } });
  const dataB = await insert(b.supabase, 'user_data', { user_id: userB.id, filename: `rls-${runId}-b.json`, data: { owner: 'B' } });
  await selectOwn(a.supabase, 'user_data', dataA.filename);
  await assertCrossUserHidden(b.supabase, 'user_data', dataA.filename);
  await assertCrossUserMutationBlocked(b.supabase, 'user_data', dataA.filename, { data: { owner: 'B-attack' } });

  // User A creates a record and child record for every relational table.
  const habitA = await insert(a.supabase, 'habits', { user_id: userA.id, name: `RLS Habit A ${runId}`, frequency: 'daily', xp_per_completion: 10 });
  const habitLogA = await insert(a.supabase, 'habit_logs', { user_id: userA.id, habit_id: habitA.id, date: '2099-01-01' });
  const expenseA = await insert(a.supabase, 'expenses', { user_id: userA.id, amount: 12.5, category: 'testing', date: '2099-01-01' });
  const budgetA = await insert(a.supabase, 'budgets', { user_id: userA.id, category: `rls-${runId}`, monthly_limit: 100 });
  const goalA = await insert(a.supabase, 'goals', { user_id: userA.id, title: `RLS Goal A ${runId}`, status: 'active' });
  const milestoneA = await insert(a.supabase, 'milestones', { user_id: userA.id, goal_id: goalA.id, title: 'RLS milestone A' });
  const recordsA = { user_data: dataA, habits: habitA, habit_logs: habitLogA, expenses: expenseA, budgets: budgetA, goals: goalA, milestones: milestoneA };

  for (const [table, row] of Object.entries(recordsA)) await selectOwn(a.supabase, table, table === 'user_data' ? row.filename : row.id);

  // User A can update and delete their own rows in every user-owned table.
  await updateOwn(a.supabase, 'user_data', dataA.filename, { data: { owner: 'A-updated' } });
  await updateOwn(a.supabase, 'habits', habitA.id, { name: `RLS Habit A Updated ${runId}` });
  await updateOwn(a.supabase, 'habit_logs', habitLogA.id, { date: '2099-01-03' });
  await updateOwn(a.supabase, 'expenses', expenseA.id, { note: 'updated by owner A' });
  await updateOwn(a.supabase, 'budgets', budgetA.id, { monthly_limit: 200 });
  await updateOwn(a.supabase, 'goals', goalA.id, { title: `RLS Goal A Updated ${runId}` });
  await updateOwn(a.supabase, 'milestones', milestoneA.id, { title: 'RLS milestone A updated' });

  const tempData = await insert(a.supabase, 'user_data', { user_id: userA.id, filename: `rls-${runId}-delete.json`, data: {} });
  const tempHabit = await insert(a.supabase, 'habits', { user_id: userA.id, name: 'temporary habit' });
  const tempLog = await insert(a.supabase, 'habit_logs', { user_id: userA.id, habit_id: habitA.id, date: '2099-01-04' });
  const tempExpense = await insert(a.supabase, 'expenses', { user_id: userA.id, amount: 1, category: 'temporary', date: '2099-01-02' });
  const tempBudget = await insert(a.supabase, 'budgets', { user_id: userA.id, category: `rls-delete-${runId}`, monthly_limit: 1 });
  const tempGoal = await insert(a.supabase, 'goals', { user_id: userA.id, title: 'temporary goal' });
  const tempMilestone = await insert(a.supabase, 'milestones', { user_id: userA.id, goal_id: goalA.id, title: 'temporary milestone' });
  await deleteOwn(a.supabase, 'habit_logs', tempLog.id);
  await deleteOwn(a.supabase, 'milestones', tempMilestone.id);
  await deleteOwn(a.supabase, 'habits', tempHabit.id);
  await deleteOwn(a.supabase, 'expenses', tempExpense.id);
  await deleteOwn(a.supabase, 'budgets', tempBudget.id);
  await deleteOwn(a.supabase, 'goals', tempGoal.id);
  await deleteOwn(a.supabase, 'user_data', tempData.filename);

  // B cannot read, update, or delete any A-owned row.
  for (const [table, row] of Object.entries(recordsA)) {
    const key = table === 'user_data' ? row.filename : row.id;
    await assertCrossUserHidden(b.supabase, table, key);
    await assertCrossUserMutationBlocked(b.supabase, table, key, crossUserUpdatePatch(table));
  }

  // Relationship policies prevent B from attaching children to A's parents.
  await assertBlocked(() => b.supabase.from('habit_logs').insert({ user_id: userB.id, habit_id: habitA.id, date: '2099-02-01' }).select('id').single(), 'B habit log attached to A habit');
  await assertBlocked(() => b.supabase.from('milestones').insert({ user_id: userB.id, goal_id: goalA.id, title: 'cross-user milestone' }).select('id').single(), 'B milestone attached to A goal');

  // B can create and read their own data, while A cannot see it.
  const habitB = await insert(b.supabase, 'habits', { user_id: userB.id, name: `RLS Habit B ${runId}`, frequency: 'daily' });
  const habitLogB = await insert(b.supabase, 'habit_logs', { user_id: userB.id, habit_id: habitB.id, date: '2099-02-02' });
  const expenseB = await insert(b.supabase, 'expenses', { user_id: userB.id, amount: 22, category: 'testing', date: '2099-01-01' });
  const goalB = await insert(b.supabase, 'goals', { user_id: userB.id, title: `RLS Goal B ${runId}`, status: 'active' });
  await selectOwn(b.supabase, 'habits', habitB.id); await selectOwn(b.supabase, 'habit_logs', habitLogB.id); await selectOwn(b.supabase, 'expenses', expenseB.id); await selectOwn(b.supabase, 'goals', goalB.id);
  await assertBlocked(() => b.supabase.from('habit_logs').update({ habit_id: habitA.id }).eq('id', habitLogB.id).select('id').single(), 'B habit log reassigned to A habit');
  await assertCrossUserHidden(a.supabase, 'habits', habitB.id);
  await assertCrossUserHidden(a.supabase, 'habit_logs', habitLogB.id);
  await assertCrossUserHidden(a.supabase, 'expenses', expenseB.id);
  await assertCrossUserHidden(a.supabase, 'goals', goalB.id);

  console.log('✓ authenticated two-user RLS isolation passed');
}

try {
  await main();
} finally {
  // Cascades remove all test rows. This cleanup intentionally uses admin only
  // after the authenticated RLS assertions have completed.
  for (const user of [userA, userB]) {
    if (user?.id) {
      const result = await admin.auth.admin.deleteUser(user.id);
      if (result.error) console.error(`Cleanup failed for ${user.id}: ${result.error.message}`);
    }
  }
}
