"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getContentDetailsQueryKey,
  getDashboardStatisticsQueryKey,
  getImmersionSessionHistoryQueryKey,
  useImmersionSessionDelete,
  useImmersionSessionUpdate,
} from "@/lib/api/generated/immersion";
import type { SessionHistoryItemResponseDto } from "@/lib/api/generated/models";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { SessionDialog } from "@/components/session-dialog";
import { SessionDeleteDialog } from "@/components/session-delete-dialog";

export function SessionActions({
  session,
  inline = false,
  onDeleted,
}: {
  session: SessionHistoryItemResponseDto;
  inline?: boolean;
  onDeleted?: () => void;
}) {
  const client = useQueryClient();
  const remove = useImmersionSessionDelete();
  const update = useImmersionSessionUpdate();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function refreshSessionViews() {
    await Promise.all([
      client.invalidateQueries({
        queryKey: getImmersionSessionHistoryQueryKey(),
      }),
      client.invalidateQueries({ queryKey: getDashboardStatisticsQueryKey() }),
      client.invalidateQueries({
        queryKey: getContentDetailsQueryKey(session.content_id),
      }),
    ]);
  }

  async function saveSession(
    data: Parameters<typeof update.mutateAsync>[0]["data"],
  ) {
    await update.mutateAsync({ id: session.id, data });
    await refreshSessionViews();
    toast.success("Session updated");
  }

  async function deleteSession() {
    if (deleting) return;
    setDeleting(true);
    try {
      await remove.mutateAsync({ id: session.id });
      onDeleted?.();
      await refreshSessionViews();
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
      {inline ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Edit ${session.title}`}
            onClick={() => setEditing(true)}
            className="size-9 bg-white text-muted-foreground"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Delete ${session.title}`}
            onClick={() => setConfirmingDelete(true)}
            className="size-9 bg-white text-muted-foreground"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : (
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
          <DropdownMenuContent
            align="end"
            className="min-w-48 whitespace-nowrap"
          >
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
      )}
      <SessionDialog
        key={`${session.id}-${session.created_at}-${session.duration}-${editing}`}
        session={session}
        open={editing}
        onOpenChange={setEditing}
        title="Edit session"
        saveLabel="Save changes"
        onSave={saveSession}
      />
      <SessionDeleteDialog
        open={confirmingDelete}
        onOpenChange={(open) => {
          if (!remove.isPending && !deleting) setConfirmingDelete(open);
        }}
        busy={remove.isPending || deleting}
        onConfirm={() => void deleteSession()}
      />
    </>
  );
}
