"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <span className="text-2xl">🖋</span>
          <span>InkBook</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link
            href="/browse"
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname.startsWith("/browse") ? "text-foreground font-medium" : "text-foreground/60"
            )}
          >
            Browse Artists
          </Link>
          <Link
            href="/pricing"
            className={cn(
              "transition-colors hover:text-foreground/80",
              pathname === "/pricing" ? "text-foreground font-medium" : "text-foreground/60"
            )}
          >
            For Artists
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="text-sm text-foreground/70 hover:text-foreground transition-colors">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90">
                  Get started
                </button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
