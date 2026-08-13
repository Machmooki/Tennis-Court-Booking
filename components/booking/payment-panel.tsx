"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { PaymentForm } from "@/components/booking/payment-form";
import { getBrowserStripe } from "@/lib/stripe/client";

interface PaymentPanelProps {
  clientSecret: string;
  amount: number;
  customerName?: string;
  onSuccess: (paymentIntentId: string) => void;
}

/**
 * Loads Stripe.js and mounts the Stripe `<Elements>` provider + embedded
 * `<PaymentElement>` (PromptPay QR and card) for a given PaymentIntent.
 * Rendered on the dedicated payment page - never inside a modal dialog.
 */
export function PaymentPanel({
  clientSecret,
  amount,
  customerName,
  onSuccess,
}: PaymentPanelProps) {
  const [stripe, setStripe] = useState<Stripe | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getBrowserStripe().then((instance) => {
      if (cancelled) return;
      if (!instance) {
        setLoadError(
          "Payments are not configured. Missing Stripe publishable key."
        );
        setStripe(null);
        return;
      }
      setLoadError(null);
      setStripe(instance);
    });

    return () => {
      cancelled = true;
    };
    // `clientSecret` isn't read here, but each new PaymentIntent should
    // re-resolve Stripe.js fresh rather than reuse a stale promise result.
  }, [clientSecret]);

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  }

  if (!stripe) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Elements
      key={clientSecret}
      stripe={stripe}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
        locale: "en",
      }}
    >
      <PaymentForm amount={amount} customerName={customerName} onSuccess={onSuccess} />
    </Elements>
  );
}
