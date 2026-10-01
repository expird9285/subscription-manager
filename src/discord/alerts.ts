import { claimNotification, releaseNotification } from "../db/notifications";
import { setState } from "../db/state";
import { listAlertCandidates } from "../db/subscriptions";
import { alertHourOf, discordConfig, isAllowedDiscordId, timeZoneOf } from "../lib/config";
import { addDays, daysBetween, dueLabel, formatDateTime, hourIn, todayIn } from "../lib/dates";
import { alertStatuses } from "../lib/subscriptions";
import type { NotificationType } from "../lib/types";
import { sendAlertMessage } from "./api";
import { subscriptionLine } from "./format";

export const LAST_ALERT_KEY = "last_alert_at";

const NOTIFICATION_TYPES: Record<number, NotificationType> = {
  7: "d7",
  3: "d3",
  1: "d1",
  0: "dday",
};

export type AlertRunResult =
  | { status: "skipped"; reason: "before_alert_hour" | "not_configured" }
  | { status: "done"; sent: number; failed: number };

/**
 * Sends D-7 / D-3 / D-1 / D-day alerts. Runs hourly; nothing is sent before ALERT_HOUR and
 * notification_logs guarantees each alert is sent once, so later runs act as retries.
 */
export async function runBillingAlerts(env: Env, now = new Date()): Promise<AlertRunResult> {
  const timeZone = timeZoneOf(env);
  if (hourIn(timeZone, now) < alertHourOf(env)) {
    return { status: "skipped", reason: "before_alert_hour" };
  }

  const config = discordConfig(env);
  if (!config.botToken || !config.alertChannelId) {
    return { status: "skipped", reason: "not_configured" };
  }

  const today = todayIn(timeZone, now);
  const candidates = await listAlertCandidates(env.DB, today, addDays(today, 7), alertStatuses);
  let sent = 0;
  let failed = 0;

  for (const subscription of candidates) {
    if (!isAllowedDiscordId(env, subscription.owner_discord_id)) {
      continue;
    }

    const type = NOTIFICATION_TYPES[daysBetween(today, subscription.next_billing_date)];
    if (!type) {
      continue;
    }

    const targetDate = subscription.next_billing_date;
    if (!(await claimNotification(env.DB, subscription.id, type, targetDate))) {
      continue;
    }

    try {
      await sendAlertMessage(env, {
        content: `[${dueLabel(targetDate, today)}] ${subscriptionLine(subscription, today)}`,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("Failed to send billing alert", subscription.id, error);
      await releaseNotification(env.DB, subscription.id, type, targetDate);
    }
  }

  if (sent > 0) {
    await setState(env.DB, LAST_ALERT_KEY, now.toISOString());
  }

  return { status: "done", sent, failed };
}

export async function sendTestAlert(env: Env, now = new Date()) {
  const formatted = formatDateTime(now.toISOString(), timeZoneOf(env));
  await sendAlertMessage(env, { content: `구독 알림 테스트입니다. ${formatted}` });
  await setState(env.DB, LAST_ALERT_KEY, now.toISOString());
}
