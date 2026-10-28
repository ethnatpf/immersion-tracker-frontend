"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useImmersionSessionHistory } from "@/lib/api/generated/immersion";
import type {
  SessionHistoryItemResponseDtoType,
} from "@/lib/api/generated/models";
import { formatDuration } from "@/lib/duration";
import { formatUtcDate } from "@/lib/date";
import { Card } from "@/components/shadcn/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { Skeleton } from "@/components/shadcn/skeleton";
import { QueryError } from "@/components/error/query-error";
import { SessionActions } from "@/components/session-actions";
import { sessionMediaStyles } from "@/components/session-media";
import { contentDetailPath } from "@/lib/content";

function MediaBadge({ type }: { type: SessionHistoryItemResponseDtoType }) {
  const { icon: Icon, label, color, background } = sessionMediaStyles[type];
  return (
    <span
      className="inline-flex  items-center gap-2 rounded-md px-2 py-1.5 text-[11px] "
      style={{ color, backgroundColor: background }}
    >
      <Icon aria-hidden="true" className="size-[14px]" />
      {label}
    </span>
  );
}

function SessionDate({ date }: { date: string }) {
  return (
    <time dateTime={date}>
      {formatUtcDate(date)}
    </time>
  );
}

function isInteractiveRowTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("button, a, input, [role='menuitem'], [role='dialog']") !==
      null
  );
}

export function RecentSessions() {
  const router = useRouter();
  const history = useImmersionSessionHistory(
    { page: 1, limit: 5 },
    { query: { retry: false } },
  );
  const data = history.data;
  return (
    <Card
      role="region"
      aria-labelledby="recent-log-heading"
      className="gap-0 rounded-2xl border border-border p-4 text-foreground ring-0 xl:p-6"
    >
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="recent-log-heading" className="text-[19px] font-semibold">
            Recent immersion log
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your latest immersion sessions, all in one place.
          </p>
        </div>
        <Link
          href="/history"
          className="flex items-center justify-between gap-6 text-[13px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View complete history
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {history.isError ? (
        <QueryError
          title="Could not load recent sessions"
          error={history.error}
          onRetry={() => void history.refetch()}
        />
      ) : history.isPending ? (
        <div
          role="status"
          aria-label="Loading recent sessions"
          className="space-y-4"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full lg:h-12" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <p className="border-y border-border py-12 text-center text-sm text-muted-foreground">
          No immersion sessions yet. Your sessions will appear here.
        </p>
      ) : (
        data && (
          <div aria-busy={history.isFetching}>
            <div className="hidden lg:block">
              <Table aria-label="Recent immersion sessions">
                <TableHeader className="bg-[#f8faf9]">
                  <TableRow className="border-0 hover:bg-transparent">
                    {["Medium", "Title", "Duration", "Date (UTC)", ""].map(
                      (title) => (
                        <TableHead
                          key={title}
                          className="h-9 px-3 text-[11px] font-normal text-muted-foreground first:pl-0 last:pr-0"
                        >
                          {title}
                        </TableHead>
                      ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((session) => (
                    <TableRow
                      key={session.id}
                      className="h-[60px] cursor-pointer border-border hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-primary"
                      onClick={(event) => {
                        if (isInteractiveRowTarget(event.target)) return;
                        router.push(contentDetailPath(session.content_id));
                      }}
                    >
                      <TableCell className="pl-0 pr-5">
                        <MediaBadge type={session.type} />
                      </TableCell>
                      <TableCell className="max-w-[340px] whitespace-normal px-3 text-[13px] font-medium">
                        <Link
                          href={contentDetailPath(session.content_id)}
                          className="text-left outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {session.title}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 text-[13px] tabular-nums">
                        {formatDuration(session.duration)}
                      </TableCell>
                      <TableCell className="px-3 text-xs text-muted-foreground">
                        <SessionDate date={session.created_at} />
                      </TableCell>
                      <TableCell className="pr-0 text-right">
                        <SessionActions session={session} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul
              aria-label="Recent immersion sessions"
              className="divide-y divide-border border-t border-border lg:hidden"
            >
              {data.items.map((session) => (
                <li
                  key={session.id}
                  className="cursor-pointer py-3"
                  onClick={(event) => {
                    if (isInteractiveRowTarget(event.target)) return;
                    router.push(contentDetailPath(session.content_id));
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <MediaBadge type={session.type} />
                    <SessionActions session={session} />
                  </div>
                  <h3 className="mt-2 min-h-10 text-sm font-semibold leading-5">
                    <Link
                      href={contentDetailPath(session.content_id)}
                      className="text-left outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {session.title}
                    </Link>
                  </h3>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium tabular-nums">
                      {formatDuration(session.duration)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      <SessionDate date={session.created_at} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </Card>
  );
}
