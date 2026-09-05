"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MatchStatus, MatchTimelinePoint } from "@/lib/understat";
import { CumulativeXgChart } from "./CumulativeXgChart";
import { WinProbChart } from "./WinProbChart";
import { XgTimelineChart } from "./XgTimelineChart";

type MatchDetailResponse = {
  ok: boolean;
  error?: string;
  id: string;
  home: string;
  away: string;
  score: { home: number; away: number };
  status: MatchStatus;
  timeline: MatchTimelinePoint[];
};

const REFRESH_MS = 60_000;

function ChartCard({
  title,
  legend,
  children,
}: {
  title: string;
  legend: { label: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
        <div className="flex items-center gap-3">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatusChip({ status, minute }: { status: MatchStatus; minute: number }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        {minute}&#39;
      </span>
    );
  }
  if (status === "finished") {
    return <span className="text-xs font-medium text-zinc-500">FT</span>;
  }
  return <span className="text-xs font-medium text-zinc-500">Not started</span>;
}

export function MatchView({ matchId }: { matchId: string }) {
  const [data, setData] = useState<MatchDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/match/${matchId}`, { cache: "no-store" });
        const json = (await res.json()) as MatchDetailResponse;
        if (!cancelled) {
          if (!json.ok) throw new Error(json.error ?? "failed to load match");
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    };

    fetchDetail();
    const interval = setInterval(() => {
      fetchDetail().then(() => {});
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [matchId]);

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-sm text-red-300">
        Couldn&apos;t load this match: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/2 rounded bg-zinc-800" />
        <div className="h-56 rounded-xl bg-zinc-900/60" />
        <div className="h-56 rounded-xl bg-zinc-900/60" />
        <div className="h-56 rounded-xl bg-zinc-900/60" />
      </div>
    );
  }

  const last = data.timeline.length ? data.timeline[data.timeline.length - 1] : null;
  const minute = last?.minute ?? 0;

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >
        &larr; back to board
      </Link>

      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-4">
          <span className="flex-1 truncate text-right text-sm font-medium text-zinc-100">
            {data.home}
          </span>
          <div className="text-center">
            <div className="text-2xl font-semibold tabular-nums text-zinc-100">
              {data.score.home} : {data.score.away}
            </div>
            <div className="mt-1 flex justify-center">
              <StatusChip status={data.status} minute={minute} />
            </div>
          </div>
          <span className="flex-1 truncate text-sm font-medium text-zinc-100">
            {data.away}
          </span>
        </div>
      </header>

      {data.timeline.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-500">
          No shot data yet — check back once the match kicks off.
        </div>
      ) : (
        <div className="space-y-4">
          <ChartCard
            title="Expected goals by minute"
            legend={[
              { label: data.home, color: "#ef4444" },
              { label: data.away, color: "#0ea5e9" },
            ]}
          >
            <XgTimelineChart timeline={data.timeline} />
          </ChartCard>

          <ChartCard
            title="Cumulative xG"
            legend={[
              { label: data.home, color: "#ef4444" },
              { label: data.away, color: "#0ea5e9" },
            ]}
          >
            <CumulativeXgChart timeline={data.timeline} />
          </ChartCard>

          <ChartCard
            title="Win probability over time"
            legend={[
              { label: "Home", color: "#ef4444" },
              { label: "Draw", color: "#a1a1aa" },
              { label: "Away", color: "#0ea5e9" },
            ]}
          >
            <WinProbChart timeline={data.timeline} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}