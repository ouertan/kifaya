# Kifaya Ops — production-ready starter

This version removes the fake/demo data and the Manus-only authentication flow. It uses:

- React + Vite for the frontend
- Supabase Auth for accounts
- Supabase Postgres for persistent data
- Row Level Security (RLS) so a signed-in user can only access their own clients/orders
- Vercel for HTTPS hosting
- CSV export with formula-injection protection

## 1. Create the database

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Paste and run `supabase/schema.sql`.
4. In **Authentication → Providers**, keep Email enabled.
5. Decide whether email confirmation is required. For a real business, keeping confirmation enabled is recommended.

## 2. Configure locally

Copy `.env.example` to `.env.local` and add the Supabase URL and publishable/anon key.

Never put a Supabase `service_role`/secret key in `.env.local` for the browser app. Only the publishable/anon key belongs in Vite's `VITE_*` variables.

```bash
pnpm install
pnpm dev
```

## 3. Deploy free

Recommended for a small commercial MVP: **Cloudflare Pages + Supabase**.

1. Push the repository to GitHub.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Import an existing Git repository**.
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.

Cloudflare Pages supports Git-based deployments and HTTPS. Its free plan has limits, but static asset requests are free/unlimited and Pages currently allows up to 500 builds/month on Free. Supabase provides the database/Auth layer.

Vercel also works technically, but its current Hobby plan is intended for personal, non-commercial use, so use a paid Vercel plan if Kifaya is operated as a commercial service.

## 4. What is real now

- Account creation and login
- Persistent orders
- Persistent clients
- Status updates
- Order deletion
- Search
- CSV export
- Dashboard metrics calculated from the database
- Per-user database isolation with RLS
- HTTPS/security headers on Vercel

The previous Google Sheets connection was intentionally removed because a frontend-only "connection" is not a secure real integration. A future Google Sheets sync should use Google OAuth plus a server-side/edge function and should never expose a Google service credential in the browser.

## 5. Production checklist

Before accepting real customer data:

- Enable email confirmation.
- Enable MFA in Supabase for privileged accounts if your plan/workflow supports it.
- Configure a custom domain and HTTPS.
- Configure backups/retention appropriate to the business.
- Review Supabase Auth rate limits and your database policies.
- Add a privacy policy and data-retention policy.
- Do not put secrets in GitHub.
- Rotate any credential that was ever committed publicly.
