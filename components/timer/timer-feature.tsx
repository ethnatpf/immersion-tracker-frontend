"use client";

import {
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Play, Timer } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ContentPicker, type ContentChoice } from "@/components/content-picker";
import { QueryError } from "@/components/error/query-error";
import { LanguageDropdown } from "@/components/language-dropdown";
import { Button } from "@/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  sessionMediaStyles,
  SessionTypeIcon,
} from "@/components/session-media";
import {
  getDashboardStatisticsQueryKey,
  getImmersionSessionHistoryQueryKey,
  getTimerCurrentQueryKey,
  useContentCreate,
  useLanguageList,
  useTimerCurrent,
  useTimerStart,
  useTimerStop,
  useUserPreferences,
} from "@/lib/api/generated/immersion";
import type {
  CreateContentDtoType,
  CurrentTimerResponseDto,
} from "@/lib/api/generated/models";
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
const titleSchema = z
  .string()
  .trim()
  .min(1, "Choose content to start a timer.")
  .max(350);

function ActiveTimer({
  timer,
  onStop,
  stopping,
  reduced,
  onReducedChange,
}: {
  timer: CurrentTimerResponseDto;
  onStop: () => void;
  stopping: boolean;
  reduced: boolean;
  onReducedChange: (reduced: boolean) => void;
}) {
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
  const category = reading ? "Reading" : sessionMediaStyles[timer.type].label;
  return (
    <section
      aria-label="Active immersion timer"
      className={
        reduced
          ? "fixed bottom-4 right-4 z-40 rounded-xl border border-border bg-white p-1 shadow-[0_12px_32px_#182d2a24] sm:right-6"
          : "fixed bottom-3 left-3 right-3 z-40 grid min-h-[148px] grid-cols-[minmax(0,1fr)_auto] grid-rows-[32px_auto_40px] gap-x-3 gap-y-1 rounded-2xl border border-border bg-white p-3 shadow-[0_12px_32px_#182d2a24] sm:bottom-4 sm:left-auto sm:right-6 sm:min-h-0 sm:flex sm:w-[min(680px,calc(100vw-3rem))] sm:flex-nowrap sm:items-center sm:gap-3 sm:px-4 sm:py-3"
      }
    >
      {reduced ? (
        <>
          <span className="sr-only">
            Active timer for {timer.title}. Elapsed time:{" "}
            {formatDuration(elapsed)}.
          </span>
          <Button
            ref={toggleButtonRef}
            variant="ghost"
            size="icon-lg"
            aria-label="Expand active timer"
            onClick={() => {
              restoreToggleFocus.current = true;
              onReducedChange(false);
            }}
            className="size-10 rounded-lg bg-[#e8f4ee] text-primary hover:bg-[#dfeee6]"
          >
            <Timer aria-hidden="true" className="size-5" />
          </Button>
        </>
      ) : (
        <>
          <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f4ee] text-primary sm:flex">
            <Timer aria-hidden="true" className="size-5" />
          </span>
          <div className="col-start-1 row-span-2 flex min-w-0 flex-col justify-center gap-y-1 sm:order-2 sm:row-span-1 sm:flex-1 sm:gap-y-0">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full bg-primary sm:hidden"
              />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-xs sm:normal-case">
                Active session
              </span>
              <span className="hidden rounded bg-[#edf2fa] px-2 py-0.5 text-[10px] text-[#5e7fa9] sm:inline-flex">
                {category}
              </span>
            </div>
            <p className="truncate text-sm font-semibold sm:font-medium">
              {timer.title}
            </p>
            <span className="text-xs text-muted-foreground sm:hidden">
              {category}
            </span>
          </div>
          <output
            aria-label="Elapsed time"
            className="col-start-1 row-start-3 self-center text-2xl font-semibold tabular-nums text-primary sm:order-3"
          >
            {formatDuration(elapsed)}
          </output>
          <Button
            onClick={onStop}
            disabled={stopping}
            className="col-start-2 row-start-3 h-10 min-w-28 gap-2 rounded-lg px-3 text-xs sm:order-4 sm:min-w-32 sm:text-sm"
          >
            <Check aria-hidden="true" className="hidden size-4 sm:block" />
            {stopping ? "Logging…" : "Finish & log"}
          </Button>
          <Button
            ref={toggleButtonRef}
            variant="ghost"
            size="icon-sm"
            aria-label="Reduce active timer"
            onClick={() => {
              restoreToggleFocus.current = true;
              onReducedChange(true);
            }}
            className="col-start-2 row-start-1 size-8 justify-self-end rounded-lg bg-[#f2f6f3] text-[#40544e] sm:order-5 sm:size-9"
          >
            <ChevronDown aria-hidden="true" />
          </Button>
        </>
      )}
    </section>
  );
}

export type TimerFeatureHandle = { start: () => void };
export type TimerLauncherContent = {
  id: string;
  title: string;
  type: CreateContentDtoType;
};
export type TimerLauncherOptions = { immediate?: boolean };
const TimerLauncherContext = createContext<
  | ((content?: TimerLauncherContent, options?: TimerLauncherOptions) => void)
  | null
>(null);

