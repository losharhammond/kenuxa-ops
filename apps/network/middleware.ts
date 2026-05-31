/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieItem = { name: string; value: string; options?: any };

const PUBLIC_PATHS = ["/", "/login", "/register", "/directory", "/api/search", "/api/businesses", "/find"];

// ─── In-memory rate limiter (Edge-compatible) ──────────────────────────────
// Tracks request counts per IP per minute window.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  if (entry.count > limit) return true;
  return false;
}

// Purge stale entries to prevent unbounded memory growth
let lastPurge = Date.now();
function maybePurge() {
  const now = Date.now();
  if (now - lastPurge < 300_000) return; // every 5 min
  lastPurge = now;
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}

// Rate limit tiers per route pattern (requests per minute)
const RATE_LIMITS: { pattern: RegExp; limit: number }[] = [
  { pattern: /^\/api\/auth\//,             limit: 10  },   // auth: strict
  { pattern: /^\/api\/pos\/sales/,         limit: 120 },   // POS: high throughput
  { pattern: /^\/api\/payments/,           limit: 30  },   // payments: moderate
  { pattern: /^\/api\/ai/,                 limit: 20  },   // AI: expensive, limit
  { pattern: /^\/api\//,                   limit: 200 },   // other APIs: generous
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  maybePurge();

  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  for (const { pattern, limit } of RATE_LIMITS) {
    if (pattern.test(pathname)) {
      if (isRateLimited(`${ip}:${pathname.split("/").slice(0, 3).join("/")}`, limit)) {
        return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            "X-RateLimit-Limit": String(limit),
          },
        });
      }
      break;
    }
  }

  // ── Security headers ─────────────────────────────────────────────────────
  const response = NextResponse.next({ request });
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)"
  );

  // ── Public path bypass ───────────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return response;
  }

  if (pathname.startsWith("/api/")) return response;

  // ── Auth check ───────────────────────────────────────────────────────────
  let authResponse = response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: CookieItem[]) => {
          cookiesToSet.forEach(({ name, value }: CookieItem) => request.cookies.set(name, value));
          authResponse = NextResponse.next({ request });
          // Re-apply security headers
          authResponse.headers.set("X-Content-Type-Options", "nosniff");
          authResponse.headers.set("X-Frame-Options", "DENY");
          authResponse.headers.set("X-XSS-Protection", "1; mode=block");
          authResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
          cookiesToSet.forEach(({ name, value, options }: CookieItem) =>
            authResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based routing ────────────────────────────────────────────────────
  if (user && (pathname.startsWith("/admin") || pathname.startsWith("/dashboard"))) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "customer";

    // Admin-only guard
    if (pathname.startsWith("/admin")) {
      const adminRoles = ["super_admin", "country_admin", "platform_admin", "finance_admin"];
      if (!adminRoles.includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Role-specific dashboard restrictions
    // NOTE: Multi-role architecture — most role restrictions removed.
    // Users can have multiple active roles and freely navigate the platform.
    // Only cashiers remain restricted to their operational modules.
    if (pathname.startsWith("/dashboard")) {
      const cashierAllowed = ["/dashboard/pos", "/dashboard/inventory", "/dashboard/invoicing", "/dashboard"];
      if (role === "cashier" && !cashierAllowed.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/dashboard/pos", request.url));
      }
    }
  }

  // ── Redirect authenticated users away from auth pages ────────────────────
  if (user && (pathname === "/login" || pathname === "/register" || pathname === "/onboarding")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
