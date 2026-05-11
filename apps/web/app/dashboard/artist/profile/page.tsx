"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Upload, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const STYLES = [
  "realism", "blackwork", "traditional", "neo_traditional", "watercolor",
  "geometric", "japanese", "tribal", "fineline", "illustrative",
  "dotwork", "lettering", "new_school", "biomechanical", "portrait", "minimalist",
] as const;

export default function ArtistProfilePage() {
  const utils = trpc.useUtils();

  const { data: myProfile } = trpc.artists.me.useQuery();
  const { data: portfolioItems, isLoading: portfolioLoading } = trpc.portfolios.list.useQuery();

  const updateProfile = trpc.artists.updateProfile.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const addPortfolioItem = trpc.portfolios.add.useMutation({
    onSuccess: () => utils.portfolios.list.invalidate(),
  });

  const deletePortfolioItem = trpc.portfolios.delete.useMutation({
    onSuccess: () => utils.portfolios.list.invalidate(),
  });

  const createStripeOnboarding = trpc.payments.createConnectOnboarding.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
  });

  const refreshConnect = trpc.payments.refreshConnectStatus.useMutation({
    onSuccess: () => utils.artists.me.invalidate(),
  });

  const openPortal = trpc.payments.createPortalSession.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
  });

  const getSubscription = trpc.payments.getSubscription.useQuery();

  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    city: "",
    country: "",
    styles: [] as typeof STYLES[number][],
    hourlyRate: "",
    minPrice: "",
    instagramHandle: "",
    websiteUrl: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (myProfile) {
      setForm({
        displayName: myProfile.displayName ?? "",
        bio: myProfile.bio ?? "",
        city: myProfile.city ?? "",
        country: myProfile.country ?? "",
        styles: (myProfile.styles ?? []) as typeof STYLES[number][],
        hourlyRate: myProfile.hourlyRate ? String(myProfile.hourlyRate) : "",
        minPrice: myProfile.minPrice ? String(myProfile.minPrice) : "",
        instagramHandle: myProfile.instagramHandle ?? "",
        websiteUrl: myProfile.websiteUrl ?? "",
      });
    }
  }, [myProfile]);

  function toggleStyle(style: typeof STYLES[number]) {
    setForm((f) => ({
      ...f,
      styles: f.styles.includes(style)
        ? f.styles.filter((s) => s !== style)
        : [...f.styles, style],
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url, publicId } = await res.json() as { url: string; publicId: string };

      await addPortfolioItem.mutateAsync({
        imageUrl: url,
        cloudinaryPublicId: publicId,
        isFlash: false,
      });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleSaveProfile() {
    const payload: Record<string, unknown> = {};
    if (form.displayName) payload.displayName = form.displayName;
    if (form.bio) payload.bio = form.bio;
    if (form.city) payload.city = form.city;
    if (form.country) payload.country = form.country;
    if (form.styles.length) payload.styles = form.styles;
    if (form.hourlyRate) payload.hourlyRate = Number(form.hourlyRate);
    if (form.minPrice) payload.minPrice = Number(form.minPrice);
    if (form.instagramHandle) payload.instagramHandle = form.instagramHandle;
    if (form.websiteUrl) payload.websiteUrl = form.websiteUrl;

    updateProfile.mutate(payload as Parameters<typeof updateProfile.mutate>[0]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/artist">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Edit Profile</h1>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* ── Profile tab ── */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Your artist name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram handle</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">@</span>
                <Input
                  id="instagram"
                  className="pl-7"
                  value={form.instagramHandle}
                  onChange={(e) => setForm((f) => ({ ...f, instagramHandle: e.target.value }))}
                  placeholder="yourhandle"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Paris"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="e.g. France"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minPrice">Minimum price ($)</Label>
              <Input
                id="minPrice"
                type="number"
                value={form.minPrice}
                onChange={(e) => setForm((f) => ({ ...f, minPrice: e.target.value }))}
                placeholder="e.g. 150"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={form.hourlyRate}
                onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                placeholder="e.g. 200"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                placeholder="https://yoursite.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={5}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell clients about yourself, your experience, specialty styles, and what to expect at a session..."
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{form.bio.length}/2000</p>
          </div>

          <div className="space-y-3">
            <Label>Styles</Label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => toggleStyle(style)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    form.styles.includes(style)
                      ? "border-foreground bg-foreground text-background"
                      : "border-input hover:border-foreground"
                  }`}
                >
                  {style.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving..." : saved ? "Saved!" : "Save profile"}
          </Button>
          {updateProfile.error && (
            <p className="text-sm text-destructive">{updateProfile.error.message}</p>
          )}
        </TabsContent>

        {/* ── Portfolio tab ── */}
        <TabsContent value="portfolio" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Portfolio images</p>
              <p className="text-sm text-muted-foreground">
                {portfolioItems?.length ?? 0} image{portfolioItems?.length !== 1 ? "s" : ""}
                {" "}— drag to reorder (coming soon)
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Add image"}
              </Button>
            </div>
          </div>

          {portfolioLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : portfolioItems?.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 cursor-pointer hover:border-foreground transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="font-medium">Upload your first image</p>
              <p className="text-sm text-muted-foreground">JPG, PNG, WebP up to 10MB</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {portfolioItems?.map((item) => (
                <div key={item.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={item.imageUrl}
                    alt={item.caption ?? "Portfolio image"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deletePortfolioItem.mutate({ id: item.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addPortfolioItem.error && (
            <p className="text-sm text-destructive">{addPortfolioItem.error.message}</p>
          )}
        </TabsContent>

        {/* ── Payments tab ── */}
        <TabsContent value="payments" className="space-y-6">
          {/* Stripe Connect */}
          <div className="rounded-lg border p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Stripe Connect</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Required to receive deposit payments from clients.
                </p>
              </div>
              {myProfile?.stripeAccountEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              ) : myProfile?.stripeAccountId ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                  Setup incomplete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                  Not set up
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  createStripeOnboarding.mutate({
                    returnUrl: `${window.location.origin}/dashboard/artist/profile?tab=payments`,
                  })
                }
                disabled={createStripeOnboarding.isPending}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {createStripeOnboarding.isPending
                  ? "Redirecting..."
                  : myProfile?.stripeAccountEnabled
                  ? "Manage account"
                  : myProfile?.stripeAccountId
                  ? "Continue setup"
                  : "Set up Stripe payouts"}
              </Button>
              {myProfile?.stripeAccountId && !myProfile.stripeAccountEnabled && (
                <Button
                  variant="outline"
                  onClick={() => refreshConnect.mutate()}
                  disabled={refreshConnect.isPending}
                >
                  {refreshConnect.isPending ? "Checking..." : "Refresh status"}
                </Button>
              )}
            </div>
          </div>

          {/* Subscription */}
          <div className="rounded-lg border p-5 space-y-4">
            <h3 className="font-semibold">Subscription</h3>
            {getSubscription.data ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium capitalize">{getSubscription.data.tier.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-medium ${getSubscription.data.status === "active" ? "text-green-600" : "text-orange-600"}`}>
                      {getSubscription.data.status}
                    </span>
                  </div>
                  {getSubscription.data.currentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {getSubscription.data.cancelAtPeriodEnd ? "Ends" : "Renews"}
                      </span>
                      <span className="font-medium">
                        {new Date(getSubscription.data.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    openPortal.mutate({
                      returnUrl: `${window.location.origin}/dashboard/artist/profile?tab=payments`,
                    })
                  }
                  disabled={openPortal.isPending}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {openPortal.isPending ? "Opening..." : "Manage subscription"}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You're on the free plan (12% commission). Upgrade to reduce fees.
                </p>
                <Link href="/pricing">
                  <Button variant="outline">View upgrade options</Button>
                </Link>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
