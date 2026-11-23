/* Reconcile every recorded Yahoo start and bench appearance with the weekly lineups. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f));
const ctx={window:{}};
vm.createContext(ctx);
for(const key of ['history','lineup'])vm.runInContext(read('public/data/'+key+'-data.js').toString(),ctx);
const H=ctx.window.DIRTY_DS_HISTORY,L=ctx.window.DIRTY_DS_LINEUPS;
const {rosters}=JSON.parse(zlib.gunzipSync(read('source/weekly-player-rows.json.gz')));
const key=(...pieces)=>JSON.stringify(pieces),nameKey=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
const cents=points=>Math.round(points*100);
const owners=new Map(Object.entries(H.standings).flatMap(([y,teams])=>teams.map(t=>[key(Number(y),t.teamId),t.owner])));
const weekly=new Map(Object.entries(H.weekly).flatMap(([y,weeks])=>Object.entries(weeks).flatMap(([w,entries])=>entries.map(t=>[key(Number(y),Number(w),t.teamId),t.owner]))));
const positions=new Map(H.players.map(p=>[p.key,p.position]));
const expected=new Map(),managerLedger=new Map(),startsFor=new Map(),uniqueStarts=new Set();
let starterCount=0,benchCount=0;
for(const {year,week,teamId,players} of rosters){
 const owner=owners.get(key(year,teamId));
 assert.ok(owner,`Missing manager: ${year} Week ${week}, team ${teamId}`);
 assert.equal(weekly.get(key(year,week,teamId)),owner,`Owner for ${year} Week ${week}, team ${teamId}`);
 for(const p of players){
  if(p.status!=='starter'&&p.status!=='bench')continue;
  const name=nameKey(p.player),group=key(name,year,owner),record=expected.get(group)||[0,0,0,0];
  assert.ok(positions.has(name),`Missing player profile: ${p.player}`);
  if(p.status==='starter'){
   starterCount++;record[0]++;record[2]+=cents(p.points);
   const startKey=key(name,year,week);
   assert.ok(!uniqueStarts.has(startKey),`Duplicate start: ${p.player}, ${year} Week ${week}`);uniqueStarts.add(startKey);
   const season=key(name,year),managers=startsFor.get(season)||new Set();
   managers.add(owner);startsFor.set(season,managers);
   if(!['K','DEF'].includes(positions.get(name))){
    const k=key(owner,p.player),counts=managerLedger.get(k)||[0,0];
    counts[0]++;counts[1]+=cents(p.points);managerLedger.set(k,counts);
   }
  }else{benchCount++;record[1]++;record[3]+=cents(p.points);}
  expected.set(group,record);
 }
}
const actual=new Map();
for(const p of H.players){
 let starts=0,points=0;
 for(const s of p.seasons){
  const k=key(p.key,s.year,s.owner),record=actual.get(k)||[0,0,0,0];
  const line=[s.starts,s.benchApps,cents(s.points),cents(s.benchPoints)];
  for(let i=0;i<line.length;i++)record[i]+=line[i];
  actual.set(k,record);starts+=line[0];points+=line[2];
 }
 assert.equal(p.starts,starts,`Career starts: ${p.name}`);
 assert.equal(cents(p.points),points,`Career starter points: ${p.name}`);
}
for(const k of new Set([...actual.keys(),...expected.keys()]))assert.deepEqual(actual.get(k)||[0,0,0,0],expected.get(k)||[0,0,0,0],`Player, season, manager: ${k}`);
const managerActual=new Map(Object.entries(L.managerLeaders).flatMap(([owner,players])=>players.map(p=>[key(owner,p.name),[p.starts,cents(p.points)]])));
assert.deepEqual(managerActual,managerLedger);
console.log(`PASS: Yahoo 2018–2025: ${H.players.length} player profiles, ${rosters.length} weekly lineups, ${starterCount} starts, ${benchCount} bench appearances, ${[...startsFor.values()].filter(x=>x.size>1).length} player-seasons with starts for multiple managers; all matched.`);
