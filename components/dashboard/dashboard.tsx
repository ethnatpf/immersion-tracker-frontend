"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Flame,
  Plus,
  SquarePlay,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDashboardStatistics,
  useLanguageList,
  useUserPreferences,
} from "@/lib/api/generated/immersion";
import type {
  DashboardStatisticsRange,
  DashboardStatisticsResponseDto,
} from "@/lib/api/generated/models";
import { formatDuration, formatHours } from "@/lib/duration";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Skeleton } from "@/components/shadcn/skeleton";
import { MediaBreakdown } from "./media-breakdown";
import { QueryError } from "@/components/error/query-error";
import { RecentSessions } from "./recent-sessions";
import { LanguageDropdown } from "@/components/language-dropdown";

const periods = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
  { value: "total", label: "Total" },
] as const;

function Metric({
  label,
  value,
  icon: Icon,
  tone = "green",
  note,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "green" | "blue" | "orange";
  note?: string;
}) {
  return (
    <Card
      role="region"
      aria-label={label}
      className="relative min-h-[120px] gap-0 rounded-[14px] border border-border p-3.5 text-foreground ring-0 xl:min-h-[124px] xl:p-5"
    >
      <p className="pr-0 text-xs text-muted-foreground xl:pr-9 xl:text-[13px]">
        {label}
      </p>
      <p className="mt-4 text-[clamp(1rem,5vw,1.4375rem)] font-semibold leading-8 tracking-tight tabular-nums xl:mt-6 xl:text-[32px]">
        {value}
        {note && (
          <span className="mt-1 block text-xs font-normal tracking-normal text-muted-foreground xl:ml-5 xl:inline">
            {note}
          </span>
        )}
      </p>
      <span
        className={cn(
          "absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-[10px] xl:bottom-auto xl:right-5 xl:top-4",
          tone === "green" && "bg-[#e8f4ee] text-primary",
          tone === "blue" && "bg-[#edf2fa] text-[#5e7fa9]",
          tone === "orange" && "bg-[#fcf1e7] text-[#b96c30]",
        )}
      >
        <Icon aria-hidden="true" className="size-[18px]" />
      </span>
    </Card>
  );
}

function Statistics({
  stats,
  language,
  range,
}: {
  stats: DashboardStatisticsResponseDto;
  language: string;
  range: DashboardStatisticsRange;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">
        <Metric
          label="Total immersion"
          value={formatDuration(stats.total_immersion_time)}
          icon={Clock}
        />
        <Metric
          label="Current streak"
          value={String(stats.current_streak)}
          note={stats.current_streak === 1 ? "day" : "days"}
          icon={Flame}
          tone="orange"
        />
        <Metric
          label="Reading time"
          value={formatHours(stats.reading_time)}
          icon={BookOpen}
          tone="blue"
        />
        <Metric
          label="Audiovisual time"
          value={formatHours(stats.audiovisual_time)}
          icon={SquarePlay}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
        <MediaBreakdown
          stats={stats}
          language={language}
          range={range}
          media="audiovisual_time"
        />
        <MediaBreakdown
          stats={stats}
          language={language}
          range={range}
          media="reading_time"
        />
      </div>
    </>
  );
}

function StatisticsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard statistics"
      className="space-y-6"
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[124px] rounded-[14px]" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2 xl:gap-5">
        <Skeleton className="h-[350px] rounded-2xl" />
        <Skeleton className="h-[350px] rounded-2xl" />
      </div>
    </div>
  );
}

export function Dashboard() {
  const [range, setRange] = useState<DashboardStatisticsRange>("week");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const languages = useLanguageList({
    query: { retry: false, staleTime: 5 * 60 * 1000 },
  });
  const preferences = useUserPreferences({
    query: { retry: false, staleTime: 5 * 60 * 1000 },
  });
  const languageList = languages.data ?? [];
  const languageId =
    selectedLanguage ??
    (preferences.isSuccess
      ? (
          languageList.find(
            (language) => language.id === preferences.data.preferred_language,
          ) ?? languageList[0]
        )?.id
      : undefined);
  const activeLanguage = languageList.find(
    (language) => language.id === languageId,
  );
  const ready = languages.isSuccess && preferences.isSuccess;
  const statistics = useDashboardStatistics(
    { language: languageId ?? "", range },
    { query: { enabled: ready && !!languageId, retry: false } },
  );
  const configError = languages.error ?? preferences.error;
  const unavailable = () =>
    toast("Not implemented yet", { id: "not-implemented" });

  return (
    <div className="space-y-6 text-foreground">
      <div className="md:pr-16">
        <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-primary xl:mb-3 xl:text-[11px]">
          YOUR PROGRESS
        </p>
        <h1 className="text-[27px] font-semibold leading-tight tracking-tight xl:text-[32px]">
          Immersion dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground xl:mt-3">
          Track your time. See your progress.
          <span className="hidden md:inline"> Keep moving forward.</span>
        </p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4">
        <Tabs
          value={range}
          onValueChange={(value) => setRange(value as DashboardStatisticsRange)}
          className="w-full lg:w-[332px]"
        >
          <TabsList
            aria-label="Statistics period"
            className="w-full bg-[#eaefec] p-1 group-data-horizontal/tabs:h-11 xl:group-data-horizontal/tabs:h-10"
          >
            {periods.map((period) => (
              <TabsTrigger
                key={period.value}
                value={period.value}
                className="text-xs data-active:bg-white data-active:text-primary data-active:shadow-none"
              >
                {period.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <LanguageDropdown
          ariaLabel="Dashboard language"
          languages={languageList}
          value={activeLanguage}
          onChange={setSelectedLanguage}
          loading={!ready}
        />
        <div className="mt-1 grid grid-cols-2 gap-3 md:mt-0 md:block lg:ml-auto">
          <Button
            onClick={unavailable}
            className="h-12 gap-2 px-2 text-[13px] font-semibold sm:text-sm md:hidden"
          >
            <Timer aria-hidden="true" className="size-[18px]" />
            Start timer
          </Button>
          <Link
            href="/log-session"
            className={cn(
              buttonVariants(),
              "h-12 gap-2 border-border bg-white px-2 text-[13px] font-semibold text-foreground hover:bg-accent sm:px-4 sm:text-sm md:h-10 md:w-[164px] md:border-primary md:bg-primary md:text-white md:hover:bg-primary/90",
            )}
          >
            <Plus
              aria-hidden="true"
              className="size-[18px] text-primary md:text-white"
            />
            Log new session
          </Link>
        </div>
      </div>
      {configError ? (
        <QueryError
          title="Could not load dashboard settings"
          error={configError}
          onRetry={() => {
            void languages.refetch();
            void preferences.refetch();
          }}
        />
      ) : !ready ? (
        <StatisticsLoading />
      ) : !activeLanguage ? (
        <Card className="border border-border p-8 text-center text-sm text-muted-foreground ring-0">
          No languages are available yet.
        </Card>
      ) : statistics.isError ? (
        <QueryError
          title="Could not load dashboard statistics"
          error={statistics.error}
          onRetry={() => void statistics.refetch()}
        />
      ) : statistics.isPending ? (
        <StatisticsLoading />
      ) : (
        <Statistics
          stats={statistics.data}
          language={activeLanguage.name}
          range={range}
        />
      )}
      <RecentSessions />
    </div>
  );
}
