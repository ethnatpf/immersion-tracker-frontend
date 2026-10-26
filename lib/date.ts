export function formatUtcDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatCompactUtcDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}
