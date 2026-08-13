"use client";

import { useState, type FormEvent } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

export function PaymentForm({
  amount,
  customerName,
  onSuccess,
}: {
  amount: number;
  customerName?: string;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements || isConfirming) return;

    setIsConfirming(true);
    setError(null);

    // `redirect: "if_required"` keeps PromptPay in-page (QR + polling).
    // Card may complete without redirect; 3DS will redirect when needed.
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment(
      {
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: window.location.href,
        },
      }
    );

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.");
      setIsConfirming(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
      return;
    }

    // Guest closed PromptPay QR early, or payment still processing.
    setIsConfirming(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="min-h-[220px]">
        <PaymentElement
          options={{
            layout: {
              type: "tabs",
              defaultCollapsed: false,
            },
            // PromptPay first (primary for THB guests), then card.
            paymentMethodOrder: ["promptpay", "card"],
            // Collect email when Stripe requires it (always for PromptPay).
            // The webhook reads this from the PaymentIntent / Charge to send
            // the E-Ticket. Stripe's typed API only allows 'auto' | 'never'
            // for email (unlike name, which supports 'always').
            fields: {
              billingDetails: {
                email: "auto",
                name: "auto",
              },
            },
            defaultValues: customerName
              ? {
                  billingDetails: {
                    name: customerName,
                  },
                }
              : undefined,
          }}
          onReady={() => setElementReady(true)}
          onLoadError={(event) => {
            setError(
              event.error.message ??
                "Could not load payment methods. Please refresh and try again."
            );
          }}
        />
        {!elementReady && !error && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Loading PromptPay and card…
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="h-11 w-full gap-2"
        disabled={!stripe || !elementReady || isConfirming}
      >
        {isConfirming && <Loader2 className="size-4 animate-spin" />}
        {isConfirming ? "Waiting for payment…" : `Pay ${formatCurrency(amount)}`}
      </Button>
    </form>
  );
}
