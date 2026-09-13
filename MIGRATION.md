# NexusLife public multi-user migration

## What changed

- Supabase Auth now owns email/password, Google OAuth, sessions, and password reset.
- The public landing page is `/`; authenticated users enter at `/dashboard`.
- Existing JSON-shaped Zustand stores now persist through the RLS-protected `user_data` table in Supabase instead of Google Drive.
- Logout clears in-memory private data before ending the Supabase session.
- Google Drive is no longer required for login.
- AI proxy requests use the Supabase bearer session; no AI secret is sent to the browser.
- A versioned SQL migration is in `supabase/migrations/0001_nexuslife.sql`.

## Supabase setup

1. Create a Supabase project and enable Email auth.
2. Configure Google under Authentication → Providers.
3. Run `supabase/migrations/0001_nexuslife.sql` in the SQL editor.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the Vercel project.
5. Set the Supabase redirect URL to the production site and `/reset-password`.

The anon key is public browser configuration. Never expose the service-role key, AI API key, or Telegram bot token through `VITE_` variables.

## Local verification

```bash
npm install
npm run build
```

## Authenticated RLS tests

The repository includes `scripts/test-rls.mjs`. It provisions two disposable, email-confirmed users through the Supabase admin API, then performs all tested SELECT/INSERT/UPDATE/DELETE operations using their normal authenticated anon-key sessions. The service-role key is never used for the operations under test.

Use a staging Supabase project when possible. In PowerShell:

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_ANON_KEY = "your-public-anon-key"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
npm run test:rls
```

Use the `service_role` key from Supabase Project Settings → API, not the public anon key. The test script also loads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from `.env.test`, `.env.local`, or `.env` when they are not already set in the shell.

The service-role key is used only to create and delete the two disposable test users. The script tests profiles, compatibility `user_data`, habits, habit logs, expenses, budgets, goals, and milestones, including attempts to attach User B's child rows to User A's parent rows. It fails on any cross-user leak or mutation and deletes both test users in a `finally` cleanup block.

If the test reports `B habit log attached to A habit unexpectedly succeeded`, run `supabase/migrations/0003_habit_log_parent_restrictive_rls.sql` in the Supabase SQL Editor before rerunning the test. This is required for projects that already had the earlier broad `habit_logs` policy applied.

The existing data files in Google Drive are not deleted. A dedicated import tool is still required to convert an old personal Drive export into Supabase rows.

## Remaining migration work

- Move the compatibility `user_data` JSON rows into the normalized tables in the same migration.
- Add a server-side account deletion function using the Supabase service role.
- Move UPI and Telegram calls behind authenticated server/Edge Functions; their current legacy workers still use browser-visible shared secrets.
- Add automated two-user RLS tests and a Drive backup/restore UI.

## Vercel Gemini AI

The browser calls `/api/gemini` with the current Supabase bearer session. The Vercel function validates that session and reads the secret `GEMINI_API_KEY` only from the Vercel server environment before calling Gemini. Set these Vercel variables:

```text
GEMINI_API_KEY=server-only-Gemini-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
```

There are no `VITE_GEMINI_*` variables. The old Cloudflare/OpenRouter worker was removed because Vercel is now the single AI proxy.
