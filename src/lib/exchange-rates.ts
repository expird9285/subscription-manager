import "server-only";

import type { Subscription } from "@/lib/database.types";
import { formatMoney, toNumber } from "@/lib/subscriptions";

const TARGET_CURRENCY = "KRW";
const FALLBACK_RATES_TO_KRW: Record<string, number> = {
  USD: 1365,
  EUR: 1480,
  JPY: 9.4,
  GBP: 1725,
  CAD: 1000,
  AUD: 910,
  CNY: 190,
};

export type ExchangeRates = {
  base: typeof TARGET_CURRENCY;
  date: string;
  rates: Record<string, number>;
  source: "live" | "fallback";
};

type FrankfurterResponse = {
  date?: string;
  rates?: Record<string, number>;
};

function normalizeCurrency(currency?: string | null) {
  return (currency || TARGET_CURRENCY).trim().toUpperCase();
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${TARGET_CURRENCY}`,
      {
        next: { revalidate: 60 * 60 * 6 },
      },
    );

    if (!response.ok) {
      throw new Error(`Exchange rate request failed: ${response.status}`);
    }

    const data = (await response.json()) as FrankfurterResponse;
    const rates = Object.fromEntries(
      Object.entries(data.rates ?? {}).flatMap(([currency, rate]) => {
        const parsedRate = Number(rate);

        return Number.isFinite(parsedRate) && parsedRate > 0
          ? [[currency.toUpperCase(), parsedRate]]
          : [];
      }),
    );

    if (!Object.keys(rates).length) {
      throw new Error("Exchange rate response did not include rates");
    }

    return {
      base: TARGET_CURRENCY,
      date: data.date ?? new Date().toISOString().slice(0, 10),
      rates,
      source: "live",
    };
  } catch {
    return {
      base: TARGET_CURRENCY,
      date: new Date().toISOString().slice(0, 10),
      rates: Object.fromEntries(
        Object.entries(FALLBACK_RATES_TO_KRW).map(([currency, krwPerUnit]) => [
          currency,
          1 / krwPerUnit,
        ]),
      ),
      source: "fallback",
    };
  }
}

export function convertToKrw(amount: number, currency: string, rates: ExchangeRates) {
  const normalizedCurrency = normalizeCurrency(currency);

  if (normalizedCurrency === TARGET_CURRENCY) {
    return amount;
  }

  const krwToCurrencyRate = rates.rates[normalizedCurrency];

  if (!krwToCurrencyRate) {
    return null;
  }

  return amount / krwToCurrencyRate;
}

export function formatKrwEstimate(
  amount: number,
  currency: string,
  rates: ExchangeRates,
) {
  const normalizedCurrency = normalizeCurrency(currency);

  if (normalizedCurrency === TARGET_CURRENCY) {
    return null;
  }

  const estimated = convertToKrw(amount, normalizedCurrency, rates);

  if (estimated === null) {
    return "원화 환산 불가";
  }

  return `예상 ${formatMoney(estimated, TARGET_CURRENCY)}`;
}

export function convertTotalsToKrw(
  totals: Record<string, number>,
  rates: ExchangeRates,
  multiplier = 1,
) {
  return Object.entries(totals).reduce((sum, [currency, amount]) => {
    const converted = convertToKrw(toNumber(amount) * multiplier, currency, rates);
    return sum + (converted ?? 0);
  }, 0);
}

export function hasForeignCurrency(totals: Record<string, number>) {
  return Object.keys(totals).some(
    (currency) => normalizeCurrency(currency) !== TARGET_CURRENCY,
  );
}

export function exchangeRateDetail(rates: ExchangeRates) {
  return rates.source === "live"
    ? `환율 기준일 ${rates.date}`
    : `환율 API 실패로 임시 환율 적용 (${rates.date})`;
}

export function subscriptionKrwEstimate(
  subscription: Pick<Subscription, "price" | "currency">,
  rates: ExchangeRates,
) {
  return formatKrwEstimate(toNumber(subscription.price), subscription.currency, rates);
}
