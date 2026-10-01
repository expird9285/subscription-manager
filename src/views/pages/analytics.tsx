import type { Child } from "hono/jsx";

import { exchangeRateDetail, formatKrwEstimate, type ExchangeRates } from "../../lib/exchange-rates";
import {
  billingCycleSummary,
  categorySummary,
  formatMoney,
  isLive,
  monthlyAmount,
  scheduledMonthlyTotals,
} from "../../lib/subscriptions";
import type { Subscription } from "../../lib/types";
import { CalendarDays, ChartColumn, ChartPie, Crown, Icon } from "../icons";
import { Badge, Empty, KrwEstimate, MetricCard, MoneyTotals, PageHeader, Panel } from "../ui";

function Row({ label, value, detail }: { label: string; value: Child; detail?: string | null }) {
  return (
    <div class="flex items-center justify-between gap-4 px-5 py-4">
      <span class="truncate text-sm font-medium text-zinc-300">{label}</span>
      <span class="shrink-0 text-right text-sm font-semibold text-zinc-50">
        {value}
        {detail ? <span class="mt-1 block text-xs font-medium text-cyan-200">{detail}</span> : null}
      </span>
    </div>
  );
}

export function AnalyticsPage({
  subscriptions,
  rates,
  today,
}: {
  subscriptions: Subscription[];
  rates: ExchangeRates;
  today: string;
}) {
  const liveSubscriptions = subscriptions.filter(isLive);
  const categories = categorySummary(subscriptions);
  const cycles = billingCycleSummary(subscriptions);
  const topExpensive = [...liveSubscriptions]
    .sort((a, b) => monthlyAmount(b) - monthlyAmount(a))
    .slice(0, 5);
  const scheduled = scheduledMonthlyTotals(subscriptions, today, 6);
  const cancelPending = subscriptions.filter((subscription) => subscription.status === "cancel_pending");
  const rateDetail = exchangeRateDetail(rates);
  const top = topExpensive[0];

  return (
    <>
      <PageHeader
        title="분석"
        description="카테고리, 결제 주기, 고비용 구독, 월별 결제 예정 금액을 내 부담 기준으로 확인합니다."
      />

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="분석 대상" value={`${liveSubscriptions.length}개`} />
        <MetricCard label="카테고리 수" value={`${categories.length}개`} detail="미분류 포함" />
        <MetricCard
          label="해지 예정"
          value={`${cancelPending.length}개`}
          detail={cancelPending[0]?.name ?? "해지 예정 없음"}
        />
        <MetricCard
          label="최고 월 부담"
          value={
            top ? (
              <div>
                {formatMoney(monthlyAmount(top), top.currency)}
                <KrwEstimate
                  amount={monthlyAmount(top)}
                  currency={top.currency}
                  rates={rates}
                  class="mt-1 block text-base font-semibold text-cyan-200"
                />
              </div>
            ) : (
              formatMoney(0)
            )
          }
          detail={top ? `${top.name} · ${rateDetail}` : rateDetail}
        />
      </section>

      <section class="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="카테고리별 월 부담" icon={<Icon icon={ChartPie} />}>
          {categories.length ? (
            categories.map((item) => (
              <Row label={item.category} value={<MoneyTotals totals={item.totals} rates={rates} />} />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="월 부담 TOP 5" icon={<Icon icon={Crown} />}>
          {topExpensive.length ? (
            topExpensive.map((subscription, index) => (
              <Row
                label={`${index + 1}. ${subscription.name}`}
                value={formatMoney(monthlyAmount(subscription), subscription.currency)}
                detail={formatKrwEstimate(monthlyAmount(subscription), subscription.currency, rates)}
              />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="결제 주기별 월 부담" icon={<Icon icon={ChartColumn} />}>
          {cycles.length ? (
            cycles.map((item) => (
              <Row label={item.cycle} value={<MoneyTotals totals={item.totals} rates={rates} />} />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="월별 결제 예정 부담" icon={<Icon icon={CalendarDays} />}>
          {scheduled.map((item) => (
            <Row label={item.key} value={<MoneyTotals totals={item.totals} rates={rates} />} />
          ))}
        </Panel>
      </section>

      <section class="mt-6">
        <Panel title="해지 예정 서비스">
          {cancelPending.length ? (
            cancelPending.map((subscription) => (
              <div class="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p class="text-sm font-semibold text-zinc-50">{subscription.name}</p>
                  <p class="mt-1 text-sm text-zinc-500">{subscription.memo || "메모 없음"}</p>
                </div>
                <Badge tone="amber">해지 예정</Badge>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </Panel>
      </section>
    </>
  );
}
