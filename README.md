# Subscription Manager

Personal web dashboard for tracking subscriptions, monthly and annual spending, upcoming billing dates, and payment alerts.

## Stack

- Next.js App Router
- Tailwind CSS
- Supabase Discord OAuth, Postgres, RLS
- Vercel deployment target
- Nextcord Discord assistant under `subscription-assistant/`

## Environment

Copy `.env.example` to `.env.local` for the dashboard.

Required public values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only values:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_WEBHOOK_URL`

Do not prefix service role values with `NEXT_PUBLIC_`.

Optional access control:

- `ALLOWED_DISCORD_IDS`: comma-separated Discord user IDs allowed after OAuth
- `ALLOWED_EMAILS`: fallback email allowlist for Discord accounts when `ALLOWED_DISCORD_IDS` is empty

The dashboard login is Discord-only. Email/password login and signup routes are not exposed.

## Supabase

The active project is `ufypnmmbnzdgyfglpmwa`.

The migration in `supabase/migrations/20260521111034_reset_for_subscription_manager.sql` resets the old public schema and creates:

- `subscriptions`
- `notification_logs`

Both tables have RLS enabled. Users can only access rows whose `user_id` matches `auth.uid()`. The `notification_logs` table prevents duplicate billing alerts with a unique `(subscription_id, notification_type, target_date)` constraint.

For Discord login, enable Discord in Supabase Auth providers and add the Supabase callback URL to the Discord Developer Portal:

- `https://ufypnmmbnzdgyfglpmwa.supabase.co/auth/v1/callback`

Add app callback URLs to the Supabase Auth redirect allow list:

- `http://localhost:3000/auth/callback`
- `https://subscription-manager-ochre-tau.vercel.app/auth/callback`

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run lint
npm run build
python -m compileall subscription-assistant
```

## Discord Assistant

See `subscription-assistant/README.md`.
