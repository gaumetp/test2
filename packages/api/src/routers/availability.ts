import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, artistProcedure } from "../trpc.js";
import { availabilityRules, availabilityOverrides, bookings } from "@tattoo-saas/db";
import { addMinutes, format, parseISO, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";

function generateSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return slots;

  let current = sh * 60 + sm;
  const end = eh * 60 + em;

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += durationMinutes;
  }
  return slots;
}

export const availabilityRouter = createTRPCRouter({

  // Get available time slots for a specific artist on a specific date
  getSlots: publicProcedure
    .input(z.object({
      artistId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      durationMinutes: z.number().min(30).max(480).default(60),
    }))
    .query(async ({ ctx, input }) => {
      const dateObj = new Date(input.date);
      const dayOfWeek = dateObj.getDay();

      // 1. Check for override on this specific date
      const override = await ctx.db.query.availabilityOverrides.findFirst({
        where: and(
          eq(availabilityOverrides.artistId, input.artistId),
          eq(availabilityOverrides.date, input.date)
        ),
      });

      if (override?.isBlocked) {
        return { slots: [], isBlocked: true };
      }

      // 2. Get recurring rule for this day of week
      const rule = await ctx.db.query.availabilityRules.findFirst({
        where: and(
          eq(availabilityRules.artistId, input.artistId),
          eq(availabilityRules.dayOfWeek, dayOfWeek),
          eq(availabilityRules.isActive, true)
        ),
      });

      let rawSlots: string[] = [];

      if (override?.customSlots) {
        // Custom slots defined for this date
        rawSlots = override.customSlots.map((s) => s.start);
      } else if (rule) {
        rawSlots = generateSlots(rule.startTime, rule.endTime, input.durationMinutes);
      }

      if (rawSlots.length === 0) {
        return { slots: [], isBlocked: false };
      }

      // 3. Remove slots that are already booked
      const dayStart = startOfDay(dateObj);
      const dayEnd = endOfDay(dateObj);

      const existingBookings = await ctx.db.query.bookings.findMany({
        where: and(
          eq(bookings.artistId, input.artistId),
        ),
        columns: { startAt: true, endAt: true },
      });

      const bookedSlots = new Set<string>();
      for (const booking of existingBookings) {
        // Mark any slot that overlaps with an existing booking as taken
        rawSlots.forEach((slot) => {
          const [h, m] = slot.split(":").map(Number);
          if (h === undefined || m === undefined) return;
          const slotStart = new Date(dateObj);
          slotStart.setHours(h, m, 0, 0);
          const slotEnd = addMinutes(slotStart, input.durationMinutes);

          if (
            isBefore(slotStart, booking.endAt) &&
            isAfter(slotEnd, booking.startAt)
          ) {
            bookedSlots.add(slot);
          }
        });
      }

      const availableSlots = rawSlots.filter((s) => !bookedSlots.has(s));

      return { slots: availableSlots, isBlocked: false };
    }),

  // Artist sets recurring availability
  setRules: artistProcedure
    .input(z.object({
      rules: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        slotDurationMinutes: z.number().min(30).max(480).default(60),
        isActive: z.boolean().default(true),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Replace all rules for this artist
      await ctx.db.delete(availabilityRules).where(
        eq(availabilityRules.artistId, ctx.user.id)
      );

      if (input.rules.length > 0) {
        await ctx.db.insert(availabilityRules).values(
          input.rules.map((r) => ({ ...r, artistId: ctx.user.id }))
        );
      }

      return { success: true };
    }),

  // Artist blocks or customizes a specific date
  setOverride: artistProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      isBlocked: z.boolean().default(false),
      customSlots: z.array(z.object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })).optional(),
      reason: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(availabilityOverrides)
        .values({ ...input, artistId: ctx.user.id })
        .onConflictDoUpdate({
          target: [availabilityOverrides.artistId, availabilityOverrides.date],
          set: {
            isBlocked: input.isBlocked,
            customSlots: input.customSlots ?? null,
            reason: input.reason ?? null,
          },
        });

      return { success: true };
    }),

  // Get all rules for an artist (for their settings page)
  getRules: artistProcedure
    .query(async ({ ctx }) => {
      const rules = await ctx.db.query.availabilityRules.findMany({
        where: eq(availabilityRules.artistId, ctx.user.id),
        orderBy: (r, { asc }) => [asc(r.dayOfWeek)],
      });
      return rules;
    }),
});
