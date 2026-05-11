import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, artistProcedure } from "../trpc";
import { portfolioItems, artistProfiles } from "@tattoo-saas/db";

const FREE_TIER_LIMIT = 5;

export const portfoliosRouter = createTRPCRouter({

  add: artistProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      cloudinaryPublicId: z.string().optional(),
      caption: z.string().max(500).optional(),
      style: z.string().optional(),
      bodyPart: z.string().max(100).optional(),
      isFlash: z.boolean().default(false),
      flashPrice: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.query.artistProfiles.findFirst({
        where: (p, { eq }) => eq(p.id, ctx.user.id),
        with: { portfolio: { columns: { id: true } } },
      });
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });

      if (
        profile.subscriptionTier === "free" &&
        profile.portfolio.length >= FREE_TIER_LIMIT
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Free plan is limited to ${FREE_TIER_LIMIT} portfolio images. Upgrade to Pro for unlimited.`,
        });
      }

      const maxOrder = profile.portfolio.length;

      const [item] = await ctx.db.insert(portfolioItems).values({
        artistId: ctx.user.id,
        imageUrl: input.imageUrl,
        cloudinaryPublicId: input.cloudinaryPublicId ?? null,
        caption: input.caption ?? null,
        style: (input.style ?? null) as never,
        bodyPart: input.bodyPart ?? null,
        isFlash: input.isFlash,
        flashPrice: input.flashPrice != null ? input.flashPrice.toString() : null,
        displayOrder: maxOrder,
      }).returning();

      return item;
    }),

  delete: artistProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.portfolioItems.findFirst({
        where: and(
          eq(portfolioItems.id, input.id),
          eq(portfolioItems.artistId, ctx.user.id)
        ),
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.delete(portfolioItems).where(eq(portfolioItems.id, input.id));
      return { success: true };
    }),

  reorder: artistProcedure
    .input(z.object({
      orderedIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update each item's display order
      await Promise.all(
        input.orderedIds.map((id, index) =>
          ctx.db
            .update(portfolioItems)
            .set({ displayOrder: index })
            .where(and(
              eq(portfolioItems.id, id),
              eq(portfolioItems.artistId, ctx.user.id)
            ))
        )
      );
      return { success: true };
    }),

  list: artistProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.portfolioItems.findMany({
        where: eq(portfolioItems.artistId, ctx.user.id),
        orderBy: (p, { asc }) => [asc(p.displayOrder)],
      });
    }),
});
