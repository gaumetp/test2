"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SuccessPageProps {
  params: { id: string };
}

export default function PaymentSuccessPage({ params }: SuccessPageProps) {
  const searchParams = useSearchParams();
  const paymentIntent = searchParams.get("payment_intent");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="text-6xl">🎉</div>
      <div>
        <h1 className="text-2xl font-bold">Deposit paid!</h1>
        <p className="mt-2 text-muted-foreground">
          Your appointment is confirmed. The artist will be notified.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href={`/dashboard/client/bookings/${params.id}`}>
          <Button>View booking</Button>
        </Link>
        <Link href="/browse">
          <Button variant="outline">Browse more artists</Button>
        </Link>
      </div>
    </div>
  );
}
