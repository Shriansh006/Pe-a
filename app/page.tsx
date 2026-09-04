export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full border border-black/10 bg-black/[.03] px-3 py-1 text-xs font-medium tracking-wide text-zinc-500 dark:border-white/10 dark:bg-white/[.06] dark:text-zinc-400">
          Phase 1 · Scaffold
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
          Peña
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          La Liga understat data, scraped on Vercel&apos;s servers and served to
          a Next.js front end.
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3 text-left font-mono text-sm">
        <a
          href="/api/health"
          className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 transition-colors hover:bg-black/[.03] dark:border-white/10 dark:bg-black dark:hover:bg-white/[.06]"
        >
          <span className="text-zinc-700 dark:text-zinc-300">
            GET /api/health
          </span>
          <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            ok
          </span>
        </a>
        <p className="px-1 text-xs leading-5 text-zinc-400 dark:text-zinc-500">
          Smoke test proving serverless functions run on Vercel.
        </p>
      </div>
    </main>
  );
}