export function useTimerLauncher() {
  return useContext(TimerLauncherContext);
}

export function TimerFeature({
  children,
  ref,
  reduced,
  onReducedChange,
}: {
  children?: ReactNode;
  ref?: Ref<TimerFeatureHandle>;
  reduced: boolean;
  onReducedChange: (reduced: boolean) => void;
}) {
  const client = useQueryClient();
  const current = useTimerCurrent({ query: { retry: false } });
  const languages = useLanguageList({ query: { enabled: false } });
  const preferences = useUserPreferences({
    query: { enabled: false, retry: false, staleTime: 5 * 60 * 1000 },
  });
  const createContent = useContentCreate({
    mutation: { retry: false, throwOnError: isServerError },
  });
  const start = useTimerStart({
    mutation: {
      retry: false,
      throwOnError: isServerError,
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) return;
        if (!isServerError(error)) showMutationError(error);
      },
    },
  });
  const stop = useTimerStop({
    mutation: { retry: false, throwOnError: isServerError },
  });
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CreateContentDtoType>("book");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<ContentChoice | null>(null);
  const [presetContent, setPresetContent] = useState(false);
  const [languageId, setLanguageId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const languageLoad = useRef(0);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const active =
    !current.isError && current.data && typeof current.data === "object"
      ? current.data
      : null;
  const noTimer =
    current.error instanceof ApiError && current.error.status === 404;
  const currentError = current.isError && !noTimer;
  const language = languageId;
  const needsLanguage = !presetContent;
  const loadingLanguageSettings =
    needsLanguage &&
    (languages.isLoading ||
      languages.isFetching ||
      preferences.isLoading ||
      preferences.isFetching);
  const validLanguage =
    presetContent ||
    (languages.data?.some((item) => item.id === language) ?? false);

  useEffect(() => {
    if (current.data === null || noTimer) onReducedChange(false);
  }, [current.data, noTimer, onReducedChange]);

  async function showDialog(
    content?: TimerLauncherContent,
    options?: TimerLauncherOptions,
  ) {
    if (active) {
      toast.warning("Stop the existing timer first.");
      return;
    }
    const latest = await current.refetch();
    if (!latest.isError && latest.data && typeof latest.data === "object") {
      toast.warning("Stop the existing timer first.");
      return;
    }
    if (
      latest.error &&
      !(latest.error instanceof ApiError && latest.error.status === 404)
    )
      return;
    if (content) {
      setType(content.type);
      setTitle(content.title);
      setSelected({ id: content.id, title: content.title });
      setPresetContent(true);
      setError("");
    } else {
      clearContentPreset();
      setType("book");
      setLanguageId("");
    }
    if (options?.immediate && content) {
      await begin(content);
      return;
    }
    setOpen(true);
    if (!content) await loadLanguageSettings();
  }

  async function loadLanguageSettings() {
    const request = ++languageLoad.current;
    const [languageResult, preferenceResult] = await Promise.all([
      languages.refetch(),
      preferences.refetch(),
    ]);
    if (request !== languageLoad.current) return;
    const preferredLanguage = languageResult.data?.find(
      (item) => item.id === preferenceResult.data?.preferred_language,
    );
    setLanguageId(preferredLanguage?.id ?? "");
  }

  function clearContentPreset() {
    setPresetContent(false);
    setSelected(null);
    setTitle("");
  }

  function leaveContentPreset() {
    if (!presetContent) return;
    setPresetContent(false);
    setLanguageId("");
    void loadLanguageSettings();
  }
  useImperativeHandle(ref, () => ({
    start: () => {
      void showDialog();
    },
  }));

  async function begin(contentOverride?: TimerLauncherContent) {
    if (writing.current) return;
    if (!contentOverride && !validLanguage) {
      setError("Choose a language to start the timer.");
      return;
    }
    const selectedTitle = contentOverride?.title ?? title;
    const startingContent = contentOverride
      ? { id: contentOverride.id, title: contentOverride.title }
      : selected;
    const selectedType = contentOverride?.type ?? type;
    const parsed = titleSchema.safeParse(selectedTitle);
    if (
      !parsed.success ||
      !startingContent ||
      (!contentOverride && startingContent.title !== parsed.data)
    ) {
      setError("Select existing content or choose a new title.");
      return;
    }
    if (!startingContent.id && !validLanguage) {
      setError("Choose a language for new content.");
      return;
    }
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      let contentId = startingContent.id;
      if (!contentId) {
        contentId = (
          await createContent.mutateAsync({
            data: { title: parsed.data, type: selectedType, language },
          })
        )._id;
        setSelected({ id: contentId, title: parsed.data });
      }
      const result = await start.mutateAsync({ data: { content: contentId } });
      client.setQueryData<CurrentTimerResponseDto>(getTimerCurrentQueryKey(), {
        id: result._id,
        content_id: contentId,
        title: parsed.data,
        type: selectedType,
        started_at: result.started_at,
      });
      setOpen(false);
      clearContentPreset();
      onReducedChange(false);
      void client.invalidateQueries({ queryKey: getTimerCurrentQueryKey() });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const latest = await current.refetch();
        if (latest.data && typeof latest.data === "object" && !latest.isError) {
          setOpen(false);
          clearContentPreset();
          toast.warning("Stop the existing timer first.", {
            id: "timer-already-active",
          });
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
      void client.invalidateQueries({
        queryKey: getDashboardStatisticsQueryKey(),
      });
      void client.invalidateQueries({
        queryKey: getImmersionSessionHistoryQueryKey(),
      });
      toast.success("Session logged.");
    } catch {
      // Shared mutation defaults show recoverable errors; the error boundary handles 5xx.
    } finally {
      writing.current = false;
    }
  }

  const timer = (
    <>
      {current.isLoading && (
        <div
          role="status"
          aria-label="Checking active timer"
          className="sr-only"
        >
          Checking active timer
        </div>
      )}
      {currentError && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm">
          <QueryError
            title="Could not check your timer"
            error={current.error}
            onRetry={() => {
              void current.refetch();
            }}
          />
        </div>
      )}
      {active && (
        <ActiveTimer
          timer={active}
          onStop={() => {
            void finish();
          }}
          stopping={stop.isPending}
          reduced={reduced}
          onReducedChange={onReducedChange}
        />
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) {
            setOpen(next);
            if (!next) clearContentPreset();
          }
        }}
      >
        <DialogContent
          initialFocus={dialogTitleRef}
          className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-5 sm:w-[680px] sm:max-w-[calc(100vw-2rem)] sm:p-7"
          showCloseButton={!busy}
        >
          <DialogHeader className="gap-3 border-b border-border pb-5">
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f4ee] text-primary">
                <Timer aria-hidden="true" className="size-5" />
              </span>
              <DialogTitle
                ref={dialogTitleRef}
                tabIndex={-1}
                className="pr-6 text-[22px] font-semibold outline-none"
              >
                Start an immersion timer
              </DialogTitle>
            </div>
            <DialogDescription>
              Choose your content and settle into your next session.
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-1 min-h-0 space-y-6 overflow-y-auto px-1 py-6">
            <fieldset disabled={busy}>
              <legend className="mb-2 text-xs text-muted-foreground">
                Content type
              </legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {contentTypes.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    aria-pressed={type === item.type}
                    onClick={() => {
                      setType(item.type);
                      setTitle("");
                      setSelected(null);
                      leaveContentPreset();
                      setError("");
                    }}
                    className={`flex h-16 items-center justify-center gap-2 rounded-xl border text-xs font-semibold focus-visible:outline-2 focus-visible:outline-primary ${type === item.type ? "border-primary bg-[#e8f4ee] text-primary" : "border-border bg-[#f9fbfa]"}`}
                  >
                    <SessionTypeIcon
                      type={item.type}
                      aria-hidden="true"
                      className="size-4"
                    />
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {loadingLanguageSettings ? (
              <div role="status" aria-label="Loading language preferences">
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                {presetContent ? (
                  <p className="text-xs text-muted-foreground">
                    Using the selected content.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <label
                      htmlFor="timer-language"
                      className="block text-xs text-muted-foreground"
                    >
                      Language
                    </label>
                    <LanguageDropdown
                      id="timer-language"
                      className="lg:w-full"
                      languages={languages.data ?? []}
                      value={languages.data?.find(
                        (item) => item.id === language,
                      )}
                      onChange={(value) => {
                        setLanguageId(value);
                        setTitle("");
                        setSelected(null);
                        leaveContentPreset();
                        setError("");
                      }}
                      loading={loadingLanguageSettings}
                    />
                  </div>
                )}
                {(languages.error || preferences.error) && needsLanguage && (
                  <QueryError
                    title={
                      languages.error
                        ? "Could not load languages"
                        : "Could not load your preferred language"
                    }
                    error={languages.error ?? preferences.error}
                    onRetry={() => {
                      void loadLanguageSettings();
                    }}
                  />
                )}
                <ContentPicker
                  language={language}
                  type={type}
                  title={title}
                  selected={selected}
                  onTitleChange={(value) => {
                    setTitle(value);
                    setSelected(null);
                    leaveContentPreset();
                    setError("");
                  }}
                  onSelect={(choice) => {
                    setSelected(choice);
                    setTitle(choice.title);
                    leaveContentPreset();
                    setError("");
                  }}
                  disabled={busy || !validLanguage}
                  error={error}
                  newContentAction="start the timer"
                />
              </>
            )}
          </div>
          <DialogFooter className="-mx-5 -mb-5 mt-1 gap-3 border-t border-border bg-white px-5 py-5 sm:-mx-7 sm:-mb-7 sm:px-7">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="h-11 w-full sm:w-[108px]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void begin();
              }}
              disabled={
                busy ||
                loadingLanguageSettings ||
                !!languages.error ||
                !validLanguage
              }
              className="h-11 w-full gap-2 sm:w-[196px]"
            >
              <Play aria-hidden="true" className="size-4" />
              {busy ? "Starting…" : "Start timer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
  return (
    <TimerLauncherContext.Provider
      value={(content, options) => {
        void showDialog(content, options);
      }}
    >
      {children}
      {timer}
    </TimerLauncherContext.Provider>
  );
}
