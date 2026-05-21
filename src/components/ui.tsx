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
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
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
          "bg-emerald-600 text-white hover:bg-emerald-700",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100",
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
          "bg-emerald-600 text-white hover:bg-emerald-700",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
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
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export const textareaClass =
  "min-h-28 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </div>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
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
        tone === "slate" && "bg-slate-100 text-slate-700",
        tone === "emerald" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "rose" && "bg-rose-50 text-rose-700",
        tone === "sky" && "bg-sky-50 text-sky-700",
      )}
    >
      {children}
    </span>
  );
}
