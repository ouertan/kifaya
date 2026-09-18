# Security notes

## Browser safety
The frontend contains only the Supabase publishable/anon key. That key is not a database password; access is controlled by Postgres Row Level Security.

Never expose:
- Supabase `service_role` key
- Google OAuth client secrets
- private API keys
- database passwords

## Database isolation
Every `clients` and `orders` row has a `user_id` referencing `auth.users`. RLS policies require `auth.uid() = user_id` for all operations.

This means changing an ID in a browser request does not grant access to another user's records.

## Input handling
React escapes rendered text by default. Database constraints limit important text fields. CSV export prefixes spreadsheet-dangerous leading characters to reduce formula injection risk.

## Hosting
Vercel provides HTTPS. `vercel.json` adds clickjacking, MIME-sniffing, referrer, permissions, and HSTS headers.

## Important limitation
This is a production-oriented MVP, not a completed compliance program. If Kifaya will store sensitive customer data at scale, add audit logging, backups, incident response, account recovery procedures, MFA for admins, and a documented privacy/retention policy before launch.
