"""Rebuild verified historical season awards from Yahoo player-week exports.

Usage: python scripts/build_awards.py /path/to/dirtyd*.txt
Writes a compact normalized source archive and a browser-ready season summary.
"""
import collections
import gzip
import json
import re
import sys
from datetime import date
from pathlib import Path

from scipy.optimize import linear_sum_assignment

ROOT = Path(__file__).resolve().parent.parent
D = json.loads((ROOT/'source/original-site-data.json').read_text())
H = json.loads((ROOT/'public/data/history-data.js').read_text().split('=',1)[1].rstrip(' ;\n'))

def norm(v): return re.sub('[^a-z0-9]','',str(v).lower())

profiles = {norm(p['name']):p for p in H['players']}
scoring=json.loads((ROOT/'source/original-scoring-data.js').read_text().split('=',1)[1].rstrip(' ;\n'))
scoring_pos={(int(year),norm(p['name'])):p['pos'] for year,players in scoring.items() for p in players}
team_owner = {(int(year),int(row['teamId'])):row['owner'] for year,rows in H['standings'].items() for row in rows}
rows_by_key=collections.defaultdict(list)
games={}
files={}
if not sys.argv[1:]:
    with gzip.open(ROOT/'source/weekly-player-rows.json.gz','rt',encoding='utf-8') as f:
        archived=json.load(f)
    for r in archived['rosters']:
        key=(int(r['year']),int(r['week']),int(r['teamId']))
        rows_by_key[key]=r['players']
    for g in archived['games']:
        key=(int(g['year']),int(g['week']),min(g['a'],g['b']),max(g['a'],g['b']))
        games[key]=g
    files={int(y):list(names) for y,names in json.loads((ROOT/'public/data/award-data.js').read_text().split('=',1)[1].rstrip(' ;\n'))['meta']['files'].items()}
    files.setdefault(2025,[])
    if 'week17-2025.txt' not in files[2025]:files[2025].append('week17-2025.txt')
else:
    for path in map(Path,sys.argv[1:]):
        data=json.loads(path.read_text())
        year=int(data.get('season') or next(iter(data['seasons'])))
        files.setdefault(year,[]).append(path.name)
        for r in data['weekly_rosters']:
            key=(year,int(r['week']),int(r['team_id']))
            rows_by_key[key].append(dict(player=r['player'],slot=r['roster_slot'],status=r['roster_status'],points=float(r['fantasy_points'] or 0),projection=r.get('projection')))
        for m in data['weekly_matchups']:
            key=(year,int(m['week']),min(m['team1_id'],m['team2_id']),max(m['team1_id'],m['team2_id']))
            games[key]=dict(year=year,week=m['week'],a=m['team1_id'],b=m['team2_id'],scoreA=m['team1_score'],scoreB=m['team2_score'],playoff=bool(m.get('playoff_week')))

slots2018=['QB','QB','RB','RB','WR','WR','TE','FLEX','K','DEF']
slotsLater=['QB','SF','RB','RB','WR','WR','TE','FLEX','K','DEF']

def position(player):
    p=profiles.get(norm(player))
    if p is None: raise ValueError(f'Unknown player: {player}')
    return p['position']

rigid_positions=collections.defaultdict(set)
rigid_global=collections.defaultdict(set)
for (year,week,team_id),roster in rows_by_key.items():
    for r in roster:
        if r['status']=='starter' and r['slot'] in ('QB','RB','WR','TE','K','DEF'):
            rigid_positions[(year,norm(r['player']))].add(r['slot'])
            rigid_global[norm(r['player'])].add(r['slot'])

def possible_positions(year,player):
    key=(year,norm(player))
    observed=rigid_positions[key]
    recorded=scoring_pos.get(key)
    fallback=position(player)
    return observed | ({recorded} if recorded in ('QB','RB','WR','TE','K','DEF') else set()) | (rigid_global[norm(player)] if not observed and not recorded else set()) | ({fallback} if not observed and not recorded and fallback!='FLEX' else set())

def eligible(positions,slot):
    if slot=='FLEX':return bool(positions & {'RB','WR','TE'})
    if slot=='SF':return bool(positions & {'QB','RB','WR','TE'})
    return slot in positions

def optimal(year, roster):
    available=[r for r in roster if r['status'] in ('starter','bench')]
    slots=slots2018 if year==2018 else slotsLater
    n=len(available);cost=[[10000.]*(n+len(slots)) for _ in slots]
    for i,slot in enumerate(slots):
        for j,r in enumerate(available):
            if eligible(possible_positions(year,r['player']),slot):cost[i][j]=-r['points']
        cost[i][n+i]=0.
    a,b=linear_sum_assignment(cost)
    return round(-sum(cost[i][j] for i,j in zip(a,b)),2)

summary=collections.defaultdict(dict)
week_stats={}
for key,roster in rows_by_key.items():
    year,week,team_id=key
    owner=team_owner[(year,team_id)]
    actual=round(sum(r['points'] for r in roster if r['status']=='starter'),2)
    best=optimal(year,roster)
    if best+.02<actual: raise ValueError(f'Optimal below actual {key}: {best} < {actual}')
    week_stats[key]=dict(owner=owner,actual=actual,optimal=best,unused=round(max(0,best-actual),2))
    s=summary[year].setdefault(owner,dict(owner=owner,year=year,starts=0,starterPoints=0.,effSum=0.,effWeeks=0,unused=0.,opponentUnused=0.,positions=collections.defaultdict(float),ownDraft=0.,otherDraft=0.,storage=0.,cheapPoints=0.))
    s['starts']+=1;s['starterPoints']+=actual;s['unused']+=max(0,best-actual)
    if best>0:s['effSum']+=actual/best;s['effWeeks']+=1
    draft={norm(x['player']):x for x in D['draftHistory'] if x['year']==year}
    for r in roster:
        if r['status']!='starter':continue
        points=r['points'];p=scoring_pos.get((year,norm(r['player']))) or position(r['player']);s['positions'][p]+=points
        d=draft.get(norm(r['player']))
        if d and d['owner']==owner:s['ownDraft']+=points
        else:s['otherDraft']+=points
        s['storage']+=points/max(1,float(d['cost'] or 1)) if d else points

