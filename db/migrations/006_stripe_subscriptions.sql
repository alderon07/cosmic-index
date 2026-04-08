-- Stripe subscription ledger
-- Run after 001-005 to track subscription state independently from users.

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  status TEXT NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT 0,
  current_period_start TEXT,
  current_period_end TEXT,
  ended_at TEXT,
  metadata_json TEXT,
  last_webhook_event_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user
  ON stripe_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer
  ON stripe_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_price_status
  ON stripe_subscriptions(user_id, stripe_price_id, status);
