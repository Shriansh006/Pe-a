import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  buildMatchTimeline,
  parseMatchData,
  type UnderstatMatchData,
} from "./understat";

const fixture: UnderstatMatchData = JSON.parse(
  readFileSync(`${import.meta.dir}/__fixtures__/understat-match-30801.json`, "utf8")
);

describe("parseMatchData", () => {
  test("parses the saved match fixture", () => {
    const data = parseMatchData(fixture);
    expect(data.shots.h.length).toBeGreaterThan(0);
    expect(data.shots.a.length).toBeGreaterThan(0);
  });

  test("locks the schema: missing shots arrays throw", () => {
    const broken = { ...fixture, shots: undefined };
    expect(() => parseMatchData(broken)).toThrow(/missing 'shots.h'\/'shots.a'/);
  });

  test("locks the schema: shot without xG throws", () => {
    const broken = JSON.parse(JSON.stringify(fixture)) as UnderstatMatchData;
    delete broken.shots.h[0].xG;
    expect(() => parseMatchData(broken)).toThrow(/shot schema changed/);
  });
});

describe("buildMatchTimeline", () => {
  test("builds a minute-by-minute timeline for a finished match", () => {
    const timeline = buildMatchTimeline(fixture, "finished");
    expect(timeline.home).toBe("Real Betis");
    expect(timeline.away).toBe("Real Madrid");
    expect(timeline.status).toBe("finished");
    expect(timeline.score).toEqual({ home: 1, away: 0 });
    expect(timeline.timeline.length).toBeGreaterThan(90);
  });

  test("first point is the pre-match state", () => {
    const { timeline } = buildMatchTimeline(fixture, "finished");
    const first = timeline[0];
    expect(first.minute).toBe(0);
    expect(first.homeCumXg).toBe(0);
    expect(first.awayCumXg).toBe(0);
    expect(first.homeGoals).toBe(0);
    expect(first.awayGoals).toBe(0);
    expect(first.winHome + first.winDraw + first.winAway).toBeCloseTo(1, 5);
  });

  test("cumulative xG is monotonically non-decreasing", () => {
    const { timeline } = buildMatchTimeline(fixture, "finished");
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].homeCumXg).toBeGreaterThanOrEqual(timeline[i - 1].homeCumXg);
      expect(timeline[i].awayCumXg).toBeGreaterThanOrEqual(timeline[i - 1].awayCumXg);
    }
  });

  test("final score matches the last timeline point", () => {
    const { timeline, score } = buildMatchTimeline(fixture, "finished");
    const last = timeline[timeline.length - 1];
    expect(last.homeGoals).toBe(score.home);
    expect(last.awayGoals).toBe(score.away);
  });

  test("win probability collapses to a decisive result late in a 1-0", () => {
    const { timeline } = buildMatchTimeline(fixture, "finished");
    const last = timeline[timeline.length - 1];
    expect(last.winHome).toBeGreaterThan(0.9);
  });

  test("empty shots produce an empty timeline", () => {
    const result = buildMatchTimeline(
      { shots: { h: [], a: [] }, rosters: {} },
      "upcoming"
    );
    expect(result.timeline).toEqual([]);
  });
});