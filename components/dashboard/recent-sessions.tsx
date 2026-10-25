"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Film, MoreVertical, SquarePlay, Tv } from "lucide-react";
import { toast } from "sonner";
import { useImmersionSessionHistory } from "@/lib/api/generated/immersion";
import type { SessionHistoryItemResponseDto, SessionHistoryItemResponseDtoType } from "@/lib/api/generated/models";
import { formatDuration } from "@/lib/duration";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/shadcn/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import { Skeleton } from "@/components/shadcn/skeleton";
import { QueryError } from "@/components/error/query-error";

const mediaStyles = {
  book: { label: "Book", icon: BookOpen, color: "#5e7fa9", background: "#edf2fa" },
  manga: { label: "Manga", icon: BookOpen, color: "#b96c30", background: "#fcf1e7" },
  anime: { label: "Anime", icon: Tv, color: "#8b6ea5", background: "#f3eef8" },
  drama: { label: "Drama", icon: Film, color: "#8b6ea5", background: "#f3eef8" },
  video: { label: "Video", icon: SquarePlay, color: "#167d68", background: "#e8f4ee" },
} as const;

function MediaBadge({ type }: { type: SessionHistoryItemResponseDtoType }) {
  const { icon: Icon, label, color, background } = mediaStyles[type];
  return <span className="inline-flex min-w-[88px] items-center gap-2 rounded-md px-2 py-1.5 text-[11px] lg:min-w-[108px]" style={{ color, backgroundColor: background }}><Icon aria-hidden="true" className="size-[14px]" />{label}</span>;
}

function SessionActions({ session }: { session: SessionHistoryItemResponseDto }) {
  return <DropdownMenu><DropdownMenuTrigger aria-label={`Actions for ${session.title}`} render={<Button variant="ghost" size="icon" className="text-muted-foreground" />}><MoreVertical aria-hidden="true" className="size-[18px]" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => toast("Not implemented yet", { id: "not-implemented" })}>View content</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function SessionDate({ date }: { date: string }) {
  return <time dateTime={date}>{new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(date))}</time>;
}

export function RecentSessions() {
  const [page, setPage] = useState(1);
  const history = useImmersionSessionHistory({ page, limit: 5 }, { query: { retry: false, placeholderData: keepPreviousData } });
  const data = history.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  return (
    <Card role="region" aria-labelledby="recent-log-heading" className="gap-0 rounded-2xl border border-border p-4 text-foreground ring-0 xl:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 id="recent-log-heading" className="text-[19px] font-semibold">Recent immersion log</h2><p className="mt-1 text-xs text-muted-foreground">Your latest immersion sessions, all in one place.</p></div>
        <Link href="/history" className="flex items-center justify-between gap-6 text-[13px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">View complete history<ArrowRight aria-hidden="true" className="size-4" /></Link>
      </div>
      {history.isError ? <QueryError title="Could not load recent sessions" error={history.error} onRetry={() => void history.refetch()} />
        : history.isPending ? <div role="status" aria-label="Loading recent sessions" className="space-y-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20 w-full lg:h-12" />)}</div>
        : data && data.items.length === 0 ? <p className="border-y border-border py-12 text-center text-sm text-muted-foreground">No immersion sessions yet. Your sessions will appear here.</p>
        : data && <div aria-busy={history.isFetching}>
          <div className="hidden lg:block">
            <Table aria-label="Recent immersion sessions">
              <TableHeader className="bg-[#f8faf9]"><TableRow className="border-0 hover:bg-transparent">{["Medium", "Title", "Duration", "Date (UTC)", "Actions"].map((title) => <TableHead key={title} className="h-9 px-3 text-[11px] font-normal text-muted-foreground first:pl-0 last:pr-0">{title}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{data.items.map((session) => <TableRow key={session.id} className="h-[60px] border-border hover:bg-transparent"><TableCell className="pl-0 pr-5"><MediaBadge type={session.type} /></TableCell><TableCell className="max-w-[340px] whitespace-normal px-3 text-[13px] font-medium">{session.title}</TableCell><TableCell className="px-3 text-[13px] tabular-nums">{formatDuration(session.duration)}</TableCell><TableCell className="px-3 text-xs text-muted-foreground"><SessionDate date={session.created_at} /></TableCell><TableCell className="pr-0 text-right"><SessionActions session={session} /></TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
          <ul aria-label="Recent immersion sessions" className="divide-y divide-border border-t border-border lg:hidden">{data.items.map((session) => <li key={session.id} className="py-3"><div className="flex items-center justify-between gap-3"><MediaBadge type={session.type} /><SessionActions session={session} /></div><h3 className="mt-2 min-h-10 text-sm font-semibold leading-5">{session.title}</h3><div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-medium tabular-nums">{formatDuration(session.duration)}</span><span className="text-[11px] text-muted-foreground"><SessionDate date={session.created_at} /></span></div></li>)}</ul>
        </div>}
      {data && !history.isError && <div className="mt-3 flex flex-col gap-4 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">{data.total === 0 ? "Showing 0 sessions" : `Showing ${(data.page - 1) * data.limit + 1}–${Math.min(data.page * data.limit, data.total)} of ${data.total} sessions`}</p>
        <div className="flex items-center justify-between gap-5">
          <Button variant="outline" size="icon" aria-label="Previous sessions page" disabled={data.page <= 1 || history.isFetching} onClick={() => setPage(data.page - 1)} className="size-10 rounded-lg lg:size-8"><ChevronLeft aria-hidden="true" className="size-4" /></Button>
          <p className="min-w-20 text-center text-xs text-muted-foreground">Page {data.page} / {totalPages}</p>
          <Button variant="outline" size="icon" aria-label="Next sessions page" disabled={data.page >= totalPages || history.isFetching} onClick={() => setPage(data.page + 1)} className="size-10 rounded-lg lg:size-8"><ChevronRight aria-hidden="true" className="size-4" /></Button>
        </div>
      </div>}
    </Card>
  );
}
