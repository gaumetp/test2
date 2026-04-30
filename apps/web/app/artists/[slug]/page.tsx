import { notFound } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { api } from "@/lib/trpc/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Instagram, Globe, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { BookingButton } from "./booking-button";

interface ArtistPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ArtistPageProps) {
  const artist = await api.artists.bySlug({ slug: params.slug }).catch(() => null);
  if (!artist) return {};
  return {
    title: `${artist.displayName} — Tattoo Artist`,
    description: artist.bio ?? `Book a tattoo session with ${artist.displayName}.`,
    openGraph: {
      images: artist.portfolio[0] ? [artist.portfolio[0].imageUrl] : [],
    },
  };
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const artist = await api.artists.bySlug({ slug: params.slug }).catch(() => null);
  if (!artist) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-3">

          {/* Left: Profile info */}
          <aside className="space-y-6 lg:col-span-1">
            <div className="sticky top-24 space-y-6 rounded-lg border p-6">
              {/* Avatar / cover */}
              <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-zinc-100">
                <div className="flex h-full items-center justify-center text-3xl">🖋</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-xl font-bold">{artist.displayName}</h1>
                  {artist.isVerified && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                {artist.city && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {artist.city}{artist.country ? `, ${artist.country}` : ""}
                  </div>
                )}
                {Number(artist.averageRating) > 0 && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{Number(artist.averageRating).toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({artist.reviewCount} reviews)</span>
                  </div>
                )}
              </div>

              {/* Pricing */}
              {(artist.minPrice || artist.hourlyRate) && (
                <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
                  {artist.minPrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Starting from</span>
                      <span className="font-semibold">{formatPrice(artist.minPrice)}</span>
                    </div>
                  )}
                  {artist.hourlyRate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hourly rate</span>
                      <span className="font-semibold">{formatPrice(artist.hourlyRate)}/hr</span>
                    </div>
                  )}
                </div>
              )}

              {/* Links */}
              <div className="flex justify-center gap-3">
                {artist.instagramHandle && (
                  <a
                    href={`https://instagram.com/${artist.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {artist.websiteUrl && (
                  <a
                    href={artist.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>

              <BookingButton artistId={artist.id} artistName={artist.displayName} />
            </div>
          </aside>

          {/* Right: Portfolio + info */}
          <div className="space-y-10 lg:col-span-2">

            {/* Bio */}
            {artist.bio && (
              <div>
                <h2 className="mb-3 text-lg font-semibold">About</h2>
                <p className="text-muted-foreground leading-relaxed">{artist.bio}</p>
              </div>
            )}

            {/* Styles */}
            <div>
              <h2 className="mb-3 text-lg font-semibold">Styles</h2>
              <div className="flex flex-wrap gap-2">
                {artist.styles.map((style) => (
                  <Badge key={style} variant="secondary">
                    {style.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Portfolio grid */}
            {artist.portfolio.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">Portfolio</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {artist.portfolio.map((item) => (
                    <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
                      <Image
                        src={item.imageUrl}
                        alt={item.caption ?? "Tattoo work"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                      {item.isFlash && item.flashPrice && (
                        <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
                          Flash · {formatPrice(item.flashPrice)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {artist.reviews.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-semibold">Reviews</h2>
                <div className="space-y-4">
                  {artist.reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.body && <p className="mt-2 text-sm">{review.body}</p>}
                      {review.artistReply && (
                        <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                          <span className="font-medium">Artist reply: </span>
                          {review.artistReply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
