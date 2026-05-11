import { NextResponse } from "next/server";
import {
  db,
  bookings,
  users,
  artistProfiles,
  notifications,
} from "@tattoo-saas/db";
import { and, between, eq, gt, inArray } from "drizzle-orm";
import { sendReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReminderType = "reminder_24h" | "reminder_1h";

const WINDOWS: Record<ReminderType, { offsetMinutes: number; toleranceMinutes: number }> = {
  reminder_24h: { offsetMinutes: 24 * 60, toleranceMinutes: 30 },
  reminder_1h: { offsetMinutes: 60, toleranceMinutes: 15 },
};

export async function GET(req: Request) {
  const secret = process.env["CRON_SECRET"];
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = Date.now();
  let sent24h = 0;
  let sent1h = 0;

  for (const [type, window] of Object.entries(WINDOWS) as [
    ReminderType,
    typeof WINDOWS["reminder_24h"],
  ][]) {
    const targetMs = now + window.offsetMinutes * 60_000;
    const start = new Date(targetMs - window.toleranceMinutes * 60_000);
    const end = new Date(targetMs + window.toleranceMinutes * 60_000);

    const dueBookings = await db
      .select({
        id: bookings.id,
        clientId: bookings.clientId,
        artistId: bookings.artistId,
        startAt: bookings.startAt,
        clientEmail: users.email,
        artistDisplayName: artistProfiles.displayName,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.clientId))
      .innerJoin(artistProfiles, eq(artistProfiles.id, bookings.artistId))
      .where(
        and(
          inArray(bookings.status, ["confirmed", "deposit_paid"]),
          between(bookings.startAt, start, end),
        )
      );

    if (dueBookings.length === 0) continue;

    // Filter out bookings that already have this reminder type sent recently.
    // 48h covers any feasible window for both 24h and 1h reminders without scanning history.
    const sinceCutoff = new Date(now - 48 * 60 * 60_000);
    const existing = await db
      .select({ payload: notifications.payload })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, type),
          gt(notifications.createdAt, sinceCutoff),
        )
      );
    const alreadySent = new Set(
      existing
        .map((e) => (e.payload as { bookingId?: string } | null)?.bookingId)
        .filter((id): id is string => !!id)
    );

    for (const booking of dueBookings) {
      if (alreadySent.has(booking.id)) continue;

      const clientUrl = `/dashboard/client/bookings/${booking.id}`;
      const artistUrl = `/dashboard/artist/bookings/${booking.id}`;

      await db.insert(notifications).values([
        {
          userId: booking.clientId,
          type,
          payload: { bookingId: booking.id, url: clientUrl },
        },
        {
          userId: booking.artistId,
          type,
          payload: { bookingId: booking.id, url: artistUrl },
        },
      ]);

      // Artist user record for email
      const artistUser = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, booking.artistId),
      });

      const isOneHour = type === "reminder_1h";

      void sendReminderEmail({
        recipientEmail: booking.clientEmail,
        artistName: booking.artistDisplayName,
        startAt: booking.startAt,
        bookingId: booking.id,
        isClient: true,
      }).catch(() => {});

      if (artistUser?.email) {
        void sendReminderEmail({
          recipientEmail: artistUser.email,
          artistName: booking.artistDisplayName,
          startAt: booking.startAt,
          bookingId: booking.id,
          isClient: false,
        }).catch(() => {});
      }

      if (isOneHour) sent1h++;
      else sent24h++;
    }
  }

  return NextResponse.json({ ok: true, sent24h, sent1h });
}
