"""Merge the eight pictured 2025 Week 17 Yahoo rosters into the archive.

Run once after refreshing history-data.js from the workbook. Reruns are safe.
The screenshots do not include Nick and Ben's 5th-place player lineups.
"""
import collections
import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'source/weekly-player-rows.json.gz'
HISTORY = ROOT / 'public/data/history-data.js'
STANDINGS = json.loads(HISTORY.read_text().split('=', 1)[1].rstrip(' ;\n'))['standings']

def norm(value):
    return re.sub('[^a-z0-9]', '', str(value).lower())

rosters = []
current = None
for raw in (ROOT / 'source/week17-2025.txt').read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith('#'):
        continue
    name, slot, points, projection = line.split('|')
    if name.isdigit():
        current = {'year': 2025, 'week': 17, 'teamId': int(name), 'owner': slot,
                   'team': points, 'expected': float(projection), 'players': []}
        assert any(r['teamId'] == current['teamId'] and r['owner'] == slot for r in STANDINGS['2025'])
        rosters.append(current)
    else:
        assert current is not None
        current['players'].append({'player': name, 'slot': slot,
                                   'status': 'bench' if slot == 'BN' else 'ir' if slot == 'IR' else 'starter',
                                   'points': float(points), 'projection': float(projection)})

assert len(rosters) == 8
for r in rosters:
    starters = [p for p in r['players'] if p['status'] == 'starter']
    assert len(starters) == 10 and abs(sum(p['points'] for p in starters) - r['expected']) < .01, r['team']

with gzip.open(SOURCE, 'rt', encoding='utf-8') as f:
    data = json.load(f)
data['rosters'] = [r for r in data['rosters'] if (r['year'], r['week'], r['teamId']) not in
                   {(x['year'], x['week'], x['teamId']) for x in rosters}]
data['rosters'] += [{k: v for k, v in r.items() if k in ('year', 'week', 'teamId', 'players')} for r in rosters]
data['rosters'].sort(key=lambda r: (r['year'], r['week'], r['teamId']))
pairs = [(1, 12), (3, 8), (5, 11), (7, 9)]
for a, b in pairs:
    left = next(r for r in rosters if r['teamId'] == a)
    right = next(r for r in rosters if r['teamId'] == b)
    data['games'] = [g for g in data['games'] if (g['year'], g['week'], min(g['a'], g['b']), max(g['a'], g['b'])) != (2025, 17, a, b)]
    data['games'].append({'year': 2025, 'week': 17, 'a': a, 'b': b,
                          'scoreA': left['expected'], 'scoreB': right['expected'], 'playoff': True})
with gzip.open(SOURCE, 'wt', encoding='utf-8') as f:
    json.dump(data, f, separators=(',', ':'))

