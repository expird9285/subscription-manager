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

- The Discord "애플리케이션이 응답하지 않았습니다" report is still open: confirm the Interactions Endpoint URL is saved in the Developer Portal and check Worker logs for `POST /discord/interactions`.
- Consider per-member payment tracking for split plans (explicitly out of scope for now).
- Consider auto-advancing `next_billing_date` by billing cycle once a bill date passes (today it stays in the past as `D+N`, same as before).
- Decide whether shared subscriptions need unequal custom shares later; current support is equal `1/N` only.
- Decide whether to self-host the Geist font instead of loading it from Google Fonts.
- New migrations must be applied to remote D1 separately (`npm run db:migrate:remote`); the Workers Builds token has no D1 permission.

## Verification

- Re-run `npm run check` after code changes.
- Re-run `npx wrangler deploy --dry-run` after changing `wrangler.jsonc` or dependencies.
- Manually check mobile and desktop navigation after layout changes (`npm run dev`).
