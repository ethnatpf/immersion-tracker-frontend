"use client";

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { RequestId } from "@/components/error/request-id";
import { cn } from "@/lib/utils";

export function ServerErrorPage({ status, requestId, onRetry }: { status: number; requestId?: string; onRetry: () => void }) {
  return (
    <div>
      <p className="hidden pt-2 text-[11px] font-semibold leading-4 text-muted-foreground md:block">WORKSPACE</p>
      <Card className="mx-auto mt-[30px] max-w-[600px] gap-0 rounded-2xl border border-border bg-white px-[23px] pb-8 pt-[31px] text-center ring-0 md:mt-[124px] md:pb-[35px]">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#fff3e6] text-[#b96c30]"><CircleAlert aria-hidden="true" className="size-[22px]" /></span>
        <p className="mt-[18px] text-[11px] font-semibold leading-[18px] text-muted-foreground">{status} · SERVER ERROR</p>
        <h1 className="mt-[14px] text-2xl font-semibold leading-10 md:text-[28px]">Something went wrong</h1>
        <p className="mt-3 text-sm leading-[25px] text-muted-foreground">We couldn’t load this page.<br />Please try again in a moment.</p>
        <div className="mt-[18px] flex flex-col justify-center gap-3 md:flex-row md:gap-4">
          <Button onClick={onRetry} className="h-12 rounded-[10px] font-semibold md:w-[150px]">Try again</Button>
          <Link href="/" onNavigate={onRetry} className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-[10px] bg-white font-semibold md:w-[196px]")}>Back to dashboard</Link>
        </div>
        {requestId && <RequestId key={requestId} requestId={requestId} />}
      </Card>
    </div>
  );
}
