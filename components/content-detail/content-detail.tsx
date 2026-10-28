"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Plus,
  RotateCcw,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import {
  getContentDetailsQueryKey,
  getDashboardStatisticsQueryKey,
  getImmersionSessionHistoryQueryKey,
  useContentDetails,
  useContentUpdate,
  useImmersionSessionCreate,
  useImmersionSessionHistory,
} from "@/lib/api/generated/immersion";
import type {
  ContentDetailsResponseDto,
  SessionHistoryItemResponseDto,
} from "@/lib/api/generated/models";
import { formatDuration } from "@/lib/duration";
import { formatUtcDate } from "@/lib/date";
import { sessionMediaStyles } from "@/components/session-media";
import { SessionActions } from "@/components/session-actions";
import { SessionDialog } from "@/components/session-dialog";
import { QueryError } from "@/components/error/query-error";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { useTimerLauncher } from "@/components/timer/timer-feature";

const PAGE_SIZE = 5;

function progressLabel(
  session: Pick<SessionHistoryItemResponseDto, "progress">,
) {
  if (!session.progress) return "Progress not recorded";
  const noun = session.progress.unit === "page" ? "Pages" : "Episodes";
  return `${noun} ${session.progress.start}–${session.progress.end}`;
}

function progressCount(
  session: Pick<SessionHistoryItemResponseDto, "progress">,
) {
  if (!session.progress) return null;
  const count = Math.max(
    0,
    session.progress.end -
      session.progress.start +
      (session.progress.unit === "episode" ? 1 : 0),
  );
  if (count === 0) return null;
  const unit = session.progress.unit === "page" ? "page" : "episode";
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

function lastSessionDetail(
  session: NonNullable<ContentDetailsResponseDto["lastImmersionSession"]>,
) {
  const relativeDate = formatDistanceToNowStrict(new Date(session.created_at), {
    addSuffix: true,
  });
  if (!session.progress) return relativeDate;
  const prefix = session.progress.unit === "page" ? "p." : "ep.";
  return `${relativeDate} (${prefix} ${session.progress.start}–${session.progress.end})`;
}

function ContentBadge({ content }: { content: ContentDetailsResponseDto }) {
  const {
    icon: Icon,
    label,
    color,
    background,
  } = sessionMediaStyles[content.type];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium"
      style={{ color, backgroundColor: background }}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </span>
  );
}

function SummaryMetric({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Clock3;
}) {
  return (
    <Card className="relative min-h-[124px] gap-0 rounded-2xl border border-border bg-white p-5 ring-0 md:min-h-[140px]">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-4 pr-12 text-[30px] font-semibold leading-9 tracking-tight tabular-nums md:text-[32px]">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      <span className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-xl bg-[#e8f4ee] text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
    </Card>
  );
}

