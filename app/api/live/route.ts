import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { LaLigaMatch } from "@/lib/understat";
import {
  UnderstatError,
  getSeason,
  getTodayLaLigaMatches,
  todayKey,
} from "@/lib/understat";
import { fetchLaLigaTodayFromFootballData } from "@/lib/football-data";
import { matchWinProb } from "@/lib/xg";

type LiveResult = {
  source: "understat" | "football-data";
  matches: (LaLigaMatch & {
    winProb: { home: number; draw: number; away: number };
    model: "dixon-coles" | "heuristic";
  })[];
};

const getLiveData = unstable_cache(
  async (dateKey: string, season: string): Promise<LiveResult> => {
    let source: LiveResult["source"];
    let matches: LaLigaMatch[];
    try {
      source = "understat";
      matches = await getTodayLaLigaMatches(dateKey, season);
    } catch (understatErr) {
      const apiKey = process.env.FOOTBALL_DATA_API_KEY;
      if (!apiKey) {
        throw new UnderstatError(
          `understat failed (${understatErr instanceof Error ? understatErr.message : String(understatErr)}) and no FOOTBALL_DATA_API_KEY is set for fallback`
        );
      }
      source = "football-data";
      matches = await fetchLaLigaTodayFromFootballData(dateKey, apiKey);
    }
    return {
      source,
      matches: matches.map((m) => {
        const { winProb, model } = matchWinProb({
          homeTeam: m.home,
          awayTeam: m.away,
          currentScore: m.score,
          minute: m.minute,
          homeXg: m.xg.home,
          awayXg: m.xg.away,
        });
        return { ...m, winProb, model };
      }),
    };
  },
  ["understat-live"],
  { revalidate: 60 }
);

export async function GET() {
  const now = new Date();
  const dateKey = todayKey(now);
  const season = getSeason(now);
  const { source, matches } = await getLiveData(dateKey, season);
  return NextResponse.json({
    ok: true,
    source,
    season,
    date: dateKey,
    generatedAt: now.toISOString(),
    matches,
  });
}