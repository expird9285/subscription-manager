# Agent Guide

This project is a single Cloudflare Worker (Hono + JSX SSR, D1, Cron Triggers, Discord HTTP interactions).
It is **not** a Next.js or React app anymore. See `README.md` for deployment.

## Commands

- `npm run check` — TypeScript + Vitest (tests run inside workerd with a local D1 and the real migrations).
- `npm run dev` — local Worker on http://localhost:8787 (needs `.dev.vars`, see `.dev.vars.example`).
- `npm run db:migrate:local` / `npm run db:migrate:remote` — apply `migrations/*.sql`.
- `npm run deploy` — remote migrations + `wrangler deploy` (Tailwind is built by `build.command`).
- `npm run cf-typegen` — regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc`.

## Conventions

- Hono JSX is not React: use `class`, `value`, `checked`, `selected`, and textarea children.
  `defaultValue`, `defaultChecked` and `<select value>` are rendered as plain attributes and do nothing.
- Tailwind only sees complete class names in source files. Never build class names with template literals.
- Calendar dates are `YYYY-MM-DD` strings. "Today" always comes from `todayIn(timeZoneOf(env))`; never use
  `new Date()` local getters (Workers run in UTC).
- Every subscription query must be scoped by `user_id`; cross-user access returns 404.
- Forms are plain HTML POSTs protected by Hono's `csrf()` middleware; mutations redirect afterwards.
- Access is fail-closed: only Discord IDs listed in `ALLOWED_DISCORD_IDS` can sign in or use bot commands.
- Schema changes go in a new numbered file in `migrations/`; never edit an applied migration.

## Operating Rule

- After each work session, update `WORKLOG.md` with the current state, commands run, results, and blockers.
- Keep `TODO.md` updated with remaining work, follow-ups, and verification tasks.