function DesktopSessions({
  sessions,
  onDeleted,
}: {
  sessions: SessionHistoryItemResponseDto[];
  onDeleted: () => void;
}) {
  return (
    <div className="hidden md:block">
      <Table
        aria-label="Immersion sessions for this content"
        className="table-fixed"
      >
        <TableHeader className="bg-[#f8faf9] text-xs text-muted-foreground">
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="w-[22%] px-5 py-3 font-normal">
              Date
            </TableHead>
            <TableHead className="px-3 py-3 font-normal">
              Session / progress
            </TableHead>
            <TableHead className="w-[19%] px-3 py-3 text-right font-normal">
              Duration
            </TableHead>
            <TableHead className="w-[112px] px-5 py-3 text-right font-normal">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id} className="h-[68px] border-border">
              <TableCell className="px-5 text-xs text-muted-foreground">
                <time dateTime={session.created_at}>
                  {formatUtcDate(session.created_at)}
                </time>
              </TableCell>
              <TableCell className="px-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {progressLabel(session)}
                  </span>
                  {progressCount(session) && (
                    <span className="rounded-md bg-[#edf2fa] px-2.5 py-1 text-[11px] text-[#5e7fa9]">
                      {progressCount(session)}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-3 text-right text-sm tabular-nums">
                {formatDuration(session.duration)}
              </TableCell>
              <TableCell className="px-5">
                <div className="flex justify-end">
                  <SessionActions
                    session={session}
                    inline
                    onDeleted={onDeleted}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MobileSessions({
  sessions,
  onDeleted,
}: {
  sessions: SessionHistoryItemResponseDto[];
  onDeleted: () => void;
}) {
  return (
    <ul
      aria-label="Immersion sessions for this content"
      className="divide-y divide-border md:hidden"
    >
      {sessions.map((session) => (
        <li key={session.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <time
                dateTime={session.created_at}
                className="text-xs text-muted-foreground"
              >
                {formatUtcDate(session.created_at)}
              </time>
              <p className="mt-2 text-sm font-medium">
                {progressLabel(session)}
              </p>
              {progressCount(session) && (
                <span className="mt-2 inline-flex rounded-md bg-[#edf2fa] px-2.5 py-1 text-[11px] text-[#5e7fa9]">
                  {progressCount(session)}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
              <Clock3
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              {formatDuration(session.duration)}
            </span>
            <SessionActions
              session={session}
              inline
              onDeleted={onDeleted}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ContentDetail({ contentId }: { contentId: string }) {
  const [page, setPage] = useState(1);
  const [logSessionOpen, setLogSessionOpen] = useState(false);
  const client = useQueryClient();
  const launchTimer = useTimerLauncher();
  const content = useContentDetails(contentId, { query: { retry: false } });
  const history = useImmersionSessionHistory(
    { content: contentId, page, limit: PAGE_SIZE },
    { query: { retry: false, enabled: !!content.data } },
  );
  const updateContent = useContentUpdate({ mutation: { retry: false } });
  const createSession = useImmersionSessionCreate({
    mutation: { retry: false },
  });

  async function setCompleted(completed: boolean) {
    if (!content.data || updateContent.isPending) return;
    try {
      await updateContent.mutateAsync({
        id: contentId,
        data: { completed },
      });
      await Promise.all([
        client.invalidateQueries({
          queryKey: getContentDetailsQueryKey(contentId),
        }),
        client.invalidateQueries({
          queryKey: getImmersionSessionHistoryQueryKey(),
        }),
      ]);
      toast.success(
        completed
          ? "Content marked as completed"
          : "Content moved back to in progress",
      );
    } catch {
      // Shared mutation defaults show recoverable failures and route server errors to the boundary.
    }
  }

  async function logSession(data: {
    created_at: string;
    duration: number;
    progress?: SessionHistoryItemResponseDto["progress"];
  }) {
    await createSession.mutateAsync({
      data: {
        content: contentId,
        created_at: data.created_at,
        duration: data.duration,
        ...(data.progress ? { progress: data.progress } : {}),
      },
    });
    setPage(1);
    await Promise.all([
      client.invalidateQueries({
        queryKey: getContentDetailsQueryKey(contentId),
      }),
      client.invalidateQueries({
        queryKey: getImmersionSessionHistoryQueryKey(),
      }),
      client.invalidateQueries({
        queryKey: getDashboardStatisticsQueryKey(),
      }),
    ]);
    toast.success("Session saved");
  }

  if (content.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading content details"
        className="space-y-6"
      >
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (content.isError) {
    return (
      <QueryError
        title="Could not load content details"
        error={content.error}
        onRetry={() => void content.refetch()}
      />
    );
  }

  const details = content.data;
  const lastSession = details.lastImmersionSession;
  const lastDetail = lastSession
    ? lastSessionDetail(lastSession)
    : "No immersion sessions yet";

  return (
    <div className="space-y-6 pb-8 text-foreground">
      <section className="md:pt-[52px]">
        <div className="flex flex-wrap items-center gap-2">
          <ContentBadge content={details} />
          <span className="inline-flex items-center gap-2 rounded-md bg-[#e8f4ee] px-2.5 py-1.5 text-xs font-medium text-[#167d68]">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[#167d68]"
            />
            {details.completed ? "Completed" : "In progress"}
          </span>
        </div>
        <h1 className="mt-4 break-words text-[27px] font-semibold leading-tight tracking-tight md:mt-5 md:text-[36px]">
          {details.title}
        </h1>
        <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:flex md:flex-wrap">
          <Button
            type="button"
            onClick={() => setLogSessionOpen(true)}
            className="order-1 col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring md:order-3 md:col-span-1 md:px-5"
          >
            <Plus aria-hidden="true" className="size-[18px]" />
            Log new session
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              launchTimer?.({
                id: details.id,
                title: details.title,
                type: details.type,
            }, { immediate: true })
            }
            className="order-2 h-12 gap-2 rounded-lg bg-white px-2 text-[13px] font-semibold sm:px-4 sm:text-sm md:order-2 md:px-6"
          >
            <Timer aria-hidden="true" className="size-4 text-primary" />
            Start timer
          </Button>
          <Button
            aria-label={
              updateContent.isPending
                ? "Saving completion status"
                : `Mark ${details.type} as ${details.completed ? "in progress" : "completed"}`
            }
            onClick={() => void setCompleted(!details.completed)}
            disabled={updateContent.isPending}
            variant="outline"
            className="order-3 h-12 gap-2 rounded-lg bg-white px-2 text-[13px] font-semibold sm:px-4 sm:text-sm md:order-1"
          >
            {details.completed ? (
              <RotateCcw aria-hidden="true" className="size-4 text-primary" />
            ) : (
              <Check aria-hidden="true" className="size-4 text-primary" />
            )}
            {updateContent.isPending ? (
              "Saving…"
            ) : (
              <>
                <span className="md:hidden">
                  Mark {details.completed ? "in progress" : "completed"}
                </span>
                <span className="hidden md:inline">
                  Mark {details.type} as {details.completed ? "in progress" : "completed"}
                </span>
              </>
            )}
          </Button>
        </div>
      </section>

      <section
        aria-label="Content summary"
        className="grid gap-4 md:grid-cols-2"
      >
        <SummaryMetric
          title="Total time spent"
          value={formatDuration(details.totalTimeSpent)}
          detail={`${history.data?.total ?? 0} total recorded ${history.data?.total === 1 ? "session" : "sessions"}`}
          icon={Clock3}
        />
        <SummaryMetric
          title={
            details.type === "book" || details.type === "manga"
              ? "Last read"
              : "Last session"
          }
          value={lastSession ? formatUtcDate(lastSession.created_at) : "—"}
          detail={lastDetail}
          icon={CalendarDays}
        />
      </section>

      <Card className="gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 ring-0">
        <div className="flex flex-col gap-1 px-5 pb-5 pt-5 md:flex-row md:items-end md:justify-between md:px-6 md:pt-6">
          <div>
            <h2 className="text-lg font-semibold">Immersion logs</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Historical record of time invested.
            </p>
          </div>
          {history.data && (
            <p className="text-xs text-muted-foreground">
              Showing {history.data.items.length}{" "}
              {history.data.items.length === 1 ? "record" : "records"}
            </p>
          )}
        </div>
        {history.isError ? (
          <div className="px-5 pb-5 md:px-6">
            <QueryError
              title="Could not load immersion logs"
              error={history.error}
              onRetry={() => void history.refetch()}
            />
          </div>
        ) : history.isPending ? (
          <div
            role="status"
            aria-label="Loading immersion logs"
            className="space-y-3 px-5 pb-6 md:px-6"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : history.data.items.length === 0 ? (
          <p className="border-t border-border px-5 py-12 text-center text-sm text-muted-foreground">
            No sessions have been recorded for this content.
          </p>
        ) : (
          <>
            <div className="border-t border-border px-5 py-5 md:hidden">
              <MobileSessions
                sessions={history.data.items}
                onDeleted={() => void history.refetch()}
              />
            </div>
            <DesktopSessions
              sessions={history.data.items}
              onDeleted={() => void history.refetch()}
            />
            {(page > 1 || page * PAGE_SIZE < history.data.total) && (
              <div className="flex justify-center gap-4 border-t border-border py-5">
                {page > 1 && (
                  <Button
                    variant="ghost"
                    disabled={history.isFetching}
                    onClick={() => setPage((currentPage) => currentPage - 1)}
                    className="gap-2 font-medium text-primary hover:bg-transparent hover:text-primary/80"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 rotate-180"
                    />
                    View newer records
                  </Button>
                )}
                {page * PAGE_SIZE < history.data.total && (
                  <Button
                    variant="ghost"
                    disabled={history.isFetching}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                    className="gap-2 font-medium text-primary hover:bg-transparent hover:text-primary/80"
                  >
                    View older records
                    <ChevronDown aria-hidden="true" className="size-4" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </Card>
      {logSessionOpen && (
        <SessionDialog
          session={{
            type: details.type,
            title: details.title,
            created_at: new Date().toISOString().slice(0, 10),
            duration: 0,
          }}
          open
          onOpenChange={setLogSessionOpen}
          title="Log new session"
          saveLabel="Log session"
          requireEpisodeProgress={
            details.type === "anime" || details.type === "drama"
          }
          onSave={logSession}
        />
      )}
    </div>
  );
}
