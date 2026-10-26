"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/shadcn/button";

export function Pagination({
  page,
  pageSize,
  total,
  busy,
  onPageChange,
  itemLabel = "entries",
}: {
  page: number;
  pageSize: number;
  total: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);

  return (
    <footer className="mt-8 rounded-2xl border border-border bg-white p-4 text-xs text-muted-foreground md:mt-0 md:flex md:items-center md:justify-between md:rounded-none md:border-0 md:border-t md:px-6 md:py-5">
      <p className="text-center md:text-left">
        Showing {first}–{last} of {total} {itemLabel}
      </p>
      <div className="mt-3 flex items-center justify-between gap-6 md:mt-0">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={page === 1 || busy}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span>Page {page} of {totalPages}</span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={page >= totalPages || busy}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </footer>
  );
}
