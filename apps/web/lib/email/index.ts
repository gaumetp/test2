import { Resend } from "resend";

const resend = new Resend(process.env["RESEND_API_KEY"]);
const FROM = process.env["EMAIL_FROM"] ?? "InkBook <noreply@inkbook.io>";

interface BookingRequestEmailProps {
  artistName: string;
  artistEmail: string;
  clientEmail: string;
  serviceType: string;
  startAt: Date;
  description: string;
  bookingId: string;
}

export async function sendBookingRequestEmail({
  artistName,
  artistEmail,
  clientEmail,
  serviceType,
  startAt,
  description,
  bookingId,
}: BookingRequestEmailProps) {
  const dateStr = startAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM,
    to: artistEmail,
    subject: `New booking request — ${serviceType} on ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>New booking request</h2>
        <p>Hi ${artistName},</p>
        <p><strong>${clientEmail}</strong> has requested a <strong>${serviceType}</strong> session on <strong>${dateStr}</strong>.</p>
        <blockquote style="border-left:3px solid #e5e7eb;padding-left:12px;color:#6b7280">${description}</blockquote>
        <a href="${process.env["NEXT_PUBLIC_APP_URL"]}/dashboard/artist/bookings/${bookingId}"
           style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          Review &amp; respond
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">InkBook · Manage your preferences in your dashboard</p>
      </div>
    `,
  });
}

interface BookingConfirmedEmailProps {
  clientEmail: string;
  artistName: string;
  startAt: Date;
  depositAmount: number;
  bookingId: string;
}

export async function sendBookingConfirmedEmail({
  clientEmail,
  artistName,
  startAt,
  depositAmount,
  bookingId,
}: BookingConfirmedEmailProps) {
  const dateStr = startAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Booking confirmed with ${artistName} — pay deposit to lock it in`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Your booking is confirmed!</h2>
        <p><strong>${artistName}</strong> has accepted your session on <strong>${dateStr}</strong>.</p>
        <p>To lock in your appointment, please pay the <strong>$${depositAmount} deposit</strong> within 48 hours.</p>
        <a href="${process.env["NEXT_PUBLIC_APP_URL"]}/booking/${bookingId}/pay"
           style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          Pay deposit
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">InkBook · Your booking will be automatically cancelled if the deposit is not paid within 48 hours.</p>
      </div>
    `,
  });
}

interface DepositPaidEmailProps {
  artistEmail: string;
  artistName: string;
  clientEmail: string;
  depositAmount: number;
  startAt: Date;
  bookingId: string;
}

export async function sendDepositPaidEmail({
  artistEmail,
  artistName,
  clientEmail,
  depositAmount,
  startAt,
  bookingId,
}: DepositPaidEmailProps) {
  const dateStr = startAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM,
    to: artistEmail,
    subject: `Deposit received — ${clientEmail} is locked in for ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Deposit received!</h2>
        <p>Hi ${artistName},</p>
        <p><strong>${clientEmail}</strong> has paid the <strong>$${depositAmount} deposit</strong>.</p>
        <p>Your session on <strong>${dateStr}</strong> is confirmed.</p>
        <a href="${process.env["NEXT_PUBLIC_APP_URL"]}/dashboard/artist/bookings/${bookingId}"
           style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          View booking
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">InkBook</p>
      </div>
    `,
  });
}

interface ReminderEmailProps {
  recipientEmail: string;
  artistName: string;
  startAt: Date;
  bookingId: string;
  isClient: boolean;
}

export async function sendReminderEmail({
  recipientEmail,
  artistName,
  startAt,
  bookingId,
  isClient,
}: ReminderEmailProps) {
  const dateStr = startAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM,
    to: recipientEmail,
    subject: `Reminder: ${isClient ? `Your tattoo session with ${artistName}` : "Session tomorrow"} — ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>${isClient ? "You've got a session tomorrow" : "Session reminder"}</h2>
        <p>Your ${isClient ? `tattoo session with ${artistName}` : "session"} is scheduled for <strong>${dateStr}</strong>.</p>
        <a href="${process.env["NEXT_PUBLIC_APP_URL"]}/dashboard/${isClient ? "client" : "artist"}/bookings/${bookingId}"
           style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          View details
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">InkBook</p>
      </div>
    `,
  });
}
