import { dueLabel } from "../../lib/dates";
import { exchangeRateDetail, type ExchangeRates } from "../../lib/exchange-rates";
import {
  categorySummary,
  formatMoney,
  hasCostSplit,
  monthlyAmount,
  sharedPrice,
  splitLabel,
  summarizeDashboard,
} from "../../lib/subscriptions";
import type { Subscription } from "../../lib/types";
import { CalendarClock, Icon, Plus } from "../icons";
import { Badge, Empty, KrwEstimate, LinkButton, MetricCard, MoneyTotals, PageHeader } from "../ui";

export function DashboardPage({
  subscriptions,
  rates,
  today,
}: {
  subscriptions: Subscription[];
  rates: ExchangeRates;
  today: string;
}) {
  const summary = summarizeDashboard(subscriptions, today);
  const categories = categorySummary(subscriptions).slice(0, 6);

  return (
    <>
      <PageHeader
        title="대시보드"
        description="월/연간 내 부담 지출, 다음 결제일, 결제 임박 항목을 한 화면에서 확인합니다."
        action={
          <LinkButton href="/subscriptions/new">
            <Icon icon={Plus} />
            구독 추가
          </LinkButton>
        }
      />

      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="이번 달 구독 지출"
          value={<MoneyTotals totals={summary.monthlyTotals} rates={rates} stacked />}
          detail={`내 부담 기준 · 활성, 체험, 해지 예정 포함 · ${exchangeRateDetail(rates)}`}
        />
        <MetricCard
          label="연간 예상 지출"
          value={<MoneyTotals totals={summary.monthlyTotals} rates={rates} multiplier={12} stacked />}
        />
        <MetricCard label="활성 구독 수" value={`${summary.activeCount}개`} />
        <MetricCard
          label="7일 내 결제 예정"
          value={`${summary.dueSoon.length}개`}
          detail={
            summary.nearestDue
              ? `${summary.nearestDue.name} ${dueLabel(summary.nearestDue.next_billing_date, today)}`
              : "결제 임박 항목 없음"
          }
        />
      </section>

      <section class="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div class="rounded-lg border border-white/10 bg-zinc-900">
          <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h3 class="text-sm font-semibold text-zinc-50">곧 결제될 구독</h3>
            <Icon icon={CalendarClock} class="h-4 w-4 text-zinc-500" />
          </div>
          <div class="divide-y divide-white/10">
            {summary.dueSoon.length ? (
              summary.dueSoon.map((subscription) => (
                <div class="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p class="font-semibold text-zinc-50">{subscription.name}</p>
                    <p class="mt-1 text-sm text-zinc-500">
                      {subscription.next_billing_date} · {formatMoney(subscription.price, subscription.currency)}
                    </p>
                    {hasCostSplit(subscription) ? (
                      <p class="mt-1 text-xs font-medium text-zinc-400">
                        내 부담 {formatMoney(sharedPrice(subscription), subscription.currency)} ·{" "}
                        {splitLabel(subscription)}
                      </p>
                    ) : null}
                    <KrwEstimate amount={sharedPrice(subscription)} currency={subscription.currency} rates={rates} />
                  </div>
                  <div>
                    <Badge tone="amber">{dueLabel(subscription.next_billing_date, today)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <Empty message="7일 내 결제 예정 구독이 없습니다." />
            )}
          </div>
        </div>

        <div class="rounded-lg border border-white/10 bg-zinc-900">
          <div class="border-b border-white/10 px-5 py-4">
            <h3 class="text-sm font-semibold text-zinc-50">카테고리별 월 지출</h3>
          </div>
          <div class="divide-y divide-white/10">
            {categories.length ? (
              categories.map((category) => (
                <div class="flex items-center justify-between gap-4 px-5 py-4">
                  <span class="text-sm font-medium text-zinc-300">{category.category}</span>
                  <span class="text-right text-sm font-semibold text-zinc-50">
                    <MoneyTotals totals={category.totals} rates={rates} />
                  </span>
                </div>
              ))
            ) : (
              <Empty message="집계할 구독이 없습니다." />
            )}
          </div>
        </div>
      </section>

      <section class="mt-6 rounded-lg border border-white/10 bg-zinc-900 p-5">
        <h3 class="text-sm font-semibold text-zinc-50">월 부담 상세</h3>
        {summary.liveSubscriptions.length ? (
          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.liveSubscriptions.slice(0, 9).map((subscription) => (
              <div class="flex items-center justify-between gap-3 rounded-md bg-zinc-950 px-3 py-3">
                <span class="truncate text-sm font-medium text-zinc-300">{subscription.name}</span>
                <span class="shrink-0 text-right text-sm font-semibold text-zinc-50">
                  {formatMoney(monthlyAmount(subscription), subscription.currency)}
                  <KrwEstimate
                    amount={monthlyAmount(subscription)}
                    currency={subscription.currency}
                    rates={rates}
                  />
                  {hasCostSplit(subscription) ? (
                    <span class="mt-1 block text-xs font-medium text-zinc-500">{splitLabel(subscription)}</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p class="mt-4 text-sm text-zinc-500">
            아직 등록된 구독이 없습니다.{" "}
            <a href="/subscriptions/new" class="font-semibold text-cyan-300 hover:text-cyan-200">
              첫 구독을 추가해 보세요.
            </a>
          </p>
        )}
      </section>
    </>
  );
}
