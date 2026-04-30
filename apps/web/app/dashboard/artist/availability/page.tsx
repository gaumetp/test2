"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DayRule {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

const DEFAULT_RULES: DayRule[] = DAYS.map((_, i) => ({
  dayOfWeek: i,
  isActive: i >= 1 && i <= 5, // Mon-Fri by default
  startTime: "10:00",
  endTime: "18:00",
  slotDurationMinutes: 120,
}));

export default function AvailabilityPage() {
  const [rules, setRules] = useState<DayRule[]>(DEFAULT_RULES);
  const [saved, setSaved] = useState(false);

  const { data: existingRules, isLoading } = trpc.availability.getRules.useQuery();

  const setRulesMutation = trpc.availability.setRules.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  useEffect(() => {
    if (existingRules && existingRules.length > 0) {
      setRules((current) =>
        current.map((r) => {
          const existing = existingRules.find((e) => e.dayOfWeek === r.dayOfWeek);
          if (!existing) return r;
          return {
            dayOfWeek: r.dayOfWeek,
            isActive: existing.isActive,
            startTime: existing.startTime,
            endTime: existing.endTime,
            slotDurationMinutes: existing.slotDurationMinutes,
          };
        })
      );
    }
  }, [existingRules]);

  function updateRule(dayOfWeek: number, updates: Partial<DayRule>) {
    setRules((r) => r.map((rule) => rule.dayOfWeek === dayOfWeek ? { ...rule, ...updates } : rule));
  }

  function handleSave() {
    setRulesMutation.mutate({
      rules: rules.filter((r) => r.isActive).map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        slotDurationMinutes: r.slotDurationMinutes,
        isActive: true,
      })),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/artist">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Manage Availability</h1>
          <p className="text-sm text-muted-foreground">Set your weekly working hours</p>
        </div>
        <Button onClick={handleSave} disabled={setRulesMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {setRulesMutation.isPending ? "Saving..." : saved ? "Saved!" : "Save changes"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {rules.map((rule) => (
            <div key={rule.dayOfWeek} className="flex items-center gap-4 p-4">
              {/* Toggle */}
              <button
                onClick={() => updateRule(rule.dayOfWeek, { isActive: !rule.isActive })}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  rule.isActive ? "bg-foreground" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    rule.isActive ? "left-6" : "left-1"
                  }`}
                />
              </button>

              {/* Day name */}
              <span className={`w-24 text-sm font-medium ${!rule.isActive && "text-muted-foreground"}`}>
                {DAYS[rule.dayOfWeek]}
              </span>

              {rule.isActive ? (
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={rule.startTime}
                      onChange={(e) => updateRule(rule.dayOfWeek, { startTime: e.target.value })}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={rule.endTime}
                      onChange={(e) => updateRule(rule.dayOfWeek, { endTime: e.target.value })}
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Slot length</span>
                    <select
                      value={rule.slotDurationMinutes}
                      onChange={(e) => updateRule(rule.dayOfWeek, { slotDurationMinutes: Number(e.target.value) })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value={60}>1h</option>
                      <option value={90}>1.5h</option>
                      <option value={120}>2h</option>
                      <option value={180}>3h</option>
                      <option value={240}>4h</option>
                    </select>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        <strong>Note:</strong> Changes apply to future bookings only. Existing confirmed bookings are not affected.
        <br />
        Clients will only see slots that are not already booked.
      </div>
    </div>
  );
}
