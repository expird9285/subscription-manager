# Worklog

## 2026-05-22

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
