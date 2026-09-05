export type MatchStatus = "upcoming" | "live" | "finished";

export type WinProb = { home: number; draw: number; away: number };

export type Forecast = { w: number | null; d: number | null; l: number | null };

export type LiveMatch = {
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
  forecast: Forecast;
  winProb: WinProb;
  model: "dixon-coles" | "heuristic";
};

export type LiveResponse = {
  ok: boolean;
  source: "understat" | "football-data";
  season: string;
  date: string;
  generatedAt: string;
  matches: LiveMatch[];
};