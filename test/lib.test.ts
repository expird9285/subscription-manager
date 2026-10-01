import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addDays,
  daysBetween,
  dueLabel,
  hourIn,
  isIsoDate,
  monthKeysFrom,
  monthRange,
  todayIn,
} from "../src/lib/dates";
import {
  convertToKrw,
  convertTotalsToKrw,
  fetchLatestRates,
  formatKrwEstimate,
  type ExchangeRates,
} from "../src/lib/exchange-rates";
import {
  categorySummary,
  filterAndSortSubscriptions,
  formatMoney,
  isDueWithin,
  monthlyAmount,
  parseFilters,
  scheduledMonthlyTotals,
  sharedPrice,
  splitLabel,
} from "../src/lib/subscriptions";
import type { Subscription } from "../src/lib/types";
import { parseSubscriptionForm, safeRedirectPath } from "../src/lib/validation";

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: crypto.randomUUID(),
    user_id: "user",
    name: "Netflix",
    category: "영상",
    price: 17000,
    split_count: 1,
    currency: "KRW",
    billing_cycle: "monthly",
    next_billing_date: "2026-10-01",
    payment_method: null,
    payment_card_id: null,
    collection_account_id: null,
    share_token: null,
    status: "active",
    auto_renew: true,
    memo: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("dates", () => {
  it("resolves today and the hour in the configured timezone, not UTC", () => {
    const now = new Date("2026-09-28T15:30:00Z"); // 00:30 on the 29th in Seoul
    expect(todayIn("Asia/Seoul", now)).toBe("2026-09-29");
    expect(todayIn("UTC", now)).toBe("2026-09-28");
    expect(hourIn("Asia/Seoul", now)).toBe(0);
    expect(hourIn("Asia/Seoul", new Date("2026-09-29T00:00:00Z"))).toBe(9);
  });

  it("does calendar arithmetic on ISO dates", () => {
    expect(daysBetween("2026-09-29", "2026-10-06")).toBe(7);
    expect(daysBetween("2026-10-06", "2026-09-29")).toBe(-7);
    expect(addDays("2026-12-29", 7)).toBe("2027-01-05");
    expect(monthKeysFrom("2026-11-15", 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(monthRange("2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(dueLabel("2026-09-29", "2026-09-29")).toBe("오늘 결제");
    expect(dueLabel("2026-10-02", "2026-09-29")).toBe("D-3");
    expect(dueLabel("2026-09-27", "2026-09-29")).toBe("D+2");
  });

  it("validates real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
  });
});

describe("subscription math", () => {
  it("splits cost and normalises billing cycles to a monthly share", () => {
    const shared = subscription({ price: 12000, split_count: 4, billing_cycle: "yearly" });
    expect(sharedPrice(shared)).toBe(3000);
    expect(monthlyAmount(shared)).toBe(250);
    expect(splitLabel(shared)).toBe("1/4 부담");
    expect(monthlyAmount(subscription({ price: 1200, billing_cycle: "weekly" }))).toBe(5200);
    expect(monthlyAmount(subscription({ price: 3000, billing_cycle: "quarterly" }))).toBe(1000);
  });

  it("only treats active/trial auto-renewing subscriptions as due", () => {
    const today = "2026-09-29";
    expect(isDueWithin(subscription({ next_billing_date: "2026-10-06" }), 7, today)).toBe(true);
    expect(isDueWithin(subscription({ next_billing_date: "2026-10-07" }), 7, today)).toBe(false);
    expect(isDueWithin(subscription({ next_billing_date: "2026-10-01", auto_renew: false }), 7, today)).toBe(false);
    expect(isDueWithin(subscription({ next_billing_date: "2026-10-01", status: "paused" }), 7, today)).toBe(false);
  });

  it("groups categories and scheduled months by currency", () => {
    const items = [
      subscription({ category: "영상", price: 10000 }),
      subscription({ category: "영상", price: 10, currency: "USD", next_billing_date: "2026-11-03" }),
      subscription({ category: null, price: 5000, status: "cancelled" }),
    ];
    expect(categorySummary(items)).toEqual([{ category: "영상", totals: { KRW: 10000, USD: 10 } }]);
    const scheduled = scheduledMonthlyTotals(items, "2026-09-29", 3);
    expect(scheduled.map((item) => item.key)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(scheduled[1]?.totals).toEqual({ KRW: 10000 });
    expect(scheduled[2]?.totals).toEqual({ USD: 10 });
  });

  it("filters and sorts the list", () => {
    const items = [
      subscription({ name: "B", price: 1000, next_billing_date: "2026-10-05" }),
      subscription({ name: "A", price: 5000, next_billing_date: "2026-10-01", status: "paused" }),
    ];
    const byPrice = filterAndSortSubscriptions(items, parseFilters({ sort: "price_desc" }));
    expect(byPrice.map((item) => item.name)).toEqual(["A", "B"]);
    const paused = filterAndSortSubscriptions(items, parseFilters({ status: "paused" }));
    expect(paused.map((item) => item.name)).toEqual(["A"]);
    expect(parseFilters({ sort: "bogus" }).sort).toBe("next_billing_asc");
  });

  it("formats money and falls back for unknown currency codes", () => {
    expect(formatMoney(17000, "KRW")).toBe("₩17,000");
    expect(formatMoney(9.99, "USD")).toContain("9.99");
    expect(formatMoney(5, "BOGUS")).toBe("5 BOGUS");
  });
});

describe("form validation", () => {
  it("parses a valid form", () => {
    const result = parseSubscriptionForm({
      name: "  Spotify ",
      price: "10.999",
      split_count: "2",
      currency: "usd",
      billing_cycle: "monthly",
      next_billing_date: "2026-10-10",
      status: "trial",
      auto_renew: "on",
      memo: "",
    });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        name: "Spotify",
        price: 11,
        split_count: 2,
        currency: "USD",
        status: "trial",
        auto_renew: true,
        memo: null,
        category: null,
      }),
    });
  });

  it("collects every validation error", () => {
    const result = parseSubscriptionForm({
      name: "",
      price: "-1",
      split_count: "0",
      currency: "WON!",
      billing_cycle: "daily",
      next_billing_date: "2026-02-30",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(6);
    }
  });

  it("only allows same-site redirect paths", () => {
    expect(safeRedirectPath("/subscriptions?q=a")).toBe("/subscriptions?q=a");
    expect(safeRedirectPath("//evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(safeRedirectPath(undefined, "/x")).toBe("/x");
  });
});

describe("exchange rates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const rates: ExchangeRates = {
    date: "2026-09-28",
    krwPerUnit: { USD: 1400, JPY: 9.5 },
    source: "live",
    fetchedAt: null,
  };

  it("converts to KRW", () => {
    expect(convertToKrw(10, "usd", rates)).toBe(14000);
    expect(convertToKrw(10, "KRW", rates)).toBe(10);
    expect(convertToKrw(10, "CHF", rates)).toBeNull();
    expect(convertTotalsToKrw({ USD: 1, KRW: 100 }, rates, 12)).toBe(16800 + 1200);
    expect(formatKrwEstimate(1, "USD", rates)).toBe("예상 ₩1,400");
    expect(formatKrwEstimate(1, "CHF", rates)).toBe("원화 환산 불가");
    expect(formatKrwEstimate(1, "KRW", rates)).toBeNull();
  });

  it("derives KRW-per-unit values from EUR-based Frankfurter rates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ base: "EUR", date: "2026-09-28", rates: { KRW: 1500, USD: 1.25, JPY: 160 } }),
    );
    const result = await fetchLatestRates();
    expect(result.source).toBe("live");
    expect(result.krwPerUnit.EUR).toBe(1500);
    expect(result.krwPerUnit.USD).toBe(1200);
    expect(result.krwPerUnit.JPY).toBeCloseTo(9.375);
    expect(result.krwPerUnit.KRW).toBeUndefined();
  });
});
