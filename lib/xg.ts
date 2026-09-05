import dixonColesParamsRaw from "./dixon-coles-params.json";

const dixonColesParams = dixonColesParamsRaw as unknown as ModelParams;

export type WinProb = { home: number; draw: number; away: number };

export type TeamParams = { attack: number; defense: number };

export type ModelParams = {
  homeAdvantage: number;
  rho: number;
  leagueAvgHomeGoals: number;
  leagueAvgAwayGoals: number;
  teams: Record<string, TeamParams>;
};

export const MAX_GOALS = 10;

export function poissonPmf(lam: number, k: number): number {
  if (lam <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lam) * lam ** k) / factorial(k);
}

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function dixonColesTau(
  x: number,
  y: number,
  lamH: number,
  lamA: number,
  rho: number
): number {
  if (x === 0 && y === 0) return 1 - lamH * lamA * rho;
  if (x === 1 && y === 0) return 1 + lamA * rho;
  if (x === 0 && y === 1) return 1 + lamH * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

export type ScorelineInput = {
  lambdaHome: number;
  lambdaAway: number;
  currentScore?: { home: number | null; away: number | null };
  minute?: number | null;
  rho?: number;
  homeXg?: number | null;
  awayXg?: number | null;
  totalMinutes?: number;
};

export function computeWinProb(input: ScorelineInput): WinProb {
  const {
    lambdaHome,
    lambdaAway,
    currentScore = { home: 0, away: 0 },
    minute = 0,
    rho = 0,
    homeXg = null,
    awayXg = null,
    totalMinutes = 90,
  } = input;

  const mins = Math.max(0, Math.min(minute ?? 0, totalMinutes));
  const remaining = (totalMinutes - mins) / totalMinutes;
  const lamH = (homeXg ?? 0) + lambdaHome * remaining;
  const lamA = (awayXg ?? 0) + lambdaAway * remaining;
  const score = currentScore ?? { home: 0, away: 0 };
  const curH = score.home ?? 0;
  const curA = score.away ?? 0;

  let home = 0;
  let draw = 0;
  let away = 0;
  let total = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p =
        poissonPmf(lamH, x) *
        poissonPmf(lamA, y) *
        dixonColesTau(x, y, lamH, lamA, rho);
      total += p;
      const diff = curH + x - (curA + y);
      if (diff > 0) home += p;
      else if (diff < 0) away += p;
      else draw += p;
    }
  }
  return { home: home / total, draw: draw / total, away: away / total };
}

export function heuristicLambdas(input: {
  homeRating: number;
  awayRating: number;
  leagueAvgHomeGoals: number;
  leagueAvgAwayGoals: number;
}): { home: number; away: number } {
  const { homeRating, awayRating, leagueAvgHomeGoals, leagueAvgAwayGoals } = input;
  return {
    home: leagueAvgHomeGoals * Math.exp(0.5 * (homeRating - awayRating)),
    away: leagueAvgAwayGoals * Math.exp(0.5 * (awayRating - homeRating)),
  };
}

export function dixonColesLambdas(
  params: ModelParams,
  homeTeam: string,
  awayTeam: string
): { home: number; away: number } {
  const home = params.teams[homeTeam] ?? { attack: 0, defense: 0 };
  const away = params.teams[awayTeam] ?? { attack: 0, defense: 0 };
  return {
    home: Math.exp(home.attack - away.defense + params.homeAdvantage),
    away: Math.exp(away.attack - home.defense),
  };
}

export function teamRatings(params: ModelParams): Record<string, number> {
  const ratings: Record<string, number> = {};
  for (const [team, p] of Object.entries(params.teams)) {
    ratings[team] = p.attack - p.defense;
  }
  return ratings;
}

export type MatchWinProb = {
  winProb: WinProb;
  model: "dixon-coles" | "heuristic";
};

export function matchWinProb(input: {
  homeTeam: string;
  awayTeam: string;
  currentScore?: { home: number | null; away: number | null };
  minute?: number | null;
  homeXg?: number | null;
  awayXg?: number | null;
}): MatchWinProb {
  const { homeTeam, awayTeam, currentScore, minute, homeXg, awayXg } = input;
  const home = dixonColesParams.teams[homeTeam];
  const away = dixonColesParams.teams[awayTeam];

  if (home && away) {
    const lambdas = dixonColesLambdas(dixonColesParams, homeTeam, awayTeam);
    return {
      winProb: computeWinProb({
        lambdaHome: lambdas.home,
        lambdaAway: lambdas.away,
        currentScore,
        minute,
        rho: dixonColesParams.rho,
        homeXg,
        awayXg,
      }),
      model: "dixon-coles",
    };
  }

  const ratings = teamRatings(dixonColesParams);
  const lambdas = heuristicLambdas({
    homeRating: ratings[homeTeam] ?? 0,
    awayRating: ratings[awayTeam] ?? 0,
    leagueAvgHomeGoals: dixonColesParams.leagueAvgHomeGoals,
    leagueAvgAwayGoals: dixonColesParams.leagueAvgAwayGoals,
  });
  return {
    winProb: computeWinProb({
      lambdaHome: lambdas.home,
      lambdaAway: lambdas.away,
      currentScore,
      minute,
      homeXg,
      awayXg,
    }),
    model: "heuristic",
  };
}