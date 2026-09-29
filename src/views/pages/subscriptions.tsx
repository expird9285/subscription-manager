import { dueLabel } from "../../lib/dates";
import { exchangeRateDetail, type ExchangeRates } from "../../lib/exchange-rates";
import {
  billingCycleLabels,
  formatMoney,
  hasCostSplit,
  monthlyAmount,
  sharedPrice,
  sortOptions,
  splitLabel,
  statusLabels,
  UNCATEGORIZED,
  type SubscriptionFilters,
} from "../../lib/subscriptions";
import type { Subscription } from "../../lib/types";
import { Icon, Pencil, Plus, Search, Trash } from "../icons";
import {
  Badge,
  Button,
  inputClass,
  KrwEstimate,
  LinkButton,
  Notice,
  PageHeader,
  type BadgeTone,
} from "../ui";

const notices: Record<string, string> = {
  created: "구독을 추가했습니다.",
  updated: "구독을 저장했습니다.",
  deleted: "구독을 삭제했습니다.",
};

function statusTone(status: Subscription["status"]): BadgeTone {
  switch (status) {
    case "active":
      return "emerald";
    case "trial":
      return "sky";
    case "cancel_pending":
      return "amber";
    case "cancelled":
      return "rose";
    default:
      return "slate";
  }
}

function Filters({ categories, filters }: { categories: string[]; filters: SubscriptionFilters }) {
  return (
    <form
      method="get"
      action="/subscriptions"
      class="mb-4 grid gap-3 rounded-lg border border-white/10 bg-zinc-900 p-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]"
    >
      <label class="relative">
        <span class="sr-only">서비스 검색</span>
        <Icon icon={Search} class="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-500" />
        <input class={`${inputClass} w-full pl-9`} name="q" value={filters.query} placeholder="서비스 검색" />
      </label>

      <select class={inputClass} name="category" aria-label="카테고리">
        <option value="">전체 카테고리</option>
        {categories.map((category) => (
          <option value={category} selected={filters.category === category}>
            {category}
          </option>
        ))}
      </select>

      <select class={inputClass} name="status" aria-label="상태">
        <option value="">전체 상태</option>
        {Object.entries(statusLabels).map(([value, label]) => (
          <option value={value} selected={filters.status === value}>
            {label}
          </option>
        ))}
      </select>

      <select class={inputClass} name="billingCycle" aria-label="결제 주기">
        <option value="">전체 주기</option>
        {Object.entries(billingCycleLabels).map(([value, label]) => (
          <option value={value} selected={filters.billingCycle === value}>
            {label}
          </option>
        ))}
      </select>

      <select class={inputClass} name="sort" aria-label="정렬">
        {Object.entries(sortOptions).map(([value, label]) => (
          <option value={value} selected={filters.sort === value}>
            {label}
          </option>
        ))}
      </select>

      <Button variant="secondary">적용</Button>
    </form>
  );
}

