import type { BankAccount, BankAccountInput, PaymentCard, PaymentCardInput } from "../lib/types";

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export async function listBankAccounts(db: D1Database, userId: string) {
  const { results } = await db
    .prepare("SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY bank_name, nickname, created_at")
    .bind(userId)
    .all<BankAccount>();
  return results;
}

export function getBankAccount(db: D1Database, userId: string, id: string) {
  return db
    .prepare("SELECT * FROM bank_accounts WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<BankAccount>();
}

export async function createBankAccount(db: D1Database, userId: string, input: BankAccountInput) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO bank_accounts (id, user_id, bank_name, nickname, account_number, holder_name, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, input.bank_name, input.nickname, input.account_number, input.holder_name, input.memo)
    .run();
  return id;
}

export async function updateBankAccount(
  db: D1Database,
  userId: string,
  id: string,
  input: BankAccountInput,
) {
  const result = await db
    .prepare(
      `UPDATE bank_accounts SET bank_name = ?, nickname = ?, account_number = ?, holder_name = ?,
         memo = ?, updated_at = ${NOW}
       WHERE id = ? AND user_id = ?`,
    )
    .bind(input.bank_name, input.nickname, input.account_number, input.holder_name, input.memo, id, userId)
    .run();
  return result.meta.changes > 0;
}

/** Linked cards and subscriptions are detached (ON DELETE SET NULL), not deleted. */
export async function deleteBankAccount(db: D1Database, userId: string, id: string) {
  const result = await db
    .prepare("DELETE FROM bank_accounts WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();
  return result.meta.changes > 0;
}

export async function listPaymentCards(db: D1Database, userId: string) {
  const { results } = await db
    .prepare("SELECT * FROM payment_cards WHERE user_id = ? ORDER BY name, created_at")
    .bind(userId)
    .all<PaymentCard>();
  return results;
}

export function getPaymentCard(db: D1Database, userId: string, id: string) {
  return db
    .prepare("SELECT * FROM payment_cards WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<PaymentCard>();
}

export async function createPaymentCard(db: D1Database, userId: string, input: PaymentCardInput) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO payment_cards (id, user_id, name, last4, bank_account_id, memo)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, input.name, input.last4, input.bank_account_id, input.memo)
    .run();
  return id;
}

export async function updatePaymentCard(
  db: D1Database,
  userId: string,
  id: string,
  input: PaymentCardInput,
) {
  const result = await db
    .prepare(
      `UPDATE payment_cards SET name = ?, last4 = ?, bank_account_id = ?, memo = ?, updated_at = ${NOW}
       WHERE id = ? AND user_id = ?`,
    )
    .bind(input.name, input.last4, input.bank_account_id, input.memo, id, userId)
    .run();
  return result.meta.changes > 0;
}

/** Subscriptions charged to the card are detached (ON DELETE SET NULL), not deleted. */
export async function deletePaymentCard(db: D1Database, userId: string, id: string) {
  const result = await db
    .prepare("DELETE FROM payment_cards WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();
  return result.meta.changes > 0;
}

export async function listPaymentMethods(db: D1Database, userId: string) {
  const [accounts, cards] = await Promise.all([
    listBankAccounts(db, userId),
    listPaymentCards(db, userId),
  ]);
  return { accounts, cards };
}
