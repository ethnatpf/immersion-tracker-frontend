"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { ContentPicker, type ContentChoice } from "@/components/content-picker";
import { ContentTypeSelector } from "@/components/content-type-selector";
import { SessionProgressUnitSelect } from "@/components/session-progress-unit-select";
import { DatePicker } from "@/components/shadcn/date-picker";
import { ApiErrorBoundary } from "@/components/error/api-error-boundary";
import { QueryError } from "@/components/error/query-error";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { LanguageDropdown } from "@/components/language-dropdown";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  getContentDetailsQueryKey,
  getContentSearchQueryKey,
  getDashboardStatisticsQueryKey,
  getImmersionSessionHistoryQueryKey,
  getUserPreferencesQueryKey,
  useContentCreate,
  useImmersionSessionCreate,
  useLanguageList,
  useUserPreferences,
} from "@/lib/api/generated/immersion";
import { formatDuration } from "@/lib/duration";
import { getLocalDateInputValue, getLocalTimeInputValue } from "@/lib/date";
import { useUserTimeZone } from "@/lib/use-user-time-zone";
import { DEFAULT_EPISODE_MINUTES } from "@/lib/constants";
import { isServerError } from "@/lib/query-options";
import {
  episodeRange,
  isReading,
  usesManualDuration,
  usesEpisodeProgress,
  sessionEntrySchema,
  sessionPayload,
  type SessionEntry,
} from "@/lib/session-entry";
import { cn } from "@/lib/utils";

function Section({
  number,
  title,
  children,
  className,
}: {
  number: number;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-2xl border border-border bg-white p-4 md:p-6",
        className,
      )}
    >
      <h2 className="mb-6 flex items-center gap-3 text-lg font-semibold">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-sm text-primary">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SessionEntryForm() {
  const timeZone = useUserTimeZone();

  return (
    timeZone ? (
      <SessionEntryFormContent />
    ) : (
      <div
        role="status"
        aria-label="Preparing session form"
        className="space-y-6"
      >
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  );
}

function SessionEntryFormContent() {
  // Keep the draft outside the mutation boundary so server-error recovery cannot repeat a write or lose a confirmed content ID.
  const [entry, setEntry] = useState<SessionEntry>(() => ({
    type: "anime",
    durationMode: "calculated",
    progressUnit: "page",
    language: "",
    title: "",
    url: "",
    date: getLocalDateInputValue(),
    time: getLocalTimeInputValue(),
    episodes: "",
    episodeMinutes: String(DEFAULT_EPISODE_MINUTES.anime),
    hours: "0",
    minutes: "0",
    pageStart: "",
    pageEnd: "",
  }));
  const [selected, setSelected] = useState<ContentChoice | null>(null);

  return (
    <ApiErrorBoundary>
      <SessionFormBody
        entry={entry}
        setEntry={setEntry}
        selected={selected}
        setSelected={setSelected}
      />
    </ApiErrorBoundary>
  );
}

