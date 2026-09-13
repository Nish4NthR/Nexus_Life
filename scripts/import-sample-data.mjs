import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  for (const filename of ['.env.test', '.env.local', '.env']) {
    const file = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}
loadEnv();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey || serviceKey.startsWith('REPLACE_WITH_')) {
  throw new Error('Set SUPABASE_URL and the real SUPABASE_SERVICE_ROLE_KEY in .env.test. This script is server-side only.');
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const dataDir = path.resolve(process.cwd(), 'sample-data');

function csv(filename) {
  const lines = fs.readFileSync(path.join(dataDir, filename), 'utf8').trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  return lines.filter(Boolean).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || null]));
  });
}

function replaceUserId(row, userId) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === 'TEST_USER_A_UUID' ? userId : value]));
}

const [credentials] = csv('test_users.csv');
const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (existing.error) throw existing.error;
let authUser = existing.data.users.find((user) => user.email?.toLowerCase() === credentials.email.toLowerCase());

if (!authUser) {
  const created = await supabase.auth.admin.createUser({ email: credentials.email, password: credentials.password, email_confirm: true, user_metadata: { full_name: credentials.display_name, username: credentials.username } });
  if (created.error) throw created.error;
  authUser = created.data.user;
  console.log(`Created confirmed Auth user: ${credentials.email}`);
} else {
  const updated = await supabase.auth.admin.updateUserById(authUser.id, { password: credentials.password, email_confirm: true, user_metadata: { full_name: credentials.display_name, username: credentials.username } });
  if (updated.error) throw updated.error;
  console.log(`Auth user already exists: ${credentials.email}`);
}

const files = [
  ['profiles.csv', 'profiles'], ['habits.csv', 'habits'], ['habit_logs.csv', 'habit_logs'],
  ['expenses.csv', 'expenses'], ['budgets.csv', 'budgets'], ['goals.csv', 'goals'], ['milestones.csv', 'milestones'],
];
for (const [filename, table] of files) {
  const rows = csv(filename).map((row) => replaceUserId(row, authUser.id));
  if (!rows.length) continue;
  const { error } = await supabase.from(table).upsert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`Imported ${rows.length} row(s) into ${table}`);
}

console.log(`Done. Login with ${credentials.email} and the password from sample-data/test_users.csv.`);
