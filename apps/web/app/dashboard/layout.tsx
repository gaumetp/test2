import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">🖋 InkBook</Link>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex gap-4 text-sm text-muted-foreground">
              <Link href="/dashboard/artist" className="hover:text-foreground transition-colors">Artist</Link>
              <Link href="/dashboard/client" className="hover:text-foreground transition-colors">Client</Link>
            </nav>
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
