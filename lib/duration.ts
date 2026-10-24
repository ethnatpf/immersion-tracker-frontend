export function formatDuration(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return [Math.floor(wholeSeconds / 3600), Math.floor(wholeSeconds / 60) % 60, wholeSeconds % 60]
    .map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatHours(seconds: number): string {
  return `${(seconds / 3600).toFixed(1)}h`;
}
