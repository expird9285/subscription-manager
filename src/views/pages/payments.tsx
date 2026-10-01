import { dueLabel } from "../../lib/dates";
import type { ExchangeRates } from "../../lib/exchange-rates";
import {
  accountLabel,
  accountTransferLine,
  cardLabel,
  type AccountOutflow,
  type Charge,
} from "../../lib/payments";
import { formatMoney, hasCostSplit, splitLabel } from "../../lib/subscriptions";
import type { PaymentCard } from "../../lib/types";
import { CreditCard, Icon, Landmark, Pencil, Plus, Trash, Wallet } from "../icons";
import { Empty, KrwEstimate, LinkButton, MoneyTotals, Notice, PageHeader } from "../ui";

const notices: Record<string, string> = {
  account_created: "계좌를 추가했습니다.",
  account_updated: "계좌를 저장했습니다.",
  account_deleted: "계좌를 삭제했습니다. 연결된 카드와 수금 지정은 해제되었습니다.",
  card_created: "카드를 추가했습니다.",
  card_updated: "카드를 저장했습니다.",
  card_deleted: "카드를 삭제했습니다. 이 카드로 결제하던 구독은 '카드 미지정'이 되었습니다.",
};

const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-zinc-300 transition hover:bg-zinc-950";
const deleteButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-400/30 text-rose-200 transition hover:bg-rose-500/10";

function ChargeRow({
  charge,
  today,
  rates,
  cardName,
}: {
  charge: Charge;
  today: string;
  rates: ExchangeRates;
  cardName?: string;
}) {
  const { subscription, date } = charge;
  return (
    <div class="flex items-start justify-between gap-4 px-5 py-3">
      <div class="min-w-0">
        <a
          href={`/subscriptions/${subscription.id}/edit`}
          class="truncate text-sm font-semibold text-zinc-100 hover:text-cyan-200"
        >
          {subscription.name}
        </a>
        <p class="mt-1 text-xs text-zinc-500">
          {date} · {dueLabel(date, today)}
          {cardName ? ` · ${cardName}` : ""}
          {hasCostSplit(subscription) ? ` · ${splitLabel(subscription)}` : ""}
        </p>
      </div>
      <div class="shrink-0 text-right text-sm font-semibold text-zinc-50">
        {formatMoney(subscription.price, subscription.currency)}
        <KrwEstimate amount={subscription.price} currency={subscription.currency} rates={rates} />
      </div>
    </div>
  );
}

function CardRow({ card }: { card: PaymentCard }) {
  return (
    <div class="flex items-center justify-between gap-3 px-5 py-3">
      <span class="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-200">
        <Icon icon={CreditCard} class="h-4 w-4 shrink-0 text-zinc-500" />
        <span class="truncate">{cardLabel(card)}</span>
      </span>
      <div class="flex shrink-0 gap-2">
        <a href={`/payments/cards/${card.id}/edit`} class={iconButton} title="카드 수정" aria-label={`${card.name} 수정`}>
          <Icon icon={Pencil} />
        </a>
        <form
          method="post"
          action={`/payments/cards/${card.id}/delete`}
          data-confirm={`'${card.name}' 카드를 삭제할까요? 이 카드로 결제하던 구독은 '카드 미지정'이 됩니다.`}
        >
          <button type="submit" class={deleteButton} title="카드 삭제" aria-label={`${card.name} 삭제`}>
            <Icon icon={Trash} />
          </button>
        </form>
      </div>
    </div>
  );
}

