# TODO

## Project Hygiene

- Create `.env.local` from `.env.example` for local development and builds.
- Decide whether to keep `next/font/google` or switch to a self-hosted/local font setup for network-restricted builds.
- Track the Next.js/PostCSS moderate audit advisory and resolve via a safe Next.js patch or upstream dependency update when available.
- Decide whether to store exchange-rate snapshots in Supabase for auditability instead of relying on live runtime fetches plus fallback rates.

## Verification

- Re-run `npm run lint` after code changes.
- Re-run `npm run build` with required public Supabase environment variables after frontend or Next.js changes.
- Re-run `python -m compileall subscription-assistant` after Python assistant changes.
- Add browser automation tooling or a manual QA pass for the mobile and desktop menu open/close interactions.

## Operating Rule

- After each future work session, update `WORKLOG.md` with the current state, commands run, results, and notable blockers.
- Keep `TODO.md` updated with remaining work, follow-ups, and verification tasks.
