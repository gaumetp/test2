import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { messages, bookings, notifications } from "@tattoo-saas/db";

export const messagesRouter = createTRPCRouter({

  send: protectedProcedure
    .input(z.object({
      bookingId: z.string().uuid(),
      content: z.string().min(1).max(5000),
      attachments: z.array(z.string().url()).max(5).default([]),
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
      if (booking.clientId !== user.id && booking.artistId !== user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (booking.status === "cancelled") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cannot message on a cancelled booking" });
      }

      const [message] = await ctx.db.insert(messages).values({
        bookingId: input.bookingId,
        senderId: user.id,
        content: input.content,
        attachments: input.attachments,
      }).returning();

      // Notify the other party
      const recipientId = user.id === booking.clientId ? booking.artistId : booking.clientId;
      const recipientIsArtist = recipientId === booking.artistId;
      const url = recipientIsArtist
        ? `/dashboard/artist/bookings/${input.bookingId}`
        : `/dashboard/client/bookings/${input.bookingId}`;
      void ctx.db.insert(notifications).values({
        userId: recipientId,
        type: "new_message",
        payload: { bookingId: input.bookingId, senderEmail: user.email, url },
      });

      return message;
    }),

  list: protectedProcedure
    .input(z.object({
      bookingId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const booking = await ctx.db.query.bookings.findFirst({
        where: eq(bookings.id, input.bookingId),
      });

      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.clientId !== user.id && booking.artistId !== user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const items = await ctx.db.query.messages.findMany({
        where: eq(messages.bookingId, input.bookingId),
        limit: input.limit,
        orderBy: (m, { asc }) => [asc(m.createdAt)],
        with: {
          sender: { columns: { id: true, email: true, role: true } },
        },
      });

      // Mark unread messages as read
      await ctx.db
        .update(messages)
        .set({ readAt: new Date() })
        .where(
          eq(messages.bookingId, input.bookingId)
        );

      return items;
    }),
});
