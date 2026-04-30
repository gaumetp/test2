"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DayPicker } from "react-day-picker";
import { format, addHours, isBefore, startOfToday } from "date-fns";
import "react-day-picker/dist/style.css";

type ServiceType = "custom" | "flash" | "touch_up";

export default function NewBookingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const artistId = searchParams.get("artistId") ?? "";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [form, setForm] = useState({
    serviceType: "custom" as ServiceType,
    description: "",
    referenceImages: [] as string[],
  });

  const artist = trpc.artists.search.useQuery(
    { limit: 1 },
    { enabled: false }
  );

  const { data: slotsData, isLoading: slotsLoading } = trpc.availability.getSlots.useQuery(
    {
      artistId,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
      durationMinutes,
    },
    { enabled: !!selectedDate && !!artistId }
  );

  const createBooking = trpc.bookings.create.useMutation({
    onSuccess: (booking) => {
      router.push(`/dashboard/client/bookings/${booking.id}?new=1`);
    },
  });

  if (!isSignedIn) {
    router.push(`/sign-in?redirect=/booking/new?artistId=${artistId}`);
    return null;
  }

  if (!artistId) {
    router.push("/browse");
    return null;
  }

  function handleSubmit() {
    if (!selectedDate || !selectedSlot) return;
    const [h, m] = selectedSlot.split(":").map(Number);
    if (h === undefined || m === undefined) return;

    const startAt = new Date(selectedDate);
    startAt.setHours(h, m, 0, 0);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    createBooking.mutate({
      artistId,
      serviceType: form.serviceType,
      startAt,
      endAt,
      description: form.description,
      referenceImages: form.referenceImages,
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="font-semibold">Book a session</h1>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  s <= step ? "bg-foreground" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {/* Step 1: Date + Slot */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Choose a date and time</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Slots shown based on artist availability
              </p>
            </div>

            <div className="space-y-2">
              <Label>Session length</Label>
              <Select
                value={String(durationMinutes)}
                onChange={(e) => {
                  setDurationMinutes(Number(e.target.value));
                  setSelectedSlot(null);
                }}
              >
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
                <option value="240">4 hours</option>
                <option value="360">6 hours (full day)</option>
              </Select>
            </div>

            <div className="rounded-lg border p-4">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                disabled={[
                  { before: startOfToday() },
                ]}
                className="mx-auto"
              />
            </div>

            {selectedDate && (
              <div>
                <Label className="mb-3 block">
                  Available slots for {format(selectedDate, "MMMM d, yyyy")}
                </Label>
                {slotsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                    ))}
                  </div>
                ) : slotsData?.isBlocked ? (
                  <p className="text-sm text-muted-foreground">Artist is unavailable on this date.</p>
                ) : slotsData?.slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available slots. Try another date.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slotsData?.slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-md border py-2.5 text-sm font-medium transition-colors ${
                          selectedSlot === slot
                            ? "border-foreground bg-foreground text-background"
                            : "hover:border-foreground"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedDate || !selectedSlot}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Brief */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Tell the artist about your tattoo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The more detail you give, the better the artist can prepare.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Session type</Label>
              <Select
                id="serviceType"
                value={form.serviceType}
                onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value as ServiceType }))}
              >
                <option value="custom">Custom design</option>
                <option value="flash">Flash design (pre-drawn)</option>
                <option value="touch_up">Touch-up</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Describe your idea: subject, style, placement on body, size, any specific references or inspirations..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                minLength={20}
                required
              />
              <p className="text-xs text-muted-foreground">{form.description.length}/2000 characters (minimum 20)</p>
            </div>

            <div className="space-y-2">
              <Label>Reference image URLs</Label>
              <p className="text-xs text-muted-foreground">Add up to 5 image URLs (Instagram posts, Pinterest, etc.)</p>
              <ReferenceImageInput
                values={form.referenceImages}
                onChange={(imgs) => setForm((f) => ({ ...f, referenceImages: imgs }))}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={form.description.length < 20}
                onClick={() => setStep(3)}
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review + Submit */}
        {step === 3 && selectedDate && selectedSlot && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Review your request</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Double-check everything before sending.
              </p>
            </div>

            <div className="divide-y rounded-lg border">
              <div className="flex justify-between p-4">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm font-medium">{format(selectedDate, "MMMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-sm text-muted-foreground">Time</span>
                <span className="text-sm font-medium">{selectedSlot}</span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm font-medium">{durationMinutes / 60} hour{durationMinutes > 60 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between p-4">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium capitalize">{form.serviceType.replace("_", " ")}</span>
              </div>
              <div className="p-4">
                <span className="block text-sm text-muted-foreground mb-2">Description</span>
                <p className="text-sm">{form.description}</p>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              After submitting, the artist has up to 48h to accept or decline. You'll receive an email with their response.
              <br /><br />
              <strong>No payment is required now.</strong> You'll only pay a deposit after the artist confirms.
            </div>

            {createBooking.error && (
              <p className="text-sm text-destructive">{createBooking.error.message}</p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={createBooking.isPending}
                onClick={handleSubmit}
              >
                {createBooking.isPending ? "Sending..." : "Send request"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ReferenceImageInput({
  values,
  onChange,
}: {
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const url = input.trim();
    if (!url || values.length >= 5) return;
    try {
      new URL(url);
      onChange([...values, url]);
      setInput("");
    } catch {
      // invalid URL
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="https://..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <Button type="button" variant="outline" onClick={add} disabled={values.length >= 5}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url, i) => (
            <div key={i} className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs">
              <span className="max-w-[200px] truncate">{url}</span>
              <button
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
