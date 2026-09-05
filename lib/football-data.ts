import type { LaLigaMatch, MatchStatus } from "./understat";
import { elapsedMinutes } from "./understat";

const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const LALIGA_COMPETITION_ID = 2014;

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { id: number; name: string; shortName: string };
  awayTeam: { id: number; name: string; shortName: string };
  score: { fullTime: { home: number | null; away: number | null } };
};

export class FootballDataError extends Error {}

export async function fetchLaLigaTodayFromFootballData(
  dateKey: string,
  apiKey: string,
  now: Date = new Date()
): Promise<LaLigaMatch[]> {
  const url = `${FOOTBALL_DATA_BASE}/matches?date=${dateKey}&competitions=${LALIGA_COMPETITION_ID}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });
  } catch (err) {
    throw new FootballDataError(
      `football-data unreachable: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!res.ok) {
    throw new FootballDataError(`football-data returned HTTP ${res.status}`);
  }
  const json = (await res.json()) as { matches?: FootballDataMatch[] };
  if (!Array.isArray(json.matches)) {
    throw new FootballDataError("football-data response missing 'matches' array");
  }
  return json.matches.map((m) => normalizeFootballDataMatch(m, now)).sort((a, b) =>
    a.kickoff.localeCompare(b.kickoff)
  );
}

function normalizeFootballDataMatch(raw: FootballDataMatch, now: Date): LaLigaMatch {
  const status = mapStatus(raw.status);
  return {
    id: String(raw.id),
    home: raw.homeTeam.shortName || raw.homeTeam.name,
    away: raw.awayTeam.shortName || raw.awayTeam.name,
    homeId: String(raw.homeTeam.id),
    awayId: String(raw.awayTeam.id),
    score: { home: raw.score.fullTime?.home ?? null, away: raw.score.fullTime?.away ?? null },
    xg: { home: null, away: null },
    status,
    minute: status === "live" ? elapsedMinutes(raw.utcDate, now) : null,
    kickoff: raw.utcDate,
    forecast: { w: null, d: null, l: null },
  };
}

function mapStatus(status: string): MatchStatus {
  if (status === "FINISHED" || status === "AWARDED") return "finished";
  if (status === "IN_PLAY" || status === "PAUSED") return "live";
  return "upcoming";
}