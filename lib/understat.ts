import { matchWinProb } from "./xg";

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

export type UnderstatShot = {
  id: string;
  minute: string;
  result: string;
  X: string;
  Y: string;
  xG: string;
  player: string;
  h_a: string;
  player_id: string;
  situation: string;
  shotType: string;
  match_id: string;
  h_team: string;
  a_team: string;
  h_goals: string;
  a_goals: string;
  date: string;
};

export type UnderstatMatchData = {
  shots: { h: UnderstatShot[]; a: UnderstatShot[] };
  rosters: unknown;
};

export type MatchTimelinePoint = {
  minute: number;
  homeXg: number;
  awayXg: number;
  homeCumXg: number;
  awayCumXg: number;
  homeGoals: number;
  awayGoals: number;
  winHome: number;
  winDraw: number;
  winAway: number;
};

export type MatchTimeline = {
  id: string;
  home: string;
  away: string;
  score: { home: number; away: number };
  status: MatchStatus;
  timeline: MatchTimelinePoint[];
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

export async function fetchMatchData(
  matchId: string,
  signal?: AbortSignal
): Promise<UnderstatMatchData> {
  const url = `${UNDERSTAT_BASE_URL}/getMatchData/${matchId}`;
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
    return JSON.parse(text) as UnderstatMatchData;
  } catch (err) {
    throw new UnderstatError(
      `failed to parse understat match JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function parseMatchData(json: unknown): UnderstatMatchData {
  if (typeof json !== "object" || json === null) {
    throw new UnderstatError("understat match data is not an object");
  }
  const data = json as Record<string, unknown>;
  const shots = data.shots as Record<string, unknown> | undefined;
  if (!shots || !Array.isArray(shots.h) || !Array.isArray(shots.a)) {
    throw new UnderstatError("understat match data missing 'shots.h'/'shots.a' arrays");
  }
  for (const side of ["h", "a"] as const) {
    for (const shot of shots[side] as UnderstatShot[]) {
      if (
        typeof shot.id !== "string" ||
        typeof shot.minute !== "string" ||
        typeof shot.xG !== "string" ||
        typeof shot.h_goals !== "string" ||
        typeof shot.a_goals !== "string" ||
        typeof shot.h_team !== "string" ||
        typeof shot.a_team !== "string"
      ) {
        throw new UnderstatError("understat shot schema changed (id/minute/xG/goals/teams)");
      }
    }
  }
  return { shots: { h: shots.h, a: shots.a }, rosters: data.rosters };
}

export function buildMatchTimeline(
  data: UnderstatMatchData,
  status: MatchStatus
): MatchTimeline {
  const homeShots = data.shots.h;
  const awayShots = data.shots.a;
  const home = homeShots[0]?.h_team ?? awayShots[0]?.a_team ?? "";
  const away = awayShots[0]?.a_team ?? homeShots[0]?.h_team ?? "";
  const id = homeShots[0]?.match_id ?? awayShots[0]?.match_id ?? "";

  const all = [
    ...homeShots.map((s) => ({ ...s, side: "h" as const })),
    ...awayShots.map((s) => ({ ...s, side: "a" as const })),
  ];
  all.sort((a, b) => Number(a.minute) - Number(b.minute) || a.id.localeCompare(b.id));

  const maxMinute = all.length ? Math.max(...all.map((s) => Number(s.minute))) : 0;

  if (all.length === 0) {
    return { id, home, away, score: { home: 0, away: 0 }, status, timeline: [] };
  }

  const homeXgByMinute = new Array<number>(maxMinute + 1).fill(0);
  const awayXgByMinute = new Array<number>(maxMinute + 1).fill(0);
  for (const shot of all) {
    const m = Number(shot.minute);
    if (m > maxMinute) continue;
    if (shot.side === "h") homeXgByMinute[m] += Number(shot.xG) || 0;
    else awayXgByMinute[m] += Number(shot.xG) || 0;
  }

  const timeline: MatchTimelinePoint[] = [];
  let shotIdx = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  let homeCumXg = 0;
  let awayCumXg = 0;

  for (let minute = 0; minute <= maxMinute; minute++) {
    while (shotIdx < all.length && Number(all[shotIdx].minute) <= minute) {
      homeGoals = Number(all[shotIdx].h_goals);
      awayGoals = Number(all[shotIdx].a_goals);
      shotIdx++;
    }
    homeCumXg += homeXgByMinute[minute] ?? 0;
    awayCumXg += awayXgByMinute[minute] ?? 0;

    const { winProb } = matchWinProb({
      homeTeam: home,
      awayTeam: away,
      currentScore: { home: homeGoals, away: awayGoals },
      minute,
      homeXg: homeCumXg,
      awayXg: awayCumXg,
    });

    timeline.push({
      minute,
      homeXg: homeXgByMinute[minute] ?? 0,
      awayXg: awayXgByMinute[minute] ?? 0,
      homeCumXg: homeCumXg,
      awayCumXg: awayCumXg,
      homeGoals,
      awayGoals,
      winHome: winProb.home,
      winDraw: winProb.draw,
      winAway: winProb.away,
    });
  }

  return {
    id,
    home,
    away,
    score: { home: homeGoals, away: awayGoals },
    status,
    timeline,
  };
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