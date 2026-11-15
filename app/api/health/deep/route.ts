import { BACKEND_URL } from "@/lib/constants";

const noStoreHeaders = { "Cache-Control": "no-store" };

type BackendHealth = {
  status?: unknown;
  details?: Record<string, unknown>;
};

export async function GET() {
  const baseUrl = process.env.API_URL ?? BACKEND_URL;

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/health`,
      { cache: "no-store", signal: AbortSignal.timeout(5_000) },
    );
    const health = (await response.json()) as BackendHealth;
    const details = health.details ?? {};
    const dependenciesUp = Object.values(details).every(
      (dependency) =>
        !dependency ||
        typeof dependency !== "object" ||
        !("status" in dependency) ||
        dependency.status === "up",
    );
    const backendStatusUp =
      health.status === undefined ||
      health.status === "ok" ||
      health.status === "up";
    const backendUp = response.ok && backendStatusUp && dependenciesUp;

    return Response.json(
      {
        status: backendUp ? "up" : "down",
        frontend: { status: "up" },
        backend: { status: backendUp ? "up" : "down", details },
      },
      { status: backendUp ? 200 : 503, headers: noStoreHeaders },
    );
  } catch {
    return Response.json(
      {
        status: "down",
        frontend: { status: "up" },
        backend: { status: "down", details: null },
      },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
