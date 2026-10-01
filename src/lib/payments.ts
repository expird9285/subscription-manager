import { addDays, addMonths } from "./dates";
import { convertToKrw, type ExchangeRates } from "./exchange-rates";
import {
  alertStatuses,
  billingCycleLabels,
  formatAmount,
  formatWon,
  normalizeCurrency,
  sharedPrice,
  splitCount,
} from "./subscriptions";
import type { BankAccount, PaymentCard, Subscription } from "./types";

type Totals = Record<string, number>;

const MAX_OCCURRENCES = 500;

/**
 * Billing dates of a subscription inside [from, to], rolling the stored next billing date
 * forward by its cycle. Past dates are rolled forward too; `custom` cycles only use the
 * stored date because their interval is unknown.
 */
export function occurrencesWithin(
  subscription: Pick<Subscription, "next_billing_date" | "billing_cycle">,
  from: string,
  to: string,
) {
  const start = subscription.next_billing_date;
  const step = (index: number) => {
    switch (subscription.billing_cycle) {
      case "weekly":
        return addDays(start, index * 7);
      case "monthly":
        return addMonths(start, index);
      case "quarterly":
        return addMonths(start, index * 3);
      case "yearly":
        return addMonths(start, index * 12);
      default:
        return null;
    }
  };

  if (subscription.billing_cycle === "custom") {
    return start >= from && start <= to ? [start] : [];
  }

  const dates: string[] = [];
  for (let index = 0; index < MAX_OCCURRENCES; index += 1) {
    const date = step(index);
    if (!date || date > to) {
      break;
    }
    if (date >= from) {
      dates.push(date);
    }
  }
  return dates;
}

/** Subscriptions that will actually charge a card: active or trial, auto-renewing. */
export function isCharging(subscription: Pick<Subscription, "status" | "auto_renew">) {
  return alertStatuses.includes(subscription.status) && subscription.auto_renew;
}

export type Charge = { subscription: Subscription; date: string };
export type Incoming = { subscription: Subscription; date: string; amount: number };

export type AccountOutflow = {
  /** null groups cards that have no linked account. */
  account: BankAccount | null;
  cards: PaymentCard[];
  charges: Charge[];
  totals: Totals;
  incoming: Incoming[];
  incomingTotals: Totals;
};

function addTo(totals: Totals, currency: string, amount: number) {
  const code = normalizeCurrency(currency);
  totals[code] = (totals[code] ?? 0) + amount;
}

function byDate<T extends { date: string; subscription: Subscription }>(a: T, b: T) {
  return a.date.localeCompare(b.date) || a.subscription.name.localeCompare(b.subscription.name, "ko-KR");
}

/**
 * Groups the full billed amounts of the next window by the account behind each card, plus
 * the members' shares expected into each collection account.
 */
export function summarizeOutflow(options: {
  subscriptions: Subscription[];
  accounts: BankAccount[];
  cards: PaymentCard[];
  from: string;
  to: string;
}) {
  const { subscriptions, accounts, cards, from, to } = options;
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const groups = new Map<string | null, AccountOutflow>();

  const groupFor = (accountId: string | null) => {
    let group = groups.get(accountId);
    if (!group) {
      group = {
        account: accounts.find((account) => account.id === accountId) ?? null,
        cards: [],
        charges: [],
        totals: {},
        incoming: [],
        incomingTotals: {},
      };
      groups.set(accountId, group);
    }
    return group;
  };

  for (const account of accounts) {
    groupFor(account.id);
  }
  for (const card of cards) {
    const accountId = card.bank_account_id && groups.has(card.bank_account_id) ? card.bank_account_id : null;
    groupFor(accountId).cards.push(card);
  }

  const unassigned: Charge[] = [];
  const unassignedTotals: Totals = {};

  for (const subscription of subscriptions.filter(isCharging)) {
    const dates = occurrencesWithin(subscription, from, to);
    const card = subscription.payment_card_id ? cardById.get(subscription.payment_card_id) : undefined;

    for (const date of dates) {
      if (card) {
        const group = groupFor(card.bank_account_id && groups.has(card.bank_account_id) ? card.bank_account_id : null);
        group.charges.push({ subscription, date });
        addTo(group.totals, subscription.currency, subscription.price);
      } else {
        unassigned.push({ subscription, date });
        addTo(unassignedTotals, subscription.currency, subscription.price);
      }

      const collectionId = subscription.collection_account_id;
      if (splitCount(subscription) > 1 && collectionId && groups.has(collectionId)) {
        const amount = subscription.price - sharedPrice(subscription);
        const group = groupFor(collectionId);
        group.incoming.push({ subscription, date, amount });
        addTo(group.incomingTotals, subscription.currency, amount);
      }
    }
  }

  const accountGroups = [...groups.values()]
    .filter((group) => group.account || group.cards.length || group.charges.length)
    .map((group) => ({ ...group, charges: group.charges.sort(byDate), incoming: group.incoming.sort(byDate) }))
    .sort((a, b) => (a.account ? 0 : 1) - (b.account ? 0 : 1));

  return { accountGroups, unassigned: unassigned.sort(byDate), unassignedTotals };
}

export function accountLabel(account: Pick<BankAccount, "bank_name" | "nickname">) {
  return account.nickname ? `${account.bank_name} ${account.nickname}` : account.bank_name;
}

/** `국민은행 123-456-789 (예금주 홍길동)` */
export function accountTransferLine(
  account: Pick<BankAccount, "bank_name" | "account_number" | "holder_name">,
) {
  const parts = [account.bank_name, account.account_number].filter(Boolean).join(" ");
  return account.holder_name ? `${parts} (예금주 ${account.holder_name})` : parts;
}

export function cardLabel(card: Pick<PaymentCard, "name" | "last4">) {
  return card.last4 ? `${card.name} (${card.last4})` : card.name;
}

/** Message members of a split plan can copy straight into a group chat. */
export function collectionText(subscription: Subscription, account: BankAccount | null) {
  const count = splitCount(subscription);
  const { currency } = subscription;
  const lines = [
    `[${subscription.name}] 구독료 정산 안내`,
    `1인당 ${formatAmount(sharedPrice(subscription), currency)} (전체 ${formatAmount(subscription.price, currency)} ÷ ${count}명)`,
    `결제일 ${subscription.next_billing_date} (${billingCycleLabels[subscription.billing_cycle]})`,
  ];
  lines.push(account ? `입금: ${accountTransferLine(account)}` : "입금 계좌: 아직 지정되지 않았어요");
  return lines.join("\n");
}

/** `17,000원`, or `US$20.00(약 28,000원)` for foreign currencies. */
export function formatAmountWithKrw(amount: number, currency: string, rates: ExchangeRates) {
  if (normalizeCurrency(currency) === "KRW") {
    return formatWon(amount);
  }
  const krw = convertToKrw(amount, currency, rates);
  return krw === null ? formatAmount(amount, currency) : `${formatAmount(amount, currency)}(약 ${formatWon(krw)})`;
}
