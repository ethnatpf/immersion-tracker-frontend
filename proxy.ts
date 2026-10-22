import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

export async function proxy(request: Request) {
  // Mounts /auth/* and refreshes rolling sessions; pages enforce access separately.
  const response = await auth0.middleware(request);

  if (response.headers.get("x-middleware-next") === "1") {
    const url = new URL(request.url);
    const requestHeaders = new Headers(request.headers);
    // Always overwrite client input; Server Components cannot read the URL directly.
    requestHeaders.set("x-auth-return-to", url.pathname + url.search);
    const forwarded = NextResponse.next({ request: { headers: requestHeaders } });

    // Keep Auth0's cookies and cache headers on the original response.
    forwarded.headers.forEach((value, key) => response.headers.set(key, value));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
