"use client";

import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

const navigation = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/subscriptions", label: "구독 목록", icon: CreditCard },
  { href: "/subscriptions/new", label: "구독 추가", icon: Plus },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/settings", label: "설정", icon: Settings },
];

export function AppNavigation({ email }: { email?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="min-w-0" onClick={() => setIsOpen(false)}>
            <p className="text-xs font-semibold text-cyan-300">개인 구독 관리</p>
            <h1 className="truncate text-base font-semibold tracking-tight text-zinc-50">
              Subscription Manager
            </h1>
          </Link>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-zinc-100 transition hover:bg-zinc-900"
            type="button"
            aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div
          id="mobile-navigation"
          className={clsx(
            "grid overflow-hidden border-t border-white/10 bg-zinc-950 transition-[grid-template-rows]",
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0">
            <NavigationContent
              email={email}
              pathname={pathname}
              onNavigate={() => setIsOpen(false)}
              compact
            />
          </div>
        </div>
      </header>

      <aside className="hidden border-r border-white/10 bg-zinc-900 lg:block lg:min-h-screen">
        <NavigationContent email={email} pathname={pathname} />
      </aside>
    </>
  );
}

function NavigationContent({
  email,
  pathname,
  onNavigate,
  compact = false,
}: {
  email?: string | null;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={clsx("flex h-full flex-col gap-5", compact ? "p-4" : "p-6")}>
      <div className={compact ? "hidden" : undefined}>
        <Link href="/dashboard" className="block" onClick={onNavigate}>
          <p className="text-sm font-medium text-cyan-300">개인 구독 관리</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Subscription Manager
          </h1>
        </Link>
        <p className="mt-2 truncate text-sm text-zinc-500">{email}</p>
      </div>

      {compact && email ? (
        <p className="truncate text-sm text-zinc-500">{email}</p>
      ) : null}

      <nav className="grid gap-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                isActive
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <form action="/auth/signout" method="post" className="mt-auto">
        <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-200">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          로그아웃
        </button>
      </form>
    </div>
  );
}
