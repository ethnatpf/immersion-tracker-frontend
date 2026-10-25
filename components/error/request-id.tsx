"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/button";

export function RequestId({ requestId }: { requestId: string }) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(requestId);
      setCopyStatus("Request ID copied.");
    } catch {
      setCopyStatus("Could not copy. Select and copy the ID manually.");
    }
  }

  return (
    <div className="mt-6 rounded-[10px] bg-[#f7f9f8] p-4 text-left md:mt-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">Request ID</p>
        <Button variant="outline" onClick={() => void copy()} className="-my-1.5 h-9 bg-white px-4 text-xs font-semibold text-primary">Copy ID</Button>
      </div>
      <p className="mt-5 break-all text-[11px] font-medium leading-[22px] select-all md:text-[13px]">{requestId}</p>
      <p className="mt-2 text-xs leading-[18px] text-muted-foreground">Share this ID when reporting<br />the issue so we can look into it.</p>
      <p role="status" className={copyStatus ? "mt-2 text-xs text-muted-foreground" : "sr-only"}>{copyStatus}</p>
    </div>
  );
}
