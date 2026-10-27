"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Play, Timer } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ContentPicker, type ContentChoice } from "@/components/content-picker";
import { QueryError } from "@/components/error/query-error";
import { LanguageDropdown } from "@/components/language-dropdown";
import { Button } from "@/components/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";
import { Skeleton } from "@/components/shadcn/skeleton";
import { sessionMediaStyles, SessionTypeIcon } from "@/components/session-media";
import {
  getDashboardStatisticsQueryKey,
  getImmersionSessionHistoryQueryKey,
  getTimerCurrentQueryKey,
  useContentCreate,
  useLanguageList,
  useTimerCurrent,
  useTimerStart,
  useTimerStop,
} from "@/lib/api/generated/immersion";
import type { CreateContentDtoType, CurrentTimerResponseDto } from "@/lib/api/generated/models";
import { ApiError } from "@/lib/api/fetch";
import { formatDuration } from "@/lib/duration";
import { isServerError } from "@/lib/query-options";
import { showMutationError } from "@/lib/mutation-error";

const contentTypes: { type: CreateContentDtoType; label: string }[] = [
  { type: "anime", label: "Anime" },
  { type: "book", label: "Book" },
  { type: "manga", label: "Manga" },
  { type: "drama", label: "Drama" },
  { type: "video", label: "YouTube" },
];
const titleSchema = z.string().trim().min(1, "Choose content to start a timer.").max(350);

function ActiveTimer({ timer, onStop, stopping, reduced, onReducedChange }: { timer: CurrentTimerResponseDto; onStop: () => void; stopping: boolean; reduced: boolean; onReducedChange: (reduced: boolean) => void }) {
  const [now, setNow] = useState(() => Date.now());
  const restoreToggleFocus = useRef(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timer.started_at]);
  useEffect(() => {
    if (!restoreToggleFocus.current) return;
    toggleButtonRef.current?.focus();
    restoreToggleFocus.current = false;
  }, [reduced]);
  const elapsed = Math.max(0, (now - Date.parse(timer.started_at)) / 1000);
  const reading = timer.type === "book" || timer.type === "manga";
  return (
    <section aria-label="Active immersion timer" className={reduced
      ? "fixed bottom-4 right-4 z-40 rounded-xl border border-border bg-white p-1 shadow-[0_12px_32px_#182d2a24] sm:right-6"
      : "fixed bottom-4 left-4 right-4 z-40 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-[0_12px_32px_#182d2a24] sm:left-auto sm:right-6 sm:w-[min(680px,calc(100vw-3rem))] sm:flex-nowrap"}>
      {reduced ? (
        <>
          <span className="sr-only">Active timer for {timer.title}. Elapsed time: {formatDuration(elapsed)}.</span>
          <Button ref={toggleButtonRef} variant="ghost" size="icon-lg" aria-label="Expand active timer" onClick={() => { restoreToggleFocus.current = true; onReducedChange(false); }} className="size-10 rounded-lg bg-[#e8f4ee] text-primary hover:bg-[#dfeee6]"><Timer aria-hidden="true" className="size-5" /></Button>
        </>
      ) : (
        <>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f4ee] text-primary"><Timer aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-primary">Active immersion</span><span className="rounded bg-[#edf2fa] px-2 py-0.5 text-[10px] text-[#5e7fa9]">{reading ? "Reading" : sessionMediaStyles[timer.type].label}</span></div>
            <p className="truncate text-sm font-medium">{timer.title}</p>
          </div>
          <output aria-label="Elapsed time" className="text-2xl font-semibold tabular-nums text-primary">{formatDuration(elapsed)}</output>
          <Button onClick={onStop} disabled={stopping} className="h-10 min-w-24 gap-2 rounded-lg"><Check aria-hidden="true" className="size-4" />{stopping ? "Logging…" : "Log"}</Button>
          <Button ref={toggleButtonRef} variant="ghost" size="icon-sm" aria-label="Reduce active timer" onClick={() => { restoreToggleFocus.current = true; onReducedChange(true); }} className="rounded-lg bg-[#f2f6f3] text-[#40544e]"><ChevronDown aria-hidden="true" /></Button>
        </>
      )}
    </section>
  );
}

export type TimerFeatureHandle = { start: () => void };

