import type { NotificationType } from "../lib/types";

/**
 * Records an alert before it is sent. Returns false if the same alert was already
 * claimed, which makes concurrent or repeated cron runs send each alert at most once.
 */
export async function claimNotification(
  db: D1Database,
  subscriptionId: string,
  type: NotificationType,
  targetDate: string,
) {
  const result = await db
    .prepare(
      `INSERT INTO notification_logs (id, subscription_id, notification_type, target_date)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (subscription_id, notification_type, target_date) DO NOTHING`,
    )
    .bind(crypto.randomUUID(), subscriptionId, type, targetDate)
    .run();
  return result.meta.changes > 0;
}

/** Undo a claim when sending failed so the next cron run retries it. */
export async function releaseNotification(
  db: D1Database,
  subscriptionId: string,
  type: NotificationType,
  targetDate: string,
) {
  await db
    .prepare(
      `DELETE FROM notification_logs
       WHERE subscription_id = ? AND notification_type = ? AND target_date = ?`,
    )
    .bind(subscriptionId, type, targetDate)
    .run();
}
