import type {
  Subscription,
  SubscriptionInput,
  SubscriptionStatus,
} from "../lib/types";

type SubscriptionRow = Omit<Subscription, "auto_renew"> & { auto_renew: number };

function fromRow(row: SubscriptionRow): Subscription {
  return { ...row, price: Number(row.price), auto_renew: row.auto_renew === 1 };
}

async function all(statement: D1PreparedStatement) {
  const { results } = await statement.all<SubscriptionRow>();
  return results.map(fromRow);
}

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export function listSubscriptions(db: D1Database, userId: string) {
  return all(
    db
      .prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY next_billing_date, name")
      .bind(userId),
  );
}

export async function getSubscription(db: D1Database, userId: string, id: string) {
  const row = await db
    .prepare("SELECT * FROM subscriptions WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<SubscriptionRow>();
  return row ? fromRow(row) : null;
}

export async function createSubscription(db: D1Database, userId: string, input: SubscriptionInput) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO subscriptions (
         id, user_id, name, category, price, split_count, currency, billing_cycle,
         next_billing_date, payment_method, status, auto_renew, memo
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      userId,
      input.name,
      input.category,
      input.price,
      input.split_count,
      input.currency,
      input.billing_cycle,
      input.next_billing_date,
      input.payment_method,
      input.status,
      input.auto_renew ? 1 : 0,
      input.memo,
    )
    .run();
  return id;
}

/** Returns false when the subscription does not exist or belongs to another user. */
export async function updateSubscription(
  db: D1Database,
  userId: string,
  id: string,
  input: SubscriptionInput,
) {
  const result = await db
    .prepare(
      `UPDATE subscriptions SET
         name = ?, category = ?, price = ?, split_count = ?, currency = ?, billing_cycle = ?,
         next_billing_date = ?, payment_method = ?, status = ?, auto_renew = ?, memo = ?,
         updated_at = ${NOW}
       WHERE id = ? AND user_id = ?`,
    )
    .bind(
      input.name,
      input.category,
      input.price,
      input.split_count,
      input.currency,
      input.billing_cycle,
      input.next_billing_date,
      input.payment_method,
      input.status,
      input.auto_renew ? 1 : 0,
      input.memo,
      id,
      userId,
    )
    .run();
  return result.meta.changes > 0;
}

export async function updateSubscriptionStatus(
  db: D1Database,
  userId: string,
  id: string,
  status: SubscriptionStatus,
) {
  const result = await db
    .prepare(`UPDATE subscriptions SET status = ?, updated_at = ${NOW} WHERE id = ? AND user_id = ?`)
    .bind(status, id, userId)
    .run();
  return result.meta.changes > 0;
}

export async function setAutoRenew(db: D1Database, userId: string, id: string, autoRenew: boolean) {
  const result = await db
    .prepare(`UPDATE subscriptions SET auto_renew = ?, updated_at = ${NOW} WHERE id = ? AND user_id = ?`)
    .bind(autoRenew ? 1 : 0, id, userId)
    .run();
  return result.meta.changes > 0;
}

export async function deleteSubscription(db: D1Database, userId: string, id: string) {
  const result = await db
    .prepare("DELETE FROM subscriptions WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();
  return result.meta.changes > 0;
}

function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

/** A user's subscriptions with the given statuses whose next billing date is within [from, to]. */
export function listUserSubscriptionsBetween(
  db: D1Database,
  userId: string,
  from: string,
  to: string,
  statuses: readonly SubscriptionStatus[],
  options: { autoRenewOnly?: boolean } = {},
) {
  return all(
    db
      .prepare(
        `SELECT * FROM subscriptions
         WHERE user_id = ? AND next_billing_date BETWEEN ? AND ?
           AND status IN (${placeholders(statuses)})
           ${options.autoRenewOnly ? "AND auto_renew = 1" : ""}
         ORDER BY next_billing_date, name`,
      )
      .bind(userId, from, to, ...statuses),
  );
}

export function listUserSubscriptionsByStatus(
  db: D1Database,
  userId: string,
  statuses: readonly SubscriptionStatus[],
) {
  return all(
    db
      .prepare(
        `SELECT * FROM subscriptions
         WHERE user_id = ? AND status IN (${placeholders(statuses)})
         ORDER BY next_billing_date, name`,
      )
      .bind(userId, ...statuses),
  );
}

/** Subscriptions of every user that may need a billing alert between `from` and `to`. */
export async function listAlertCandidates(
  db: D1Database,
  from: string,
  to: string,
  statuses: readonly SubscriptionStatus[],
) {
  const { results } = await db
    .prepare(
      `SELECT subscriptions.*, users.discord_id AS owner_discord_id
       FROM subscriptions JOIN users ON users.id = subscriptions.user_id
       WHERE subscriptions.next_billing_date BETWEEN ? AND ?
         AND subscriptions.auto_renew = 1
         AND subscriptions.status IN (${placeholders(statuses)})
       ORDER BY subscriptions.next_billing_date, subscriptions.name`,
    )
    .bind(from, to, ...statuses)
    .all<SubscriptionRow & { owner_discord_id: string }>();

  return results.map((row) => ({ ...fromRow(row), owner_discord_id: row.owner_discord_id }));
}

export async function countSubscriptions(db: D1Database, userId: string) {
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}
