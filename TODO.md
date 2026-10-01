# TODO

## Go-live (manual, needs account access)

- Stop the old Python bot (systemd) and its `check_billing.py` / `backup_supabase.py` cron jobs before deploying.
- Set the six Worker secrets with `npx wrangler secret put` (see README step 3).
- Add `https://manager.ocsar.xyz/auth/callback` (and `http://localhost:8787/auth/callback`) to Discord OAuth2 redirects.
- Delete the `manager` CNAME (Vercel) in the `ocsar.xyz` Cloudflare DNS zone, then run `npm run deploy`.
- Set the Discord Interactions Endpoint URL to `https://manager.ocsar.xyz/discord/interactions`.
- Log in, register slash commands and send a test alert from the Settings page.
- Export Supabase data with `npm run export:supabase` and apply it to remote D1; delete the generated SQL file.
- After verifying the data, retire the Vercel project and pause/delete the Supabase project.

## Follow-ups

- Consider auto-advancing `next_billing_date` by billing cycle once a bill date passes (today it stays in the past as `D+N`, same as before).
- Decide whether shared subscriptions need unequal custom shares later; current support is equal `1/N` only.
- Decide whether to self-host the Geist font instead of loading it from Google Fonts.
- Optionally connect Workers Builds (Git integration) with `npm run deploy` as the deploy command.

## Verification

- Re-run `npm run check` after code changes.
- Re-run `npx wrangler deploy --dry-run` after changing `wrangler.jsonc` or dependencies.
- Manually check mobile and desktop navigation after layout changes (`npm run dev`).
