"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface MessageThreadProps {
  bookingId: string;
  meId: string;
  disabled?: boolean;
  disabledReason?: string;
}

function formatDayLabel(date: Date) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yest)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function MessageThread({
  bookingId,
  meId,
  disabled,
  disabledReason,
}: MessageThreadProps) {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.messages.list.useQuery(
    { bookingId },
    { refetchInterval: 5000 }
  );

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      utils.messages.list.invalidate({ bookingId });
      utils.notifications.unreadCount.invalidate();
      setDraft("");
    },
  });

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  const submit = () => {
    const content = draft.trim();
    if (!content || disabled) return;
    sendMessage.mutate({ bookingId, content });
  };

  let lastDayLabel: string | null = null;

  return (
    <div className="rounded-lg border p-5 space-y-4">
      <h2 className="font-semibold">Messages</h2>

      <div
        ref={scrollRef}
        className="h-80 overflow-y-auto rounded-md bg-muted/30 p-3 space-y-1"
      >
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-muted" />
            <div className="ml-auto h-10 w-1/2 animate-pulse rounded-2xl bg-muted" />
            <div className="h-10 w-3/5 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : items.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            No messages yet
          </p>
        ) : (
          items.map((m) => {
            const mine = m.senderId === meId;
            const day = formatDayLabel(new Date(m.createdAt));
            const showDay = day !== lastDayLabel;
            lastDayLabel = day;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-2 flex items-center justify-center">
                    <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {day}
                    </span>
                  </div>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-foreground text-background"
                        : "bg-background border"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-background/60" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {disabled ? (
        <p className="text-center text-xs text-muted-foreground">
          {disabledReason ?? "Messaging is closed for this booking."}
        </p>
      ) : (
        <div className="flex gap-2">
          <Textarea
            rows={2}
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="icon"
            disabled={!draft.trim() || sendMessage.isPending}
            onClick={submit}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
