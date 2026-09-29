import type { Child, PropsWithChildren } from "hono/jsx";

import {
  convertTotalsToKrw,
  formatKrwEstimate,
  hasForeignCurrency,
  type ExchangeRates,
} from "../lib/exchange-rates";
import { formatMoney, formatTotals } from "../lib/subscriptions";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const inputClass =
  "h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/15";

export const textareaClass =
  "min-h-28 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/15";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "discord";

const buttonBase =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-cyan-400 text-zinc-950 hover:bg-cyan-300",
  secondary: "border border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
  danger: "bg-rose-500 text-white hover:bg-rose-400",
  ghost: "text-zinc-300 hover:bg-zinc-900",
  discord: "bg-indigo-500 text-white hover:bg-indigo-400",
};

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cx(buttonBase, buttonVariants[variant], extra);
}

export function Button({
  variant = "primary",
  class: className,
  type = "submit",
  title,
  children,
}: PropsWithChildren<{
  variant?: ButtonVariant;
  class?: string;
  type?: "submit" | "button";
  title?: string;
}>) {
  return (
    <button type={type} class={buttonClass(variant, className)} title={title}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  class: className,
  children,
}: PropsWithChildren<{ href: string; variant?: ButtonVariant; class?: string }>) {
  return (
    <a href={href} class={buttonClass(variant, className)}>
      {children}
    </a>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: Child;
}) {
  return (
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h2>
        {description ? (
          <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <label class="grid gap-2 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function MetricCard({ label, value, detail }: { label: string; value: Child; detail?: string }) {
  return (
    <div class="rounded-lg border border-white/10 bg-zinc-900/80 p-5 shadow-sm shadow-black/20">
      <p class="text-sm font-medium text-zinc-500">{label}</p>
      <div class="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">{value}</div>
      {detail ? <p class="mt-2 text-sm text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export type BadgeTone = "slate" | "emerald" | "amber" | "rose" | "sky";

const badgeTones: Record<BadgeTone, string> = {
  slate: "bg-zinc-800 text-zinc-300",
  emerald: "bg-emerald-400/10 text-emerald-200",
  amber: "bg-amber-400/10 text-amber-200",
  rose: "bg-rose-500/10 text-rose-200",
  sky: "bg-sky-400/10 text-sky-200",
};

export function Badge({ tone = "slate", children }: PropsWithChildren<{ tone?: BadgeTone }>) {
  return (
    <span class={cx("inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function Notice({ tone = "info", children }: PropsWithChildren<{ tone?: "info" | "error" }>) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      class={cx(
        "mb-4 rounded-md border px-3 py-2 text-sm font-medium",
        tone === "error"
          ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
          : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
      )}
    >
      {children}
    </div>
  );
}

export function Panel({ title, icon, children }: PropsWithChildren<{ title: string; icon?: Child }>) {
  return (
    <section class="rounded-lg border border-white/10 bg-zinc-900">
      <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h3 class="text-sm font-semibold text-zinc-50">{title}</h3>
        {icon ? <div class="text-zinc-500">{icon}</div> : null}
      </div>
      <div class="divide-y divide-white/10">{children}</div>
    </section>
  );
}

export function Empty({ message = "데이터가 없습니다." }: { message?: string }) {
  return <p class="px-5 py-8 text-sm text-zinc-500">{message}</p>;
}

/** Secondary line with the approximate KRW value of a foreign-currency amount. */
export function KrwEstimate({
  amount,
  currency,
  rates,
  class: className = "mt-1 block text-xs font-medium text-cyan-200",
}: {
  amount: number;
  currency: string;
  rates: ExchangeRates;
  class?: string;
}) {
  const estimate = formatKrwEstimate(amount, currency, rates);
  return estimate ? <span class={className}>{estimate}</span> : null;
}

/** Per-currency totals joined with " / ", plus a KRW estimate when foreign currencies are involved. */
export function MoneyTotals({
  totals,
  rates,
  multiplier = 1,
  stacked = false,
}: {
  totals: Record<string, number>;
  rates: ExchangeRates;
  multiplier?: number;
  stacked?: boolean;
}) {
  const formatted = formatTotals(totals, multiplier);
  return (
    <>
      {stacked ? formatted.map((value) => <div>{value}</div>) : <span>{formatted.join(" / ")}</span>}
      {hasForeignCurrency(totals) ? (
        <span
          class={cx(
            "block font-semibold text-cyan-200",
            stacked ? "mt-2 text-base" : "mt-1 text-xs font-medium",
          )}
        >
          예상 {formatMoney(convertTotalsToKrw(totals, rates, multiplier), "KRW")}
        </span>
      ) : null}
    </>
  );
}
