import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/trpc/server";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ArtistGridProps {
  searchParams: {
    city?: string;
    style?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}

export async function ArtistGrid({ searchParams }: ArtistGridProps) {
  const { items } = await api.artists.search({
    city: searchParams.city,
    styles: searchParams.style ? [searchParams.style as never] : undefined,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium">No artists found</p>
        <p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  );
}

function ArtistCard({ artist }: { artist: Awaited<ReturnType<typeof api.artists.search>>["items"][0] }) {
  const coverImage = artist.portfolio[0]?.imageUrl;

  return (
    <Link href={`/artists/${artist.slug}`} className="group">
      <div className="overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
        {/* Cover image / portfolio grid */}
        <div className="relative aspect-square overflow-hidden bg-zinc-100">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={`${artist.displayName} tattoo work`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl text-muted-foreground">
              🖋
            </div>
          )}
          {artist.isVerified && (
            <div className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-xs font-medium shadow">
              ✓ Verified
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold leading-tight">{artist.displayName}</h3>
              {artist.city && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {artist.city}
                </div>
              )}
            </div>
            {Number(artist.averageRating) > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{Number(artist.averageRating).toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({artist.reviewCount})</span>
              </div>
            )}
          </div>

          {/* Style tags */}
          <div className="mt-3 flex flex-wrap gap-1">
            {artist.styles.slice(0, 3).map((style) => (
              <Badge key={style} variant="secondary" className="text-xs">
                {style.replace("_", " ")}
              </Badge>
            ))}
          </div>

          {/* Price */}
          {artist.minPrice && (
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">From </span>
              <span className="font-semibold">{formatPrice(artist.minPrice)}</span>
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
