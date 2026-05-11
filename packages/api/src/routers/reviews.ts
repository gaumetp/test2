import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, avg, count } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc.js";
import { reviews, bookings, artistProfiles } from "@tattoo-saas/db";

export const reviewsRouter = createTRPCRouter({

  create: protectedProcedure
    .input(z.object({
      bookingId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      body: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const booking = await ctx.db.query.bookings.findFirst({
        where: eq(bookings.id, input.bookingId),
      });

      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.clientId !== user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (booking.status !== "completed") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Booking must be completed before reviewing" });
      }

      const [review] = await ctx.db.insert(reviews).values({
        bookingId: input.bookingId,
        clientId: user.id,
        artistId: booking.artistId,
        rating: input.rating,
        body: input.body ?? null,
      }).returning();

      // Recompute artist average rating
      const stats = await ctx.db
        .select({
          avg: avg(reviews.rating),
          count: count(),
        })
        .from(reviews)
        .where(eq(reviews.artistId, booking.artistId));

      const stat = stats[0];
      if (stat) {
        await ctx.db
          .update(artistProfiles)
          .set({
            averageRating: stat.avg ?? "0",
            reviewCount: Number(stat.count),
          })
          .where(eq(artistProfiles.id, booking.artistId));
      }

      return review;
    }),

  // Artist replies to a review
  reply: protectedProcedure
    .input(z.object({
      reviewId: z.string().uuid(),
      reply: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const review = await ctx.db.query.reviews.findFirst({
        where: eq(reviews.id, input.reviewId),
      });

      if (!review) throw new TRPCError({ code: "NOT_FOUND" });
      if (review.artistId !== user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const [updated] = await ctx.db
        .update(reviews)
        .set({ artistReply: input.reply, updatedAt: new Date() })
        .where(eq(reviews.id, input.reviewId))
        .returning();

      return updated;
    }),

  listForArtist: publicProcedure
    .input(z.object({
      artistId: z.string().uuid(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.reviews.findMany({
        where: eq(reviews.artistId, input.artistId),
        limit: input.limit,
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        with: {
          client: { columns: { id: true, email: true } },
        },
      });

      return items;
    }),
});
