"""Benchmark Dixon-Coles and the heuristic baseline against Understat's
bookmaker forecast using log-loss and Brier score on the last season.

Usage:
    python3 scripts/benchmark_models.py
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "la-liga-results.json"
PARAMS_PATH = ROOT / "lib" / "dixon-coles-params.json"


def poisson(lam, k):
    return math.exp(-lam) * lam**k / math.factorial(k)


def tau(x, y, lh, la, rho):
    if x == 0 and y == 0:
        return 1 - lh * la * rho
    if x == 1 and y == 0:
        return 1 + la * rho
    if x == 0 and y == 1:
        return 1 + lh * rho
    if x == 1 and y == 1:
        return 1 - rho
    return 1


def dc_probs(params, home, away):
    hp, ap = params["teams"][home], params["teams"][away]
    lh = math.exp(hp["attack"] - ap["defense"] + params["homeAdvantage"])
    la = math.exp(ap["attack"] - hp["defense"])
    H = D = A = 0.0
    for x in range(11):
        for y in range(11):
            p = poisson(lh, x) * poisson(la, y) * tau(x, y, lh, la, params["rho"])
            if x > y:
                H += p
            elif x < y:
                A += p
            else:
                D += p
    t = H + D + A
    return [H / t, D / t, A / t]


def heuristic_probs(params, home, away):
    def rating(t):
        p = params["teams"].get(t)
        return p["attack"] - p["defense"] if p else 0.0

    rH, rA = rating(home), rating(away)
    lh = params["leagueAvgHomeGoals"] * math.exp(0.5 * (rH - rA))
    la = params["leagueAvgAwayGoals"] * math.exp(0.5 * (rA - rH))
    H = D = A = 0.0
    for x in range(11):
        for y in range(11):
            p = poisson(lh, x) * poisson(la, y)
            if x > y:
                H += p
            elif x < y:
                A += p
            else:
                D += p
    t = H + D + A
    return [H / t, D / t, A / t]


def score_probs(match):
    h, a = match["home_goals"], match["away_goals"]
    if h > a:
        return [1, 0, 0]
    if h < a:
        return [0, 0, 1]
    return [0, 1, 0]


def log_loss(prob, actual):
    return -math.log(max(prob, 1e-9))


def brier(prob, actual):
    return sum((p - a) ** 2 for p, a in zip(prob, actual))


def evaluate(rows, predict):
    ll = []
    br = []
    for m in rows:
        prob = predict(m)
        actual = score_probs(m)
        ll.append(log_loss(prob[actual.index(1)], actual))
        br.append(brier(prob, actual))
    return sum(ll) / len(ll), sum(br) / len(br)


def main():
    rows = json.loads(DATA_PATH.read_text())
    params = json.loads(PARAMS_PATH.read_text())

    fitted = [m for m in rows if m["season"] != 2026]
    test = [m for m in rows if m["season"] == 2026]
    print(f"fitted on {len(fitted)} matches, benchmark on {len(test)} matches (2026)")

    models = {
        "dixon-coles": lambda m: dc_probs(params, m["home"], m["away"]),
        "heuristic": lambda m: heuristic_probs(params, m["home"], m["away"]),
        "bookmaker": lambda m: [m["forecast"]["w"], m["forecast"]["d"], m["forecast"]["l"]],
    }

    print(f"{'model':<12} {'log-loss':>10} {'brier':>10}")
    for name, predict in models.items():
        ll, br = evaluate(test, predict)
        print(f"{name:<12} {ll:>10.4f} {br:>10.4f}")


if __name__ == "__main__":
    main()