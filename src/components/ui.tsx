import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-cyan-400 text-zinc-950 hover:bg-cyan-300",
        variant === "secondary" &&
          "border border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
        variant === "danger" && "bg-rose-500 text-white hover:bg-rose-400",
        variant === "ghost" && "text-zinc-300 hover:bg-zinc-900",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<"a"> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <a
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
        variant === "primary" &&
          "bg-cyan-400 text-zinc-950 hover:bg-cyan-300",
        variant === "secondary" &&
          "border border-white/10 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-10 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/15";

export const textareaClass =
  "min-h-28 rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-400/15";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/80 p-5 shadow-sm shadow-black/20">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50">
        {value}
      </div>
      {detail ? <p className="mt-2 text-sm text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "sky";
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold",
        tone === "slate" && "bg-zinc-800 text-zinc-300",
        tone === "emerald" && "bg-emerald-400/10 text-emerald-200",
        tone === "amber" && "bg-amber-400/10 text-amber-200",
        tone === "rose" && "bg-rose-500/10 text-rose-200",
        tone === "sky" && "bg-sky-400/10 text-sky-200",
      )}
    >
      {children}
    </span>
  );
}
