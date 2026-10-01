import { getState, setState } from "../db/state";
import { formatMoney, normalizeCurrency, toNumber } from "./subscriptions";

const STATE_KEY = "exchange_rates";
const RATES_URL = "https://api.frankfurter.dev/v1/latest";
const FETCH_TIMEOUT_MS = 3000;
const REFRESH_AFTER_MS = 6 * 60 * 60 * 1000;

/** Rough KRW values used only when no live snapshot has ever been fetched. */
const FALLBACK_KRW_PER_UNIT: Record<string, number> = {
  USD: 1365,
  EUR: 1480,
  JPY: 9.4,
  GBP: 1725,
  CAD: 1000,
  AUD: 910,
  CNY: 190,
};

export type ExchangeRates = {
  /** Reference date of the rates (YYYY-MM-DD). */
  date: string;
  /** How many KRW one unit of each currency is worth. */
  krwPerUnit: Record<string, number>;
  source: "live" | "fallback";
  fetchedAt: string | null;
};

type FrankfurterResponse = {
  base?: string;
  date?: string;
  rates?: Record<string, number>;
};

export function fallbackRates(date = new Date().toISOString().slice(0, 10)): ExchangeRates {
  return { date, krwPerUnit: { ...FALLBACK_KRW_PER_UNIT }, source: "fallback", fetchedAt: null };
}

/** Fetches EUR-based rates (better precision than KRW-based) and converts them to KRW per unit. */
export async function fetchLatestRates(): Promise<ExchangeRates> {
  const response = await fetch(RATES_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Exchange rate request failed: ${response.status}`);
  }

  const data = (await response.json()) as FrankfurterResponse;
  const base = normalizeCurrency(data.base ?? "EUR");
  const rates: Record<string, number> = { ...(data.rates ?? {}), [base]: 1 };
  const krwPerBase = Number(rates.KRW);

  if (!Number.isFinite(krwPerBase) || krwPerBase <= 0) {
    throw new Error("Exchange rate response did not include KRW");
  }

  const krwPerUnit: Record<string, number> = {};
  for (const [currency, rate] of Object.entries(rates)) {
    const perBase = Number(rate);
    if (Number.isFinite(perBase) && perBase > 0 && currency.toUpperCase() !== "KRW") {
      krwPerUnit[currency.toUpperCase()] = krwPerBase / perBase;
    }
  }

  return {
    date: data.date ?? new Date().toISOString().slice(0, 10),
    krwPerUnit,
    source: "live",
    fetchedAt: new Date().toISOString(),
  };
}

export async function refreshExchangeRates(db: D1Database) {
  const rates = await fetchLatestRates();
  await setState(db, STATE_KEY, rates);
  return rates;
}

function isStale(rates: ExchangeRates) {
  return !rates.fetchedAt || Date.now() - Date.parse(rates.fetchedAt) > REFRESH_AFTER_MS;
}

export async function refreshExchangeRatesIfStale(db: D1Database) {
  const stored = await getState<ExchangeRates>(db, STATE_KEY);
  if (stored && !isStale(stored.value)) {
    return stored.value;
  }
  return refreshExchangeRates(db);
}

/**
 * Reads the stored snapshot (refreshed hourly by the cron trigger). Page renders never
 * block on the external API unless no snapshot exists yet.
 */
export async function getExchangeRates(
  db: D1Database,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<ExchangeRates> {
  const stored = await getState<ExchangeRates>(db, STATE_KEY).catch(() => null);

  if (stored) {
    if (isStale(stored.value) && waitUntil) {
      waitUntil(refreshExchangeRates(db).catch(() => undefined));
    }
    return stored.value;
  }

  try {
    return await refreshExchangeRates(db);
  } catch {
    return fallbackRates();
  }
}

export function convertToKrw(amount: number, currency: string, rates: ExchangeRates) {
  const code = normalizeCurrency(currency);
  if (code === "KRW") {
    return amount;
  }
  const krwPerUnit = rates.krwPerUnit[code];
  return krwPerUnit ? amount * krwPerUnit : null;
}

export function formatKrwEstimate(amount: number, currency: string, rates: ExchangeRates) {
  if (normalizeCurrency(currency) === "KRW") {
    return null;
  }
  const estimated = convertToKrw(amount, currency, rates);
  return estimated === null ? "원화 환산 불가" : `예상 ${formatMoney(estimated, "KRW")}`;
}

export function convertTotalsToKrw(
  totals: Record<string, number>,
  rates: ExchangeRates,
  multiplier = 1,
) {
  return Object.entries(totals).reduce((sum, [currency, amount]) => {
    return sum + (convertToKrw(toNumber(amount) * multiplier, currency, rates) ?? 0);
  }, 0);
}

export function hasForeignCurrency(totals: Record<string, number>) {
  return Object.keys(totals).some((currency) => normalizeCurrency(currency) !== "KRW");
}

export function exchangeRateDetail(rates: ExchangeRates) {
  return rates.source === "live"
    ? `환율 기준일 ${rates.date}`
    : `환율 API 실패로 임시 환율 적용 (${rates.date})`;
}
