import { requireSession } from "@/lib/require-session";

export default async function Home() {
  const { user } = await requireSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Immersion Tracker</h1>
      <p className="text-muted-foreground">
        Signed in as {user.name || user.email || "a language learner"}.
      </p>
      {/* Auth routes need a full browser navigation. */}
      <a className="w-fit underline underline-offset-4" href="/auth/logout">
        Sign out
      </a>
    </main>
  );
}
