import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { NotFoundGoBack } from "@/components/not-found-go-back";
import { requireSession } from "@/lib/require-session";

export const metadata: Metadata = {
  title: "Page not found | Immersion Tracker",
};

export default async function NotFound() {
  const { user } = await requireSession();

  return (
    <AppShell email={user.email}>
      <div className="relative grid min-h-[calc(100dvh-132px)] place-items-center md:min-h-[calc(100dvh-64px)]">
        <section
          aria-labelledby="not-found-title"
          className="flex min-h-[430px] w-full max-w-[600px] flex-col items-center rounded-2xl border border-border bg-white px-6 pb-8 pt-8 text-center md:min-h-[402px] md:px-8"
        >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
              <Compass aria-hidden="true" className="size-6" strokeWidth={2} />
            </div>
            <p className="mt-4 text-[11px] font-bold leading-[18px] text-primary">
              404 · PAGE NOT FOUND
            </p>
            <h1
              id="not-found-title"
              className="mt-5 text-2xl font-semibold leading-9 tracking-[-0.02em] text-foreground md:text-[28px]"
            >
              This page wandered off
            </h1>
            <p className="mt-3 max-w-[360px] text-sm leading-5 text-[#647b76]">
              The page you’re looking for doesn’t exist,
              <br /> or it may have moved.
            </p>
            <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
              <Link
                href="/"
                className="inline-flex h-12 items-center justify-center rounded-[10px] bg-primary px-5 text-sm font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-w-[174px]"
              >
                Back to dashboard
              </Link>
              <NotFoundGoBack />
            </div>
        </section>
      </div>
    </AppShell>
  );
}
