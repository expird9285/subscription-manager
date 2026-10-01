import type { AlertCandidate } from "../db/subscriptions";
import { daysBetween, dueLabel } from "../lib/dates";
import type { ExchangeRates } from "../lib/exchange-rates";
import { formatAmountWithKrw } from "../lib/payments";
import { formatMoney, sharedPrice, splitCount } from "../lib/subscriptions";
import type { Subscription } from "../lib/types";
import type { DiscordEmbed } from "./api";

export const EMBED_COLOR = 0x059669;
const MAX_LINES = 20;

export function escapeMarkdown(text: string) {
  return text.replace(/([\\*_~`|])/g, "\\$1");
}

export function subscriptionLine(subscription: Subscription, today: string, cardName?: string | null) {
  const { currency, next_billing_date: date } = subscription;
  let line =
    `**${escapeMarkdown(subscription.name)}** · ` +
    `${formatMoney(sharedPrice(subscription), currency)} 내 부담 · ` +
    `${date} (${dueLabel(date, today)})`;

  const count = splitCount(subscription);
  if (count > 1) {
    line += ` · 전체 ${formatMoney(subscription.price, currency)} / 1/${count}`;
  }
  const payment = cardName ?? subscription.payment_method;
  if (payment) {
    line += ` · ${escapeMarkdown(payment)}`;
  }
  return line;
}

/**
 * e.g. `3일 뒤에 **넷플릭스** 구독이 결제돼요. **현대카드**에 연결된 계좌(국민은행 월급통장)에
 * **17,000원** 이상 채워져 있는지 확인해 주세요.` The amount is the full price the card is charged.
 */
export function billingAlertMessage(candidate: AlertCandidate, today: string, rates: ExchangeRates) {
  const days = daysBetween(today, candidate.next_billing_date);
  const when = days === 0 ? "오늘" : `${days}일 뒤에`;
  const amount = formatAmountWithKrw(candidate.price, candidate.currency, rates);
  const cardName = candidate.card_name ?? candidate.payment_method;
  const account = candidate.account_bank_name
    ? [candidate.account_bank_name, candidate.account_nickname].filter(Boolean).join(" ")
    : null;

  const target = cardName
    ? `**${escapeMarkdown(cardName)}**에 연결된 계좌${account ? `(${escapeMarkdown(account)})` : ""}에`
    : "결제 계좌에";

  return (
    `${when} **${escapeMarkdown(candidate.name)}** 구독이 결제돼요. ` +
    `${target} **${amount}** 이상 채워져 있는지 확인해 주세요.`
  );
}

export function listEmbed(
  title: string,
  subscriptions: Subscription[],
  emptyMessage: string,
  today: string,
  cardNames: Map<string, string> = new Map(),
): DiscordEmbed {
  const embed: DiscordEmbed = { title, color: EMBED_COLOR };

  if (!subscriptions.length) {
    embed.description = emptyMessage;
    return embed;
  }

  embed.description = subscriptions
    .slice(0, MAX_LINES)
    .map((subscription) =>
      subscriptionLine(
        subscription,
        today,
        subscription.payment_card_id ? cardNames.get(subscription.payment_card_id) : null,
      ),
    )
    .join("\n");

  if (subscriptions.length > MAX_LINES) {
    embed.footer = { text: `외 ${subscriptions.length - MAX_LINES}개 더 있음` };
  }
  return embed;
}
