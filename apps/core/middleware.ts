import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    const { limited, remaining } = rateLimit(request);
    if (limited) {
      return NextResponse.json({ error: { message: "Rate limit exceeded" } }, { status: 429 });
    }
    const response = NextResponse.next();
    response.headers.set("x-ratelimit-remaining", String(remaining));
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
