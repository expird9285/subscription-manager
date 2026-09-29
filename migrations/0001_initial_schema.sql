-- Subscription Manager schema for Cloudflare D1 (SQLite).
-- Dates are stored as ISO strings: `YYYY-MM-DD` for calendar dates and
-- `YYYY-MM-DDTHH:MM:SS.sssZ` for timestamps.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT
);

-- Only the SHA-256 hash of the session token is stored.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  category TEXT,
  price REAL NOT NULL CHECK (price >= 0),
  split_count INTEGER NOT NULL DEFAULT 1 CHECK (split_count BETWEEN 1 AND 99),
  currency TEXT NOT NULL DEFAULT 'KRW' CHECK (length(currency) BETWEEN 3 AND 8),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly', 'weekly', 'custom')),
  next_billing_date TEXT NOT NULL
    CHECK (next_billing_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancel_pending', 'cancelled', 'trial')),
  auto_renew INTEGER NOT NULL DEFAULT 1 CHECK (auto_renew IN (0, 1)),
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX subscriptions_user_next_billing_idx ON subscriptions (user_id, next_billing_date);
CREATE INDEX subscriptions_alert_idx ON subscriptions (next_billing_date, status, auto_renew);

-- Prevents duplicate billing alerts for the same subscription, alert type and billing date.
CREATE TABLE notification_logs (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions (id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('d7', 'd3', 'd1', 'dday')),
  target_date TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (subscription_id, notification_type, target_date)
);

-- Small key/value store for runtime state (exchange-rate snapshot, last alert time).
CREATE TABLE app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
