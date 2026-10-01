# Worklog

## 2026-10-01

### Payment Cards, Linked Accounts And Split-Plan Collection

- Added `migrations/0002_payment_methods.sql`: `bank_accounts`, `payment_cards` (linked account, ON DELETE SET NULL), and `subscriptions.payment_card_id`, `collection_account_id`, `share_token`.
- New `/payments` page: accounts with their cards, next-30-day charges per account (full amounts, weekly/monthly/quarterly/yearly occurrences rolled forward), money to collect from split plans, and subscriptions without a card. Dashboard shows a per-account 30-day panel.
- Subscription form has "결제 카드" and "수금 계좌" selects; ownership of selected cards/accounts is checked server-side. The old free-text payment field stays as "기타 결제 수단 메모".
- Billing alerts now read `N일 뒤에(오늘) **이름** 구독이 결제돼요. **카드**에 연결된 계좌(은행 별칭)에 **금액** 이상 채워져 있는지 확인해 주세요.` with the full amount (foreign currencies add a KRW estimate).
- Split plans get a "수금 안내" page with copyable text and a revocable public link `/s/:token` (no-store, noindex, shows only name, per-person amount, dates and the collection account).
- Ran `npm run check`: TypeScript passed, 47 Vitest tests passed. Checked `/payments`, forms, share and public pages in `wrangler dev` with Playwright (desktop/mobile, clipboard copy, no horizontal overflow after a grid `min-width` fix).

### Remote D1 Schema And Workers Builds Notes

- Merged PR #1 into `main` at the owner's request.
- Applied `migrations/0001_initial_schema.sql` to the remote D1 database through the connected Cloudflare account and recorded it in `d1_migrations` (same table wrangler uses), so `wrangler d1 migrations apply DB --remote` will not re-run it.
- Verified the remote tables (`users`, `sessions`, `subscriptions`, `notification_logs`, `app_state`) and indexes exist.
- Documented Workers Builds settings: build command `npm run build:css`, deploy command `npx wrangler deploy` (the auto-generated build token has no D1 permission), and the expected first-build failure until secrets are set.

## 2026-09-29

### Cloudflare Workers Rewrite

- Rewrote the app as a single Cloudflare Worker per the owner's decisions: Hono + JSX SSR, Cloudflare D1 with first-party Discord OAuth, Discord bot moved into the Worker (HTTP interactions + Cron Trigger), custom domain `manager.ocsar.xyz`.
- Removed the Next.js app, Supabase client/migrations, Vercel config and the Python `subscription-assistant/` bot.
- Created the D1 database `subscription-manager` (APAC, id `930e5831-9a7d-48fa-83fc-2915a6519987`) through the connected Cloudflare account; tables are created by `migrations/0001_initial_schema.sql` on deploy.
- Ported every page (dashboard, subscriptions list/new/edit, analytics, settings, login) and kept the dark Tailwind design, mobile menu and collapsible desktop sidebar (state now persisted in a cookie).
- Behaviour changes: dates are computed in `TIMEZONE` (Asia/Seoul) instead of the server's UTC clock; form validation errors re-render the form instead of throwing; delete asks for confirmation; access is fail-closed on `ALLOWED_DISCORD_IDS`; bot commands show the caller's own subscriptions; settings page can register slash commands, send a test alert and export JSON.
- Exchange rates now come from a D1 snapshot refreshed hourly by cron (EUR-based Frankfurter rates for better KRW precision), so page renders never wait on the external API.
- Fixed the login background gradient, which Tailwind 4 compiled to an invalid `background-color` in the old app too.
- Added `scripts/export-supabase.mjs` to move users, subscriptions and notification logs from Supabase into D1 (idempotent, matches users by Discord ID). Verified against a fake Supabase server and a local D1 twice.
- Ran `npm run check`: TypeScript passed, 39 Vitest tests passed (auth/OAuth, CSRF, CRUD, per-user isolation, interactions signatures and commands, alert scheduling/dedupe/retry, cron handler).
- Ran `npx wrangler deploy --dry-run`: bundle built with D1, vars and assets bindings.
- Ran `wrangler dev` with seeded local data, checked every route, triggered the cron handler (reached the Discord API) and captured desktop/mobile screenshots with Playwright.
- npm 10.9 hits an arborist `edgesOut` bug when resolving vitest peers from scratch; the lockfile was generated with npm 11 and installs fine with `npm ci` / `npm install` on npm 10.

### Current State

- Code is ready to deploy; the owner still needs to set secrets, remove the Vercel CNAME, deploy, configure the Discord portal and run the Supabase export (see `TODO.md`).

## 2026-05-29

### Performance Diagnosis

