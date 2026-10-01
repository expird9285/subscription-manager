import { daysBetween, monthKeysFrom } from "./dates";
import type {
  BillingCycle,
  Subscription,
  SubscriptionStatus,
} from "./types";

export const billingCycleLabels: Record<BillingCycle, string> = {
  monthly: "월간",
  yearly: "연간",
  quarterly: "분기",
  weekly: "주간",
  custom: "직접",
};

export const statusLabels: Record<SubscriptionStatus, string> = {
  active: "활성",
  paused: "일시중지",
  cancel_pending: "해지 예정",
  cancelled: "해지됨",
  trial: "체험",
};

/** Statuses that still cost money and count towards spending totals. */
export const liveStatuses: readonly SubscriptionStatus[] = ["active", "trial", "cancel_pending"];

/** Statuses that receive billing alerts. */
export const alertStatuses: readonly SubscriptionStatus[] = ["active", "trial"];

export const UNCATEGORIZED = "미분류";

type Totals = Record<string, number>;

export function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isLive(subscription: Pick<Subscription, "status">) {
  return liveStatuses.includes(subscription.status);
}

export function splitCount(subscription: Pick<Subscription, "split_count">) {
  const count = Number(subscription.split_count ?? 1);
  return Number.isInteger(count) && count >= 1 ? count : 1;
}

/** The user's own share of one billing. */
export function sharedPrice(subscription: Pick<Subscription, "price" | "split_count">) {
  return toNumber(subscription.price) / splitCount(subscription);
}

export function hasCostSplit(subscription: Pick<Subscription, "split_count">) {
  return splitCount(subscription) > 1;
}

export function splitLabel(subscription: Pick<Subscription, "split_count">) {
  const count = splitCount(subscription);
  return count > 1 ? `1/${count} 부담` : "혼자 부담";
}

/** The user's own share normalised to a monthly amount. */
export function monthlyAmount(
  subscription: Pick<Subscription, "price" | "billing_cycle" | "split_count">,
) {
  const price = sharedPrice(subscription);

  switch (subscription.billing_cycle) {
    case "yearly":
      return price / 12;
    case "quarterly":
      return price / 3;
    case "weekly":
      return (price * 52) / 12;
    case "monthly":
    case "custom":
    default:
      return price;
  }
}

export function normalizeCurrency(currency?: string | null) {
  return (currency || "KRW").trim().toUpperCase();
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = "KRW") {
  const code = normalizeCurrency(currency);
  let formatter = moneyFormatters.get(code);

  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: code,
        maximumFractionDigits: code === "KRW" || code === "JPY" ? 0 : 2,
      });
    } catch {
      return `${amount.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} ${code}`;
    }
    moneyFormatters.set(code, formatter);
  }

  return formatter.format(amount);
}

export function formatTotals(totals: Totals, multiplier = 1) {
  const entries = Object.entries(totals);

  if (!entries.length) {
    return [formatMoney(0, "KRW")];
  }

  return entries.map(([currency, amount]) => formatMoney(amount * multiplier, currency));
}

function addTo(totals: Totals, currency: string, amount: number) {
  const code = normalizeCurrency(currency);
  totals[code] = (totals[code] ?? 0) + amount;
  return totals;
}

export function isDueWithin(subscription: Subscription, days: number, today: string) {
  const diff = daysBetween(today, subscription.next_billing_date);
  return (
    alertStatuses.includes(subscription.status) &&
    subscription.auto_renew &&
    diff >= 0 &&
    diff <= days
  );
}

export function groupMonthlyTotalsByCurrency(subscriptions: Subscription[]) {
  return subscriptions
    .filter(isLive)
    .reduce<Totals>((totals, item) => addTo(totals, item.currency, monthlyAmount(item)), {});
}

