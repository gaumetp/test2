import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { notifications, users } from "@tattoo-saas/db";

export const notificationsRouter = createTRPCRouter({

  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
        columns: { id: true },
      });
      if (!user) return 0;

      const [row] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

      return row?.count ?? 0;
    }),

  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      unreadOnly: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
        columns: { id: true },
      });
      if (!user) return [];

      const items = await ctx.db.query.notifications.findMany({
        where: input.unreadOnly
          ? and(eq(notifications.userId, user.id), isNull(notifications.readAt))
          : eq(notifications.userId, user.id),
        limit: input.limit,
        orderBy: (n, { desc }) => [desc(n.createdAt)],
      });

      return items;
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
        columns: { id: true },
      });
      if (!user) return;

      await ctx.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, user.id)));
    }),

  markAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
        columns: { id: true },
      });
      if (!user) return;

      await ctx.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    }),
});