- Investigated slow response reports after several days of real usage.
- Confirmed the production deployment behind `manager.ocsar.xyz` is running Vercel Functions in `iad1`.
- Confirmed the Supabase project `ufypnmmbnzdgyfglpmwa` is in `ap-northeast-2`.
- Identified the likely primary latency source: authenticated page requests run server-side in Vercel `iad1` while Supabase Auth and Postgres are in Seoul, causing long-distance network round trips.
- Identified duplicated auth work: the Next.js `proxy` calls `supabase.auth.getUser()` and the app layout/data layer calls `getCurrentUser()` with `supabase.auth.getUser()` again during the same page request.
- Identified another avoidable latency source: dashboard, analytics, and subscription pages await `getExchangeRates()`, which calls an external exchange-rate API on the server render path.
- Confirmed the production deployment inspection shows server function output in `iad1`.

### Current State

- No runtime code changes were made during this diagnosis.
- Recommended next fixes are to move Vercel Functions closer to Supabase/Korea, reduce duplicate Supabase Auth checks, and make exchange-rate loading non-blocking or locally cached.

## 2026-05-22

### Supabase Split Count Migration Applied

- Checked the live Supabase project `ufypnmmbnzdgyfglpmwa` after adding shared subscription support.
- Confirmed `public.subscriptions` did not yet have the `split_count` column in the live database.
- Applied the `add_subscription_split_count` migration through the Supabase plugin.
- Verified `public.subscriptions.split_count` now exists as `integer not null default 1` with the check constraint `split_count >= 1 and split_count <= 99`.

### Current State

- Local migration files and live Supabase schema are now aligned for equal `1/N` subscription cost splitting.

### Shared Subscription Cost Splits

- Added `split_count` support for subscriptions so family/friend shared plans can be tracked as `1/N` personal burden while preserving the full billing price.
- Added a Supabase migration to add `subscriptions.split_count` with a default of `1` and a range check from `1` to `99`.
- Updated the reset migration and TypeScript database type to include `split_count`.
- Updated subscription create/edit forms to collect the number of people sharing the subscription.
- Updated dashboard, analytics, filters, and subscription table labels so expense summaries are based on personal burden rather than full plan price.
- Subscription table now shows full billing amount, personal burden amount, and monthly burden separately.
- Updated Discord assistant monthly totals and alert/list formatting to use personal burden while showing the full amount for split plans.
- Ran `npm run lint`: passed.
- Ran `npm run build` with public Supabase environment variables: passed.
- Ran `python -m compileall subscription-assistant`: passed.

### Current State

- Cost sharing is implemented for equal `1/N` splits.
- Existing rows will behave as non-shared subscriptions because the migration defaults `split_count` to `1`.

### Vercel Preview Deploy

- Committed `subscription-assistant/README.md` setup-guide changes in `c557f3f` (`Document Discord assistant setup`).
- Used the Vercel plugin flow and local Vercel CLI to deploy the current project as a preview deployment.
- First preview deployment `dpl_95ZqtxxSvGQQHeWWWYsR8gnVMiUw` failed because Vercel Preview did not have the public Supabase environment variables available at build time.
- Confirmed the failing log line: `Missing Supabase public environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.`
- Re-ran preview deployment with public Supabase build/runtime environment variables passed directly to the Vercel CLI.
- Successful preview deployment: `dpl_DTb1rxgT6wVac3nnuJ7LKXbtWVJD`.
- Preview URL: `https://subscription-manager-6f9dhafyt-galaxytabion2-6110s-projects.vercel.app`.
- Vercel inspector URL: `https://vercel.com/galaxytabion2-6110s-projects/subscription-manager/DTb1rxgT6wVac3nnuJ7LKXbtWVJD`.

### Current State

- Local branch `main` is ahead of `origin/main` with the recent local commits.
- Vercel Preview deploy is ready.
- Preview deploy currently depends on CLI-passed public Supabase env values because project-level Preview env registration was blocked by the project having no connected Git repository.

### Desktop Sidebar Collapse

- Updated desktop navigation so the PC sidebar can collapse and expand independently from the mobile menu.
- Changed the app shell desktop grid from a fixed `260px` sidebar column to an `auto` sidebar column so the main content follows the sidebar width.
- Collapsed desktop state now shows a 72px icon rail with accessible hidden labels and tooltips.
- Expanded desktop state keeps the existing brand, user email, navigation labels, and logout layout.
- Ran `npm run lint`: passed.
- Ran `npm run build` with public Supabase environment variables: passed.

### Current State

- Desktop and mobile navigation both support open/close behavior.
- `subscription-assistant/README.md` still has an unrelated unstaged change and was not touched by this update.

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
