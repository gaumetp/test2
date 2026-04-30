import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db, users } from "@tattoo-saas/db";
import { eq } from "drizzle-orm";

export default async function DashboardRedirectPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user) redirect("/onboarding");

  if (user.role === "artist" || user.role === "studio_owner") {
    redirect("/dashboard/artist");
  }

  redirect("/dashboard/client");
}
