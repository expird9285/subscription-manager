// Calendar dates are handled as `YYYY-MM-DD` strings so results never depend on the
// runtime's timezone (Workers always run in UTC). "Today" is resolved in the configured
// TIMEZONE (default Asia/Seoul).

const DAY_MS = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function zonedParts(timeZone: string, now: Date) {
  const parts = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

export function todayIn(timeZone: string, now = new Date()) {
  return zonedParts(timeZone, now).date;
}

export function hourIn(timeZone: string, now = new Date()) {
  return zonedParts(timeZone, now).hour;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isIsoDate(value: string) {
  const match = ISO_DATE_RE.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toUtcMs(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Number of days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: string, to: string) {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function addDays(isoDate: string, days: number) {
  return fromUtcMs(toUtcMs(isoDate) + days * DAY_MS);
}

/** Adds calendar months, clamping to the last day of shorter months (Jan 31 + 1 → Feb 28). */
export function addMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return fromUtcMs(Date.UTC(year, month - 1 + months, Math.min(day, lastDay)));
}

export function monthKey(isoDate: string) {
  return isoDate.slice(0, 7);
}

/** `count` consecutive `YYYY-MM` keys starting with the month of `isoDate`. */
export function monthKeysFrom(isoDate: string, count: number) {
  const [year, month] = isoDate.split("-").map(Number) as [number, number];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    return fromUtcMs(date.getTime()).slice(0, 7);
  });
}

export function monthRange(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number) as [number, number];
  const start = fromUtcMs(Date.UTC(year, month - 1, 1));
  const end = fromUtcMs(Date.UTC(year, month, 0));
  return { start, end };
}

export function dueLabel(isoDate: string, today: string) {
  const diff = daysBetween(today, isoDate);
  if (diff === 0) {
    return "오늘 결제";
  }
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

export function formatDateTime(isoTimestamp: string | null | undefined, timeZone: string) {
  if (!isoTimestamp) {
    return null;
  }
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
