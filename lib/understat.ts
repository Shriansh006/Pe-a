export type MatchStatus = "upcoming" | "live" | "finished";

export type LaLigaMatch = {
  id: string;
  home: string;
  away: string;
  homeId: string;
  awayId: string;
  score: { home: number | null; away: number | null };
  xg: { home: number | null; away: number | null };
  status: MatchStatus;
  minute: number | null;
  kickoff: string;
  forecast: { w: number | null; d: number | null; l: number | null };
};

export type UnderstatTeamRef = {
  id: string;
  title: string;
  short_title: string;
};

export type UnderstatRawMatch = {
  id: string;
  isResult: boolean;
  h: UnderstatTeamRef;
  a: UnderstatTeamRef;
  goals: { h: string | null; a: string | null };
  xG: { h: string | null; a: string | null };
  datetime: string;
  forecast: { w: string | null; d: string | null; l: string | null };
};

export type UnderstatLeagueData = {
  teams: unknown;
  players: unknown;
  dates: UnderstatRawMatch[];
};

export class UnderstatError extends Error {}

export const UNDERSTAT_BASE_URL =
  process.env.UNDERSTAT_BASE_URL ?? "https://understat.com";
export const UNDERSTAT_LEAGUE_SLUG = "La_liga";
export const UNDERSTAT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export function getSeason(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() + 1 >= 8 ? String(year) : String(year - 1);
}

export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function fetchUnderstatLeagueData(
  season: string,
  signal?: AbortSignal
): Promise<UnderstatLeagueData> {
  const url = `${UNDERSTAT_BASE_URL}/getLeagueData/${UNDERSTAT_LEAGUE_SLUG}/${season}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": UNDERSTAT_USER_AGENT,
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      signal,
      cache: "no-store",
    });
  } catch (err) {
    throw new UnderstatError(
      `understat unreachable: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!res.ok) {
    throw new UnderstatError(`understat returned HTTP ${res.status} for ${url}`);
  }
  const text = await res.text();
  if (!text.trim().startsWith("{")) {
    throw new UnderstatError("understat returned non-JSON (bot page or changed response)");
  }
  try {
    return JSON.parse(text) as UnderstatLeagueData;
  } catch (err) {
    throw new UnderstatError(
      `failed to parse understat JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function parseUnderstatLeagueData(json: unknown): UnderstatLeagueData {
  if (typeof json !== "object" || json === null) {
    throw new UnderstatError("understat league data is not an object");
  }
  const data = json as Record<string, unknown>;
  if (!Array.isArray(data.dates)) {
    throw new UnderstatError("understat league data missing 'dates' array");
  }
  const dates = data.dates as UnderstatRawMatch[];
  for (const match of dates) {
    if (
      typeof match.id !== "string" ||
      typeof match.isResult !== "boolean" ||
      !match.h ||
      !match.a
    ) {
      throw new UnderstatError("understat match schema changed (id/isResult/h/a)");
    }
    if (typeof match.datetime !== "string" || !match.goals || !match.xG) {
      throw new UnderstatError("understat match schema changed (datetime/goals/xG)");
    }
  }
  return { teams: data.teams, players: data.players, dates };
}

export function kickoffToISO(wall: string): string {
  return new Date(wall.replace(" ", "T") + "Z").toISOString();
}

export function elapsedMinutes(kickoffISO: string, now: Date): number {
  const mins = Math.floor(
    (now.getTime() - new Date(kickoffISO).getTime()) / 60_000
  );
  return Math.max(0, Math.min(mins, 120));
}

export function normalizeMatch(raw: UnderstatRawMatch, now: Date = new Date()): LaLigaMatch {
  const score = { home: toNum(raw.goals.h), away: toNum(raw.goals.a) };
  const status: MatchStatus = raw.isResult
    ? "finished"
    : score.home !== null || score.away !== null
      ? "live"
      : "upcoming";
  const kickoff = kickoffToISO(raw.datetime);
  return {
    id: raw.id,
    home: raw.h.title,
    away: raw.a.title,
    homeId: raw.h.id,
    awayId: raw.a.id,
    score,
    xg: { home: toNum(raw.xG.h), away: toNum(raw.xG.a) },
    status,
    minute: status === "live" ? elapsedMinutes(kickoff, now) : null,
    kickoff,
    forecast: {
      w: toNum(raw.forecast?.w),
      d: toNum(raw.forecast?.d),
      l: toNum(raw.forecast?.l),
    },
  };
}

export function todayMatchesFromData(
  data: UnderstatLeagueData,
  dateKey: string,
  now: Date = new Date()
): LaLigaMatch[] {
  return data.dates
    .filter((match) => match.datetime.slice(0, 10) === dateKey)
    .map((match) => normalizeMatch(match, now))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export async function getTodayLaLigaMatches(
  dateKey: string,
  season: string,
  now: Date = new Date()
): Promise<LaLigaMatch[]> {
  const data = await fetchUnderstatLeagueData(season);
  return todayMatchesFromData(parseUnderstatLeagueData(data), dateKey, now);
}

function toNum(value: string | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value);
}