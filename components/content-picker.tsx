"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useContentSearch } from "@/lib/api/generated/immersion";
import type { CreateContentDtoType } from "@/lib/api/generated/models";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/shadcn/combobox";
import { InputGroupAddon } from "@/components/shadcn/input-group";
import { Button } from "@/components/shadcn/button";
import { Skeleton } from "@/components/shadcn/skeleton";
import { QueryError } from "@/components/error/query-error";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";

export type ContentChoice = { id?: string; title: string };

export function ContentPicker({
  language,
  type,
  title,
  selected,
  onTitleChange,
  onSelect,
  disabled,
  error,
  newContentAction = "save the session",
}: {
  language: string;
  type: CreateContentDtoType;
  title: string;
  selected: ContentChoice | null;
  onTitleChange: (title: string) => void;
  onSelect: (choice: ContentChoice) => void;
  disabled?: boolean;
  error?: string;
  newContentAction?: string;
}) {
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useComboboxAnchor();
  const needsLanguage = !language && !disabled;
  const tooltipId = useId();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(title.trim()), 300);
    return () => clearTimeout(timeout);
  }, [title]);
  const ready =
    !!language &&
    !!debounced &&
    debounced === title.trim() &&
    title.trim().length <= 350;
  const search = useContentSearch(
    { language, type, q: debounced, page, limit: 20 },
    { query: { enabled: ready && !disabled } },
  );
  const current = ready && search.isSuccess && !search.isFetching;
  const matches: ContentChoice[] = current ? search.data.items : [];
  const exact = matches.some(
    (item) =>
      item.title.toLocaleLowerCase() === title.trim().toLocaleLowerCase(),
  );
  const options: ContentChoice[] =
    current && !exact ? [...matches, { title: title.trim() }] : matches;
  const items =
    selected &&
    !options.some(
      (item) => item.id === selected.id && item.title === selected.title,
    )
      ? [...options, selected]
      : options;

  return (
    <div className="space-y-2">
      <label htmlFor="content-title" className="text-xs text-muted-foreground">
        Title / search
      </label>
      <Combobox
        items={items}
        filteredItems={options}
        filter={null}
        value={selected}
        inputValue={title}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled || !language}
        itemToStringLabel={(item: ContentChoice) => item.title}
        isItemEqualToValue={(a: ContentChoice, b: ContentChoice) =>
          a.id === b.id && a.title === b.title
        }
        onInputValueChange={(value, details) => {
          if (details.reason === "input-change") {
            setPage(1);
            onTitleChange(value);
          } else details.cancel();
        }}
        onValueChange={(choice) => {
          if (choice) {
            setPage(1);
            onSelect(choice);
          }
        }}
      >
        <Tooltip disabled={!needsLanguage} onOpenChange={setTooltipOpen}>
          <TooltipTrigger
            aria-describedby={
              needsLanguage && tooltipOpen ? tooltipId : undefined
            }
            render={
              <div
                ref={anchorRef}
                role={needsLanguage ? "group" : undefined}
                aria-label={
                  needsLanguage ? "Title search unavailable" : undefined
                }
                tabIndex={needsLanguage ? 0 : undefined}
                className={`rounded-[10px] outline-none focus-visible:ring-3 focus-visible:ring-primary/25 ${needsLanguage ? "cursor-not-allowed [&_[data-slot=input-group]]:pointer-events-none" : ""}`}
              />
            }
          >
            <ComboboxInput
              ref={inputRef}
              id="content-title"
              maxLength={350}
              disabled={disabled || !language}
              aria-label="Title / search"
              aria-invalid={!!error}
              aria-describedby={error ? "content-error" : "content-help"}
              showTrigger={false}
              className="h-12 w-full rounded-[10px] bg-[#f9fbfa]"
            >
              <InputGroupAddon align="inline-start">
                <Search aria-hidden="true" className="size-[18px]" />
              </InputGroupAddon>
            </ComboboxInput>
          </TooltipTrigger>
          <TooltipContent id={tooltipId} role="tooltip">
            Select a language first.
          </TooltipContent>
        </Tooltip>
        <ComboboxContent
          anchor={anchorRef}
          align="start"
          sideOffset={8}
          className="min-w-(--anchor-width) p-2"
        >
          {(!ready || search.isLoading || search.isFetching) && title.trim() ? (
            <div role="status" aria-label="Searching content" className="p-3">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : null}
          {!title.trim() && (
            <p className="p-3 text-sm text-muted-foreground">
              Type a title to search your content.
            </p>
          )}
          {current && (
            <p className="px-3 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground">
              {matches.length ? "EXISTING CONTENT" : "NO MATCHING CONTENT"}
            </p>
          )}
          <ComboboxList>
            {(item: ContentChoice) => (
              <ComboboxItem
                key={item.id ?? "new"}
                value={item}
                className="min-h-16 gap-3"
                aria-label={
                  item.id ? item.title : `Create new content: ${item.title}`
                }
              >
                {!item.id && (
                  <Plus aria-hidden="true" className="size-6 text-primary" />
                )}
                <span className="min-w-0">
                  <span className="block break-words font-medium">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.id
                      ? "Already in your content"
                      : `New content · Created when you ${newContentAction}`}
                  </span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
          {current && search.data.total > 20 && (
            <div className="flex items-center justify-between gap-2 border-t border-border p-2">
              <Button
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous results
              </Button>
              <span className="text-xs">Page {page}</span>
              <Button
                variant="ghost"
                disabled={page * 20 >= search.data.total}
                onClick={() => setPage(page + 1)}
              >
                Next results
              </Button>
            </div>
          )}
        </ComboboxContent>
      </Combobox>
      <p id="content-help" className="text-xs text-muted-foreground">
        {selected
          ? selected.id
            ? "Existing content selected."
            : `Your new content will be created when you ${newContentAction}.`
          : "Search for an existing title, or choose a new one to create content."}
      </p>
      {error && (
        <p id="content-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {ready && search.isError && (
        <QueryError
          title="Could not search content"
          error={search.error}
          onRetry={() => {
            void search.refetch().then(() => {
              inputRef.current?.focus();
              setOpen(true);
            });
          }}
        />
      )}
    </div>
  );
}
