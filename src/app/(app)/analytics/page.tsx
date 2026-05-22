import { BarChart3, CalendarDays, Crown, PieChart } from "lucide-react";

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
  billingCycleLabels,
  categorySummary,
  formatMoney,
  formatTotals,
  liveStatuses,
  monthlyAmount,
  scheduledMonthlyTotals,
} from "@/lib/subscriptions";

export default async function AnalyticsPage() {
  const [subscriptions, exchangeRates] = await Promise.all([
    getSubscriptions(),
    getExchangeRates(),
  ]);
  const liveSubscriptions = subscriptions.filter((subscription) =>
    liveStatuses.includes(subscription.status),
  );
  const categories = categorySummary(subscriptions);
  const topExpensive = [...liveSubscriptions]
    .sort((a, b) => monthlyAmount(b) - monthlyAmount(a))
    .slice(0, 5);
  const cycleTotals = Object.entries(
    liveSubscriptions.reduce<Record<string, Record<string, number>>>(
      (totals, subscription) => {
        const cycle = billingCycleLabels[subscription.billing_cycle];
        const currency = subscription.currency || "KRW";
        totals[cycle] ??= {};
        totals[cycle][currency] =
          (totals[cycle][currency] ?? 0) + monthlyAmount(subscription);
        return totals;
      },
      {},
    ),
  );
  const scheduled = scheduledMonthlyTotals(subscriptions, 6);
  const cancelPending = subscriptions.filter(
    (subscription) => subscription.status === "cancel_pending",
  );
  const rateDetail = exchangeRateDetail(exchangeRates);

  return (
    <>
      <PageHeader
        title="분석"
        description="카테고리, 결제 주기, 고비용 구독, 월별 결제 예정 금액을 내 부담 기준으로 확인합니다."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="분석 대상" value={`${liveSubscriptions.length}개`} />
        <MetricCard
          label="카테고리 수"
          value={`${categories.length}개`}
          detail="미분류 포함"
        />
        <MetricCard
          label="해지 예정"
          value={`${cancelPending.length}개`}
          detail={cancelPending[0]?.name ?? "해지 예정 없음"}
        />
        <MetricCard
          label="최고 월 부담"
          value={
            topExpensive[0]
              ? (
                  <div>
                    {formatMoney(
                      monthlyAmount(topExpensive[0]),
                      topExpensive[0].currency,
                    )}
                    <KrwEstimate
                      amount={monthlyAmount(topExpensive[0])}
                      currency={topExpensive[0].currency}
                      exchangeRates={exchangeRates}
                    />
                  </div>
                )
              : formatMoney(0)
          }
          detail={topExpensive[0] ? `${topExpensive[0].name} · ${rateDetail}` : rateDetail}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="카테고리별 월 부담" icon={<PieChart className="h-4 w-4" />}>
          {categories.length ? (
            categories.map((item) => (
              <Row
                key={item.category}
                label={item.category}
                value={
                  <MoneyValue totals={item.totals} exchangeRates={exchangeRates} />
                }
              />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="월 부담 TOP 5" icon={<Crown className="h-4 w-4" />}>
          {topExpensive.length ? (
            topExpensive.map((subscription, index) => (
              <Row
                key={subscription.id}
                label={`${index + 1}. ${subscription.name}`}
                value={formatMoney(
                  monthlyAmount(subscription),
                  subscription.currency,
                )}
                detail={formatKrwEstimate(
                  monthlyAmount(subscription),
                  subscription.currency,
                  exchangeRates,
                )}
              />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="결제 주기별 월 부담" icon={<BarChart3 className="h-4 w-4" />}>
          {cycleTotals.length ? (
            cycleTotals.map(([cycle, totals]) => (
              <Row
                key={cycle}
                label={cycle}
                value={<MoneyValue totals={totals} exchangeRates={exchangeRates} />}
              />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel
          title="월별 결제 예정 부담"
          icon={<CalendarDays className="h-4 w-4" />}
        >
          {scheduled.map((item) => (
            <Row
              key={item.key}
              label={item.key}
              value={<MoneyValue totals={item.totals} exchangeRates={exchangeRates} />}
            />
          ))}
        </Panel>
      </section>

      <section className="mt-6 rounded-lg border border-white/10 bg-zinc-900">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-50">
            해지 예정 서비스
          </h3>
        </div>
        <div className="divide-y divide-white/10">
          {cancelPending.length ? (
            cancelPending.map((subscription) => (
              <div
                key={subscription.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-50">
                    {subscription.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {subscription.memo || "메모 없음"}
                  </p>
                </div>
                <Badge tone="amber">해지 예정</Badge>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </div>
      </section>
    </>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h3 className="text-sm font-semibold text-zinc-50">{title}</h3>
        <div className="text-zinc-500">{icon}</div>
      </div>
      <div className="divide-y divide-white/10">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="truncate text-sm font-medium text-zinc-300">
        {label}
      </span>
      <span className="shrink-0 text-right text-sm font-semibold text-zinc-50">
        {value}
        {detail ? (
          <span className="mt-1 block text-xs font-medium text-cyan-200">
            {detail}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function Empty() {
  return <p className="px-5 py-8 text-sm text-zinc-500">데이터가 없습니다.</p>;
}

function MoneyValue({
  totals,
  exchangeRates,
}: {
  totals: Record<string, number>;
  exchangeRates: Awaited<ReturnType<typeof getExchangeRates>>;
}) {
  return (
    <>
      <span>{formatTotals(totals).join(" / ")}</span>
      {hasForeignCurrency(totals) ? (
        <span className="mt-1 block text-xs font-medium text-cyan-200">
          예상 {formatMoney(convertTotalsToKrw(totals, exchangeRates), "KRW")}
        </span>
      ) : null}
    </>
  );
}

function KrwEstimate({
  amount,
  currency,
  exchangeRates,
}: {
  amount: number;
  currency: string;
  exchangeRates: Awaited<ReturnType<typeof getExchangeRates>>;
}) {
  const estimate = formatKrwEstimate(amount, currency, exchangeRates);
  return estimate ? (
    <span className="mt-1 block text-base font-semibold text-cyan-200">
      {estimate}
    </span>
  ) : null;
}
