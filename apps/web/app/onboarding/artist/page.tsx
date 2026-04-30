"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STYLES = [
  "realism", "blackwork", "traditional", "neo_traditional", "watercolor",
  "geometric", "japanese", "tribal", "fineline", "illustrative",
  "dotwork", "lettering", "new_school", "biomechanical", "portrait", "minimalist",
] as const;

export default function ArtistOnboardingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    displayName: "",
    city: "",
    country: "",
    styles: [] as typeof STYLES[number][],
  });

  const createProfile = trpc.artists.createProfile.useMutation({
    onSuccess: ({ slug }) => {
      router.push(`/dashboard/artist?onboarded=1`);
    },
  });

  if (!isSignedIn) {
    router.push("/sign-up?redirect=/onboarding/artist");
    return null;
  }

  function toggleStyle(style: typeof STYLES[number]) {
    setForm((f) => ({
      ...f,
      styles: f.styles.includes(style)
        ? f.styles.filter((s) => s !== style)
        : [...f.styles, style],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createProfile.mutate(form);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-foreground" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div>
          <h1 className="text-2xl font-bold">Create your artist profile</h1>
          <p className="text-muted-foreground">
            Step {step} of 3 — {step === 1 ? "Basic info" : step === 2 ? "Your styles" : "Almost done"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display name</label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Your artist name or real name"
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Paris"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="e.g. France"
                  required
                />
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!form.displayName || !form.city || !form.country}
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select all styles that apply to your work</p>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      form.styles.includes(style)
                        ? "border-foreground bg-foreground text-background"
                        : "border-input hover:border-foreground"
                    }`}
                  >
                    {style.replace("_", " ")}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={form.styles.length === 0}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{form.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{form.city}, {form.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Styles</span>
                  <span className="font-medium">{form.styles.length} selected</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You can complete your portfolio, set availability, and connect Stripe after creating your profile.
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createProfile.isPending}
                >
                  {createProfile.isPending ? "Creating..." : "Create my profile"}
                </Button>
              </div>
              {createProfile.error && (
                <p className="text-sm text-destructive">{createProfile.error.message}</p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