function AccountSection({
  group,
  today,
  rates,
}: {
  group: AccountOutflow;
  today: string;
  rates: ExchangeRates;
}) {
  const { account } = group;
  const cardNames = new Map(group.cards.map((card) => [card.id, card.name]));

  return (
    <section class="rounded-lg border border-white/10 bg-zinc-900">
      <div class="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <Icon icon={account ? Landmark : CreditCard} class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <h3 class="truncate text-base font-semibold text-zinc-50">
              {account ? accountLabel(account) : "연결 계좌 없는 카드"}
            </h3>
            <p class="mt-0.5 truncate text-sm text-zinc-500">
              {account
                ? accountTransferLine(account) || "계좌번호 미입력"
                : "카드 수정에서 출금 계좌를 연결하면 계좌별로 합산됩니다."}
            </p>
          </div>
        </div>
        {account ? (
          <div class="flex shrink-0 gap-2">
            <a href={`/payments/accounts/${account.id}/edit`} class={iconButton} title="계좌 수정" aria-label="계좌 수정">
              <Icon icon={Pencil} />
            </a>
            <form
              method="post"
              action={`/payments/accounts/${account.id}/delete`}
              data-confirm={`'${accountLabel(account)}' 계좌를 삭제할까요? 연결된 카드와 수금 지정은 해제됩니다.`}
            >
              <button type="submit" class={deleteButton} title="계좌 삭제" aria-label="계좌 삭제">
                <Icon icon={Trash} />
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] lg:divide-x lg:divide-white/10">
        <div>
          <div class="flex items-end justify-between gap-4 px-5 pt-4">
            <p class="text-sm font-medium text-zinc-400">앞으로 30일 출금 예정</p>
            <div class="text-right text-lg font-semibold text-zinc-50">
              <MoneyTotals totals={group.totals} rates={rates} />
            </div>
          </div>
          <div class="mt-2 divide-y divide-white/10">
            {group.charges.length ? (
              group.charges.map((charge) => (
                <ChargeRow
                  charge={charge}
                  today={today}
                  rates={rates}
                  cardName={charge.subscription.payment_card_id ? cardNames.get(charge.subscription.payment_card_id) : undefined}
                />
              ))
            ) : (
              <Empty message="30일 안에 빠져나갈 구독이 없습니다." />
            )}
          </div>
        </div>

        <div class="border-t border-white/10 lg:border-t-0">
          <p class="px-5 pt-4 text-sm font-medium text-zinc-400">연결된 카드</p>
          <div class="mt-2 divide-y divide-white/10">
            {group.cards.length ? (
              group.cards.map((card) => <CardRow card={card} />)
            ) : (
              <Empty message="연결된 카드가 없습니다." />
            )}
          </div>

          {account ? (
            <div class="border-t border-white/10">
              <div class="flex items-end justify-between gap-4 px-5 pt-4">
                <p class="text-sm font-medium text-zinc-400">30일 내 받을 돈 (1/N)</p>
                <div class="text-right text-sm font-semibold text-emerald-200">
                  <MoneyTotals totals={group.incomingTotals} rates={rates} />
                </div>
              </div>
              <div class="mt-2 divide-y divide-white/10 pb-1">
                {group.incoming.length ? (
                  group.incoming.map((item) => (
                    <div class="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                      <a href={`/subscriptions/${item.subscription.id}/share`} class="min-w-0 truncate text-zinc-300 hover:text-cyan-200">
                        {item.subscription.name} · {item.date}
                      </a>
                      <span class="shrink-0 font-semibold text-zinc-100">
                        {formatMoney(item.amount, item.subscription.currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <Empty message="이 계좌로 수금하는 1/N 구독이 없습니다." />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PaymentsPage({
  groups,
  unassigned,
  unassignedTotals,
  today,
  until,
  rates,
  notice,
}: {
  groups: AccountOutflow[];
  unassigned: Charge[];
  unassignedTotals: Record<string, number>;
  today: string;
  until: string;
  rates: ExchangeRates;
  notice?: string;
}) {
  const message = notice ? notices[notice] : undefined;

  return (
    <>
      <PageHeader
        title="결제수단"
        description={`카드와 출금 계좌를 등록하고, ${today}부터 ${until}까지 계좌별로 얼마가 빠져나가는지 확인합니다. 금액은 카드에서 결제되는 전체 금액 기준입니다.`}
        action={
          <div class="flex flex-wrap gap-2">
            <LinkButton href="/payments/accounts/new" variant="secondary">
              <Icon icon={Landmark} />
              계좌 추가
            </LinkButton>
            <LinkButton href="/payments/cards/new">
              <Icon icon={Plus} />
              카드 추가
            </LinkButton>
          </div>
        }
      />
      {message ? <Notice>{message}</Notice> : null}

      {groups.length ? (
        <div class="grid grid-cols-1 gap-6">
          {groups.map((group) => (
            <AccountSection group={group} today={today} rates={rates} />
          ))}
        </div>
      ) : (
        <div class="rounded-lg border border-dashed border-white/15 bg-zinc-900 p-8 text-center">
          <Icon icon={Wallet} class="mx-auto h-8 w-8 text-zinc-600" />
          <p class="mt-3 text-sm font-medium text-zinc-300">아직 등록된 계좌와 카드가 없습니다.</p>
          <p class="mt-1 text-sm text-zinc-500">
            출금 계좌를 먼저 추가하고, 카드를 만들 때 그 계좌를 연결하세요.
          </p>
        </div>
      )}

      <section class="mt-6 rounded-lg border border-white/10 bg-zinc-900">
        <div class="flex items-end justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h3 class="text-sm font-semibold text-zinc-50">결제 카드 미지정 구독</h3>
            <p class="mt-1 text-xs text-zinc-500">구독 수정에서 결제 카드를 고르면 계좌별 합계에 포함됩니다.</p>
          </div>
          <div class="text-right text-sm font-semibold text-zinc-50">
            <MoneyTotals totals={unassignedTotals} rates={rates} />
          </div>
        </div>
        <div class="divide-y divide-white/10">
          {unassigned.length ? (
            unassigned.map((charge) => (
              <ChargeRow
                charge={charge}
                today={today}
                rates={rates}
                cardName={charge.subscription.payment_method ?? undefined}
              />
            ))
          ) : (
            <Empty message="30일 안에 결제되는 구독은 모두 카드가 지정되어 있습니다." />
          )}
        </div>
      </section>
    </>
  );
}
