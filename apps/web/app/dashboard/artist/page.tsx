import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/lib/trpc/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Star, Users } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";

export const metadata = { title: "Artist Dashboard" };

export default async function ArtistDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Artist Dashboard</h1>
          <p className="text-muted-foreground">Manage your bookings and profile</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/artist/availability">
            <Button variant="outline" size="sm">Manage Availability</Button>
          </Link>
          <Link href="/dashboard/artist/profile">
            <Button size="sm">Edit Profile</Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <ArtistStats />
      </Suspense>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
        <RecentBookings />
      </Suspense>
    </div>
  );
}

async function ArtistStats() {
  const { items: bookings } = await api.bookings.listForArtist({ status: "all", limit: 50 });

  const pending = bookings.filter((b) => b.status === "pending").length;
  const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "deposit_paid").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const revenue = bookings
    .filter((b) => b.status === "completed" && b.depositAmount)
    .reduce((sum, b) => sum + Number(b.depositAmount ?? 0), 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending requests</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pending}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{confirmed}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completed}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Deposits received</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPrice(revenue)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

async function RecentBookings() {
  const { items } = await api.bookings.listForArtist({ status: "all", limit: 10 });

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    confirmed: "secondary",
    deposit_paid: "default",
    completed: "default",
    cancelled: "destructive",
    no_show: "destructive",
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Recent Bookings</h2>
      {items.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          No bookings yet. Share your profile to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((booking) => (
            <Link key={booking.id} href={`/dashboard/artist/bookings/${booking.id}`}>
              <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent">
                <div>
                  <p className="font-medium">{booking.client?.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(booking.startAt)} · {booking.serviceType}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {booking.depositAmount && (
                    <span className="text-sm font-medium">{formatPrice(booking.depositAmount)}</span>
                  )}
                  <Badge variant={statusColors[booking.status] ?? "outline"}>
                    {booking.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
