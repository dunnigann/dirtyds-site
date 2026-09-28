"""Build a browser-ready archive from the supplied workbook and original site data.

The workbook is read-only. It has no opponent pairings or player-week lineups.
"""

from __future__ import annotations

import collections
import json
import re
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source" / "original-site-data.json"
BOOK = ROOT / "source" / "DirtyDs_Master_History_2018_2025_Website_Ready.xlsx"
OUTPUT = ROOT / "public" / "data" / "history-data.js"
D = json.loads(SOURCE.read_text())
W = openpyxl.load_workbook(BOOK, read_only=True, data_only=True)


def source_rows(sheet):
    return [r for r in W[sheet].values if r and isinstance(r[0], int)]


def norm(value):
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def rounded(value):
    return round(float(value or 0), 2)


owner_by_alias = {}
for owner, profile in D["owners"].items():
    for alias in profile["aliases"]:
        owner_by_alias[norm(alias)] = owner
owner_by_alias[norm("Watch List")] = "Brent"


def owner_of(team):
    return owner_by_alias.get(norm(team))


league = []
for r in W["League & Teams"].values:
    if r and isinstance(r[0], int) and len(r) > 7 and isinstance(r[1], int) and isinstance(r[2], int):
        league.append(dict(year=r[0], leagueId=r[1], teams=r[2], regularWeeks=r[3],
                           regularGames=r[4], playoffGames=r[5], allGames=r[6], playerWeeks=r[7]))

standings = collections.defaultdict(list)
for r in source_rows("League & Teams"):
    if len(r) < 12 or not isinstance(r[2], str):
        continue
    owner = owner_of(r[2])
    if not owner:
        raise ValueError(f"Unmapped team: {r[0]} {r[2]}")
    standings[str(r[0])].append(dict(year=r[0], teamId=r[1], team=r[2], owner=owner,
                                  w=r[3], l=r[4], t=r[5], pf=rounded(r[6]),
                                  pa=rounded(r[7]), pct=rounded(r[8]),
                                  starter=rounded(r[9]), bench=rounded(r[10]),
                                  projection=rounded(r[11])))
for year, teams in standings.items():
    teams.sort(key=lambda t: (-t["w"], -t["pf"]))
    for i, team in enumerate(teams, 1):
        team["rank"] = i

weekly = collections.defaultdict(lambda: collections.defaultdict(list))
for r in source_rows("Weekly & Lineups"):
    if len(r) < 7 or not isinstance(r[3], str):
        continue
    weekly[str(r[0])][str(r[1])].append(dict(year=r[0], week=r[1], teamId=r[2],
        team=r[3], owner=owner_of(r[3]), score=rounded(r[4]), bench=rounded(r[5]),
        projection=rounded(r[6])))
for year in weekly:
    for week in weekly[year]:
        weekly[year][week].sort(key=lambda r: -r["score"])

matchups = collections.defaultdict(lambda: collections.defaultdict(list))
for r in source_rows("Weekly & Lineups"):
    if len(r) < 13 or not isinstance(r[3], int) or not isinstance(r[4], str):
        continue
    if not owner_of(r[4]) or not owner_of(r[7]):
        raise ValueError(f"Unmapped matchup team: {r[0]} {r[4]} vs {r[7]}")
    matchups[str(r[0])][str(r[1])].append(dict(year=r[0], week=r[1], playoff=bool(r[2]),
        a=dict(teamId=r[3], team=r[4], owner=owner_of(r[4]), score=rounded(r[5])),
        b=dict(teamId=r[6], team=r[7], owner=owner_of(r[7]), score=rounded(r[8])),
        winner=owner_of(r[10]) if isinstance(r[10], str) else None,
        tie=bool(r[11]), url=r[12]))
for year in matchups:
    for week in matchups[year]:
        matchups[year][week].sort(key=lambda m: -(m["a"]["score"] + m["b"]["score"]))