function SubscriptionRow({
  subscription,
  rates,
  today,
  returnTo,
}: {
  subscription: Subscription;
  rates: ExchangeRates;
  today: string;
  returnTo: string;
}) {
  const base = `/subscriptions/${subscription.id}`;

  return (
    <tr class="align-top">
      <td class="px-4 py-3 font-semibold text-zinc-50">
        {subscription.name}
        {subscription.memo ? (
          <p class="mt-1 max-w-56 truncate text-xs font-normal text-zinc-500">{subscription.memo}</p>
        ) : null}
      </td>
      <td class="px-4 py-3 text-zinc-400">{subscription.category || UNCATEGORIZED}</td>
      <td class="px-4 py-3 text-zinc-300">
        {formatMoney(subscription.price, subscription.currency)}
        <KrwEstimate amount={subscription.price} currency={subscription.currency} rates={rates} />
        {hasCostSplit(subscription) ? (
          <div class="mt-1 text-xs text-zinc-500">{splitLabel(subscription)}</div>
        ) : null}
      </td>
      <td class="px-4 py-3 text-zinc-300">
        {formatMoney(sharedPrice(subscription), subscription.currency)}
        <KrwEstimate amount={sharedPrice(subscription)} currency={subscription.currency} rates={rates} />
      </td>
      <td class="px-4 py-3 text-zinc-300">
        {formatMoney(monthlyAmount(subscription), subscription.currency)}
        <KrwEstimate amount={monthlyAmount(subscription)} currency={subscription.currency} rates={rates} />
      </td>
      <td class="whitespace-nowrap px-4 py-3 text-zinc-400">{billingCycleLabels[subscription.billing_cycle]}</td>
      <td class="whitespace-nowrap px-4 py-3">
        <div class="font-medium text-zinc-200">{subscription.next_billing_date}</div>
        <div class="mt-1 text-xs text-zinc-500">{dueLabel(subscription.next_billing_date, today)}</div>
      </td>
      <td class="px-4 py-3">
        <form method="post" action={`${base}/status`} class="flex gap-2">
          <input type="hidden" name="return_to" value={returnTo} />
          <select class={`${inputClass} h-9 min-w-28`} name="status" aria-label={`${subscription.name} 상태`}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option value={value} selected={subscription.status === value}>
                {label}
              </option>
            ))}
          </select>
          <Button variant="secondary" class="h-9 px-3">
            저장
          </Button>
        </form>
        <div class="mt-2">
          <Badge tone={statusTone(subscription.status)}>{statusLabels[subscription.status]}</Badge>
        </div>
      </td>
      <td class="px-4 py-3">
        <form method="post" action={`${base}/auto-renew`}>
          <input type="hidden" name="return_to" value={returnTo} />
          <input type="hidden" name="auto_renew" value={subscription.auto_renew ? "false" : "true"} />
          <Button variant="secondary" class="h-9 px-3" title="클릭하면 자동 갱신을 전환합니다">
            {subscription.auto_renew ? "켜짐" : "꺼짐"}
          </Button>
        </form>
      </td>
      <td class="px-4 py-3 text-zinc-400">{subscription.payment_method || "-"}</td>
      <td class="px-4 py-3">
        <div class="flex justify-end gap-2">
          <a
            href={`${base}/edit`}
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-zinc-300 transition hover:bg-zinc-950"
            title="수정"
            aria-label={`${subscription.name} 수정`}
          >
            <Icon icon={Pencil} />
          </a>
          <form
            method="post"
            action={`${base}/delete`}
            data-confirm={`'${subscription.name}' 구독을 삭제할까요?`}
          >
            <input type="hidden" name="return_to" value={returnTo} />
            <button
              type="submit"
              class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-400/30 text-rose-200 transition hover:bg-rose-500/10"
              title="삭제"
              aria-label={`${subscription.name} 삭제`}
            >
              <Icon icon={Trash} />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

export function SubscriptionsPage({
  subscriptions,
  categories,
  filters,
  rates,
  today,
  returnTo,
  notice,
}: {
  subscriptions: Subscription[];
  categories: string[];
  filters: SubscriptionFilters;
  rates: ExchangeRates;
  today: string;
  returnTo: string;
  notice?: string;
}) {
  const message = notice ? notices[notice] : undefined;

  return (
    <>
      <PageHeader
        title="구독 목록"
        description={`검색, 필터, 정렬로 현재 구독 상태와 결제 예정일을 관리합니다. ${exchangeRateDetail(rates)}`}
        action={
          <LinkButton href="/subscriptions/new">
            <Icon icon={Plus} />
            추가
          </LinkButton>
        }
      />
      {message ? <Notice>{message}</Notice> : null}
      <Filters categories={categories} filters={filters} />

      {subscriptions.length ? (
        <div class="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900">
          <table class="w-full min-w-[1180px] border-collapse break-keep text-left text-sm">
            <thead class="whitespace-nowrap bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th class="px-4 py-3">서비스</th>
                <th class="px-4 py-3">카테고리</th>
                <th class="px-4 py-3">전체 결제금액</th>
                <th class="px-4 py-3">내 부담금</th>
                <th class="px-4 py-3">월 부담</th>
                <th class="px-4 py-3">주기</th>
                <th class="px-4 py-3">다음 결제일</th>
                <th class="px-4 py-3">상태</th>
                <th class="px-4 py-3">자동 갱신</th>
                <th class="px-4 py-3">결제 수단</th>
                <th class="px-4 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
              {subscriptions.map((subscription) => (
                <SubscriptionRow subscription={subscription} rates={rates} today={today} returnTo={returnTo} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div class="rounded-lg border border-dashed border-white/15 bg-zinc-900 p-8 text-center">
          <p class="text-sm font-medium text-zinc-400">표시할 구독이 없습니다.</p>
        </div>
      )}
    </>
  );
}
