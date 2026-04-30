import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/lib/trpc/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My Bookings" };

export default async function ClientDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">Track your tattoo appointments</p>
        </div>
        <Link href="/browse">
          <Button>Find an artist</Button>
        </Link>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
        <BookingList />
      </Suspense>
    </div>
  );
}

async function BookingList() {
  const bookings = await api.bookings.listForClient({ status: "all" });

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    confirmed: "secondary",
    deposit_paid: "default",
    completed: "default",
    cancelled: "destructive",
    no_show: "destructive",
  };

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border py-20 text-center">
        <p className="text-lg font-medium">No bookings yet</p>
        <p className="mt-2 text-sm text-muted-foreground mb-6">
          Browse artists and submit your first booking request
        </p>
        <Link href="/browse">
          <Button>Browse artists</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <Link key={booking.id} href={`/dashboard/client/bookings/${booking.id}`}>
          <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
            <div>
              <p className="font-medium">{booking.artist?.displayName}</p>
              <p className="text-sm text-muted-foreground">
                {booking.artist?.city && `${booking.artist.city} · `}
                {formatDate(booking.startAt)} · {booking.serviceType}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusColors[booking.status] ?? "outline"}>
                {booking.status.replace("_", " ")}
              </Badge>
              {booking.status === "confirmed" && (
                <Button size="sm" onClick={(e) => e.preventDefault()}>Pay deposit</Button>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
