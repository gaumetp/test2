"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatPrice } from "@/lib/utils";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

interface Props {
  params: { id: string };
}

const STATUS_COLOR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "secondary",
  deposit_paid: "default",
  completed: "default",
  cancelled: "destructive",
  no_show: "destructive",
};

export default function ArtistBookingDetailPage({ params }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: booking, isLoading } = trpc.bookings.byId.useQuery({ id: params.id });

  const respond = trpc.bookings.respond.useMutation({
    onSuccess: () => utils.bookings.byId.invalidate({ id: params.id }),
  });

  const complete = trpc.bookings.complete.useMutation({
    onSuccess: () => utils.bookings.byId.invalidate({ id: params.id }),
  });

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      utils.bookings.byId.invalidate({ id: params.id });
      setMessage("");
    },
  });

  const [message, setMessage] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [declineMessage, setDeclineMessage] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  if (isLoading) {
    return <PageLoading />;
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Booking not found.</p>
      </div>
    );
  }

  const isPending = booking.status === "pending";
  const isActive = booking.status === "confirmed" || booking.status === "deposit_paid";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/artist">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Booking from {booking.client?.email}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(booking.startAt)}</p>
        </div>
        <Badge variant={STATUS_COLOR[booking.status] ?? "outline"}>
          {booking.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Booking details */}
          <div className="rounded-lg border p-5 space-y-4">
            <h2 className="font-semibold">Session details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{booking.serviceType.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(booking.startAt)}</p>
              </div>
              {booking.estimatedPrice && (
                <div>
                  <p className="text-muted-foreground">Estimated price</p>
                  <p className="font-medium">{formatPrice(booking.estimatedPrice)}</p>
                </div>
              )}
              {booking.depositAmount && (
                <div>
                  <p className="text-muted-foreground">Deposit</p>
                  <p className="font-medium">{formatPrice(booking.depositAmount)}</p>
                </div>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Client brief</p>
              <p className="text-sm whitespace-pre-wrap">{booking.description}</p>
            </div>
            {booking.referenceImages && booking.referenceImages.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Reference images</p>
                <div className="flex flex-wrap gap-2">
                  {booking.referenceImages.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Reference {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Respond to pending booking */}
          {isPending && !showDeclineForm && (
            <div className="rounded-lg border p-5 space-y-4">
              <h2 className="font-semibold">Respond to this request</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Deposit amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Estimated total ($)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 300"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={!depositAmount || respond.isPending}
                  onClick={() =>
                    respond.mutate({
                      bookingId: params.id,
                      action: "confirm",
                      depositAmount: Number(depositAmount),
                      estimatedPrice: estimatedPrice ? Number(estimatedPrice) : undefined,
                    })
                  }
                >
                  {respond.isPending ? "Confirming..." : "Accept & send deposit request"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeclineForm(true)}
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          {isPending && showDeclineForm && (
            <div className="rounded-lg border border-destructive/30 p-5 space-y-4">
              <h2 className="font-semibold text-destructive">Decline booking</h2>
              <div className="space-y-2">
                <Label>Reason (optional — will be shown to client)</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Not available, style mismatch..."
                  value={declineMessage}
                  onChange={(e) => setDeclineMessage(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeclineForm(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({
                      bookingId: params.id,
                      action: "decline",
                      message: declineMessage,
                    })
                  }
                >
                  {respond.isPending ? "Declining..." : "Confirm decline"}
                </Button>
              </div>
            </div>
          )}

          {/* Mark complete */}
          {isActive && (
            <div className="rounded-lg border p-5 flex items-center justify-between">
              <div>
                <p className="font-medium">Mark session as complete</p>
                <p className="text-sm text-muted-foreground">
                  Do this after the tattoo session is done. This will prompt the client for a review.
                </p>
              </div>
              <Button
                variant="outline"
                disabled={complete.isPending}
                onClick={() => complete.mutate({ bookingId: params.id })}
              >
                {complete.isPending ? "..." : "Complete"}
              </Button>
            </div>
          )}

          {/* Messaging */}
          <div className="rounded-lg border p-5 space-y-4">
            <h2 className="font-semibold">Messages</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {booking.messages?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No messages yet</p>
              ) : (
                booking.messages?.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{msg.sender?.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm bg-muted rounded-lg px-3 py-2 inline-block">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
            {booking.status !== "cancelled" && booking.status !== "completed" && (
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (message.trim()) {
                        sendMessage.mutate({ bookingId: params.id, content: message.trim() });
                      }
                    }
                  }}
                />
                <Button
                  size="icon"
                  disabled={!message.trim() || sendMessage.isPending}
                  onClick={() => sendMessage.mutate({ bookingId: params.id, content: message.trim() })}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 text-sm space-y-3">
            <p className="font-semibold">Client</p>
            <p className="text-muted-foreground">{booking.client?.email}</p>
            <Separator />
            <p className="font-semibold">Timeline</p>
            <div className="space-y-1 text-muted-foreground text-xs">
              <p>Requested: {new Date(booking.createdAt).toLocaleDateString()}</p>
              {booking.depositPaidAt && (
                <p>Deposit paid: {new Date(booking.depositPaidAt).toLocaleDateString()}</p>
              )}
              {booking.completedAt && (
                <p>Completed: {new Date(booking.completedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
