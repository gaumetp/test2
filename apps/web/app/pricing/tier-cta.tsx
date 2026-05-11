"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

interface TierCTAProps {
  tier: string;
  cta: string;
  href: string;
  isHighlighted: boolean;
}

export function TierCTA({ tier, cta, href, isHighlighted }: TierCTAProps) {
  const { isSignedIn } = useAuth();

  const checkout = trpc.payments.createSubscriptionCheckout.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
  });

  const variant = isHighlighted ? "secondary" : "default";

  // Free tier and Studio+ always use link
  if (tier === "free" || tier === "studio_plus" || !isSignedIn) {
    return (
      <Link href={href} className="w-full">
        <Button className="w-full" variant={variant}>
          {cta}
        </Button>
      </Link>
    );
  }

  return (
    <Button
      className="w-full"
      variant={variant}
      disabled={checkout.isPending}
      onClick={() =>
        checkout.mutate({
          tier: tier as "pro" | "studio" | "studio_plus",
          successUrl: `${window.location.origin}/dashboard/artist/profile?tab=payments`,
          cancelUrl: window.location.href,
        })
      }
    >
      {checkout.isPending ? "Redirecting…" : cta}
    </Button>
  );
}
