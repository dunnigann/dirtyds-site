"""Resolve final placements from the championship and placement brackets."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'public/data/history-data.js'
h=json.loads(p.read_text().split('=',1)[1].rstrip(';\n'))
d=json.loads((root/'source/original-site-data.json').read_text())
for year,rows in h['standings'].items():
    games=sorted([g for weeks in h['matchups'][year].values() for g in weeks],key=lambda g:g['week'],reverse=True)
    podium=next(x for x in d['podium'] if x['year']==int(year))
    places={podium['gold']:1,podium['silver']:2,podium['bronze']:3}
    sources={owner:'Championship / third-place result' for owner in places}
    third=next(g for g in games if podium['bronze'] in [g['a']['owner'],g['b']['owner']] and g['week']==max(x['week'] for x in games))
    fourth=next(s['owner'] for s in [third['a'],third['b']] if s['owner']!=podium['bronze'])
    places[fourth]=4;sources[fourth]='Third-place result'
    # Six qualifiers. Quarterfinal losers play the 5th-place match in the
    # penultimate week; consolation finalists play for 7th and 9th.
    qualifiers={r['owner'] for r in rows[:6]}
    remaining=list(qualifiers-set(places))
    if len(remaining)!=2:raise ValueError((year,'qualifier mismatch',remaining))
    def assign_pair(owners,start):
        game=next(g for g in games if {g['a']['owner'],g['b']['owner']}==set(owners))
        a,b=game['a'],game['b'];winner=game['winner']
        if not winner:
            winner=min(owners,key=lambda o:next(r['rank'] for r in rows if r['owner']==o))
        loser=next(o for o in owners if o!=winner)
        places[winner]=start;places[loser]=start+1
        sources[winner]=sources[loser]=f"Placement game · Week {game['week']}"
    assign_pair(remaining,5)
    final_week=max(g['week'] for g in games)
    final_pairs=[g for g in games if g['week']==final_week and not ({g['a']['owner'],g['b']['owner']}&qualifiers)]
    prior_week=final_week-1
    semi_winners={g['winner'] for g in games if g['week']==prior_week and not ({g['a']['owner'],g['b']['owner']}&qualifiers)}
    if len(final_pairs)!=2:raise ValueError((year,'consolation final mismatch'))
    for g in final_pairs:
        owners=[g['a']['owner'],g['b']['owner']]
        start=7 if set(owners)<=semi_winners else 9
        assign_pair(owners,start)
    remaining=[r['owner'] for r in rows if r['owner'] not in places]
    assign_pair(remaining,11)
    assert sorted(places.values())==list(range(1,13)),(year,places)
    assert places[next(x['owner'] for x in d['wallOfShame'] if x['year']==int(year))]==12,(year,places)
    for r in rows:r['finalPlace']=places[r['owner']];r['finalPlaceSource']=sources[r['owner']]
    print(year,', '.join(f'{o}: {n}' for o,n in sorted(places.items(),key=lambda x:x[1])))
p.write_text('window.DIRTY_DS_HISTORY='+json.dumps(h,separators=(',',':'),ensure_ascii=False)+';\n')
