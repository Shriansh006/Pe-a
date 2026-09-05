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

type LiveResult = {
  source: "understat" | "football-data";
  matches: LaLigaMatch[];
};

const getLiveData = unstable_cache(
  async (dateKey: string, season: string): Promise<LiveResult> => {
    try {
      return { source: "understat", matches: await getTodayLaLigaMatches(dateKey, season) };
    } catch (understatErr) {
      const apiKey = process.env.FOOTBALL_DATA_API_KEY;
      if (!apiKey) {
        throw new UnderstatError(
          `understat failed (${understatErr instanceof Error ? understatErr.message : String(understatErr)}) and no FOOTBALL_DATA_API_KEY is set for fallback`
        );
      }
      return {
        source: "football-data",
        matches: await fetchLaLigaTodayFromFootballData(dateKey, apiKey),
      };
    }
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