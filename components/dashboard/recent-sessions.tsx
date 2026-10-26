"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getDashboardStatisticsQueryKey,
  getImmersionSessionHistoryQueryKey,
  getContentDetailsQueryKey,
  useImmersionSessionDelete,
  useImmersionSessionHistory,
  useImmersionSessionUpdate,
} from "@/lib/api/generated/immersion";
import type {
  SessionHistoryItemResponseDto,
  SessionHistoryItemResponseDtoType,
} from "@/lib/api/generated/models";
import { formatDuration } from "@/lib/duration";
import { formatUtcDate } from "@/lib/date";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
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
import { SessionDialog } from "@/components/session-dialog";
import { sessionMediaStyles } from "@/components/session-media";

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

function SessionActions({
  session,
}: {
  session: SessionHistoryItemResponseDto;
}) {
  const client = useQueryClient();
  const remove = useImmersionSessionDelete();
  const update = useImmersionSessionUpdate();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveSession(data: Parameters<typeof update.mutateAsync>[0]["data"]) {
    await update.mutateAsync({ id: session.id, data });
    await Promise.all([
      client.invalidateQueries({
        queryKey: getImmersionSessionHistoryQueryKey(),
      }),
      client.invalidateQueries({
        queryKey: getDashboardStatisticsQueryKey(),
      }),
      client.invalidateQueries({
        queryKey: getContentDetailsQueryKey(session.content_id),
      }),
    ]);
    toast.success("Session updated");
  }

  async function deleteSession() {
    if (deleting) return;
    setDeleting(true);
    try {
      await remove.mutateAsync({ id: session.id });
      await Promise.all([
        client.invalidateQueries({
          queryKey: getImmersionSessionHistoryQueryKey(),
        }),
        client.invalidateQueries({
          queryKey: getDashboardStatisticsQueryKey(),
        }),
        client.invalidateQueries({
          queryKey: getContentDetailsQueryKey(session.content_id),
        }),
      ]);
      toast.success("Session deleted");
      setConfirmingDelete(false);
    } catch {
      // Mutation defaults show recoverable failures and route server errors to the boundary.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${session.title}`}
          onClick={(event) => event.stopPropagation()}
          render={
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
            />
          }
        >
          <MoreVertical aria-hidden="true" className="size-[18px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48 whitespace-nowrap">
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              setEditing(true);
            }}
          >
            <Pencil aria-hidden="true" />
            Edit session
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              event.stopPropagation();
              setConfirmingDelete(true);
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SessionDialog
        key={`${session.id}-${session.created_at}-${session.duration}-${editing}`}
        session={session}
        open={editing}
        onOpenChange={setEditing}
        title="Edit session"
        saveLabel="Save changes"
        onSave={saveSession}
      />
      <DialogPrimitive.Root
        open={confirmingDelete}
        onOpenChange={(open) => {
          if (!remove.isPending && !deleting) setConfirmingDelete(open);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[#182d2a]/35 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 text-foreground shadow-xl outline-none">
            <div className="mb-5 flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbeceb] text-[#b94039]">
                <Trash2 aria-hidden="true" className="size-5" />
              </span>
              <DialogPrimitive.Title className="text-lg font-semibold">
                Delete this session?
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Description className="text-sm leading-5 text-muted-foreground">
              This will permanently remove this session from your immersion
              history. You can’t undo this action.
            </DialogPrimitive.Description>
            <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
              <Button
                variant="outline"
                disabled={remove.isPending || deleting}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={remove.isPending || deleting}
                onClick={() => void deleteSession()}
              >
                {remove.isPending || deleting ? "Deleting…" : "Delete session"}
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

function SessionDate({ date }: { date: string }) {
  return (
    <time dateTime={date}>
      {formatUtcDate(date)}
    </time>
  );
}

function showNotImplementedToast() {
  toast("Not implemented yet", { id: "not-implemented" });
}

function isInteractiveRowTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("button, a, input, [role='menuitem'], [role='dialog']") !==
      null
  );
}

export function RecentSessions() {
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
                      className="h-[60px] cursor-pointer border-border hover:bg-accent/40"
                      onClick={(event) => {
                        if (isInteractiveRowTarget(event.target)) return;
                        showNotImplementedToast();
                      }}
                    >
                      <TableCell className="pl-0 pr-5">
                        <MediaBadge type={session.type} />
                      </TableCell>
                      <TableCell className="max-w-[340px] whitespace-normal px-3 text-[13px] font-medium">
                        <button
                          type="button"
                          className="text-left outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring hover:underline"
                          onClick={showNotImplementedToast}
                        >
                          {session.title}
                        </button>
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
                    showNotImplementedToast();
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <MediaBadge type={session.type} />
                    <SessionActions session={session} />
                  </div>
                  <h3 className="mt-2 min-h-10 text-sm font-semibold leading-5">
                    <button
                      type="button"
                      className="text-left outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring hover:underline"
                      onClick={showNotImplementedToast}
                    >
                      {session.title}
                    </button>
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