export function summarizeDashboard(subscriptions: Subscription[], today: string) {
  const liveSubscriptions = subscriptions.filter(isLive);
  const dueSoon = subscriptions
    .filter((subscription) => isDueWithin(subscription, 7, today))
    .sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date));

  return {
    activeCount: subscriptions.filter((subscription) => subscription.status === "active").length,
    liveSubscriptions,
    dueSoon,
    nearestDue: dueSoon[0] ?? null,
    monthlyTotals: groupMonthlyTotalsByCurrency(subscriptions),
  };
}

function sumTotals(totals: Totals) {
  return Object.values(totals).reduce((sum, value) => sum + value, 0);
}

function groupBy(
  subscriptions: Subscription[],
  keyOf: (subscription: Subscription) => string,
) {
  return Object.entries(
    subscriptions.filter(isLive).reduce<Record<string, Totals>>((groups, subscription) => {
      const key = keyOf(subscription);
      groups[key] = addTo(groups[key] ?? {}, subscription.currency, monthlyAmount(subscription));
      return groups;
    }, {}),
  );
}

export function categorySummary(subscriptions: Subscription[]) {
  return groupBy(subscriptions, (item) => item.category?.trim() || UNCATEGORIZED)
    .map(([category, totals]) => ({ category, totals }))
    .sort((a, b) => sumTotals(b.totals) - sumTotals(a.totals));
}

export function billingCycleSummary(subscriptions: Subscription[]) {
  return groupBy(subscriptions, (item) => billingCycleLabels[item.billing_cycle]).map(
    ([cycle, totals]) => ({ cycle, totals }),
  );
}

/** The user's share of bills scheduled in each of the next `months` months. */
export function scheduledMonthlyTotals(subscriptions: Subscription[], today: string, months = 6) {
  const live = subscriptions.filter(isLive);

  return monthKeysFrom(today, months).map((key) => ({
    key,
    totals: live
      .filter((subscription) => subscription.next_billing_date.startsWith(key))
      .reduce<Totals>((acc, item) => addTo(acc, item.currency, sharedPrice(item)), {}),
  }));
}

export function categoriesOf(subscriptions: Subscription[]) {
  return Array.from(
    new Set(subscriptions.map((subscription) => subscription.category || UNCATEGORIZED)),
  ).sort((a, b) => a.localeCompare(b, "ko-KR"));
}

export const sortOptions = {
  next_billing_asc: "결제일 가까운 순",
  price_desc: "가격 높은 순",
  monthly_desc: "월 부담 높은 순",
  name_asc: "이름순",
} as const;

export type SortOption = keyof typeof sortOptions;

export type SubscriptionFilters = {
  query: string;
  category: string;
  status: string;
  billingCycle: string;
  sort: SortOption;
};

export function parseFilters(params: Record<string, string | undefined>): SubscriptionFilters {
  const sort = params.sort && params.sort in sortOptions ? (params.sort as SortOption) : "next_billing_asc";
  return {
    query: params.q?.trim() ?? "",
    category: params.category ?? "",
    status: params.status ?? "",
    billingCycle: params.billingCycle ?? "",
    sort,
  };
}

export function filterAndSortSubscriptions(
  subscriptions: Subscription[],
  filters: SubscriptionFilters,
) {
  const query = filters.query.toLowerCase();

  return subscriptions
    .filter((subscription) => {
      if (query && !subscription.name.toLowerCase().includes(query)) {
        return false;
      }
      if (filters.category && (subscription.category || UNCATEGORIZED) !== filters.category) {
        return false;
      }
      if (filters.status && subscription.status !== filters.status) {
        return false;
      }
      if (filters.billingCycle && subscription.billing_cycle !== filters.billingCycle) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (filters.sort) {
        case "price_desc":
          return toNumber(b.price) - toNumber(a.price);
        case "monthly_desc":
          return monthlyAmount(b) - monthlyAmount(a);
        case "name_asc":
          return a.name.localeCompare(b.name, "ko-KR");
        case "next_billing_asc":
        default:
          return a.next_billing_date.localeCompare(b.next_billing_date);
      }
    });
}
