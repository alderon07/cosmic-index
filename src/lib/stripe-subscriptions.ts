import type Stripe from "stripe";

type SubscriptionLike = Pick<Stripe.Subscription, "status" | "items">;
type SubscriptionItemLike = Stripe.Subscription["items"]["data"][number];

export interface StripeSubscriptionSnapshot {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  endedAt: string | null;
  metadataJson: string | null;
}

const ENTITLED_STATUSES = new Set(["active", "trialing"]);
const NON_MANAGEABLE_STATUSES = new Set(["canceled", "incomplete_expired"]);

function getConfiguredProPriceId(): string | undefined {
  const value = process.env.STRIPE_PRO_PRICE_ID?.trim();
  return value ? value : undefined;
}

export function normalizeStripeTimestamp(
  value: number | null | undefined
): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function normalizeStripeProductId(
  product:
    | string
    | Stripe.Product
    | Stripe.DeletedProduct
    | null
    | undefined
): string | null {
  if (!product) return null;
  return typeof product === "string" ? product : product.id;
}

export function getSubscriptionPriceDetails(
  subscription: SubscriptionLike
): { priceId: string | null; productId: string | null } {
  const preferredItem = getPreferredSubscriptionItem(subscription);

  if (!preferredItem?.price) {
    return { priceId: null, productId: null };
  }

  return {
    priceId: preferredItem.price.id ?? null,
    productId: normalizeStripeProductId(preferredItem.price.product),
  };
}

function getPreferredSubscriptionItem(
  subscription: SubscriptionLike
): SubscriptionItemLike | undefined {
  const configuredPriceId = getConfiguredProPriceId();
  const items = subscription.items.data;

  return (
    (configuredPriceId
      ? items.find((item) => item.price?.id === configuredPriceId)
      : undefined) ?? items[0]
  );
}

export function matchesConfiguredProPrice(
  priceId: string | null | undefined
): boolean {
  const configuredPriceId = getConfiguredProPriceId();
  return Boolean(
    configuredPriceId && priceId && configuredPriceId === priceId
  );
}

export function subscriptionMatchesConfiguredProPrice(
  subscription: SubscriptionLike
): boolean {
  const { priceId } = getSubscriptionPriceDetails(subscription);
  return matchesConfiguredProPrice(priceId);
}

export function isEntitledStripeSubscriptionStatus(
  status: string | null | undefined
): boolean {
  return typeof status === "string" && ENTITLED_STATUSES.has(status);
}

export function isManageableStripeSubscriptionStatus(
  status: string | null | undefined
): boolean {
  return typeof status === "string" && !NON_MANAGEABLE_STATUSES.has(status);
}

export function isEntitledStripeSubscriptionRecord(input: {
  status: string | null | undefined;
  priceId: string | null | undefined;
}): boolean {
  return (
    isEntitledStripeSubscriptionStatus(input.status) &&
    matchesConfiguredProPrice(input.priceId)
  );
}

export function buildStripeSubscriptionSnapshot(
  subscription: Stripe.Subscription
): StripeSubscriptionSnapshot | null {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return null;

  const { priceId, productId } = getSubscriptionPriceDetails(subscription);
  const preferredItem = getPreferredSubscriptionItem(subscription);

  return {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    stripePriceId: priceId,
    stripeProductId: productId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: normalizeStripeTimestamp(
      preferredItem?.current_period_start
    ),
    currentPeriodEnd: normalizeStripeTimestamp(
      preferredItem?.current_period_end
    ),
    endedAt: normalizeStripeTimestamp(subscription.ended_at),
    metadataJson:
      subscription.metadata && Object.keys(subscription.metadata).length > 0
        ? JSON.stringify(subscription.metadata)
        : null,
  };
}