function SessionFormBody({
  entry,
  setEntry,
  selected,
  setSelected,
}: {
  entry: SessionEntry;
  setEntry: (entry: SessionEntry) => void;
  selected: ContentChoice | null;
  setSelected: (choice: ContentChoice | null) => void;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const languages = useLanguageList();
  const preferences = useUserPreferences();
  const createContent = useContentCreate({
    mutation: { throwOnError: isServerError, retry: false },
  });
  const createSession = useImmersionSessionCreate({
    mutation: { throwOnError: isServerError, retry: false },
  });
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const preferred =
    languages.data?.find(
      (language) => language.id === preferences.data?.preferred_language,
    )?.id ?? "";
  const language = entry.language || preferred;
  const reading = isReading(entry.type);
  const manualDuration =
    usesManualDuration(entry.type) || entry.durationMode === "manual";
  const loading = languages.isLoading || preferences.isLoading;
  const settingsError = languages.error ?? preferences.error;
  const range = episodeRange(entry.episodes);
  const total = range
    ? (range.end - range.start + 1) * Number(entry.episodeMinutes) * 60
    : 0;
  const update = (field: keyof SessionEntry, value: string) => {
    setEntry({ ...entry, [field]: value });
    setErrors((previous) => ({ ...previous, [field]: "" }));
    createContent.reset();
    createSession.reset();
  };

  async function save() {
    if (submitting.current) return;
    const draft = { ...entry, language, url: selected?.id ? "" : entry.url };
    const validation = sessionEntrySchema.safeParse(draft);
    const nextErrors: Record<string, string> = {};
    if (!validation.success)
      for (const issue of validation.error.issues)
        nextErrors[String(issue.path[0])] ??= issue.message;
    if (!selected || selected.title !== entry.title.trim())
      nextErrors.title = "Select existing content or choose a new title.";
    setErrors(nextErrors);
    if (
      Object.keys(nextErrors).length ||
      !validation.success ||
      !selected ||
      loading ||
      settingsError ||
      !languages.data?.some((item) => item.id === language)
    )
      return;
    submitting.current = true;
    setBusy(true);
    createContent.reset();
    createSession.reset();
    let confirmed = false;
    try {
      let id = selected.id;
      if (!id) {
        const content = await createContent.mutateAsync({
          data: {
            title: validation.data.title,
            type: entry.type,
            language,
            ...(validation.data.url ? { url: validation.data.url } : {}),
          },
        });
        id = content._id;
        setSelected({ id, title: validation.data.title });
        setEntry({ ...entry, language });
        void client.invalidateQueries({ queryKey: getContentSearchQueryKey() });
      }
      await createSession.mutateAsync({ data: sessionPayload(draft, id) });
      confirmed = true;
      await Promise.all([
        client.invalidateQueries({
          queryKey: getImmersionSessionHistoryQueryKey(),
        }),
        client.invalidateQueries({
          queryKey: getDashboardStatisticsQueryKey(),
        }),
        client.invalidateQueries({ queryKey: getUserPreferencesQueryKey() }),
        client.invalidateQueries({ queryKey: getContentSearchQueryKey() }),
        client.invalidateQueries({ queryKey: getContentDetailsQueryKey(id) }),
      ]);
      toast.success("Session saved");
      router.push("/");
    } catch {
      // Generated mutation state retains ApiError, including its status and request ID.
    } finally {
      if (!confirmed) {
        submitting.current = false;
        setBusy(false);
      }
    }
  }

  const field = (
    name: Exclude<keyof SessionEntry, "date">,
    label: string,
    options: {
      type?: "number" | "text" | "url";
      min?: number;
      max?: number;
      step?: string;
      placeholder?: string;
      prominent?: boolean;
    } = {},
  ) => (
    <div
      className={cn(
        "min-w-0 space-y-2",
        options.prominent && "flex flex-col text-center",
      )}
    >
      <label
        htmlFor={name}
        className={cn(
          "block text-xs text-muted-foreground",
          options.prominent && "order-2 mt-2",
        )}
      >
        {label}
      </label>
      <Input
        id={name}
        value={entry[name]}
        onChange={(event) => update(name, event.target.value)}
        type={options.type ?? "number"}
        min={options.min}
        max={options.max}
        step={options.step}
        placeholder={options.placeholder}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        className={cn(
          "h-12 rounded-[10px] bg-[#f9fbfa] text-sm",
          options.prominent &&
            "h-20 text-center text-[28px] font-semibold tabular-nums md:text-[28px]",
        )}
      />
      {errors[name] && (
        <p
          id={`${name}-error`}
          role="alert"
          className="text-xs text-destructive"
        >
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="pb-1">
      <header className="mb-6 md:mb-9 md:pr-16">
        <p className="mb-3 text-[10px] font-semibold tracking-[0.12em] text-primary">
          BUILD YOUR HABIT
        </p>
        <h1 className="text-[27px] font-semibold leading-tight tracking-tight md:text-[32px]">
          <span className="md:hidden">Log a session</span>
          <span className="hidden md:inline">Log an immersion session</span>
        </h1>
        <p className="mt-3 text-sm leading-[22px] text-muted-foreground">
          A good session deserves a little credit. Record what you immersed in.
        </p>
      </header>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset
          disabled={busy}
          className="min-w-0 space-y-5 md:space-y-6"
          aria-busy={busy}
        >
          <legend className="sr-only">Immersion session</legend>
          <Section number={1} title="Content type">
            <ContentTypeSelector
              type={entry.type}
              onTypeChange={(value) => {
                setSelected(null);
                setEntry({
                  ...entry,
                  type: value,
                  durationMode: usesManualDuration(value) ? "manual" : "calculated",
                  progressUnit: value === "audiobook" ? "chapter" : "page",
                  title: "",
                  url: "",
                  episodeMinutes:
                    value === "anime"
                      ? String(DEFAULT_EPISODE_MINUTES.anime)
                      : value === "drama"
                        ? String(DEFAULT_EPISODE_MINUTES.drama)
                        : "",
                  episodes: "",
                  pageStart: "",
                  pageEnd: "",
                });
                setErrors({});
                createContent.reset();
                createSession.reset();
              }}
            />
          </Section>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:gap-6">
            <Section number={2} title="Session details" className="space-y-5">
              {settingsError ? (
                <QueryError
                  title="Could not load session settings"
                  error={settingsError}
                  onRetry={() => {
                    if (languages.error) void languages.refetch();
                    if (preferences.error) void preferences.refetch();
                  }}
                />
              ) : (
                <div className="space-y-2">
                  <label
                    htmlFor="session-language"
                    className="block text-xs text-muted-foreground"
                  >
                    Language
                  </label>
                  {loading ? (
                    <div role="status" aria-label="Loading session settings">
                      <Skeleton className="h-11 w-full xl:h-10" />
                    </div>
                  ) : (
                    <LanguageDropdown
                      id="session-language"
                      className="lg:w-full"
                      languages={languages.data ?? []}
                      value={languages.data?.find(
                        (item) => item.id === language,
                      )}
                      loading={loading}
                      onChange={(value) => {
                        if (value) {
                          setSelected(null);
                          setEntry({
                            ...entry,
                            language: value,
                            title: "",
                            url: "",
                          });
                          setErrors({});
                        }
                      }}
                      disabled={busy}
                    />
                  )}
                  {!loading &&
                    languages.isSuccess &&
                    !languages.data.length && (
                      <p className="text-sm text-muted-foreground">
                        No languages available. A language is needed to log a
                        session.
                      </p>
                    )}
                  {errors.language && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors.language}
                    </p>
                  )}
                </div>
              )}
              <ContentPicker
                key={`${language}:${entry.type}`}
                language={language}
                type={entry.type}
                title={entry.title}
                selected={selected}
                disabled={busy || loading || !!settingsError}
                onTitleChange={(title) => {
                  setSelected(null);
                  update("title", title);
                }}
                onSelect={(choice) => {
                  setSelected(choice);
                  update("title", choice.title);
                }}
                error={errors.title}
              />
              {(reading || entry.type === "audiobook") && (
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {entry.progressUnit === "page"
                        ? "Page range (optional)"
                        : "Chapter range (optional)"}
                    </span>
                    {entry.pageStart &&
                      entry.pageEnd &&
                      Number(entry.pageEnd) >= Number(entry.pageStart) && (
                        <span className="text-primary">
                          {Number(entry.pageEnd) -
                            Number(entry.pageStart) +
                            1}{" "}
                          {entry.progressUnit === "page" ? "pages" : "chapters"} logged
                        </span>
                      )}
                  </div>
                  <div
                    className={cn(
                      "grid gap-3",
                      isReading(entry.type) || entry.type === "audiobook"
                        ? "grid-cols-3"
                        : "grid-cols-2",
                    )}
                  >
                    {field(
                      "pageStart",
                      "From",
                      { min: 1 },
                    )}
                    {field(
                      "pageEnd",
                      "To",
                      { min: 1 },
                    )}
                    {(isReading(entry.type) || entry.type === "audiobook") && (
                      <div className="min-w-0 space-y-2">
                        <label className="block text-xs text-muted-foreground">
                          Unit
                        </label>
                        <SessionProgressUnitSelect
                          value={entry.progressUnit}
                          allowPages={isReading(entry.type)}
                          disabled={!isReading(entry.type)}
                          onValueChange={(value) =>
                            update("progressUnit", value)
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div
                className={cn("grid gap-5", !selected?.id && "md:grid-cols-2")}
              >
                {!selected?.id &&
                  field("url", "Reference link (optional)", {
                    type: "url",
                    placeholder: "https://",
                  })}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="date"
                      className="mb-2 block text-xs text-muted-foreground"
                    >
                      Log date
                    </label>
                    <DatePicker
                      id="date"
                      ariaLabel="Log date"
                      value={entry.date}
                      onChange={(date) => update("date", date)}
                      max={getLocalDateInputValue()}
                      disabled={busy}
                      invalid={!!errors.date}
                      describedBy={errors.date ? "date-error" : undefined}
                    />
                    {errors.date && (
                      <p
                        id="date-error"
                        role="alert"
                        className="mt-2 text-xs text-destructive"
                      >
                        {errors.date}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Calendar date in your timezone.
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="time"
                      className="mb-2 block text-xs text-muted-foreground"
                    >
                      Log time
                    </label>
                    <Input
                      id="time"
                      type="time"
                      step="1"
                      className="h-12 bg-[#f9fbfa]"
                      value={entry.time}
                      onChange={(event) => update("time", event.target.value)}
                      disabled={busy}
                      aria-invalid={!!errors.time}
                      aria-describedby={errors.time ? "time-error" : undefined}
                    />
                    {errors.time && (
                      <p
                        id="time-error"
                        role="alert"
                        className="mt-2 text-xs text-destructive"
                      >
                        {errors.time}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Time in your timezone.
                    </p>
                  </div>
                </div>
              </div>
            </Section>
            <Section
              number={3}
              title={manualDuration ? "Session time" : "Time & progress"}
            >
              <span
                className={cn(
                  "mb-5 inline-block rounded-md px-5 py-1 text-[11px]",
                  manualDuration
                    ? "bg-[#edf2fa] text-[#547bad]"
                    : "bg-accent text-primary",
                )}
              >
                {manualDuration
                  ? "Manual"
                  : entry.type === "podcast" || entry.type === "audiobook"
                    ? "Audio"
                    : "Audiovisual"}
              </span>
              {usesEpisodeProgress(entry.type) && (
                <div className="space-y-5">
                  <div>
                    {field(
                      "episodes",
                      entry.type === "podcast"
                        ? "Episodes listened"
                        : "Episodes watched",
                      { type: "text", placeholder: "e.g. 4 or 61–64" },
                    )}
                    <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                      Enter an episode number (e.g. 4) or a range (e.g. 61–64).
                    </p>
                  </div>
                  {!manualDuration && (
                    <div>
                      {field(
                        "episodeMinutes",
                        "Episode duration (minutes)",
                        { min: 0, step: "any" },
                      )}
                      {entry.type === "podcast" && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Enter the actual length of each episode.
                        </p>
                      )}
                      {entry.type === "anime" && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Standard TV anime length: {DEFAULT_EPISODE_MINUTES.anime} min.
                        </p>
                      )}
                    </div>
                  )}
                  {!manualDuration && (
                    <div
                      aria-live="polite"
                      className="rounded-xl bg-accent p-4 text-center text-primary"
                    >
                      <p className="text-[11px]">Total calculated</p>
                      <p className="mt-2 text-[28px] font-semibold tabular-nums">
                        {formatDuration(
                          Number.isSafeInteger(total) && total > 0 ? total : 0,
                        )}
                      </p>
                      <p className="text-[11px]">
                        {Number.isSafeInteger(total) && total > 0
                          ? total / 60
                          : 0} min
                      </p>
                    </div>
                  )}
                </div>
              )}
              {usesEpisodeProgress(entry.type) && (
                <button
                  type="button"
                  className="mt-4 text-xs font-medium text-[#4f6f68] underline-offset-4 hover:text-primary hover:underline"
                  onClick={() =>
                    update(
                      "durationMode",
                      manualDuration ? "calculated" : "manual",
                    )
                  }
                >
                  {manualDuration
                    ? "Use calculated time"
                    : "Enter time manually"}
                </button>
              )}
              {manualDuration && (
                <div className="mt-5">
                  <p className="mb-5 text-sm text-muted-foreground">
                    {isReading(entry.type) || entry.type === "audiobook"
                      ? "Enter your reading time."
                      : entry.type === "podcast"
                        ? "Enter your listening time."
                        : "Enter your viewing time."}
                  </p>
                  <div className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] gap-4">
                    {field("hours", "Hours", { min: 0, prominent: true })}
                    <span
                      aria-hidden="true"
                      className="pt-5 text-center text-[28px] text-muted-foreground"
                    >
                      :
                    </span>
                    {field("minutes", "Minutes", {
                      min: 0,
                      max: 59,
                      prominent: true,
                    })}
                  </div>
                </div>
              )}
            </Section>
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-5 md:flex-row-reverse md:justify-between">
            <Button
              type="submit"
              disabled={
                busy || loading || !!settingsError || !languages.data?.length
              }
              className="h-12 gap-3 font-semibold md:h-11 md:w-[200px]"
            >
              <Save
                aria-hidden="true"
                className="hidden size-[18px] md:block"
              />
              {busy ? "Saving session…" : "Save session"}
            </Button>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 bg-white md:h-11 md:border-transparent md:bg-transparent md:text-muted-foreground",
              )}
            >
              Cancel entry
            </Link>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
