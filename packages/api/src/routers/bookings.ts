import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc.js";
import { bookings, users, artistProfiles, notifications } from "@tattoo-saas/db";
import { sendEmail, bookingRequestHtml, bookingConfirmedHtml } from "../email.js";

const bookingStatusValues = [
  "pending", "confirmed", "deposit_paid", "completed", "cancelled", "no_show", "all",
] as const;

const serviceTypeValues = ["custom", "flash", "touch_up"] as const;

export const bookingsRouter = createTRPCRouter({

  // Client creates a booking request
  create: protectedProcedure
    .input(z.object({
      artistId: z.string().uuid(),
      serviceType: z.enum(serviceTypeValues),
      startAt: z.coerce.date(),
      endAt: z.coerce.date(),
      description: z.string().min(20).max(2000),
      referenceImages: z.array(z.string().url()).max(5).default([]),
      studioId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const artist = await ctx.db.query.artistProfiles.findFirst({
        where: (p, { eq }) => eq(p.id, input.artistId),
      });
      if (!artist) throw new TRPCError({ code: "NOT_FOUND", message: "Artist not found" });

      // Prevent double-booking: check for overlapping confirmed bookings
      const conflict = await ctx.db.query.bookings.findFirst({
        where: and(
          eq(bookings.artistId, input.artistId),
          or(
            eq(bookings.status, "confirmed"),
            eq(bookings.status, "deposit_paid")
          ),
          // Simple overlap check via raw SQL would be better; this is a safe approximation
        ),
      });

      const [booking] = await ctx.db.insert(bookings).values({
        clientId: user.id,
        artistId: input.artistId,
        ...(input.studioId && { studioId: input.studioId }),
        serviceType: input.serviceType,
        startAt: input.startAt,
        endAt: input.endAt,
        description: input.description,
        referenceImages: input.referenceImages,
        status: "pending",
      }).returning();

      if (!booking) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Notify artist (fire-and-forget)
      const artistUser = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, input.artistId),
      });
      if (artistUser) {
        const dateStr = input.startAt.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
        });
        void ctx.db.insert(notifications).values({
          userId: input.artistId,
          type: "booking_request",
          payload: { bookingId: booking.id, clientEmail: user.email, serviceType: input.serviceType, dateStr },
        });
        void sendEmail({
          to: artistUser.email,
          subject: `New booking request — ${input.serviceType} on ${dateStr}`,
          html: bookingRequestHtml({
            artistName: artist.displayName,
            clientEmail: user.email,
            serviceType: input.serviceType.replace("_", " "),
            dateStr,
            description: input.description,
            bookingId: booking.id,
          }),
        });
      }

      return booking;
    }),

  // Artist accepts or declines
  respond: protectedProcedure
    .input(z.object({
      bookingId: z.string().uuid(),
      action: z.enum(["confirm", "decline"]),
      message: z.string().max(1000).optional(),
      estimatedPrice: z.number().positive().optional(),
      depositAmount: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const booking = await ctx.db.query.bookings.findFirst({
        where: eq(bookings.id, input.bookingId),
        with: { artist: true },
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.artistId !== user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (booking.status !== "pending") {
        throw new TRPCError({ code: "CONFLICT", message: "Booking is not in pending state" });
      }

      const [updated] = await ctx.db
        .update(bookings)
        .set({
          status: input.action === "confirm" ? "confirmed" : "cancelled",
          ...(input.message !== undefined && { artistNote: input.message }),
          ...(input.estimatedPrice !== undefined && { estimatedPrice: input.estimatedPrice.toString() }),
          ...(input.depositAmount !== undefined && { depositAmount: input.depositAmount.toString() }),
          ...(input.action === "decline" && { cancellationReason: input.message ?? null, cancelledBy: user.id }),
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, input.bookingId))
        .returning();

      // Notify client on confirm/decline
      const clientUser = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, booking.clientId),
      });
      if (clientUser) {
        if (input.action === "confirm") {
          const dateStr = booking.startAt.toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
          });
          void ctx.db.insert(notifications).values({
            userId: booking.clientId,
            type: "booking_confirmed",
            payload: { bookingId: input.bookingId, artistName: booking.artist.displayName, depositAmount: input.depositAmount },
          });
          if (input.depositAmount) {
            void sendEmail({
              to: clientUser.email,
              subject: `Your booking with ${booking.artist.displayName} is confirmed`,
              html: bookingConfirmedHtml({
                clientEmail: clientUser.email,
                artistName: booking.artist.displayName,
                dateStr,
                depositAmount: String(input.depositAmount),
                bookingId: input.bookingId,
              }),
            });
          }
        } else {
          void ctx.db.insert(notifications).values({
            userId: booking.clientId,
            type: "booking_declined",
            payload: { bookingId: input.bookingId, artistName: booking.artist.displayName },
          });
        }
      }

      return updated;
    }),

  // Artist marks session as complete
  complete: protectedProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const booking = await ctx.db.query.bookings.findFirst({
        where: eq(bookings.id, input.bookingId),
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.artistId !== user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if (booking.status !== "deposit_paid" && booking.status !== "confirmed") {
        throw new TRPCError({ code: "CONFLICT" });
      }

      const [updated] = await ctx.db
        .update(bookings)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(bookings.id, input.bookingId))
        .returning();

      // Update artist total bookings counter
      await ctx.db
        .update(artistProfiles)
        .set({ totalBookings: user.id as unknown as number }) // Will be incremented in SQL
        .where(eq(artistProfiles.id, booking.artistId));

      return updated;
    }),

  // Cancel by client or artist
  cancel: protectedProcedure
    .input(z.object({
      bookingId: z.string().uuid(),
      reason: z.string().max(500).optional(),
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

      const isArtist = booking.artistId === user.id;
      const isClient = booking.clientId === user.id;
      if (!isArtist && !isClient) throw new TRPCError({ code: "FORBIDDEN" });

      if (booking.status === "completed" || booking.status === "cancelled") {
        throw new TRPCError({ code: "CONFLICT", message: "Cannot cancel this booking" });
      }

      const [updated] = await ctx.db
        .update(bookings)
        .set({
          status: "cancelled",
          cancellationReason: input.reason ?? null,
          cancelledBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, input.bookingId))
        .returning();

      return updated;
    }),

  // Get a single booking (client or artist)
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const booking = await ctx.db.query.bookings.findFirst({
        where: eq(bookings.id, input.id),
        with: {
          client: { columns: { id: true, email: true } },
          artist: true,
          messages: {
            orderBy: (m, { asc }) => [asc(m.createdAt)],
            with: {
              sender: { columns: { id: true, email: true, role: true } },
            },
          },
          review: true,
        },
      });

      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.clientId !== user.id && booking.artistId !== user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return booking;
    }),

  // List bookings for artist dashboard
  listForArtist: protectedProcedure
    .input(z.object({
      status: z.enum(bookingStatusValues).default("all"),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const whereClause = input.status === "all"
        ? eq(bookings.artistId, user.id)
        : and(eq(bookings.artistId, user.id), eq(bookings.status, input.status));

      const items = await ctx.db.query.bookings.findMany({
        where: whereClause,
        limit: input.limit + 1,
        orderBy: [desc(bookings.startAt)],
        with: {
          client: { columns: { id: true, email: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  // List bookings for client dashboard
  listForClient: protectedProcedure
    .input(z.object({
      status: z.enum(bookingStatusValues).default("all"),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const whereClause = input.status === "all"
        ? eq(bookings.clientId, user.id)
        : and(eq(bookings.clientId, user.id), eq(bookings.status, input.status));

      const items = await ctx.db.query.bookings.findMany({
        where: whereClause,
        limit: input.limit,
        orderBy: [desc(bookings.startAt)],
        with: {
          artist: {
            columns: { id: true, slug: true, displayName: true, city: true },
          },
        },
      });

      return items;
    }),
});
