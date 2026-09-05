"""Build La Liga results dataset from Understat and fit the Dixon-Coles model.

Usage:
    python3 scripts/fit_dixon_coles.py

Fetches getLeagueData for the last 3 seasons, builds a clean results dataset,
fits Dixon-Coles via MLE, and exports fitted parameters to
lib/dixon-coles-params.json.
"""

import json
import math
import urllib.request
from pathlib import Path

import numpy as np
from scipy.optimize import minimize

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "la-liga-results.json"
PARAMS_PATH = ROOT / "lib" / "dixon-coles-params.json"

SEASONS = [2024, 2025, 2026]
BASE_URL = "https://understat.com/getLeagueData/La_liga/{season}"
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)


def fetch_raw(season: int) -> dict:
    req = urllib.request.Request(
        BASE_URL.format(season=season),
        headers={
            "User-Agent": UA,
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Accept-Encoding": "gzip",
        },
    )
    with urllib.request.urlopen(req) as res:
        body = res.read()
    if body[:2] == b"\x1f\x8b":
        import gzip

        body = gzip.decompress(body)
    return json.loads(body)


def build_dataset() -> list[dict]:
    rows = []
    for season in SEASONS:
        print(f"fetching season {season}...")
        data = fetch_raw(season)
        for m in data["dates"]:
            if m["isResult"] is not True:
                continue
            goals = m["goals"]
            rows.append(
                {
                    "season": season,
                    "id": m["id"],
                    "datetime": m["datetime"],
                    "home": m["h"]["title"],
                    "away": m["a"]["title"],
                    "home_goals": int(goals["h"]),
                    "away_goals": int(goals["a"]),
                    "home_xg": float(m["xG"]["h"]),
                    "away_xg": float(m["xG"]["a"]),
                    "forecast": {
                        "w": float(m["forecast"]["w"]),
                        "d": float(m["forecast"]["d"]),
                        "l": float(m["forecast"]["l"]),
                    },
                }
            )
    return rows


def dixon_coles_nll(params, rows, team_ids, n_teams, penalty=10.0):
    """Negative log-likelihood for the Dixon-Coles bivariate Poisson model."""
    home_adv = params[0]
    rho = params[1]
    att = params[2 : 2 + n_teams]
    deff = params[2 + n_teams : 2 + 2 * n_teams]

    nll = 0.0
    for row in rows:
        i, j = team_ids[row["home"]], team_ids[row["away"]]
        x, y = row["home_goals"], row["away_goals"]
        lam_h = math.exp(att[i] - deff[j] + home_adv)
        lam_a = math.exp(att[j] - deff[i])

        log_p = (
            -lam_h
            + x * math.log(lam_h)
            - lam_a
            + y * math.log(lam_a)
            - math.lgamma(x + 1)
            - math.lgamma(y + 1)
        )
        # tau correction for low-scoring outcomes
        if x == 0 and y == 0:
            tau = 1 - lam_h * lam_a * rho
        elif x == 0 and y == 1:
            tau = 1 + lam_h * rho
        elif x == 1 and y == 0:
            tau = 1 + lam_a * rho
        elif x == 1 and y == 1:
            tau = 1 - rho
        else:
            tau = 1.0
        if tau <= 0:
            tau = 1e-9
        nll += -math.log(max(tau, 1e-12)) - log_p

    # identification: anchor attack/defense sums near zero
    penalty_att = penalty * sum(att) ** 2
    penalty_def = penalty * sum(deff) ** 2
    return nll + penalty_att + penalty_def


def fit(rows, team_ids):
    n_teams = len(team_ids)

    home_goals = {}
    away_goals = {}
    gp = {}
    for row in rows:
        for team, key in ((row["home"], "home"), (row["away"], "away")):
            gp.setdefault(team, [0, 0])
        gp[row["home"]][0] += 1
        gp[row["away"]][1] += 1
        home_goals[row["home"]] = home_goals.get(row["home"], 0) + row["home_goals"]
        away_goals[row["away"]] = away_goals.get(row["away"], 0) + row["away_goals"]

    league_home_avg = sum(home_goals.values()) / sum(g[0] for g in gp.values())
    league_away_avg = sum(away_goals.values()) / sum(g[1] for g in gp.values())

    att = []
    deff = []
    for team, idx in sorted(team_ids.items(), key=lambda kv: kv[1]):
        hg = home_goals.get(team, 0)
        ag = away_goals.get(team, 0)
        gp_h, gp_a = gp[team]
        att.append(math.log((hg / gp_h + 0.5) / league_home_avg) if gp_h else 0.0)
        deff.append(math.log((ag / gp_a + 0.5) / league_away_avg) if gp_a else 0.0)

    x0 = [math.log(league_home_avg / league_away_avg), 0.0] + att + deff

    def obj(p):
        return dixon_coles_nll(p, rows, team_ids, n_teams)

    bounds = [(None, None), (-0.5, 0.5)] + [(None, None)] * (2 * n_teams)
    best = None
    for scale in (1.0, 0.5):
        x0s = [x0[0], x0[1]] + [v * scale for v in x0[2:]]
        res = minimize(obj, x0s, method="L-BFGS-B", bounds=bounds, options={"maxiter": 2000})
        if best is None or res.fun < best.fun:
            best = res

    return best.x, league_home_avg, league_away_avg, n_teams


def main():
    rows = build_dataset()
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(rows, indent=1))

    teams = sorted({r["home"] for r in rows} | {r["away"] for r in rows})
    team_ids = {t: i for i, t in enumerate(teams)}

    print(f"dataset: {len(rows)} matches, {len(teams)} teams across {SEASONS}")
    params, league_home_avg, league_away_avg, n_teams = fit(rows, team_ids)

    home_adv = float(params[0])
    rho = float(params[1])
    att = params[2 : 2 + n_teams]
    deff = params[2 + n_teams :]

    out = {
        "model": "dixon-coles",
        "homeAdvantage": home_adv,
        "rho": rho,
        "leagueAvgHomeGoals": league_home_avg,
        "leagueAvgAwayGoals": league_away_avg,
        "seasons": SEASONS,
        "teams": {
            name: {"attack": float(att[idx]), "defense": float(deff[idx])}
            for name, idx in team_ids.items()
        },
    }
    PARAMS_PATH.write_text(json.dumps(out, indent=2))
    print(f"fitted and wrote {PARAMS_PATH}")

    # sanity: top attack / best defense
    by_att = sorted(out["teams"].items(), key=lambda kv: -kv[1]["attack"])[:5]
    print("top attack:", [(t, round(v["attack"], 3)) for t, v in by_att])
    by_def = sorted(out["teams"].items(), key=lambda kv: kv[1]["defense"])[:5]
    print("best defense:", [(t, round(v["defense"], 3)) for t, v in by_def])
    print(f"home advantage: {home_adv:.3f}  rho: {rho:.3f}")


if __name__ == "__main__":
    main()