import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { MatchStatus } from "@/lib/understat";
import {
  buildMatchTimeline,
  fetchMatchData,
  fetchUnderstatLeagueData,
  getSeason,
  parseMatchData,
  parseUnderstatLeagueData,
} from "@/lib/understat";

const getMatchDetail = unstable_cache(
  async (matchId: string, season: string) => {
    const leagueRaw = await fetchUnderstatLeagueData(season);
    const league = parseUnderstatLeagueData(leagueRaw);
    const meta = league.dates.find((m) => m.id === matchId);

    const status: MatchStatus = meta
      ? meta.isResult
        ? "finished"
        : meta.goals.h !== null || meta.goals.a !== null
          ? "live"
          : "upcoming"
      : "upcoming";

    let matchData;
    try {
      matchData = parseMatchData(await fetchMatchData(matchId));
    } catch (err) {
      if (!meta) throw err;
    }

    if (matchData) {
      const timeline = buildMatchTimeline(matchData, status);
      return {
        ...timeline,
        home: timeline.home || (meta?.h.title ?? ""),
        away: timeline.away || (meta?.a.title ?? ""),
        id: timeline.id || matchId,
      };
    }

    return {
      id: matchId,
      home: meta?.h.title ?? "",
      away: meta?.a.title ?? "",
      score: { home: numOrZero(meta?.goals.h ?? null), away: numOrZero(meta?.goals.a ?? null) },
      status,
      timeline: [],
    };
  },
  ["understat-match"],
  { revalidate: 60 }
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const season = getSeason();
  try {
    const timeline = await getMatchDetail(id, season);
    return NextResponse.json({ ok: true, ...timeline });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("HTTP 404") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

function numOrZero(value: string | null): number {
  return value === null ? 0 : Number(value);
}