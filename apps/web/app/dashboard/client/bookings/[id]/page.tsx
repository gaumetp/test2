"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageThread } from "@/components/message-thread";
import { formatDate, formatPrice } from "@/lib/utils";
import { ArrowLeft, Star } from "lucide-react";

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

export default function ClientBookingDetailPage({ params }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: booking, isLoading } = trpc.bookings.byId.useQuery({ id: params.id });

  const cancel = trpc.bookings.cancel.useMutation({
    onSuccess: () => utils.bookings.byId.invalidate({ id: params.id }),
  });

  const submitReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      utils.bookings.byId.invalidate({ id: params.id });
      setShowReviewForm(false);
    },
  });

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");

  if (isLoading) return <PageLoading />;
  if (!booking) return <div className="flex min-h-[50vh] items-center justify-center">Booking not found.</div>;

  const canCancel = booking.status === "pending" || booking.status === "confirmed";
  const canPay = booking.status === "confirmed" && booking.depositAmount;
  const canReview = booking.status === "completed" && !booking.review;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/client">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Session with {booking.artist?.displayName}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(booking.startAt)}</p>
        </div>
        <Badge variant={STATUS_COLOR[booking.status] ?? "outline"}>
          {booking.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Booking info */}
          <div className="rounded-lg border p-5 space-y-3">
            <h2 className="font-semibold">Session details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Artist</p>
                <Link href={`/artists/${booking.artist?.slug}`} className="font-medium hover:underline">
                  {booking.artist?.displayName}
                </Link>
              </div>
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
                  <p className="text-muted-foreground">Estimated total</p>
                  <p className="font-medium">{formatPrice(booking.estimatedPrice)}</p>
                </div>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your brief</p>
              <p className="text-sm">{booking.description}</p>
            </div>
            {booking.artistNote && (
              <div className="bg-muted rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Message from artist</p>
                <p className="text-sm">{booking.artistNote}</p>
              </div>
            )}
          </div>

          {/* Pay deposit */}
          {canPay && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-3">
              <h2 className="font-semibold text-green-900">Your booking is confirmed!</h2>
              <p className="text-sm text-green-800">
                {booking.artist?.displayName} has accepted your request.
                Pay the <strong>{formatPrice(booking.depositAmount!)}</strong> deposit to lock in your appointment.
              </p>
              <Button onClick={() => router.push(`/booking/${params.id}/pay`)}>
                Pay {formatPrice(booking.depositAmount!)} deposit
              </Button>
            </div>
          )}

          {/* Leave review */}
          {canReview && !showReviewForm && (
            <div className="rounded-lg border p-5 space-y-3">
              <h2 className="font-semibold">Leave a review</h2>
              <p className="text-sm text-muted-foreground">
                How was your experience? Help other clients find great artists.
              </p>
              <Button onClick={() => setShowReviewForm(true)}>Write a review</Button>
            </div>
          )}

          {canReview && showReviewForm && (
            <div className="rounded-lg border p-5 space-y-4">
              <h2 className="font-semibold">Write your review</h2>
              <div className="space-y-2">
                <p className="text-sm font-medium">Rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)}>
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Comment (optional)</p>
                <Textarea
                  rows={4}
                  placeholder="Share your experience with this artist..."
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                <Button
                  disabled={submitReview.isPending}
                  onClick={() => submitReview.mutate({
                    bookingId: params.id,
                    rating,
                    body: reviewBody || undefined,
                  })}
                >
                  {submitReview.isPending ? "Submitting..." : "Submit review"}
                </Button>
              </div>
            </div>
          )}

          {/* Show submitted review */}
          {booking.review && (
            <div className="rounded-lg border p-5 space-y-2">
              <h2 className="font-semibold">Your review</h2>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= booking.review!.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`} />
                ))}
              </div>
              {booking.review.body && <p className="text-sm">{booking.review.body}</p>}
            </div>
          )}

          {/* Messages */}
          <MessageThread
            bookingId={params.id}
            meId={booking.clientId}
            disabled={booking.status === "cancelled" || booking.status === "completed"}
            disabledReason={
              booking.status === "cancelled"
                ? "Messaging is closed — this booking was cancelled."
                : "Messaging is closed — this booking is complete."
            }
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 text-sm space-y-3">
            <p className="font-semibold">Payment</p>
            {booking.depositAmount ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit</span>
                  <span className="font-medium">{formatPrice(booking.depositAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium ${booking.depositPaidAt ? "text-green-600" : "text-orange-600"}`}>
                    {booking.depositPaidAt ? "Paid" : "Pending"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Deposit amount will be set when artist confirms.</p>
            )}
            {canCancel && (
              <>
                <Separator />
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate({ bookingId: params.id })}
                >
                  Cancel booking
                </Button>
              </>
            )}
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
    </div>
  );
}
