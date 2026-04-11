-- Retire legacy users.stripe_subscription_id in favor of stripe_subscriptions.
-- Safe after 006_stripe_subscriptions.sql has been applied.

ALTER TABLE users DROP COLUMN stripe_subscription_id;
