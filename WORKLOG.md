# Worklog

## 2026-05-22

### Mobile Navigation And KRW Estimates

- Updated the app shell so mobile/tablet widths show a compact top bar with a sandwich menu button instead of the full navigation stack.
- Added `src/components/app-navigation.tsx` as a small client component for opening and closing the mobile menu while keeping the main app pages server-rendered.
- Added live exchange-rate support in `src/lib/exchange-rates.ts` using latest KRW-based rates, with a conservative fallback table if the rate API is unavailable.
- Added KRW estimated amounts for non-KRW subscriptions across the dashboard summary cards, upcoming billing list, category totals, monthly detail list, analytics panels, and subscription table.
- Preserved the original currency display and only adds KRW estimates when the stored currency is not KRW.
- Ran `npm run lint`: passed.
- Ran `npm run build` with public Supabase environment variables: passed.
- Started `next dev` on `127.0.0.1:3000`: server reported ready.
- Attempted automated browser verification through the Node REPL, but Playwright is not installed in the current runtime, so screenshot/click verification could not run there.
- Stopped the dev server and removed the temporary dev log.

### Current State

- Mobile navigation and KRW estimate implementation is complete.
- Visual browser automation remains unverified because Playwright was unavailable in the Node REPL environment.
- Working tree contains the implementation, `WORKLOG.md`, and `TODO.md` updates pending commit.

### Initial Codebase Review

- Reviewed the repository structure for `subscription-manager`.
- Identified the main app as a Next.js 16.2.6 App Router dashboard with React 19, Tailwind CSS 4, Supabase SSR auth, and Discord OAuth access control.
- Identified `subscription-assistant/` as a Nextcord-based Discord assistant for upcoming billing alerts, monthly summaries, subscription listing, status checks, and alert tests.
- Confirmed the repo was on `main` with no tracked local changes before edits.
- Installed npm dependencies from `package-lock.json` so local Next.js docs and verification commands could run.
- Checked the local Next.js 16 docs under `node_modules/next/dist/docs/`; current usage of `proxy.ts`, async `params`/`searchParams`, and async `cookies()`/`headers()` matches the documented Next 16 direction.
- Ran `npm run lint`: passed.
- Ran `npm run build`: passed when public Supabase environment variables were provided and network access was available for `next/font/google`.
- Ran `python -m compileall subscription-assistant`: passed.
- Noted `npm audit` reports 2 moderate vulnerabilities through Next's internal PostCSS dependency. `npm audit fix --force` would downgrade Next to 9.3.3, so it should not be used.

### Current State

- The tracked working tree is clean apart from this documentation update.
- The app requires local public Supabase environment variables before a production build can prerender all pages.
- Builds in restricted-network environments can fail because `src/app/layout.tsx` imports fonts through `next/font/google`.
