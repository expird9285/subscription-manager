import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

const navigation = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/subscriptions", label: "구독 목록", icon: CreditCard },
  { href: "/subscriptions/new", label: "구독 추가", icon: Plus },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/settings", label: "설정", icon: Settings },
];

export function AppShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/10 bg-zinc-900 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-5 p-4 lg:p-6">
          <div>
            <Link href="/dashboard" className="block">
              <p className="text-sm font-medium text-cyan-300">개인 구독 관리</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">
                Subscription Manager
              </h1>
            </Link>
            <p className="mt-2 truncate text-sm text-zinc-500">{user.email}</p>
          </div>

          <nav className="grid gap-1 sm:grid-cols-5 lg:grid-cols-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-50"
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
      </aside>

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
