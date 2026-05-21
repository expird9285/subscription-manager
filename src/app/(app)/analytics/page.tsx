import { BarChart3, CalendarDays, Crown, PieChart } from "lucide-react";

import { Badge, MetricCard, PageHeader } from "@/components/ui";
import { getSubscriptions } from "@/lib/dal";
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
  const subscriptions = await getSubscriptions();
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

  return (
    <>
      <PageHeader
        title="분석"
        description="카테고리, 결제 주기, 고비용 구독, 월별 결제 예정 금액을 확인합니다."
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
          label="최고 월 환산"
          value={
            topExpensive[0]
              ? formatMoney(
                  monthlyAmount(topExpensive[0]),
                  topExpensive[0].currency,
                )
              : formatMoney(0)
          }
          detail={topExpensive[0]?.name}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="카테고리별 월 지출" icon={<PieChart className="h-4 w-4" />}>
          {categories.length ? (
            categories.map((item) => (
              <Row
                key={item.category}
                label={item.category}
                value={formatTotals(item.totals).join(" / ")}
              />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="가장 비싼 구독 TOP 5" icon={<Crown className="h-4 w-4" />}>
          {topExpensive.length ? (
            topExpensive.map((subscription, index) => (
              <Row
                key={subscription.id}
                label={`${index + 1}. ${subscription.name}`}
                value={formatMoney(
                  monthlyAmount(subscription),
                  subscription.currency,
                )}
              />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="결제 주기별 월 환산" icon={<BarChart3 className="h-4 w-4" />}>
          {cycleTotals.length ? (
            cycleTotals.map(([cycle, totals]) => (
              <Row
                key={cycle}
                label={cycle}
                value={formatTotals(totals).join(" / ")}
              />
            ))
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel
          title="월별 결제 예정 금액"
          icon={<CalendarDays className="h-4 w-4" />}
        >
          {scheduled.map((item) => (
            <Row
              key={item.key}
              label={item.key}
              value={formatTotals(item.totals).join(" / ")}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="truncate text-sm font-medium text-zinc-300">
        {label}
      </span>
      <span className="shrink-0 text-right text-sm font-semibold text-zinc-50">
        {value}
      </span>
    </div>
  );
}

function Empty() {
  return <p className="px-5 py-8 text-sm text-zinc-500">데이터가 없습니다.</p>;
}