export function TimerFeature({ children, ref, reduced, onReducedChange }: { children?: ReactNode; ref?: Ref<TimerFeatureHandle>; reduced: boolean; onReducedChange: (reduced: boolean) => void }) {
  const client = useQueryClient();
  const current = useTimerCurrent({ query: { retry: false } });
  const languages = useLanguageList({ query: { enabled: false } });
  const createContent = useContentCreate({ mutation: { retry: false, throwOnError: isServerError } });
  const start = useTimerStart({ mutation: { retry: false, throwOnError: isServerError, onError: (error) => {
    if (error instanceof ApiError && error.status === 409) return;
    if (!isServerError(error)) showMutationError(error);
  } } });
  const stop = useTimerStop({ mutation: { retry: false, throwOnError: isServerError } });
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CreateContentDtoType>("book");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<ContentChoice | null>(null);
  const [languageId, setLanguageId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const active = !current.isError && current.data && typeof current.data === "object" ? current.data : null;
  const noTimer = current.error instanceof ApiError && current.error.status === 404;
  const currentError = current.isError && !noTimer;
  const language = languageId;
  const validLanguage = languages.data?.some((item) => item.id === language) ?? false;

  useEffect(() => {
    if (current.data === null || noTimer) onReducedChange(false);
  }, [current.data, noTimer, onReducedChange]);

  async function showDialog() {
    if (active) { toast.warning("Stop the existing timer first."); return; }
    const latest = await current.refetch();
    if (!latest.isError && latest.data && typeof latest.data === "object") { toast.warning("Stop the existing timer first."); return; }
    if (latest.error && !(latest.error instanceof ApiError && latest.error.status === 404)) return;
    setOpen(true);
    await languages.refetch();
  }
  useImperativeHandle(ref, () => ({ start: () => { void showDialog(); } }));

  async function begin() {
    if (writing.current) return;
    if (!validLanguage) {
      setError("Choose a language to start the timer.");
      return;
    }
    const parsed = titleSchema.safeParse(title);
    if (!parsed.success || !selected || selected.title !== parsed.data) {
      setError("Select existing content or choose a new title.");
      return;
    }
    if (!selected.id && !validLanguage) {
      setError("Choose a language for new content.");
      return;
    }
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      let contentId = selected.id;
      if (!contentId) {
        contentId = (await createContent.mutateAsync({ data: { title: parsed.data, type, language } }))._id;
        setSelected({ id: contentId, title: parsed.data });
      }
      const result = await start.mutateAsync({ data: { content: contentId } });
      client.setQueryData<CurrentTimerResponseDto>(getTimerCurrentQueryKey(), {
        id: result._id, content_id: contentId, title: parsed.data, type, started_at: result.started_at,
      });
      setOpen(false);
      setTitle("");
      setSelected(null);
      void client.invalidateQueries({ queryKey: getTimerCurrentQueryKey() });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const latest = await current.refetch();
        if (latest.data && typeof latest.data === "object" && !latest.isError) {
          setOpen(false);
          toast.warning("Stop the existing timer first.", { id: "timer-already-active" });
        } else showMutationError(error);
      }
      // Shared mutation defaults show recoverable errors; the error boundary handles 5xx.
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  async function finish() {
    if (writing.current) return;
    writing.current = true;
    try {
      await stop.mutateAsync();
      client.setQueryData(getTimerCurrentQueryKey(), null);
      void client.invalidateQueries({ queryKey: getTimerCurrentQueryKey() });
      void client.invalidateQueries({ queryKey: getDashboardStatisticsQueryKey() });
      void client.invalidateQueries({ queryKey: getImmersionSessionHistoryQueryKey() });
      toast.success("Session logged.");
    } catch {
      // Shared mutation defaults show recoverable errors; the error boundary handles 5xx.
    } finally {
      writing.current = false;
    }
  }

  const timer = <>
    {current.isLoading && <div role="status" aria-label="Checking active timer" className="sr-only">Checking active timer</div>}
    {currentError && <div className="fixed bottom-4 right-4 z-40 max-w-sm"><QueryError title="Could not check your timer" error={current.error} onRetry={() => { void current.refetch(); }} /></div>}
    {active && <ActiveTimer timer={active} onStop={() => { void finish(); }} stopping={stop.isPending} reduced={reduced} onReducedChange={onReducedChange} />}
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogContent initialFocus={dialogTitleRef} className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-5 sm:w-[680px] sm:max-w-[calc(100vw-2rem)] sm:p-7" showCloseButton={!busy}>
        <DialogHeader className="gap-3 border-b border-border pb-5">
          <div className="flex items-center gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f4ee] text-primary"><Timer aria-hidden="true" className="size-5" /></span><DialogTitle ref={dialogTitleRef} tabIndex={-1} className="pr-6 text-[22px] font-semibold outline-none">Start an immersion timer</DialogTitle></div>
          <DialogDescription>Choose your content and settle into your next session.</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 space-y-6 overflow-y-auto px-1 py-6">
          <fieldset disabled={busy}><legend className="mb-2 text-xs text-muted-foreground">Content type</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{contentTypes.map((item) => <button key={item.type} type="button" aria-pressed={type === item.type} onClick={() => { setType(item.type); setTitle(""); setSelected(null); setError(""); }} className={`flex h-16 items-center justify-center gap-2 rounded-xl border text-xs font-semibold focus-visible:outline-2 focus-visible:outline-primary ${type === item.type ? "border-primary bg-[#e8f4ee] text-primary" : "border-border bg-[#f9fbfa]"}`}><SessionTypeIcon type={item.type} aria-hidden="true" className="size-4" />{item.label}</button>)}</div></fieldset>
          {languages.isLoading ? <div role="status" aria-label="Loading languages"><Skeleton className="h-12 w-full" /></div> : <>
            <div className="space-y-2"><label htmlFor="timer-language" className="block text-xs text-muted-foreground">Language</label><LanguageDropdown id="timer-language" className="lg:w-full" languages={languages.data ?? []} value={languages.data?.find((item) => item.id === language)} onChange={(value) => { setLanguageId(value); setTitle(""); setSelected(null); setError(""); }} loading={languages.isLoading} /></div>
            {languages.error && <QueryError title="Could not load languages" error={languages.error} onRetry={() => { void languages.refetch(); }} />}
            <ContentPicker language={language} type={type} title={title} selected={selected} onTitleChange={(value) => { setTitle(value); setSelected(null); setError(""); }} onSelect={(choice) => { setSelected(choice); setTitle(choice.title); setError(""); }} disabled={busy || !validLanguage} error={error} newContentAction="start the timer" />
          </>}
        </div>
        <DialogFooter className="-mx-5 -mb-5 mt-1 gap-3 border-t border-border bg-white px-5 py-5 sm:-mx-7 sm:-mb-7 sm:px-7"><Button variant="outline" onClick={() => setOpen(false)} disabled={busy} className="h-11 w-full sm:w-[108px]">Cancel</Button><Button onClick={() => { void begin(); }} disabled={busy || languages.isLoading || !!languages.error || !validLanguage} className="h-11 w-full gap-2 sm:w-[196px]"><Play aria-hidden="true" className="size-4" />{busy ? "Starting…" : "Start timer"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
  return <>{children}{timer}</>;
}
