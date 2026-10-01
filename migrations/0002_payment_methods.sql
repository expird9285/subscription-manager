-- Bank accounts and payment cards, so each subscription can name the card it is charged to
-- (and the account behind it) and, for split plans, the account members pay their share into.

CREATE TABLE bank_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL CHECK (length(trim(bank_name)) > 0),
  nickname TEXT,
  account_number TEXT,
  holder_name TEXT,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX bank_accounts_user_idx ON bank_accounts (user_id);

CREATE TABLE payment_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  last4 TEXT CHECK (last4 IS NULL OR last4 GLOB '[0-9][0-9][0-9][0-9]'),
  bank_account_id TEXT REFERENCES bank_accounts (id) ON DELETE SET NULL,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX payment_cards_user_idx ON payment_cards (user_id);
CREATE INDEX payment_cards_account_idx ON payment_cards (bank_account_id);

ALTER TABLE subscriptions ADD COLUMN payment_card_id TEXT REFERENCES payment_cards (id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN collection_account_id TEXT REFERENCES bank_accounts (id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN share_token TEXT;

CREATE INDEX subscriptions_payment_card_idx ON subscriptions (payment_card_id);
CREATE INDEX subscriptions_collection_account_idx ON subscriptions (collection_account_id);
CREATE UNIQUE INDEX subscriptions_share_token_idx ON subscriptions (share_token) WHERE share_token IS NOT NULL;
