export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    public readonly requestId?: string,
  ) {
    super(`API request failed (${status})`);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const requestUrl = typeof window !== "undefined"
    ? new URL(url, window.location.origin).toString()
    : url;
  const response = await fetch(requestUrl, { ...options, credentials: "same-origin" });
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) throw new ApiError(response.status, body, response.headers.get("X-Request-ID") ?? undefined);
  return body as T;
}
