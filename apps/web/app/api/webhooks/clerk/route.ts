import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db, users } from "@tattoo-saas/db";
import { eq } from "drizzle-orm";

interface ClerkUserCreatedEvent {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string;
  };
}

export async function POST(req: Request) {
  const webhookSecret = process.env["CLERK_WEBHOOK_SECRET"];
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkUserCreatedEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserCreatedEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const primaryEmail = event.data.email_addresses.find(
      (e) => e.id === event.data.primary_email_address_id
    );

    if (primaryEmail) {
      await db.insert(users).values({
        clerkId: event.data.id,
        email: primaryEmail.email_address,
        role: "client",
      }).onConflictDoNothing();
    }
  }

  if (event.type === "user.deleted") {
    await db.delete(users).where(eq(users.clerkId, event.data.id));
  }

  return NextResponse.json({ received: true });
}
