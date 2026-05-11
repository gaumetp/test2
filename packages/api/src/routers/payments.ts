import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, artistProcedure } from "../trpc";
import { bookings, artistProfiles, subscriptions } from "@tattoo-saas/db";

// Commission rates by tier (applied to deposit amount)
const COMMISSION_RATES: Record<string, number> = {
  free: 0.12,
  pro: 0.05,
  studio: 0.03,
  studio_plus: 0.02,
};

export const paymentsRouter = createTRPCRouter({

  // Client: get Stripe PaymentIntent client secret to pay deposit
  createDepositIntent: protectedProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, { apiVersion: "2025-02-24.acacia" });

      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const booking = await ctx.db.query.bookings.findFirst({
        where: eq(bookings.id, input.bookingId),
        with: { artist: true },
      });

      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.clientId !== user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (booking.status !== "confirmed") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Booking must be confirmed before payment" });
      }
      if (!booking.depositAmount) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Deposit amount not set" });
      }
      if (!booking.artist.stripeAccountId || !booking.artist.stripeAccountEnabled) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Artist has not completed payment setup" });
      }

      const depositCents = Math.round(Number(booking.depositAmount) * 100);
      const tier = booking.artist.subscriptionTier;
      const commissionRate = COMMISSION_RATES[tier] ?? 0.12;
      const applicationFeeCents = Math.round(depositCents * commissionRate);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: depositCents,
        currency: "usd",
        application_fee_amount: applicationFeeCents,
        transfer_data: { destination: booking.artist.stripeAccountId },
        metadata: {
          bookingId: input.bookingId,
          clientId: user.id,
          artistId: booking.artistId,
        },
      });

      // Store the payment intent ID
      await ctx.db
        .update(bookings)
        .set({ stripePaymentIntentId: paymentIntent.id })
        .where(eq(bookings.id, input.bookingId));

      return { clientSecret: paymentIntent.client_secret! };
    }),

  // Artist: start Stripe Connect onboarding
  createConnectOnboarding: artistProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, { apiVersion: "2025-02-24.acacia" });

      let profile = await ctx.db.query.artistProfiles.findFirst({
        where: (p, { eq }) => eq(p.id, ctx.user.id),
      });

      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      let accountId = profile.stripeAccountId;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          metadata: { userId: ctx.user.id },
        });
        accountId = account.id;

        await ctx.db
          .update(artistProfiles)
          .set({ stripeAccountId: accountId })
          .where(eq(artistProfiles.id, ctx.user.id));
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: input.returnUrl,
        return_url: input.returnUrl,
        type: "account_onboarding",
      });

      return { url: accountLink.url };
    }),

  // Get subscription checkout URL
  createSubscriptionCheckout: protectedProcedure
    .input(z.object({
      tier: z.enum(["pro", "studio", "studio_plus"]),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, { apiVersion: "2025-02-24.acacia" });

      const PRICE_IDS: Record<string, string> = {
        pro: process.env["STRIPE_PRICE_PRO"]!,
        studio: process.env["STRIPE_PRICE_STUDIO"]!,
        studio_plus: process.env["STRIPE_PRICE_STUDIO_PLUS"]!,
      };

      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const priceId = PRICE_IDS[input.tier];
      if (!priceId) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid tier" });

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        ...(user.stripeCustomerId && { customer: user.stripeCustomerId }),
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: { userId: user.id, tier: input.tier },
      });

      return { url: session.url! };
    }),

  // Get current subscription status
  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
        with: { subscription: true },
      });

      return user?.subscription ?? null;
    }),

  // Open Stripe customer portal for subscription management
  createPortalSession: protectedProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, { apiVersion: "2025-02-24.acacia" });

      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (!user.stripeCustomerId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No active subscription to manage" });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: input.returnUrl,
      });

      return { url: session.url };
    }),

  // Refresh Stripe Connect status from Stripe (call after onboarding return)
  refreshConnectStatus: artistProcedure
    .mutation(async ({ ctx }) => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, { apiVersion: "2025-02-24.acacia" });

      const profile = await ctx.db.query.artistProfiles.findFirst({
        where: (p, { eq }) => eq(p.id, ctx.user.id),
      });
      if (!profile?.stripeAccountId) {
        return { enabled: false };
      }

      const account = await stripe.accounts.retrieve(profile.stripeAccountId);
      const enabled = !!(account.charges_enabled && account.payouts_enabled);

      await ctx.db
        .update(artistProfiles)
        .set({ stripeAccountEnabled: enabled })
        .where(eq(artistProfiles.id, ctx.user.id));

      return { enabled };
    }),
});
