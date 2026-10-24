import { auth0 } from "@/lib/auth0";

const authorizedPaths = new Set([
  "language",
  "user/preferences",
  "dashboard/statistics",
  "immersion-session",
]);
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!authorizedPaths.has(endpoint)) {
    return Response.json({ message: "Not found" }, { status: 404, headers: privateHeaders });
  }

  let token: string;
  try {
    ({ token } = await auth0.getAccessToken());
  } catch {
    return Response.json({ code: "session_expired", message: "Please sign in again." }, { status: 401, headers: privateHeaders });
  }

  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const upstreamUrl = new URL(`${baseUrl.replace(/\/$/, "")}/${endpoint}`);
  upstreamUrl.search = new URL(request.url).search;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: request.signal,
    });
    const headers = new Headers(privateHeaders);
    const requestId = upstream.headers.get("X-Request-ID");
    if (requestId) headers.set("X-Request-ID", requestId);
    if (upstream.status === 401) {
      await upstream.body?.cancel();
      return Response.json({ code: "api_unauthorized", message: "The API could not authorize this request." }, { status: 401, headers });
    }
    headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/json");
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return Response.json({ message: "The API is unavailable. Please try again." }, { status: 502, headers: privateHeaders });
  }
}
