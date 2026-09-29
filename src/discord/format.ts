import { dueLabel } from "../lib/dates";
import { formatMoney, sharedPrice, splitCount } from "../lib/subscriptions";
import type { Subscription } from "../lib/types";
import type { DiscordEmbed } from "./api";

export const EMBED_COLOR = 0x059669;
const MAX_LINES = 20;

export function escapeMarkdown(text: string) {
  return text.replace(/([\\*_~`|])/g, "\\$1");
}

export function subscriptionLine(subscription: Subscription, today: string) {
  const { currency, next_billing_date: date } = subscription;
  let line =
    `**${escapeMarkdown(subscription.name)}** · ` +
    `${formatMoney(sharedPrice(subscription), currency)} 내 부담 · ` +
    `${date} (${dueLabel(date, today)})`;

  const count = splitCount(subscription);
  if (count > 1) {
    line += ` · 전체 ${formatMoney(subscription.price, currency)} / 1/${count}`;
  }
  return line;
}

export function listEmbed(
  title: string,
  subscriptions: Subscription[],
  emptyMessage: string,
  today: string,
): DiscordEmbed {
  const embed: DiscordEmbed = { title, color: EMBED_COLOR };

  if (!subscriptions.length) {
    embed.description = emptyMessage;
    return embed;
  }

  embed.description = subscriptions
    .slice(0, MAX_LINES)
    .map((subscription) => subscriptionLine(subscription, today))
    .join("\n");

  if (subscriptions.length > MAX_LINES) {
    embed.footer = { text: `외 ${subscriptions.length - MAX_LINES}개 더 있음` };
  }
  return embed;
}
