import { CalendarClock, Plus } from "lucide-react";
import Link from "next/link";

import { Badge, MetricCard, PageHeader } from "@/components/ui";
import { getSubscriptions } from "@/lib/dal";
import {
  convertTotalsToKrw,
  exchangeRateDetail,
  formatKrwEstimate,
  getExchangeRates,
  hasForeignCurrency,
} from "@/lib/exchange-rates";
import {
  categorySummary,
  dueLabel,
  formatMoney,
  formatTotals,
  hasCostSplit,
  monthlyAmount,
  sharedPrice,
  splitLabel,
  summarizeDashboard,
} from "@/lib/subscriptions";

export default async function DashboardPage() {
  const [subscriptions, exchangeRates] = await Promise.all([
    getSubscriptions(),
    getExchangeRates(),
  ]);
  const summary = summarizeDashboard(subscriptions);
  const categories = categorySummary(subscriptions).slice(0, 6);
  const rateDetail = exchangeRateDetail(exchangeRates);

  return (
    <>
      <PageHeader
        title="대시보드"
        description="월/연간 내 부담 지출, 다음 결제일, 결제 임박 항목을 한 화면에서 확인합니다."
        action={
          <Link
            href="/subscriptions/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            구독 추가
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="이번 달 구독 지출"
          value={
            <MoneyTotal
              totals={summary.monthlyTotals}
              exchangeRates={exchangeRates}
            />
          }
          detail={`내 부담 기준 · 활성, 체험, 해지 예정 포함 · ${rateDetail}`}
        />
        <MetricCard
          label="연간 예상 지출"
          value={
            <MoneyTotal
              totals={summary.monthlyTotals}
              multiplier={12}
              exchangeRates={exchangeRates}
            />
          }
        />
        <MetricCard label="활성 구독 수" value={`${summary.activeCount}개`} />
        <MetricCard
          label="7일 내 결제 예정"
          value={`${summary.dueSoon.length}개`}
          detail={
            summary.nearestDue
              ? `${summary.nearestDue.name} ${dueLabel(summary.nearestDue.next_billing_date)}`
              : "결제 임박 항목 없음"
          }
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-lg border border-white/10 bg-zinc-900">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h3 className="text-sm font-semibold text-zinc-50">
              곧 결제될 구독
            </h3>
            <CalendarClock className="h-4 w-4 text-zinc-500" aria-hidden="true" />
          </div>
          <div className="divide-y divide-white/10">
            {summary.dueSoon.length ? (
              summary.dueSoon.map((subscription) => (
                <div
                  key={subscription.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-zinc-50">
                      {subscription.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {subscription.next_billing_date} ·{" "}
                      {formatMoney(subscription.price, subscription.currency)}
                    </p>
                    {hasCostSplit(subscription) ? (
                      <p className="mt-1 text-xs font-medium text-zinc-400">
                        내 부담{" "}
                        {formatMoney(sharedPrice(subscription), subscription.currency)} ·{" "}
                        {splitLabel(subscription)}
                      </p>
                    ) : null}
                    <KrwEstimate
                      amount={sharedPrice(subscription)}
                      currency={subscription.currency}
                      exchangeRates={exchangeRates}
                    />
                  </div>
                  <Badge tone="amber">
                    {dueLabel(subscription.next_billing_date)}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-zinc-500">
                7일 내 결제 예정 구독이 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-900">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="text-sm font-semibold text-zinc-50">
              카테고리별 월 지출
            </h3>
          </div>
          <div className="divide-y divide-white/10">
            {categories.length ? (
              categories.map((category) => (
                <div
                  key={category.category}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <span className="text-sm font-medium text-zinc-300">
                    {category.category}
                  </span>
                  <span className="text-right text-sm font-semibold text-zinc-50">
                    <span>{formatTotals(category.totals).join(" / ")}</span>
                    {hasForeignCurrency(category.totals) ? (
                      <span className="mt-1 block text-xs font-medium text-cyan-200">
                        예상{" "}
                        {formatMoney(
                          convertTotalsToKrw(category.totals, exchangeRates),
                          "KRW",
                        )}
                      </span>
                    ) : null}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-zinc-500">
                집계할 구독이 없습니다.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-white/10 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-zinc-50">월 부담 상세</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.liveSubscriptions.slice(0, 9).map((subscription) => (
            <div
              key={subscription.id}
              className="flex items-center justify-between rounded-md bg-zinc-950 px-3 py-3"
            >
              <span className="truncate text-sm font-medium text-zinc-300">
                {subscription.name}
              </span>
              <span className="text-sm font-semibold text-zinc-50">
                {formatMoney(monthlyAmount(subscription), subscription.currency)}
                <KrwEstimate
                  amount={monthlyAmount(subscription)}
                  currency={subscription.currency}
                  exchangeRates={exchangeRates}
                  align="right"
                />
                {hasCostSplit(subscription) ? (
                  <span className="mt-1 block text-right text-xs font-medium text-zinc-500">
                    {splitLabel(subscription)}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function MoneyTotal({
  totals,
  exchangeRates,
  multiplier = 1,
}: {
  totals: Record<string, number>;
  exchangeRates: Awaited<ReturnType<typeof getExchangeRates>>;
  multiplier?: number;
}) {
  return (
    <div>
      {formatTotals(totals, multiplier).map((value) => (
        <div key={value}>{value}</div>
      ))}
      {hasForeignCurrency(totals) ? (
        <div className="mt-2 text-base font-semibold text-cyan-200">
          예상 {formatMoney(convertTotalsToKrw(totals, exchangeRates, multiplier), "KRW")}
        </div>
      ) : null}
    </div>
  );
}

function KrwEstimate({
  amount,
  currency,
  exchangeRates,
  align = "left",
}: {
  amount: number | string;
  currency: string;
  exchangeRates: Awaited<ReturnType<typeof getExchangeRates>>;
  align?: "left" | "right";
}) {
  const estimate = formatKrwEstimate(Number(amount), currency, exchangeRates);

  if (!estimate) {
    return null;
  }

  return (
    <span
      className={`mt-1 block text-xs font-medium text-cyan-200 ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {estimate}
    </span>
  );
}
