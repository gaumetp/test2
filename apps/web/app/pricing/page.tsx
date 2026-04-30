import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata = {
  title: "Pricing — InkBook",
  description: "Simple, transparent pricing for tattoo artists.",
};

const TIERS = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Try it out. No credit card needed.",
    commission: "12% on deposit",
    highlight: false,
    features: [
      "Artist profile page",
      "Up to 5 portfolio images",
      "Up to 10 bookings / month",
      "Deposit payment via Stripe",
      "Client messaging",
      "Basic dashboard",
    ],
    cta: "Start free",
    href: "/onboarding/artist",
  },
  {
    name: "Pro",
    price: 29,
    period: "/month",
    description: "For active independent artists.",
    commission: "5% on deposit",
    highlight: true,
    features: [
      "Everything in Free",
      "Unlimited portfolio images",
      "Unlimited bookings",
      "Analytics dashboard",
      "Priority in search results",
      "Flash design listings",
      "Custom booking link",
      "Email support",
    ],
    cta: "Get Pro",
    href: "/onboarding/artist?tier=pro",
  },
  {
    name: "Studio",
    price: 89,
    period: "/month",
    description: "For studios with up to 5 artists.",
    commission: "3% on deposit",
    highlight: false,
    features: [
      "Everything in Pro",
      "Up to 5 artist seats",
      "Studio profile page",
      "Unified calendar view",
      "Commission split settings",
      "Priority support",
    ],
    cta: "Get Studio",
    href: "/onboarding/artist?tier=studio",
  },
  {
    name: "Studio+",
    price: 149,
    period: "/month",
    description: "For large studios with up to 15 artists.",
    commission: "2% on deposit",
    highlight: false,
    features: [
      "Everything in Studio",
      "Up to 15 artist seats",
      "Dedicated onboarding",
      "Custom integrations",
      "SLA support",
    ],
    cta: "Contact us",
    href: "mailto:hello@inkbook.io",
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            No hidden fees. Commission applies to deposit only — not the full session price.
          </p>
        </section>

        {/* Tiers */}
        <section className="container mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-lg border p-6 ${
                  tier.highlight
                    ? "border-foreground bg-foreground text-background shadow-xl"
                    : "bg-card"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-foreground">
                    Most popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${tier.price}</span>
                    <span className={`text-sm ${tier.highlight ? "text-background/70" : "text-muted-foreground"}`}>
                      {tier.period}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm ${tier.highlight ? "text-background/70" : "text-muted-foreground"}`}>
                    {tier.description}
                  </p>
                  <div className={`mt-2 inline-block rounded-md px-2 py-1 text-xs font-medium ${
                    tier.highlight ? "bg-white/20 text-background" : "bg-muted text-muted-foreground"
                  }`}>
                    {tier.commission}
                  </div>
                </div>

                <ul className="mb-8 flex-1 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tier.highlight ? "text-background" : "text-foreground"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href={tier.href}>
                  <Button
                    className="w-full"
                    variant={tier.highlight ? "secondary" : "default"}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-20">
            <h2 className="mb-8 text-center text-2xl font-bold">Common questions</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                {
                  q: "What is the commission applied to?",
                  a: "Commission is taken from the deposit only — not the full session price. A $100 deposit on the Pro plan costs you $5 in commission.",
                },
                {
                  q: "When do I get paid?",
                  a: "Deposits are transferred to your Stripe Connect account automatically after the payment clears, minus the platform fee.",
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes. Cancel your subscription at any time from your dashboard. You keep access until the end of the billing period.",
                },
                {
                  q: "Do clients pay any fees?",
                  a: "No. All fees are on the artist side. The price clients see is what they pay.",
                },
              ].map((item) => (
                <div key={item.q} className="rounded-lg border p-5">
                  <p className="font-semibold">{item.q}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
