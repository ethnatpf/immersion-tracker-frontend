"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog";

export function SessionDeleteDialog({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[#182d2a]/35 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0"
        className="flex w-[calc(100%-2rem)] max-w-[400px] flex-col gap-0 rounded-2xl bg-white p-6 text-foreground shadow-xl ring-0 sm:max-w-[400px]"
      >
          <DialogHeader className="mb-5 flex-row items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbeceb] text-[#b94039]">
              <Trash2 aria-hidden="true" className="size-5" />
            </span>
            <DialogTitle className="text-lg font-semibold">
              Delete this session?
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-sm leading-5 text-muted-foreground">
            This will permanently remove this session from your immersion
            history. You can’t undo this action.
          </DialogDescription>
          <DialogFooter className="mx-0 mb-0 mt-5 flex-row justify-end gap-3 rounded-none border-border bg-white p-0 pt-4">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Deleting…" : "Delete session"}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
