"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PayDepositPageProps {
  params: { id: string };
}

export default function PayDepositPage({ params }: PayDepositPageProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: booking, isLoading } = trpc.bookings.byId.useQuery({ id: params.id });

  const createIntent = trpc.payments.createDepositIntent.useMutation({
    onSuccess: (data) => setClientSecret(data.clientSecret),
  });

  useEffect(() => {
    if (booking?.status === "confirmed" && !clientSecret) {
      createIntent.mutate({ bookingId: params.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.status]);

  if (!isSignedIn) {
    router.push(`/sign-in?redirect=/booking/${params.id}/pay`);
    return null;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!booking) {
    return <div className="flex min-h-screen items-center justify-center"><p>Booking not found.</p></div>;
  }

  if (booking.status === "deposit_paid" || booking.status === "completed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="text-5xl">✅</div>
        <h1 className="text-xl font-semibold">Deposit already paid</h1>
        <Button onClick={() => router.push(`/dashboard/client/bookings/${params.id}`)}>
          View booking
        </Button>
      </div>
    );
  }

  if (booking.status !== "confirmed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">This booking is not ready for payment (status: {booking.status}).</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/client")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-4 py-4">
        <div className="mx-auto max-w-lg">
          <h1 className="font-semibold">Pay deposit</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 space-y-6">
        {/* Booking summary */}
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <p className="font-semibold">Booking summary</p>
          <div className="flex justify-between text-muted-foreground">
            <span>Artist</span>
            <span className="font-medium text-foreground">{booking.artist?.displayName}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Date</span>
            <span className="font-medium text-foreground">{formatDate(booking.startAt)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service</span>
            <span className="font-medium text-foreground capitalize">{booking.serviceType.replace("_", " ")}</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="font-medium">Deposit due now</span>
            <span className="text-lg font-bold">{formatPrice(booking.depositAmount ?? 0)}</span>
          </div>
          {booking.estimatedPrice && (
            <p className="text-xs text-muted-foreground">
              Estimated total: {formatPrice(booking.estimatedPrice)} · Deposit will be deducted from final price
            </p>
          )}
        </div>

        {/* Stripe Elements */}
        {clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe" } }}
          >
            <PaymentForm bookingId={params.id} amount={Number(booking.depositAmount ?? 0)} />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Payments are processed securely by Stripe. InkBook never stores your card details.
        </div>
      </main>
    </div>
  );
}

function PaymentForm({ bookingId, amount }: { bookingId: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/${bookingId}/pay/success`,
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
    }
    // On success, Stripe redirects to return_url
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={!stripe || isProcessing}>
        {isProcessing ? "Processing..." : `Pay ${formatPrice(amount)}`}
      </Button>
    </form>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
    </div>
  );
}
