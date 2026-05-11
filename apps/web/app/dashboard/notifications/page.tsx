"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  booking_request: "New booking request",
  booking_confirmed: "Booking confirmed",
  booking_declined: "Booking declined",
  booking_cancelled: "Booking cancelled",
  deposit_paid: "Deposit received",
  new_message: "New message",
  review_request: "Review requested",
  payout_sent: "Payout sent",
  reminder_24h: "Reminder: session tomorrow",
  reminder_1h: "Reminder: session in 1 hour",
};

export default function NotificationsPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.notifications.list.useQuery({
    limit: 50,
    unreadOnly: false,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const unreadCount = items.filter((i) => !i.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-16 text-center">
          <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No notifications yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll let you know when something happens.
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((item) => {
            const url = (item.payload as { url?: string } | null)?.url;
            const content = (
              <div className="flex items-start gap-4 p-4">
                <div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    item.readAt ? "bg-transparent" : "bg-blue-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{TYPE_LABELS[item.type] ?? item.type}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!item.readAt && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markRead.mutate({ id: item.id });
                    }}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            );

            return url ? (
              <Link
                key={item.id}
                href={url}
                onClick={() => {
                  if (!item.readAt) markRead.mutate({ id: item.id });
                }}
                className={`block transition-colors hover:bg-accent/50 ${
                  !item.readAt ? "bg-blue-50/40" : ""
                }`}
              >
                {content}
              </Link>
            ) : (
              <div key={item.id} className={!item.readAt ? "bg-blue-50/40" : ""}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
