"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/shadcn/button";

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
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) onOpenChange(nextOpen);
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
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
