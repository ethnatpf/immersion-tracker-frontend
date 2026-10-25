import { auth0 } from "@/lib/auth0";

const authorizedPaths = new Map<string, readonly string[]>([
  ["language", ["GET"]],
  ["user/preferences", ["GET"]],
  ["dashboard/statistics", ["GET"]],
  ["immersion-session", ["GET", "POST"]],
  ["content/search", ["GET"]],
  ["content", ["POST"]],
]);
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(request, context, "GET");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(request, context, "POST");
}

async function forward(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  method: string,
) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!authorizedPaths.get(endpoint)?.includes(method)) {
    return Response.json(
      { message: "Not found" },
      { status: 404, headers: privateHeaders },
    );
  }

  let token: string;
  try {
    ({ token } = await auth0.getAccessToken());
  } catch {
    return Response.json(
      { code: "session_expired", message: "Please sign in again." },
      { status: 401, headers: privateHeaders },
    );
  }

  const baseUrl = process.env.API_URL ?? "http://localhost:4000";
  const upstreamUrl = new URL(`${baseUrl.replace(/\/$/, "")}/${endpoint}`);
  upstreamUrl.search = new URL(request.url).search;

  try {
    const hasBody = method !== "GET" && method !== "HEAD";
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      ...(hasBody ? { body: await request.text() } : {}),
      cache: "no-store",
      redirect: "error",
      signal: request.signal,
    });
    const headers = new Headers(privateHeaders);
    const requestId = upstream.headers.get("X-Request-ID");
    if (requestId) headers.set("X-Request-ID", requestId);
    if (upstream.status === 401) {
      await upstream.body?.cancel();
      return Response.json(
        {
          code: "api_unauthorized",
          message: "The API could not authorize this request.",
        },
        { status: 401, headers },
      );
    }
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") ?? "application/json",
    );
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return Response.json(
      { message: "The API is unavailable. Please try again." },
      { status: 502, headers: privateHeaders },
    );
  }
}
