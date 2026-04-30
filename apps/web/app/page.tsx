import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

const STYLES = [
  "Realism", "Blackwork", "Traditional", "Watercolor",
  "Geometric", "Japanese", "Fineline", "Dotwork",
];

const HOW_IT_WORKS = [
  { step: "01", title: "Browse artists", desc: "Search by style, city, and price. Every profile is a curated portfolio." },
  { step: "02", title: "Submit a brief", desc: "Describe your idea, attach references, and pick a time slot." },
  { step: "03", title: "Confirm & deposit", desc: "Pay a small deposit to lock your booking. No deposit, no no-shows." },
  { step: "04", title: "Get tattooed", desc: "Show up, get inked. Leave a review to help other clients." },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center gap-8 px-4 py-32 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-white to-white" />
        <div className="mx-auto max-w-3xl animate-fade-in space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            The booking platform for serious tattoo artists
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Find your next<br />
            <span className="text-zinc-500">tattoo artist.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Browse verified artists, view full portfolios, and book with a deposit — all in one place. No DMs, no ghosting.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/browse">
            <Button size="lg" className="px-8">Browse artists</Button>
          </Link>
          <Link href="/onboarding/artist">
            <Button size="lg" variant="outline" className="px-8">I'm an artist</Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Free for clients · Artists from $0/mo</p>
      </section>

      {/* Styles */}
      <section className="border-y bg-zinc-50 py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Browse by style
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {STYLES.map((style) => (
              <Link
                key={style}
                href={`/browse?style=${style.toLowerCase()}`}
                className="rounded-full border bg-white px-5 py-2 text-sm font-medium transition-colors hover:bg-foreground hover:text-background"
              >
                {style}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="container mx-auto max-w-7xl px-4">
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col gap-3">
                <span className="text-4xl font-bold text-zinc-200">{item.step}</span>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for artists */}
      <section className="border-t bg-zinc-900 py-24 text-white">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">You're an artist?</h2>
          <p className="mb-8 text-lg text-zinc-400">
            Get a professional booking page, manage your calendar, collect deposits automatically, and grow your client base.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/onboarding/artist">
              <Button size="lg" variant="secondary" className="px-8">Start free</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-zinc-700 px-8 text-white hover:bg-zinc-800">
                View pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Link href="/" className="font-bold">🖋 InkBook</Link>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
              <Link href="/about" className="hover:text-foreground">About</Link>
              <Link href="/terms" className="hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
