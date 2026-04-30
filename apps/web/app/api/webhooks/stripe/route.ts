import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db, bookings, subscriptions, artistProfiles, users } from "@tattoo-saas/db";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env["STRIPE_WEBHOOK_SECRET"]!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingId = intent.metadata["bookingId"];
      if (bookingId) {
        await db
          .update(bookings)
          .set({ status: "deposit_paid", depositPaidAt: new Date(), updatedAt: new Date() })
          .where(eq(bookings.id, bookingId));
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata["userId"];
      const tier = sub.metadata["tier"] as "pro" | "studio" | "studio_plus";

      if (userId && tier) {
        await db
          .insert(subscriptions)
          .values({
            userId,
            stripeSubscriptionId: sub.id,
            tier,
            status: sub.status as "active" | "past_due" | "cancelled" | "trialing",
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          })
          .onConflictDoUpdate({
            target: subscriptions.userId,
            set: {
              status: sub.status as "active" | "past_due" | "cancelled" | "trialing",
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              updatedAt: new Date(),
            },
          });

        // Sync tier to artist profile
        await db
          .update(artistProfiles)
          .set({ subscriptionTier: tier })
          .where(eq(artistProfiles.id, userId));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata["userId"];
      if (userId) {
        await db
          .update(subscriptions)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        await db
          .update(artistProfiles)
          .set({ subscriptionTier: "free" })
          .where(eq(artistProfiles.id, userId));
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      // Artist completed Connect onboarding
      if (account.charges_enabled && account.payouts_enabled) {
        await db
          .update(artistProfiles)
          .set({ stripeAccountEnabled: true })
          .where(eq(artistProfiles.stripeAccountId, account.id));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
