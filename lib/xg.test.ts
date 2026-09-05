import { describe, expect, test } from "bun:test";
import {
  dixonColesTau,
  heuristicLambdas,
  matchWinProb,
  poissonPmf,
  teamRatings,
} from "./xg";
import params from "./dixon-coles-params.json";

describe("poissonPmf", () => {
  test("sums to ~1 over the support", () => {
    let total = 0;
    for (let k = 0; k <= 40; k++) total += poissonPmf(2.5, k);
    expect(total).toBeCloseTo(1, 5);
  });

  test("zero lambda only assigns mass to 0", () => {
    expect(poissonPmf(0, 0)).toBe(1);
    expect(poissonPmf(0, 1)).toBe(0);
  });
});

describe("dixonColesTau", () => {
  test("correction factors for low scores", () => {
    expect(dixonColesTau(0, 0, 1.5, 1.2, 0.05)).toBeCloseTo(1 - 1.5 * 1.2 * 0.05);
    expect(dixonColesTau(1, 0, 1.5, 1.2, 0.05)).toBeCloseTo(1 + 1.2 * 0.05);
    expect(dixonColesTau(0, 1, 1.5, 1.2, 0.05)).toBeCloseTo(1 + 1.5 * 0.05);
    expect(dixonColesTau(1, 1, 1.5, 1.2, 0.05)).toBeCloseTo(1 - 0.05);
    expect(dixonColesTau(2, 3, 1.5, 1.2, 0.05)).toBe(1);
  });
});

describe("matchWinProb (golden values from the Python fit)", () => {
  test("pre-match Real Madrid (h) vs Barcelona", () => {
    const { winProb, model } = matchWinProb({
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
    });
    expect(model).toBe("dixon-coles");
    expect(winProb.home).toBeCloseTo(0.4213, 3);
    expect(winProb.draw).toBeCloseTo(0.2217, 3);
    expect(winProb.away).toBeCloseTo(0.357, 3);
  });

  test("live 1-0 to Real Madrid at minute 60", () => {
    const { winProb } = matchWinProb({
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
      currentScore: { home: 1, away: 0 },
      minute: 60,
    });
    expect(winProb.home).toBeCloseTo(0.7305, 3);
    expect(winProb.draw).toBeCloseTo(0.2054, 3);
    expect(winProb.away).toBeCloseTo(0.0642, 3);
  });

  test("live 0-0 at minute 25 with xG so far 0.4-0.9", () => {
    const { winProb } = matchWinProb({
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
      currentScore: { home: 0, away: 0 },
      minute: 25,
      homeXg: 0.4,
      awayXg: 0.9,
    });
    expect(winProb.home).toBeCloseTo(0.1543, 3);
    expect(winProb.draw).toBeCloseTo(0.1814, 3);
    expect(winProb.away).toBeCloseTo(0.6644, 3);
  });

  test("late in a decided match probabilities collapse to the score", () => {
    const { winProb } = matchWinProb({
      homeTeam: "Real Madrid",
      awayTeam: "Barcelona",
      currentScore: { home: 1, away: 0 },
      minute: 95,
    });
    expect(winProb.home).toBeGreaterThan(0.9);
  });

  test("unknown teams fall back to the heuristic model", () => {
    const { model, winProb } = matchWinProb({
      homeTeam: "Some Promoted Team",
      awayTeam: "Another New Team",
    });
    expect(model).toBe("heuristic");
    expect(winProb.home + winProb.draw + winProb.away).toBeCloseTo(1, 5);
  });

  test("probabilities always sum to 1", () => {
    const { winProb } = matchWinProb({
      homeTeam: "Atletico Madrid",
      awayTeam: "Sevilla",
      currentScore: { home: 2, away: 2 },
      minute: 78,
      homeXg: 1.8,
      awayXg: 1.1,
    });
    expect(winProb.home + winProb.draw + winProb.away).toBeCloseTo(1, 5);
  });
});

describe("heuristicLambdas", () => {
  test("equal ratings give league-average expected goals", () => {
    const { home, away } = heuristicLambdas({
      homeRating: 0,
      awayRating: 0,
      leagueAvgHomeGoals: 1.52,
      leagueAvgAwayGoals: 1.14,
    });
    expect(home).toBeCloseTo(1.52, 5);
    expect(away).toBeCloseTo(1.14, 5);
  });

  test("stronger home team scores more", () => {
    const ratings = teamRatings(params);
    const { home } = heuristicLambdas({
      homeRating: ratings["Real Madrid"] ?? 0,
      awayRating: ratings["Alaves"] ?? 0,
      leagueAvgHomeGoals: params.leagueAvgHomeGoals,
      leagueAvgAwayGoals: params.leagueAvgAwayGoals,
    });
    expect(home).toBeGreaterThan(params.leagueAvgHomeGoals);
  });
});