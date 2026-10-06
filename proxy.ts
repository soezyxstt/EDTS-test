import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_IDENTITIES, DEMO_SESSION_COOKIE } from "@/lib/demo-session";

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return NextResponse.next();
  if (getSessionCookie(request)) return NextResponse.next();
  if (DEMO_IDENTITIES.some(({ id }) => id === request.cookies.get(DEMO_SESSION_COOKIE)?.value)) return NextResponse.next();

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("callbackURL", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/manage/:path*", "/apply/:path*", "/applications/:path*", "/profile/:path*"],
};