# The original site supplies three Week 17 placement results absent from the workbook.
# Do not fabricate the other possible Week 17 matchups or player lineup statistics.
for game in D["season2025"]["playoffs"]:
    if game["round"] not in ("Championship", "3rd Place", "5th Place"):
        continue
    winner, loser = game["winner"], game["loser"]
    high, low = map(lambda x: float(x.strip()), re.split(r"[–-]", game["score"]))
    a_team = next(x["team"] for x in D["season2025"]["teams"] if x["owner"] == winner)
    b_team = next(x["team"] for x in D["season2025"]["teams"] if x["owner"] == loser)
    matchups["2025"]["17"].append(dict(year=2025, week=17, playoff=True, round=game["round"],
        a=dict(teamId=None, team=a_team, owner=winner, score=high),
        b=dict(teamId=None, team=b_team, owner=loser, score=low),
        winner=winner, tie=False, url=None, source="Original site"))
    for owner, team, score in ((winner, a_team, high), (loser, b_team, low)):
        weekly["2025"]["17"].append(dict(year=2025, week=17, teamId=None,
            team=team, owner=owner, score=score, bench=None, projection=None, source="Original site"))
matchups["2025"]["17"].sort(key=lambda m: -(m["a"]["score"]+m["b"]["score"]))
weekly["2025"]["17"].sort(key=lambda r: -r["score"])

player_base = {norm(p["name"]): p for p in D["players"]}
player_rows = collections.defaultdict(list)
for r in source_rows("Players"):
    if len(r) < 13 or not isinstance(r[3], str):
        continue
    key = norm(r[3])
    player_rows[key].append(dict(year=r[0], team=r[1], owner=owner_of(r[1]),
        player=r[3], yahooId=r[4], slot=r[5], starts=r[6] or 0, benchApps=r[7] or 0,
        points=rounded(r[8]), benchPoints=rounded(r[9]), projection=rounded(r[10]),
        weeks=r[11] or 0, url=r[12]))

players = []
for key in sorted(set(player_base) | set(player_rows)):
    original = player_base.get(key, {})
    rows = sorted(player_rows[key], key=lambda x: (-x["year"], -x["points"]))
    slots = collections.Counter(x["slot"] for x in rows if x["slot"] in ("QB", "RB", "WR", "TE", "K", "DEF"))
    position = original.get("position") or (slots.most_common(1)[0][0] if slots else "FLEX")
    drafts = [e for e in original.get("events", []) if e["type"] in ("Draft", "Keeper")]
    players.append(dict(key=key, name=original.get("name") or rows[0]["player"],
        id=original.get("id"), position=position, nflTeam=original.get("nflTeam"),
        owners=original.get("owners", []) or sorted({r["owner"] for r in rows if r["owner"]}),
        events=original.get("events", []), fullSeasonPoints=original.get("fantasyPoints", {}),
        seasons=rows, starts=sum(x["starts"] for x in rows),
        points=rounded(sum(x["points"] for x in rows)),
        drafted=len(drafts), maxPrice=max((e["cost"] for e in drafts if isinstance(e.get("cost"), (int, float))), default=None)))

all_season_rows = [row for teams in standings.values() for row in teams]
all_week_rows = [row for weeks in weekly.values() for entries in weeks.values() for row in entries]
all_games = [game for weeks in matchups.values() for entries in weeks.values() for game in entries]
workbook_week_rows = [row for row in all_week_rows if row.get("source") != "Original site"]
workbook_games = [game for game in all_games if game.get("source") != "Original site"]
max_pf = max(all_season_rows, key=lambda r: r["pf"])
min_pf = min(all_season_rows, key=lambda r: r["pf"])
best = max(all_season_rows, key=lambda r: (r["pct"], r["w"], r["pf"]))
worst = min(all_season_rows, key=lambda r: (r["pct"], r["w"], r["pf"]))
high_week = max(workbook_week_rows, key=lambda r: r["score"])
biggest_margin = max(workbook_games, key=lambda m: abs(m["a"]["score"] - m["b"]["score"]))
closest = min((g for g in workbook_games if not g["tie"]), key=lambda m: abs(m["a"]["score"] - m["b"]["score"]))
highest_combined = max(workbook_games, key=lambda m: m["a"]["score"] + m["b"]["score"])

