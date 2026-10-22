import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth0 } from "@/lib/auth0";

/** Call before reading protected data in a page or server action. */
export async function requireSession() {
  const session = await auth0.getSession();

  if (!session) {
    const requestedPath = (await headers()).get("x-auth-return-to");
    // Relative URLs need a base for parsing; this .invalid origin is only a
    // placeholder and is never contacted. Comparing origins below rejects
    // paths such as //evil.com that would redirect outside the app.
    const base = new URL("https://immersion-tracker.invalid");
    const destination = requestedPath?.startsWith("/") && URL.canParse(requestedPath, base)
      ? new URL(requestedPath, base)
      : base;
    const returnTo = destination.origin === base.origin
      ? destination.pathname + destination.search
      : "/";

    redirect(`/auth/login?${new URLSearchParams({ returnTo })}`);
  }

  return session;
}
