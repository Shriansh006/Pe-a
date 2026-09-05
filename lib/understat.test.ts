import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  normalizeMatch,
  parseUnderstatLeagueData,
  todayMatchesFromData,
  type UnderstatLeagueData,
} from "./understat";

const fixture: UnderstatLeagueData = JSON.parse(
  readFileSync(`${import.meta.dir}/__fixtures__/understat-la-liga-2026.json`, "utf8")
);

describe("parseUnderstatLeagueData", () => {
  test("parses the saved fixture", () => {
    const data = parseUnderstatLeagueData(fixture);
    expect(data.dates.length).toBe(380);
  });

  test("locks the schema: missing 'dates' array throws", () => {
    const broken = { ...fixture, dates: undefined };
    expect(() => parseUnderstatLeagueData(broken)).toThrow(/missing 'dates' array/);
  });

  test("locks the schema: removed home team ref throws", () => {
    const broken = JSON.parse(JSON.stringify(fixture)) as UnderstatLeagueData;
    delete broken.dates[0].h;
    expect(() => parseUnderstatLeagueData(broken)).toThrow(/schema changed/);
  });

  test("locks the schema: removed xG throws", () => {
    const broken = JSON.parse(JSON.stringify(fixture)) as UnderstatLeagueData;
    delete broken.dates[0].xG;
    expect(() => parseUnderstatLeagueData(broken)).toThrow(/schema changed/);
  });

  test("locks the schema: non-boolean isResult throws", () => {
    const broken = JSON.parse(JSON.stringify(fixture)) as UnderstatLeagueData;
    broken.dates[0].isResult = "1" as unknown as boolean;
    expect(() => parseUnderstatLeagueData(broken)).toThrow(/schema changed/);
  });
});

describe("todayMatchesFromData", () => {
  test("returns only matches on the given Madrid date", () => {
    const matches = todayMatchesFromData(fixture, "2026-09-05");
    expect(matches.length).toBe(3);
    for (const m of matches) {
      expect(m.status).toBe("upcoming");
    }
  });

  test("returns matches sorted by kickoff", () => {
    const matches = todayMatchesFromData(fixture, "2026-09-05");
    const kickoffs = matches.map((m) => m.kickoff);
    expect([...kickoffs].sort()).toEqual(kickoffs);
  });

  test("returns an empty array when no matches that day", () => {
    expect(todayMatchesFromData(fixture, "2027-06-30")).toEqual([]);
  });
});

describe("normalizeMatch", () => {
  test("finished match has score, xG and finished status", () => {
    const match = normalizeMatch(fixture.dates[0]);
    expect(match.status).toBe("finished");
    expect(match.score).toEqual({ home: 3, away: 0 });
    expect(match.xg.home).toBeCloseTo(2.28581);
    expect(match.xg.away).toBeCloseTo(0.259705);
    expect(match.minute).toBeNull();
  });

  test("upcoming match has null score and xG", () => {
    const data = parseUnderstatLeagueData(fixture);
    const match = normalizeMatch(data.dates.find((m) => m.datetime.slice(0, 10) === "2026-09-05")!);
    expect(match.status).toBe("upcoming");
    expect(match.score).toEqual({ home: null, away: null });
    expect(match.xg).toEqual({ home: null, away: null });
    expect(match.minute).toBeNull();
  });

  test("kickoff is converted from Madrid wall time to ISO", () => {
    const match = normalizeMatch(fixture.dates[0]);
    expect(new Date(match.kickoff).toISOString()).toBe(match.kickoff);
    expect(match.kickoff.startsWith("2026-08-15T")).toBe(true);
  });
});