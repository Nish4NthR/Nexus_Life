# NexusLife sample CSV data

These files are example/demo data only.

1. Create the user through the NexusLife signup screen using the row in `test_users.csv`.
2. Copy the resulting Supabase Auth user UUID into the `TEST_USER_A_UUID` values in the other CSV files.
3. Import the relational CSVs only after the user exists and only into a test/staging Supabase project.

The password in `test_users.csv` is a deliberately simple demo password. Do not reuse it for a real account. Passwords are managed by Supabase Auth and must not be imported into `profiles` or any application table.

To import the user and records without email verification, put the real server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.test` and run:

```powershell
npm run import:sample
```

The importer creates the Auth user with `email_confirm: true`, then replaces `TEST_USER_A_UUID` with the real Auth UUID before importing the CSV rows. Never expose the service-role key to the browser or commit `.env.test`.

For normal email signup without verification emails, open Supabase Dashboard → Authentication → Providers → Email and disable **Confirm email**. Google authentication is intentionally not used by this app.
