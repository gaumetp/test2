import { Suspense } from "react";
import { Navbar } from "@/components/navbar";
import { ArtistGrid } from "./artist-grid";

interface BrowsePageProps {
  searchParams: {
    city?: string;
    style?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}

export const metadata = {
  title: "Browse Tattoo Artists",
  description: "Find tattoo artists near you. Filter by style, city, and price.",
};

export default function BrowsePage({ searchParams }: BrowsePageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container mx-auto max-w-7xl flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Browse Artists</h1>
          <p className="mt-2 text-muted-foreground">Find your perfect tattoo artist</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-3">
          <SearchFilters searchParams={searchParams} />
        </div>

        <Suspense fallback={<ArtistGridSkeleton />}>
          <ArtistGrid searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

function SearchFilters({ searchParams }: BrowsePageProps) {
  const styles = [
    "realism", "blackwork", "traditional", "neo_traditional", "watercolor",
    "geometric", "japanese", "tribal", "fineline",
  ];

  return (
    <form className="flex flex-wrap gap-2 w-full">
      <input
        type="text"
        name="city"
        placeholder="City"
        defaultValue={searchParams.city}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <select
        name="style"
        defaultValue={searchParams.style}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All styles</option>
        {styles.map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </select>
      <input
        type="number"
        name="minPrice"
        placeholder="Min price"
        defaultValue={searchParams.minPrice}
        className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="number"
        name="maxPrice"
        placeholder="Max price"
        defaultValue={searchParams.maxPrice}
        className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        className="h-9 rounded-md bg-foreground px-4 text-sm font-medium text-background"
      >
        Search
      </button>
    </form>
  );
}

function ArtistGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-muted aspect-square" />
      ))}
    </div>
  );
}
