"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { LanguageResponseDto } from "@/lib/api/generated/models";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";

export function LanguageDropdown({ languages, value, onChange, loading }: {
  languages: LanguageResponseDto[];
  value?: LanguageResponseDto;
  onChange: (id: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const query = search.trim().toLocaleLowerCase();
  const matches = languages.filter((language) =>
    language.name.toLocaleLowerCase().includes(query)
      || language.nativeName.toLocaleLowerCase().includes(query)
      || language.code.toLocaleLowerCase().includes(query),
  );
  const resultsLabel = !query ? "LANGUAGES" : matches.length === 0 ? "SEARCH RESULTS"
    : `${matches.length} ${matches.length === 1 ? "RESULT" : "RESULTS"}`;

  return (
    <Combobox
      items={languages}
      filteredItems={matches}
      filter={null}
      value={value ?? null}
      onValueChange={(language) => { if (language) onChange(language.id); }}
      inputValue={search}
      onInputValueChange={setSearch}
      onOpenChange={(open) => { if (open) setSearch(""); }}
      itemToStringLabel={(language) => language.name}
      itemToStringValue={(language) => language.id}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      disabled={loading || languages.length === 0}
    >
      <ComboboxTrigger
        role="combobox"
        aria-label="Dashboard language"
        render={<Button variant="outline" className="h-11 w-full justify-between bg-white px-4 font-normal lg:w-[208px] xl:h-10" />}
      >
        <span className="truncate">{value ? `${value.name}${value.nativeName !== value.name ? ` (${value.nativeName})` : ""}` : (loading ? "Loading languages…" : "No languages available")}</span>
      </ComboboxTrigger>
      <ComboboxContent
        sideOffset={8}
        className="flex min-w-(--anchor-width) flex-col rounded-xl shadow-[0_8px_24px_#182d2a1f] lg:w-[320px] lg:min-w-[320px] *:data-[slot=input-group]:m-3 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-11 *:data-[slot=input-group]:shrink-0 *:data-[slot=input-group]:bg-white"
      >
        <ComboboxInput
          ref={inputRef}
          aria-label="Search languages"
          placeholder="Search languages…"
          showTrigger={false}
          className="rounded-lg in-data-[slot=combobox-content]:focus-within:border-primary in-data-[slot=combobox-content]:focus-within:ring-0 in-data-[slot=combobox-content]:focus-within:shadow-[inset_0_0_0_0.5px_#167d68] [&_input]:text-sm [&_input]:placeholder:text-[#647b76]"
        >
          <InputGroupAddon align="inline-start" className="pl-3 text-[#647b76]">
            <Search aria-hidden="true" className="size-[18px]" />
          </InputGroupAddon>
          {search && <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Clear search"
              size="icon-sm"
              className="text-[#647b76]"
              onClick={() => { setSearch(""); inputRef.current?.focus(); }}
            ><X aria-hidden="true" className="size-4" /></InputGroupButton>
          </InputGroupAddon>}
        </ComboboxInput>
        <p aria-live="polite" className="px-4 pb-3 pt-4 text-[10px] font-semibold leading-[18px] text-[#647b76]">{resultsLabel}</p>
        <ComboboxEmpty className="min-h-[132px] flex-col justify-start px-5 pb-12 pt-2 text-foreground">
          <span className="text-base font-semibold leading-6">No languages found</span>
          <span className="mt-2 text-[13px] leading-6 text-[#647b76]">Try another name or language code.</span>
        </ComboboxEmpty>
        <ComboboxList className="max-h-[280px] min-h-0 space-y-1 px-2 pb-0 pt-0 data-empty:p-0">
          {(language) => (
            <ComboboxItem
              key={language.id}
              value={language}
              className="h-[52px] flex-col items-start justify-center gap-0.5 rounded-lg py-1.5 pl-3 pr-11 font-normal data-selected:bg-[#e8f4ef] data-selected:font-semibold [&_[data-slot=combobox-item-indicator]]:right-4 [&_[data-slot=combobox-item-indicator]]:size-5 [&_[data-slot=combobox-item-indicator]_svg]:size-5"
            >
              <span className="w-full truncate text-sm leading-5">{language.name}</span>
              <span aria-hidden="true" lang={language.code} className="w-full truncate text-xs font-normal leading-[18px] text-[#647b76]">{language.nativeName}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
        {matches.length > 0 && <p className="mx-3 mb-2 mt-3 border-t border-border px-1 pt-2 text-[11px] leading-[18px] text-[#647b76]">
          {query ? `Matches “${search.trim()}”` : "Search by name or language code"}
        </p>}
      </ComboboxContent>
    </Combobox>
  );
}
