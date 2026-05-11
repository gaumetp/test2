"use client";

import { useState } from "react";
import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@tattoo-saas/api";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Star } from "lucide-react";

type Review = inferRouterOutputs<AppRouter>["reviews"]["listForMe"][number];

export default function ArtistReviewsPage() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.reviews.listForMe.useQuery();

  const average =
    items.length === 0
      ? 0
      : items.reduce((sum, r) => sum + r.rating, 0) / items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/artist">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "No reviews yet"
              : `${items.length} review${items.length === 1 ? "" : "s"} · ${average.toFixed(1)} average`}
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-5 w-5 ${
                  s <= Math.round(average)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Reviews from completed bookings will appear here.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onReplied={() => utils.reviews.listForMe.invalidate()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  onReplied,
}: {
  review: Review;
  onReplied: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.artistReply ?? "");

  const reply = trpc.reviews.reply.useMutation({
    onSuccess: () => {
      onReplied();
      setEditing(false);
    },
  });

  return (
    <div className="rounded-lg border p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${
                  s <= review.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {review.client?.email} ·{" "}
            {new Date(review.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {review.body && (
        <p className="text-sm whitespace-pre-wrap">{review.body}</p>
      )}

      <Separator />

      {review.artistReply && !editing ? (
        <div className="space-y-2 rounded-md bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Your reply
          </p>
          <p className="text-sm whitespace-pre-wrap">{review.artistReply}</p>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => {
              setDraft(review.artistReply ?? "");
              setEditing(true);
            }}
          >
            Edit reply
          </Button>
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Thank the client, share context, or respond to feedback..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!draft.trim() || reply.isPending}
              onClick={() =>
                reply.mutate({ reviewId: review.id, reply: draft.trim() })
              }
            >
              {reply.isPending ? "Saving..." : "Save reply"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraft(review.artistReply ?? "");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
        >
          Reply publicly
        </Button>
      )}
    </div>
  );
}