for g in games.values():
    year,week=g['year'],g['week']
    a=week_stats[(year,week,g['a'])];b=week_stats[(year,week,g['b'])]
    if abs(a['actual']-g['scoreA'])>.11 or abs(b['actual']-g['scoreB'])>.11:raise ValueError(f'Team score mismatch {year} Week {week}')
    summary[year][a['owner']]['opponentUnused']+=b['unused']
    summary[year][b['owner']]['opponentUnused']+=a['unused']

# The first Thursday NFL game gives the start of each fantasy week.
season_open={2018:date(2018,9,6),2019:date(2019,9,5),2020:date(2020,9,10),2021:date(2021,9,9),2022:date(2022,9,8),2023:date(2023,9,7),2024:date(2024,9,5),2025:date(2025,9,4)}
events=collections.defaultdict(list)
for p in D['players']:
    for ev in p.get('events',[]):events[(ev['year'],ev['owner'])].append({**ev,'player':p['name']})
for year,owners in summary.items():
    draft_by_owner=collections.Counter()
    for d in D['draftHistory']:
        if d['year']==year and d.get('cost') is not None:draft_by_owner[d['owner']]+=float(d['cost'])
    for owner,s in owners.items():
        ev=events[(year,owner)]
        additions=[x for x in ev if x['type']=='Add']
        trades={tuple([x['date'],*sorted([owner,x.get('fromOwner','')])]) for x in ev if x['type']=='Trade'}
        s['transactions']=len(additions)+len(trades)
        paid=[x for x in additions if x.get('method')=='Waiver' and isinstance(x.get('cost'),(int,float)) and x['cost']>0]
        s['faabKnown']=year>=2020
        s['faab']=sum(x['cost'] for x in paid)
        s['auction']=draft_by_owner[owner]
        s['spend']=s['auction']+s['faab'] if s['faabKnown'] else None
        for claim in paid:
            start=max(1,((date.fromisoformat(claim['date'])-season_open[year]).days//7)+1)
            for (ry,w,tid),roster in rows_by_key.items():
                if ry!=year or w<start or team_owner[(ry,tid)]!=owner:continue
                if any(r['status']=='starter' and norm(r['player'])==norm(claim['player']) for r in roster):
                    s['cheapPoints']+=sum(r['points'] for r in roster if r['status']=='starter' and norm(r['player'])==norm(claim['player']))
        # A player won more than once can only count a week's points once.
        if paid:
            paid_weeks=set()
            for claim in paid:
                start=max(1,((date.fromisoformat(claim['date'])-season_open[year]).days//7)+1)
                paid_weeks.update((w,norm(claim['player'])) for (ry,w,tid),roster in rows_by_key.items() if ry==year and w>=start and team_owner[(ry,tid)]==owner and any(r['status']=='starter' and norm(r['player'])==norm(claim['player']) for r in roster))
            s['cheapPoints']=sum(r['points'] for (ry,w,tid),roster in rows_by_key.items() if ry==year and team_owner[(ry,tid)]==owner for r in roster if r['status']=='starter' and (w,norm(r['player'])) in paid_weeks)
        s['cheapRatio']=s['cheapPoints']/s['faab'] if s['faab'] else None
        s['pointsPerDollar']=s['starterPoints']/s['spend'] if s['spend'] else None
        s['efficiency']=100*s['effSum']/s['effWeeks'] if s['effWeeks'] else None
        for k in ['starterPoints','unused','opponentUnused','ownDraft','otherDraft','storage','cheapPoints','spend','auction','efficiency','cheapRatio','pointsPerDollar']:
            if s[k] is not None:s[k]=round(s[k],2)
        s['positions']={k:round(v,2) for k,v in s['positions'].items()}
        del s['effSum'];del s['effWeeks']

out=dict(seasons={str(y):list(owners.values()) for y,owners in sorted(summary.items())},meta=dict(files=files,teamWeeks=len(rows_by_key),matchups=len(games),playerWeeks=sum(len(v) for v in rows_by_key.values()),coverage={'2025':'Eight Week 17 lineups verified from Yahoo screenshots; Nick and Ben 5th-place lineups were not supplied','2018-2019':'FAAB bid amounts were not recorded'},incompleteOwners={'2025':['Nick','Ben']},method='Weekly legal lineup optimization over active starters and bench; 2018 uses two QB slots, 2019 onward QB plus superflex.'))
source=ROOT/'source/weekly-player-rows.json.gz'
with gzip.open(source,'wt',encoding='utf-8') as f:json.dump(dict(rosters=[dict(year=y,week=w,teamId=t,players=rs) for (y,w,t),rs in sorted(rows_by_key.items())],games=list(games.values())),f,separators=(',',':'))
output=ROOT/'public/data/award-data.js'
output.write_text('window.DIRTY_DS_AWARDS='+json.dumps(out,separators=(',',':'))+';\n')
print(f'{len(rows_by_key)} team-weeks, {len(games)} games, {sum(len(v) for v in rows_by_key.values())} player-weeks')
print('Output',output.stat().st_size,'source gzip',source.stat().st_size)