text = HISTORY.read_text()
history = json.loads(text.split('=', 1)[1].rstrip(' ;\n'))
if not history['meta'].get('week17ScreenshotsApplied'):
    profiles = {norm(p['name']): p for p in history['players']}
    for r in rosters:
        for row in r['players']:
            if row['status'] == 'ir':
                continue
            player = profiles.get(norm(row['player']))
            if player is None:
                raise ValueError(f"Player missing from history: {row['player']}")
            season = next((s for s in player['seasons'] if s['year'] == 2025 and s['owner'] == r['owner']), None)
            if season is None:
                season = {'year': 2025, 'team': r['team'], 'owner': r['owner'], 'player': player['name'],
                          'yahooId': None, 'slot': row['slot'], 'starts': 0, 'benchApps': 0,
                          'points': 0, 'benchPoints': 0, 'projection': 0, 'weeks': 0, 'url': None}
                player['seasons'].append(season)
            starter = row['status'] == 'starter'
            season['starts' if starter else 'benchApps'] += 1
            season['points' if starter else 'benchPoints'] = round(
                season['points' if starter else 'benchPoints'] + row['points'], 2)
            season['projection'] = round(season['projection'] + row['projection'], 2)
            season['weeks'] += 1
            if starter:
                player['starts'] += 1
                player['points'] = round(player['points'] + row['points'], 2)
            if r['owner'] not in player['owners']:
                player['owners'].append(r['owner'])
    weekly = history['weekly']['2025']['17']
    weekly[:] = [r for r in weekly if r['owner'] not in {x['owner'] for x in rosters}]
    for r in rosters:
        weekly.append({'year': 2025, 'week': 17, 'teamId': r['teamId'], 'team': r['team'],
                       'owner': r['owner'], 'score': r['expected'],
                       'bench': round(sum(x['points'] for x in r['players'] if x['status'] == 'bench'), 2),
                       'projection': round(sum(x['projection'] for x in r['players'] if x['status'] == 'starter'), 2),
                       'source': 'Yahoo Week 17 screenshots'})
    matchups = history['matchups']['2025']['17']
    for a, b in pairs:
        left = next(r for r in rosters if r['teamId'] == a)
        right = next(r for r in rosters if r['teamId'] == b)
        existing = next((g for g in matchups if {g['a']['owner'], g['b']['owner']} == {left['owner'], right['owner']}), None)
        if existing is None:
            existing = {'year': 2025, 'week': 17, 'playoff': True, 'round': 'Placement',
                        'winner': left['owner'] if left['expected'] > right['expected'] else right['owner'],
                        'tie': False, 'url': None, 'source': 'Yahoo Week 17 screenshots'}
            matchups.append(existing)
            for scope in ('all', 'playoffs'):
                matrix = history['h2h'][scope]
                for own, opp, pf, pa in ((left['owner'], right['owner'], left['expected'], right['expected']),
                                         (right['owner'], left['owner'], right['expected'], left['expected'])):
                    cell = matrix[own][opp]
                    cell['gp'] += 1
                    cell['pf'] = round(cell['pf'] + pf, 2)
                    cell['pa'] = round(cell['pa'] + pa, 2)
                    cell['w' if pf > pa else 'l' if pf < pa else 't'] += 1
        existing['a'] = {'teamId': a, 'team': left['team'], 'owner': left['owner'], 'score': left['expected']}
        existing['b'] = {'teamId': b, 'team': right['team'], 'owner': right['owner'], 'score': right['expected']}
    history['meta']['week17ScreenshotsApplied'] = True
    history['meta']['through'] = '2025 Week 17; eight photographed lineups (Nick and Ben placement lineups absent)'
    history['meta']['games'] += 2
    history['meta']['playerWeeks'] += sum(len(r['players']) for r in rosters)
    history['meta']['weeklyRows'] += 4  # Jake, Dan, James and Fritz were not in the old Week 17 score list.
    history['meta']['playerWeekLineupsAvailable'] = True
    HISTORY.write_text('window.DIRTY_DS_HISTORY=' + json.dumps(history, separators=(',', ':')) + ';\n')

champions = json.loads((ROOT/'source/original-site-data.json').read_text())['champions']
owner_by_team = {(int(year), row['teamId']): row['owner'] for year, rows in history['standings'].items() for row in rows}
lineups = {}
for c in champions:
    year = c['year']
    season = [r for r in data['rosters'] if r['year'] == year]
    week = max(r['week'] for r in season)
    roster = next(r for r in season if r['week'] == week and owner_by_team[(year, r['teamId'])] == c['owner'])
    starters = [p for p in roster['players'] if p['status'] == 'starter']
    lineups[str(year)] = {'owner': c['owner'], 'team': c['team'], 'week': week,
                          'score': round(sum(p['points'] for p in starters), 2),
                          'starters': [{'name': p['player'], 'slot': p['slot'], 'points': p['points']} for p in starters]}

by_owner = collections.defaultdict(lambda: collections.defaultdict(lambda: {'starts': 0, 'points': 0.0}))
positions = {norm(p['name']): p['position'] for p in history['players']}
for r in data['rosters']:
    owner = owner_by_team[(r['year'], r['teamId'])]
    for p in r['players']:
        if p['status'] != 'starter' or positions.get(norm(p['player'])) in ('K', 'DEF'):
            continue
        bucket = by_owner[owner][p['player']]
        bucket['starts'] += 1
        bucket['points'] = round(bucket['points'] + p['points'], 2)
leaders = {owner: [{'name': name, **values} for name, values in sorted(players.items(),
           key=lambda item: (-item[1]['starts'], -item[1]['points'], item[0]))]
           for owner, players in by_owner.items()}
out = {'championships': lineups, 'managerLeaders': leaders,
       'coverage': {'2025': 'Eight Week 17 team lineups pictured; Nick and Ben placement lineups absent.'}}
(ROOT/'public/data/lineup-data.js').write_text('window.DIRTY_DS_LINEUPS=' + json.dumps(out, separators=(',', ':')) + ';\n')
print(f"Merged {len(rosters)} team lineups; {len(lineups)} championship lineups; {len(leaders)} manager leaderboards")