h2h = {}
for scope in ("all", "regular", "playoffs"):
    matrix = {a: {b: dict(w=0, l=0, t=0, pf=0, pa=0, gp=0) for b in D["ownerOrder"] if a != b}
              for a in D["ownerOrder"]}
    for game in all_games:
        if scope == "regular" and game["playoff"] or scope == "playoffs" and not game["playoff"]:
            continue
        for side, other in ((game["a"], game["b"]), (game["b"], game["a"])):
            s = matrix[side["owner"]][other["owner"]]
            s["gp"] += 1
            s["pf"] = rounded(s["pf"] + side["score"])
            s["pa"] = rounded(s["pa"] + other["score"])
            if game["tie"] or side["score"] == other["score"]:
                s["t"] += 1
            elif side["score"] > other["score"]:
                s["w"] += 1
            else:
                s["l"] += 1
    h2h[scope] = matrix

auctions = [r for r in D["draftHistory"] if not r.get("keeper") and isinstance(r.get("cost"), (int, float))]
keepers = [r for r in D["draftHistory"] if r.get("keeper") and isinstance(r.get("cost"), (int, float))]
averages = {}
keeper_spend = {}
for owner in D["ownerOrder"]:
    bids = [r["cost"] for r in auctions if r["owner"] == owner]
    averages[owner] = dict(average=rounded(sum(bids) / len(bids)) if bids else 0, count=len(bids))
    keeper_spend[owner] = sum(r["cost"] for r in keepers if r["owner"] == owner)

auction_records = dict(
    highest=sorted(auctions, key=lambda r: (-r["cost"], r["year"]))[:10],
    averageBids=averages,
    keeperSpend=keeper_spend,
    byPosition={p: sorted((r for r in auctions if r["position"] == p),
                          key=lambda r: -r["cost"])[:3] for p in ["QB", "RB", "WR", "TE", "K", "DEF"]},
)
records = [dict(title="Most Points · Regular Season", value=max_pf["pf"], year=max_pf["year"],
                owner=max_pf["owner"], team=max_pf["team"]),
           dict(title="Fewest Points · Regular Season", value=min_pf["pf"], year=min_pf["year"],
                owner=min_pf["owner"], team=min_pf["team"]),
           dict(title="Best Regular Season", value=f'{best["w"]}-{best["l"]}', year=best["year"],
                owner=best["owner"], team=best["team"]),
           dict(title="Worst Regular Season", value=f'{worst["w"]}-{worst["l"]}', year=worst["year"],
                owner=worst["owner"], team=worst["team"]),
           dict(title="Highest Score · Workbook Weeks", value=high_week["score"], year=high_week["year"],
                owner=high_week["owner"], team=high_week["team"], detail=f'Week {high_week["week"]}'),
           dict(title="Highest Score · All Games", value=217.54, year=2025,
                owner="Tyler", team="YINZer 4 LIFE", detail="Championship · original site"),
           dict(title="Biggest Margin · Workbook", value=rounded(abs(biggest_margin["a"]["score"] - biggest_margin["b"]["score"])),
                year=biggest_margin["year"], owner=biggest_margin["winner"], detail=f'Week {biggest_margin["week"]}'),
           dict(title="Closest Game · Workbook", value=rounded(abs(closest["a"]["score"] - closest["b"]["score"])),
                year=closest["year"], owner=f'{closest["a"]["owner"]} vs {closest["b"]["owner"]}', detail=f'Week {closest["week"]}'),
           dict(title="Highest Combined · Workbook", value=rounded(highest_combined["a"]["score"] + highest_combined["b"]["score"]),
                year=highest_combined["year"], owner=f'{highest_combined["a"]["owner"]} vs {highest_combined["b"]["owner"]}', detail=f'Week {highest_combined["week"]}')]

history = dict(meta=dict(through="2025 Week 16 + 3 Week 17 placement games", seasons=8,
                         workbookGames=sum(x["allGames"] for x in league), games=len(all_games),
                         playerWeeks=sum(x["playerWeeks"] for x in league),
                         weeklyRows=len(all_week_rows), playerSeasonRows=sum(map(len, player_rows.values())),
                         weeklyOpponentsAvailable=True, playerWeekLineupsAvailable=False),
               league=league, standings=standings, weekly=weekly, matchups=matchups, h2h=h2h, players=players,
               records=records, auction=auction_records)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text("window.DIRTY_DS_HISTORY=" + json.dumps(history, separators=(",", ":"), ensure_ascii=False) + ";\n")
print(f"Generated {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
print(f"{len(players)} players, {len(all_games)} matchups, {len(all_week_rows)} team-weeks, {len(all_season_rows)} team-seasons")
print("Record checks:", records)
