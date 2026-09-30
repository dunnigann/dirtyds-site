// Source-to-site consistency checks for the historical archive.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.createContext(context);
for(const f of ['site-data.js','history-data.js','award-data.js','lineup-data.js'])vm.runInContext(fs.readFileSync(path.join(root,'public/data',f),'utf8'),context);
const {DIRTY_DS_DATA:D,DIRTY_DS_HISTORY:H,DIRTY_DS_AWARDS:A,DIRTY_DS_LINEUPS:L}=context.window;
const archive=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'source/weekly-player-rows.json.gz'))));
assert.equal(H.meta.workbookGames,762);
assert.equal(H.meta.games,767);
assert.equal(H.matchups['2025']['17'].length,5);
assert.equal(archive.rosters.filter(r=>r.year===2025&&r.week===17).length,8);
assert.equal(archive.games.filter(g=>g.year===2025&&g.week===17).length,4);
for(const r of archive.rosters.filter(r=>r.year===2025&&r.week===17)){
  const known=H.weekly['2025']['17'].find(w=>w.teamId===r.teamId);
  assert.ok(known,`Missing Week 17 team ${r.teamId}`);
  const sum=Math.round(r.players.filter(p=>p.status==='starter').reduce((n,p)=>n+p.points,0)*100)/100;
  assert.equal(sum,known.score,`Team ${r.teamId} starter score`);
}
assert.equal(L.championships['2025'].score,217.54);
assert.equal(L.championships['2025'].starters.length,10);
assert.equal(Object.keys(L.championships).length,8);
assert.equal(Object.keys(L.managerLeaders).length,13);
assert.equal(D.draftHistory.length,1529);
assert.equal(H.players.length,807);
assert.equal(Object.values(H.standings).flat().length,96);
assert.equal(A.meta.incompleteOwners['2025'].join(','),'Nick,Ben');
for(const f of ['public/index.html','public/404.html','public/assets/css/styles.css','public/assets/css/mobile.css','public/assets/css/dirtyds.css','public/assets/images/logo/dirtyds-chicken.jpg'])assert.ok(fs.existsSync(path.join(root,f)),`${f} missing`);
console.log('PASS: eight Week 17 lineups reconcile, championship banners and manager data available, 767 known games.');
