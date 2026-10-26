"use client";

import { useEffect, useState } from "react";
import { Clock3, Search } from "lucide-react";
import { useImmersionSessionHistory } from "@/lib/api/generated/immersion";
import type {
  ImmersionSessionHistoryTypeItem,
  SessionHistoryItemResponseDto,
} from "@/lib/api/generated/models";
import { formatUtcDate } from "@/lib/date";
import { formatDuration } from "@/lib/duration";
import { sessionMediaStyles } from "@/components/session-media";
import { SessionActions } from "@/components/session-actions";
import { Pagination } from "@/components/pagination";
import { QueryError } from "@/components/error/query-error";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { DateRangePicker } from "@/components/shadcn/date-range-picker";
import { Input } from "@/components/shadcn/input";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";

const PAGE_SIZE = 4;
type Category = "all" | "reading" | "watching";
const categoryTypes: Record<
  Category,
  ImmersionSessionHistoryTypeItem[] | undefined
> = {
  all: undefined,
  reading: ["book", "manga"],
  watching: ["anime", "drama", "video"],
};
const categoryTabClassName =
  "text-xs text-muted-foreground hover:text-muted-foreground data-active:bg-white data-active:text-primary data-active:hover:text-primary data-active:shadow-none";

type Session = SessionHistoryItemResponseDto;

function SessionBadge({ session }: { session: Session }) {
  const {
    icon: Icon,
    label,
    color,
    background,
  } = sessionMediaStyles[session.type];
  return (
    <span
      className="inline-flex min-w-24 self-start items-center gap-2 rounded-md px-2.5 py-1.5 text-xs"
      style={{ color, backgroundColor: background }}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </span>
  );
}

function SessionDate({ date }: { date: string }) {
  return <time dateTime={date}>{formatUtcDate(date)}</time>;
}

