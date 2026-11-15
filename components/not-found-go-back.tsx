"use client";

export function NotFoundGoBack() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="inline-flex h-12 min-w-[126px] items-center justify-center rounded-[10px] border border-border bg-white px-5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      Go back
    </button>
  );
}
