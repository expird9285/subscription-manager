import type { Child, PropsWithChildren } from "hono/jsx";

import { displayNameOf } from "../db/users";
import type { User } from "../lib/types";
import {
  ChartColumn,
  CreditCard,
  Icon,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Wallet,
  X,
} from "./icons";

const navigation = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/subscriptions", label: "구독 목록", icon: CreditCard },
  { href: "/subscriptions/new", label: "구독 추가", icon: Plus },
  { href: "/payments", label: "결제수단", icon: Wallet },
  { href: "/analytics", label: "분석", icon: ChartColumn },
  { href: "/settings", label: "설정", icon: Settings },
];

/** The most specific navigation entry matching the current path. */
function activeHref(pathname: string) {
  return navigation
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function Document({
  title,
  noindex = false,
  children,
}: PropsWithChildren<{ title?: string; noindex?: boolean }>) {
  return (
    <html lang="ko" class="h-full antialiased">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        <meta name="description" content="Personal subscription spending dashboard" />
        {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
        <title>{title ? `${title} · Subscription Manager` : "Subscription Manager"}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;600&display=swap"
        />
        <link rel="stylesheet" href="/assets/app.css" />
        <script src="/assets/app.js" defer></script>
      </head>
      <body class="min-h-full bg-zinc-950 text-zinc-50">{children}</body>
    </html>
  );
}

function NavLinks({ pathname, desktop }: { pathname: string; desktop: boolean }) {
  const active = activeHref(pathname);
  return (
    <nav class="grid gap-1" aria-label="주요 메뉴">
      {navigation.map((item) => (
        <a
          href={item.href}
          title={desktop ? item.label : undefined}
          aria-current={item.href === active ? "page" : undefined}
          class={[
            "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
            desktop ? "group-data-[sidebar=collapsed]/shell:justify-center group-data-[sidebar=collapsed]/shell:px-0" : "",
            item.href === active
              ? "bg-zinc-800 text-zinc-50"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50",
          ].join(" ")}
        >
          <Icon icon={item.icon} class="h-4 w-4 shrink-0" />
          <span class={desktop ? "group-data-[sidebar=collapsed]/shell:sr-only" : undefined}>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

function LogoutButton({ desktop }: { desktop: boolean }) {
  return (
    <form method="post" action="/auth/logout" class="mt-auto">
      <button
        type="submit"
        title={desktop ? "로그아웃" : undefined}
        class={[
          "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-200",
          desktop ? "group-data-[sidebar=collapsed]/shell:justify-center group-data-[sidebar=collapsed]/shell:px-0" : "",
        ].join(" ")}
      >
        <Icon icon={LogOut} class="h-4 w-4 shrink-0" />
        <span class={desktop ? "group-data-[sidebar=collapsed]/shell:sr-only" : undefined}>로그아웃</span>
      </button>
    </form>
  );
}

function Brand({ size }: { size: "sm" | "lg" }) {
  return (
    <a href="/dashboard" class="block min-w-0">
      <p class={size === "lg" ? "text-sm font-medium text-cyan-300" : "text-xs font-semibold text-cyan-300"}>
        개인 구독 관리
      </p>
      <h1
        class={
          size === "lg"
            ? "mt-1 truncate text-xl font-semibold tracking-tight"
            : "truncate text-base font-semibold tracking-tight text-zinc-50"
        }
      >
        Subscription Manager
      </h1>
    </a>
  );
}

export function AppShell({
  user,
  pathname,
  sidebarCollapsed,
  children,
}: PropsWithChildren<{ user: User; pathname: string; sidebarCollapsed: boolean }>) {
  const name = displayNameOf(user);

  return (
    <div
      class="group/shell min-h-screen lg:grid lg:grid-cols-[auto_1fr]"
      data-shell=""
      data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}
    >
      <header
        class="group/mobile sticky top-0 z-40 border-b border-white/10 bg-zinc-950/95 backdrop-blur lg:hidden"
        data-mobile-nav=""
        data-open="false"
      >
        <div class="flex h-16 items-center justify-between px-4">
          <Brand size="sm" />
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-100 transition hover:bg-zinc-900"
            aria-label="메뉴 열기"
            aria-expanded="false"
            aria-controls="mobile-navigation"
            data-mobile-toggle=""
          >
            <span class="group-data-[open=true]/mobile:hidden">
              <Icon icon={Menu} class="h-5 w-5" />
            </span>
            <span class="hidden group-data-[open=true]/mobile:inline">
              <Icon icon={X} class="h-5 w-5" />
            </span>
          </button>
        </div>
        <div
          id="mobile-navigation"
          class="grid grid-rows-[0fr] overflow-hidden border-t border-white/10 bg-zinc-950 transition-[grid-template-rows] group-data-[open=true]/mobile:grid-rows-[1fr]"
          inert
        >
          <div class="min-h-0">
            <div class="flex flex-col gap-5 p-4">
              <p class="truncate text-sm text-zinc-500">{name}</p>
              <NavLinks pathname={pathname} desktop={false} />
              <LogoutButton desktop={false} />
            </div>
          </div>
        </div>
      </header>

      <aside class="hidden border-r border-white/10 bg-zinc-900 transition-[width] duration-200 lg:block lg:min-h-screen lg:w-64 lg:group-data-[sidebar=collapsed]/shell:w-[72px]">
        <div class="sticky top-0 flex h-screen flex-col gap-5 p-6 group-data-[sidebar=collapsed]/shell:p-3">
          <div class="flex items-start justify-between gap-3 group-data-[sidebar=collapsed]/shell:justify-center">
            <div class="min-w-0 group-data-[sidebar=collapsed]/shell:hidden">
              <Brand size="lg" />
              <p class="mt-2 truncate text-sm text-zinc-500">{name}</p>
            </div>
            <button
              type="button"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-100 transition hover:bg-zinc-800"
              aria-label={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
              aria-expanded={sidebarCollapsed ? "false" : "true"}
              data-sidebar-toggle=""
            >
              <span class="group-data-[sidebar=collapsed]/shell:hidden">
                <Icon icon={PanelLeftClose} class="h-5 w-5" />
              </span>
              <span class="hidden group-data-[sidebar=collapsed]/shell:inline">
                <Icon icon={PanelLeftOpen} class="h-5 w-5" />
              </span>
            </button>
          </div>
          <NavLinks pathname={pathname} desktop />
          <LogoutButton desktop />
        </div>
      </aside>

      <main class="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

export function StandalonePage({ children }: { children: Child }) {
  return (
    <main class="flex min-h-screen items-center justify-center bg-[#050505] bg-[image:radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(6,182,212,0.18),transparent_28%)] p-4">
      {children}
    </main>
  );
}