function DesktopRows({
  items,
  onDeleted,
}: {
  items: Session[];
  onDeleted: () => void;
}) {
  return (
    <Table aria-label="Immersion history" className="table-fixed text-left">
      <TableHeader className="text-xs text-muted-foreground">
        <TableRow className="border-0 hover:bg-transparent">
          <TableHead className="w-[47%] px-6 py-5 font-normal">
            Content title
          </TableHead>
          <TableHead className="w-[15%] px-3 py-5 font-normal">Type</TableHead>
          <TableHead className="w-[17%] px-3 py-5 font-normal">Date</TableHead>
          <TableHead className="w-[12%] px-3 py-5 text-right font-normal">
            Duration
          </TableHead>
          <TableHead className="px-6 py-5 text-right font-normal">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((session) => (
          <TableRow key={session.id} className="h-[100px] border-border">
            <TableCell className="px-6 text-sm font-medium">
              <span className="block truncate">{session.title}</span>
            </TableCell>
            <TableCell className="px-3">
              <SessionBadge session={session} />
            </TableCell>
            <TableCell className="px-3 text-xs text-muted-foreground">
              <SessionDate date={session.created_at} />
            </TableCell>
            <TableCell className="px-3 text-right text-sm tabular-nums">
              {formatDuration(session.duration)}
            </TableCell>
            <TableCell className="px-6">
              <div className="flex justify-end">
                <SessionActions
                  session={session}
                  inline
                  onDeleted={onDeleted}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MobileRows({
  items,
  onDeleted,
}: {
  items: Session[];
  onDeleted: () => void;
}) {
  return (
    <ul aria-label="Immersion history" className="space-y-4">
      {items.map((session) => (
        <li key={session.id}>
          <Card className="gap-0 rounded-2xl border border-border bg-white p-4 ring-0">
            <SessionBadge session={session} />
            <h2 className="mt-4 min-h-10 text-sm font-semibold">
              {session.title}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              <SessionDate date={session.created_at} />
            </p>
            <div className="mt-4 flex items-end justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
                <Clock3
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                {formatDuration(session.duration)}
              </span>
              <SessionActions session={session} inline onDeleted={onDeleted} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function History() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<Category>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const nextQuery = search.trim();
    if (nextQuery === query) return;
    const timeout = window.setTimeout(() => {
      setPage(1);
      setQuery(nextQuery);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, query]);

  const history = useImmersionSessionHistory(
    {
      page,
      limit: PAGE_SIZE,
      ...(categoryTypes[category] ? { type: categoryTypes[category] } : {}),
      ...(query ? { q: query } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    },
    { query: { retry: false } },
  );
  const data = history.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const lastItemOnPage = page > 1 && data?.items.length === 1;
  const onDeleted = () => {
    if (lastItemOnPage) setPage(page - 1);
  };

  return (
    <Tabs
      value={category}
      onValueChange={(value) => {
        if (value !== "all" && value !== "reading" && value !== "watching")
          return;
        setCategory(value);
        setPage(1);
      }}
      className="gap-0 pb-6"
    >
      <header className="mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Your activity
        </p>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight md:text-[32px]">
          Immersion history
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every session, in one place. Find your reading and watching history.
        </p>
      </header>

      <Card className="mb-6 gap-4 rounded-2xl border border-border bg-white p-4 ring-0 md:p-6 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block lg:min-w-0 lg:w-[38%]">
          <span className="sr-only">Search titles</span>
          <Search
            aria-hidden="true"
            className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={350}
            placeholder="Search titles..."
            className="h-12 rounded-xl bg-[#f7f9f8] pl-11"
          />
        </label>
        <div className="lg:min-w-0 lg:w-[31%]">
          <TabsList
            aria-label="Media category"
            activateOnFocus
            className="w-full bg-[#eff3f0] p-1 group-data-horizontal/tabs:h-12"
          >
            <TabsTrigger value="all" className={categoryTabClassName}>
              All
            </TabsTrigger>
            <TabsTrigger value="reading" className={categoryTabClassName}>
              Reading
            </TabsTrigger>
            <TabsTrigger value="watching" className={categoryTabClassName}>
              Watching
            </TabsTrigger>
          </TabsList>
        </div>
        <DateRangePicker
          className="lg:w-[250px]"
          value={{ from: startDate, to: endDate }}
          onChange={({ from, to }) => {
            setStartDate(from ?? "");
            setEndDate(to ?? "");
            setPage(1);
          }}
        />
      </Card>

      {(["all", "reading", "watching"] as const).map((value) => (
        <TabsContent key={value} value={value} className="outline-none">
          {category === value &&
            (history.isError ? (
              <QueryError
                title="Could not load history"
                error={history.error}
                onRetry={() => void history.refetch()}
              />
            ) : history.isPending ? (
              <div
                role="status"
                aria-label="Loading immersion history"
                className="space-y-4"
              >
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
            ) : (
              data && (
                <div aria-busy={history.isFetching}>
                  {data.items.length ? (
                    <>
                      <Card className="hidden gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 ring-0 md:block">
                        <DesktopRows items={data.items} onDeleted={onDeleted} />
                        <Pagination
                          page={page}
                          pageSize={PAGE_SIZE}
                          total={data.total}
                          busy={history.isFetching}
                          onPageChange={setPage}
                        />
                      </Card>
                      <div className="md:hidden">
                        <MobileRows items={data.items} onDeleted={onDeleted} />
                        <Pagination
                          page={page}
                          pageSize={PAGE_SIZE}
                          total={data.total}
                          busy={history.isFetching}
                          onPageChange={setPage}
                        />
                      </div>
                    </>
                  ) : data.total > 0 && page > totalPages ? (
                    <Card className="items-center rounded-2xl border border-border bg-white px-6 py-12 text-center ring-0">
                      <p className="text-sm text-muted-foreground">
                        This page is no longer available.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setPage(totalPages)}
                      >
                        Go to last page
                      </Button>
                    </Card>
                  ) : (
                    <Card className="rounded-2xl border border-border bg-white px-6 py-12 text-center text-sm text-muted-foreground ring-0">
                      {query || startDate || endDate || category !== "all"
                        ? "No immersion sessions match your filters."
                        : "No immersion sessions yet. Your sessions will appear here."}
                    </Card>
                  )}
                </div>
              )
            ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
