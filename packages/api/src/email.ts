// Thin email wrapper — only fires if RESEND_API_KEY is set.
// Fails silently in dev if key is missing so local testing isn't blocked.

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"] ?? "InkBook <noreply@inkbook.io>";
  if (!key) return; // skip in dev without key

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) console.error("Email send failed:", await res.text());
  } catch (err) {
    console.error("Email send error:", err);
  }
}

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

export function bookingRequestHtml(params: {
  artistName: string;
  clientEmail: string;
  serviceType: string;
  dateStr: string;
  description: string;
  bookingId: string;
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="margin-top:0">New booking request</h2>
      <p>Hi ${params.artistName},</p>
      <p><strong>${params.clientEmail}</strong> has requested a <strong>${params.serviceType}</strong> session on <strong>${params.dateStr}</strong>.</p>
      <blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:8px 16px;color:#6b7280">${params.description.slice(0, 300)}${params.description.length > 300 ? "…" : ""}</blockquote>
      <a href="${APP_URL}/dashboard/artist/bookings/${params.bookingId}"
         style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
        Review &amp; respond
      </a>
    </div>`;
}

export function bookingConfirmedHtml(params: {
  clientEmail: string;
  artistName: string;
  dateStr: string;
  depositAmount: string;
  bookingId: string;
}) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="margin-top:0">Booking confirmed! 🎉</h2>
      <p>Hi ${params.clientEmail},</p>
      <p><strong>${params.artistName}</strong> has accepted your session on <strong>${params.dateStr}</strong>.</p>
      <p>To lock in your appointment, pay the <strong>$${params.depositAmount} deposit</strong> within 48 hours.</p>
      <a href="${APP_URL}/booking/${params.bookingId}/pay"
         style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
        Pay deposit now
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">
        Your booking will be automatically cancelled if the deposit is not paid within 48 hours.
      </p>
    </div>`;
}
