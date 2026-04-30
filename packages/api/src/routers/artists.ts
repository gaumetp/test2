import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, artistProcedure, protectedProcedure } from "../trpc.js";
import { artistProfiles, users } from "@tattoo-saas/db";

const tattooStyles = [
  "realism", "blackwork", "traditional", "neo_traditional", "watercolor",
  "geometric", "japanese", "tribal", "fineline", "illustrative", "dotwork",
  "lettering", "new_school", "biomechanical", "portrait", "minimalist",
] as const;

export const artistsRouter = createTRPCRouter({

  search: publicProcedure
    .input(z.object({
      city: z.string().optional(),
      styles: z.array(z.enum(tattooStyles)).optional(),
      minPrice: z.number().positive().optional(),
      maxPrice: z.number().positive().optional(),
      cursor: z.string().uuid().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.city) {
        conditions.push(ilike(artistProfiles.city, `%${input.city}%`));
      }
      if (input.minPrice) {
        conditions.push(sql`${artistProfiles.minPrice} >= ${input.minPrice}`);
      }
      if (input.maxPrice) {
        conditions.push(sql`${artistProfiles.minPrice} <= ${input.maxPrice}`);
      }

      const items = await ctx.db.query.artistProfiles.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        limit: input.limit + 1,
        orderBy: [desc(artistProfiles.averageRating), desc(artistProfiles.reviewCount)],
        with: {
          portfolio: {
            limit: 6,
            orderBy: (p, { asc }) => [asc(p.displayOrder)],
          },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.db.query.artistProfiles.findFirst({
        where: eq(artistProfiles.slug, input.slug),
        with: {
          portfolio: {
            orderBy: (p, { asc }) => [asc(p.displayOrder)],
          },
          reviews: {
            limit: 10,
            orderBy: (r, { desc }) => [desc(r.createdAt)],
            with: {
              client: { columns: { id: true, email: true } },
            },
          },
          availabilityRules: {
            where: (r, { eq }) => eq(r.isActive, true),
          },
        },
      });

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Artist not found" });
      }

      return profile;
    }),

  updateProfile: artistProcedure
    .input(z.object({
      displayName: z.string().min(2).max(100).optional(),
      bio: z.string().max(2000).optional(),
      city: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      styles: z.array(z.enum(tattooStyles)).optional(),
      hourlyRate: z.number().positive().optional(),
      minPrice: z.number().positive().optional(),
      instagramHandle: z.string().max(100).optional(),
      websiteUrl: z.string().url().optional().or(z.literal("")),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.query.artistProfiles.findFirst({
        where: (p, { eq }) => eq(p.id, ctx.user.id),
      });

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [updated] = await ctx.db
        .update(artistProfiles)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(artistProfiles.id, ctx.user.id))
        .returning();

      return updated;
    }),

  // Called during artist onboarding to create the profile
  createProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().min(2).max(100),
      city: z.string().max(100),
      country: z.string().max(100),
      styles: z.array(z.enum(tattooStyles)).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: (u, { eq }) => eq(u.clerkId, ctx.userId),
      });

      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      if (user.role !== "client") {
        throw new TRPCError({ code: "CONFLICT", message: "Profile already exists" });
      }

      const slug = `${input.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;

      await ctx.db.transaction(async (tx) => {
        await tx.update(users).set({ role: "artist" }).where(eq(users.id, user.id));
        await tx.insert(artistProfiles).values({
          id: user.id,
          slug,
          displayName: input.displayName,
          city: input.city,
          country: input.country,
          styles: input.styles,
        });
      });

      return { slug };
    }),
});
