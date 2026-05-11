"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

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

export function NotificationBell() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: count = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const { data: items = [] } = trpc.notifications.list.useQuery(
    { limit: 10, unreadOnly: false },
    { enabled: open }
  );

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              {count > 0 && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => markAllRead.mutate()}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet
                </p>
              ) : (
                items.map((item) => {
                  const url = (item.payload as { url?: string } | null)?.url;
                  const body = (
                    <div className="flex flex-1 items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {TYPE_LABELS[item.type] ?? item.type}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
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
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );

                  const className = `flex items-start gap-3 border-b px-4 py-3 last:border-0 ${
                    !item.readAt ? "bg-accent/40" : ""
                  } ${url ? "cursor-pointer hover:bg-accent" : ""}`;

                  return url ? (
                    <Link
                      key={item.id}
                      href={url}
                      className={className}
                      onClick={() => {
                        if (!item.readAt) markRead.mutate({ id: item.id });
                        setOpen(false);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div key={item.id} className={className}>{body}</div>
                  );
                })
              )}
            </div>

            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block border-t px-4 py-2.5 text-center text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
