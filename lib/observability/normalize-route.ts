const routePatterns: Array<{ pattern: RegExp; route: string }> = [
  { pattern: /^\/$/, route: "/" },
  { pattern: /^\/history\/?$/, route: "/history" },
  { pattern: /^\/log-session\/?$/, route: "/log-session" },
  { pattern: /^\/content\/[^/]+\/?$/, route: "/content/[id]" },
];

export function normalizeRoute(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  return routePatterns.find(({ pattern }) => pattern.test(path))?.route ?? path;
}
