"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

interface BookingButtonProps {
  artistId: string;
  artistName: string;
}

export function BookingButton({ artistId, artistName }: BookingButtonProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  function handleClick() {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/artists/${artistId}/book`);
      return;
    }
    router.push(`/booking/new?artistId=${artistId}`);
  }

  return (
    <Button className="w-full" size="lg" onClick={handleClick}>
      Book {artistName}
    </Button>
  );
}
