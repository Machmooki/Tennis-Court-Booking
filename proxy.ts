import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { checkRateLimit } from "@/lib/rate-limit";

// Guest checkout + "pay now" both call Server Actions from `/booking`,
// which never needs more than a couple of submissions per minute for a
// real person. This is deliberately generous enough to not block a guest
// booking several slots in one visit, while still capping scripted spam.
const BOOKING_RATE_LIMIT = { windowMs: 60_000, max: 12 };

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isBookingSubmission(request: NextRequest): boolean {
  // Next.js Server Actions - whether bound to a <form> or called
  // imperatively from a Client Component - always POST back to the page
  // that invoked them with a `Next-Action` header, so this scopes rate
  // limiting to booking/payment submissions without touching normal page
  // navigation or unrelated routes.
  return (
    request.method === "POST" &&
    request.nextUrl.pathname.startsWith("/booking") &&
    request.headers.has("next-action")
  );
}

export async function proxy(request: NextRequest) {
  if (isBookingSubmission(request)) {
    const ip = getClientIp(request);
    const { allowed, resetAt } = checkRateLimit(`booking:${ip}`, BOOKING_RATE_LIMIT);

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Too many booking requests from this device. Please wait a moment and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, images, and API routes: the payment webhook in
    // particular authenticates via signature, not cookies, and must not
    // pay the cost of a Supabase auth round-trip on every request.
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
