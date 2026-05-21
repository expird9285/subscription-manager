import type {
  BillingCycle,
  Subscription,
  SubscriptionStatus,
} from "@/lib/database.types";

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

export const liveStatuses: SubscriptionStatus[] = [
  "active",
  "trial",
  "cancel_pending",
];

export const alertStatuses: SubscriptionStatus[] = ["active", "trial"];

export function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function monthlyAmount(subscription: Pick<Subscription, "price" | "billing_cycle">) {
  const price = toNumber(subscription.price);

  switch (subscription.billing_cycle) {
    case "monthly":
      return price;
    case "yearly":
      return price / 12;
    case "quarterly":
      return price / 3;
    case "weekly":
      return (price * 52) / 12;
    case "custom":
      return price;
    default:
      return 0;
  }
}

export function formatMoney(amount: number, currency = "KRW") {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(amount);
}

export function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntil(dateString: string, baseDate = new Date()) {
  const target = parseLocalDate(dateString);
  const base = startOfLocalDay(baseDate);
  const diff = target.getTime() - base.getTime();
  return Math.ceil(diff / 86_400_000);
}

export function dueLabel(dateString: string, baseDate = new Date()) {
  const diff = daysUntil(dateString, baseDate);

  if (diff === 0) {
    return "오늘 결제";
  }

  if (diff > 0) {
    return `D-${diff}`;
  }

  return `D+${Math.abs(diff)}`;
}

export function isDueWithin(subscription: Subscription, days: number) {
  const diff = daysUntil(subscription.next_billing_date);
  return (
    alertStatuses.includes(subscription.status) &&
    subscription.auto_renew &&
    diff >= 0 &&
    diff <= days
  );
}

export function groupMonthlyTotalsByCurrency(subscriptions: Subscription[]) {
  return subscriptions
    .filter((subscription) => liveStatuses.includes(subscription.status))
    .reduce<Record<string, number>>((totals, subscription) => {
      const currency = subscription.currency || "KRW";
      totals[currency] = (totals[currency] ?? 0) + monthlyAmount(subscription);
      return totals;
    }, {});
}

export function summarizeDashboard(subscriptions: Subscription[]) {
  const liveSubscriptions = subscriptions.filter((subscription) =>
    liveStatuses.includes(subscription.status),
  );
  const activeCount = subscriptions.filter(
    (subscription) => subscription.status === "active",
  ).length;
  const dueSoon = subscriptions
    .filter((subscription) => isDueWithin(subscription, 7))
    .sort(
      (a, b) =>
        parseLocalDate(a.next_billing_date).getTime() -
        parseLocalDate(b.next_billing_date).getTime(),
    );

  return {
    activeCount,
    liveSubscriptions,
    dueSoon,
    nearestDue: dueSoon[0] ?? null,
    monthlyTotals: groupMonthlyTotalsByCurrency(subscriptions),
  };
}

export function categorySummary(subscriptions: Subscription[]) {
  return Object.entries(
    subscriptions
      .filter((subscription) => liveStatuses.includes(subscription.status))
      .reduce<Record<string, Record<string, number>>>((totals, subscription) => {
        const category = subscription.category?.trim() || "미분류";
        const currency = subscription.currency || "KRW";
        totals[category] ??= {};
        totals[category][currency] =
          (totals[category][currency] ?? 0) + monthlyAmount(subscription);
        return totals;
      }, {}),
  )
    .map(([category, totals]) => ({ category, totals }))
    .sort((a, b) => {
      const aTotal = Object.values(a.totals).reduce((sum, value) => sum + value, 0);
      const bTotal = Object.values(b.totals).reduce((sum, value) => sum + value, 0);
      return bTotal - aTotal;
    });
}

export function formatTotals(totals: Record<string, number>, multiplier = 1) {
  const entries = Object.entries(totals);

  if (!entries.length) {
    return [formatMoney(0, "KRW")];
  }

  return entries.map(([currency, amount]) =>
    formatMoney(amount * multiplier, currency),
  );
}

export type SubscriptionFilters = {
  query?: string;
  category?: string;
  status?: string;
  billingCycle?: string;
  sort?: string;
};

export function filterAndSortSubscriptions(
  subscriptions: Subscription[],
  filters: SubscriptionFilters,
) {
  const query = filters.query?.trim().toLowerCase();

  const filtered = subscriptions.filter((subscription) => {
    if (query && !subscription.name.toLowerCase().includes(query)) {
      return false;
    }

    if (filters.category && (subscription.category || "미분류") !== filters.category) {
      return false;
    }

    if (filters.status && subscription.status !== filters.status) {
      return false;
    }

    if (filters.billingCycle && subscription.billing_cycle !== filters.billingCycle) {
      return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "price_desc":
        return toNumber(b.price) - toNumber(a.price);
      case "monthly_desc":
        return monthlyAmount(b) - monthlyAmount(a);
      case "name_asc":
        return a.name.localeCompare(b.name, "ko-KR");
      case "next_billing_asc":
      default:
        return (
          parseLocalDate(a.next_billing_date).getTime() -
          parseLocalDate(b.next_billing_date).getTime()
        );
    }
  });
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function scheduledMonthlyTotals(subscriptions: Subscription[], months = 6) {
  const start = startOfLocalDay();

  return Array.from({ length: months }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const key = monthKey(date);
    const totals = subscriptions
      .filter((subscription) => liveStatuses.includes(subscription.status))
      .filter((subscription) => subscription.next_billing_date.startsWith(key))
      .reduce<Record<string, number>>((acc, subscription) => {
        const currency = subscription.currency || "KRW";
        acc[currency] = (acc[currency] ?? 0) + toNumber(subscription.price);
        return acc;
      }, {});

    return { key, totals };
  });
}
