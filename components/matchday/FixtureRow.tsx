import Link from "next/link";
import type { LiveMatch } from "@/lib/types";
import { XGBar } from "./XGBar";
import { WinProbMeter } from "./WinProbMeter";

function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function FixtureRow({ match }: { match: LiveMatch }) {
  const { status } = match;
  const greyed = status === "finished";
  const live = status === "live";

  return (
    <Link
      href={`/match/${match.id}`}
      className={`block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900 ${
        greyed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        {live ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {match.minute}&#39;
          </span>
        ) : status === "finished" ? (
          <span className="text-xs font-medium text-zinc-500">FT</span>
        ) : (
          <span className="text-xs tabular-nums text-zinc-400">
            {formatKickoff(match.kickoff)}
          </span>
        )}
        {!live && !greyed && (
          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">
            Predict
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={`flex-1 truncate text-right text-sm font-medium ${
            greyed ? "text-zinc-500" : "text-zinc-100"
          }`}
        >
          {match.home}
        </span>
        <span
          className={`text-base font-semibold tabular-nums ${
            greyed ? "text-zinc-500" : "text-zinc-100"
          }`}
        >
          {match.score.home ?? "–"}
          <span className="mx-1 text-zinc-600">:</span>
          {match.score.away ?? "–"}
        </span>
        <span
          className={`flex-1 truncate text-sm font-medium ${
            greyed ? "text-zinc-500" : "text-zinc-100"
          }`}
        >
          {match.away}
        </span>
      </div>

      <div className="mt-4">
        <XGBar home={match.xg.home} away={match.xg.away} />
      </div>
      <div className="mt-3">
        <WinProbMeter
          home={match.winProb.home}
          draw={match.winProb.draw}
          away={match.winProb.away}
        />
      </div>
    </Link>
  );
}