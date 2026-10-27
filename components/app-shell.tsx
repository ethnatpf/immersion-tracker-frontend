"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Clock, Layers, LayoutGrid, LogOut, Menu, Plus, Timer, UserRound, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/shadcn/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/shadcn/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/shadcn/sheet";
import { cn } from "@/lib/utils";
import { ApiErrorBoundary } from "@/components/error/api-error-boundary";
import { TimerFeature, type TimerFeatureHandle } from "@/components/timer/timer-feature";

function Brand({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary text-white", mobile && "size-8 rounded-[10px]")}>
        <Layers aria-hidden="true" className={mobile ? "size-[18px]" : "size-[22px]"} />
      </span>
      <div>
        <span className={cn("text-xl font-semibold leading-7", mobile && "text-[19px]")}>Immersion</span>
        {!mobile && <p className="text-[11px] leading-4 text-muted-foreground">A little, every day.</p>}
      </div>
    </div>
  );
}

function ProfileMenu({ email }: { email?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Open profile menu" render={<Button variant="outline" className="size-11 rounded-full bg-white" />}>
        <UserRound aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-[calc(100vw-40px)] max-w-[350px] rounded-[14px] border border-border p-4 shadow-[0_12px_32px_#182d2a24] ring-0 md:w-[280px]">
        <DropdownMenuGroup>
          <div className="flex min-w-0 items-center gap-3 pb-[18px] pt-1">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent"><UserRound aria-hidden="true" className="size-[22px]" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-[22px]">Your account</p>
              <p className="truncate text-xs leading-[22px] text-muted-foreground">{email || "Signed in"}</p>
            </div>
          </div>
          <div role="separator" className="mb-2 h-px bg-border" />
          <DropdownMenuItem nativeButton={false} render={<a href="/auth/logout" />} className="min-h-14 gap-3 px-1.5 font-medium md:min-h-11">
            <LogOut aria-hidden="true" className="size-5 text-muted-foreground" />Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const workspaceLinks = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/history", label: "History", icon: Clock },
];

function Navigation({ mobile = false, onSelect, onStartTimer }: { mobile?: boolean; onSelect?: () => void; onStartTimer: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav aria-label={mobile ? "Mobile workspace" : "Workspace"} className={cn("px-4", mobile && "px-4")}>
        <p className={cn("mb-3 px-3 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground", mobile && "mb-4")}>WORKSPACE</p>
        <div className={cn("flex flex-col gap-[10px]", mobile && "gap-3")}>
          {workspaceLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={onSelect} className={cn(
                "flex h-11 items-center gap-[14px] rounded-[9px] px-[14px] text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mobile && "h-14 rounded-xl px-[18px]",
                active ? "bg-accent font-semibold text-primary" : "font-normal text-muted-foreground hover:bg-accent/50",
                mobile && !active && "text-foreground",
              )}>
                <Icon aria-hidden="true" className="size-5" />{label}
                {mobile && (active ? <span className="ml-auto size-1.5 rounded-full bg-primary" /> : <ChevronRight aria-hidden="true" className="ml-auto size-4 text-muted-foreground" />)}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className={cn("mx-5 mt-10 flex flex-col gap-3", mobile && "mt-7 border-t border-border pt-[27px]")}>
        <Button onClick={() => { onSelect?.(); onStartTimer(); }} className={cn("h-11 justify-start gap-3 rounded-[9px] px-[18px] font-semibold", mobile && "h-12")}><Timer aria-hidden="true" className="size-[18px]" />Start timer</Button>
        <Link href="/log-session" onClick={onSelect} className={cn(buttonVariants({ variant: "outline" }), "h-11 justify-start gap-3 rounded-[9px] bg-white px-[18px] text-[13px] font-semibold", mobile && "h-12 text-sm")}><Plus aria-hidden="true" className="size-5 text-primary" />Log new session</Link>
      </div>
      <div className={cn("mx-6 mt-auto border-t border-border pb-6 pt-3", mobile && "mx-5 pb-[max(48px,env(safe-area-inset-bottom))] pt-7")}>
        <a href="/auth/logout" className="flex min-h-11 items-center gap-[14px] rounded-lg px-2 text-sm text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"><LogOut aria-hidden="true" className="size-[19px]" />Log out</a>
      </div>
    </>
  );
}

export function AppShell({ children, email }: { children: ReactNode; email?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [timerReduced, setTimerReduced] = useState(false);
  const timerRef = useRef<TimerFeatureHandle>(null);
  const pathname = usePathname();
  const onStartTimer = () => timerRef.current?.start();
  return (
    <div className="min-h-dvh bg-background">
      <a href="#main-content" className="sr-only z-[60] rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 hidden w-[220px] flex-col overflow-y-auto border-r border-border bg-white md:flex">
        <div className="pb-11 pl-6 pr-4 pt-8"><Brand /></div>
        <Navigation onStartTimer={onStartTimer} />
      </aside>
      <header className="sticky top-0 z-30 flex h-[88px] items-center gap-3 border-b border-border bg-white px-5 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger aria-label="Open navigation" render={<Button variant="ghost" className="mr-2 size-9 rounded-[10px] border-0" />}><Menu aria-hidden="true" className="size-5" /></SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="gap-0 overflow-y-auto border-0 bg-white data-[side=left]:w-[min(342px,calc(100vw-48px))] md:hidden">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Your immersion workspace and session actions.</SheetDescription>
            <div className="mx-5 mb-7 flex min-h-[101px] items-center justify-between gap-2 border-b border-border">
              <Brand />
              <SheetClose aria-label="Close navigation" render={<Button variant="ghost" className="size-11 rounded-xl bg-background" />}><X aria-hidden="true" className="size-5 text-muted-foreground" /></SheetClose>
            </div>
            <Navigation mobile onSelect={() => setMobileOpen(false)} onStartTimer={onStartTimer} />
          </SheetContent>
        </Sheet>
        <Brand mobile />
        <div className="ml-auto"><ProfileMenu email={email} /></div>
      </header>
      <div className="relative min-h-[calc(100dvh-88px)] bg-[#f6f8f7] md:ml-[220px] md:min-h-dvh">
        <div className="absolute right-10 top-[38px] hidden md:block"><ProfileMenu email={email} /></div>
        <main id="main-content" tabIndex={-1} className="min-w-0 px-5 py-[22px] outline-none md:px-10 md:py-8"><ApiErrorBoundary key={pathname}><TimerFeature ref={timerRef} reduced={timerReduced} onReducedChange={setTimerReduced}>{children}</TimerFeature></ApiErrorBoundary></main>
      </div>
    </div>
  );
}
