"use client";

import { useEffect, useState } from "react";
import type { LiveResponse } from "@/lib/types";
import { LeagueSection } from "./LeagueSection";

const REFRESH_MS = 60_000;

function formatBoardDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
        >
          <div className="h-3 w-16 rounded bg-zinc-800" />
          <div className="mt-4 flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-zinc-800" />
            <div className="h-4 w-10 rounded bg-zinc-800" />
            <div className="h-4 w-24 rounded bg-zinc-800" />
          </div>
          <div className="mt-5 h-1.5 w-full rounded-full bg-zinc-800" />
          <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

export function Board() {
  const [data, setData] = useState<LiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const fetchLive = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as LiveResponse;
        if (!cancelled) {
          setData(json);
          setUpdatedAt(Date.now());
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const secondsAgo =
    updatedAt === null ? null : Math.max(0, Math.round((now - updatedAt) / 1000));

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium tracking-wide text-zinc-400">La Liga</h2>
          {data && (
            <p className="mt-0.5 text-xs text-zinc-600">{formatBoardDate(data.date)}</p>
          )}
        </div>
        {secondsAgo !== null && (
          <p className="text-xs tabular-nums text-zinc-600">
            updated {secondsAgo}s ago
          </p>
        )}
      </header>

      <div className="mt-5">
        {error && !data ? (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
            Couldn&apos;t load the matchday board: {error}
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="ml-2 underline"
            >
              retry
            </button>
          </div>
        ) : !data ? (
          <SkeletonRows />
        ) : data.matches.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-500">
            No La Liga matches today.
          </div>
        ) : (
          <LeagueSection matches={data.matches} />
        )}
      </div>

      {data && (
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/70 pt-4 text-[11px] text-zinc-600">
          <span>
            source: {data.source} · season {data.season}
          </span>
          <span>auto-refresh every 60s</span>
        </footer>
      )}
    </div>
  );
}