"""Create stable player portrait IDs from a locally downloaded Sleeper player directory."""
import collections,json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
H=json.loads((ROOT/'public/data/history-data.js').read_text().split('=',1)[1].rstrip(' ;\n'))
players=json.load(open(sys.argv[1]))
def norm(s):return re.sub('[^a-z0-9]','',re.sub(r'\b(jr|sr|ii|iii|iv)\b','',s.lower().replace('.','')))
byname=collections.defaultdict(list);byyahoo=collections.defaultdict(list)
for id,p in players.items():
 if not p:continue
 byname[norm(p.get('full_name') or '')].append((id,p))
 if p.get('yahoo_id'):byyahoo[str(p['yahoo_id'])].append((id,p))
out={};missing=[]
aliases={'Bam Knight':'Zonovan Knight','D. Thompson-Robinson':'Dorian Thompson-Robinson'}
for p in H['players']:
 if p['position']=='DEF':continue
 yahoo={str(s['yahooId']) for s in p['seasons'] if s.get('yahooId')}
 candidates=[c for y in yahoo for c in byyahoo[y]] or byname[norm(aliases.get(p['name'],p['name']))]
 if not candidates:
  missing.append(p['name']);continue
 chosen=next((c for c in candidates if c[1].get('position')==p['position']),candidates[0])
 out[p['key']]=f'https://sleepercdn.com/content/nfl/players/thumb/{chosen[0]}.jpg'
path=ROOT/'public/data/photo-data.js'
path.write_text('window.DIRTY_DS_PHOTOS='+json.dumps(out,separators=(',',':'))+';\n')
print('Photos',len(out),'missing',len(missing),missing)
