import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { db } from "@tattoo-saas/db";
import { eq } from "drizzle-orm";
import { users } from "@tattoo-saas/db";
import { NotificationBell } from "@/components/notification-bell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
    columns: { role: true },
  });

  const isArtist = dbUser?.role === "artist" || dbUser?.role === "studio_owner" || dbUser?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">🖋 InkBook</Link>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex gap-4 text-sm text-muted-foreground">
              {isArtist ? (
                <>
                  <Link href="/dashboard/artist" className="hover:text-foreground transition-colors">Dashboard</Link>
                  <Link href="/dashboard/artist/profile" className="hover:text-foreground transition-colors">Profile</Link>
                  <Link href="/dashboard/artist/availability" className="hover:text-foreground transition-colors">Availability</Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard/client" className="hover:text-foreground transition-colors">My Bookings</Link>
                  <Link href="/browse" className="hover:text-foreground transition-colors">Browse Artists</Link>
                </>
              )}
            </nav>
            <NotificationBell />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
