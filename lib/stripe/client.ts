import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Loads (and caches) the Stripe.js singleton used by embedded
 * `<Elements>`/`<PaymentElement>` checkout. Stripe's own guidance is to call
 * `loadStripe` once per page load, not on every render/mount.
 *
 * Returns `null` (instead of throwing) when the publishable key is missing
 * so the payment UI can show a clear error instead of crashing the tree.
 */
export function getBrowserStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
    if (!publishableKey) {
      console.error(
        "[stripe] Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. Add your pk_test_/pk_live_ key to .env.local and restart the dev server."
      );
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
