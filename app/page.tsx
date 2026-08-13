import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Tennis Court Booking
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Book a court in seconds — no account needed.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          nativeButton={false}
          render={<Link href="/booking" />}
          className="h-11"
        >
          Book a court
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/member/login" />}
          variant="outline"
          className="h-11"
        >
          Sign in
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/login" />}
          variant="ghost"
          className="h-11"
        >
          Admin sign in
        </Button>
      </div>
    </div>
  );
}
