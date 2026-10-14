const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),archive=JSON.parse(fs.readFileSync(path.join(root,'public/data/rankings-2026.json')));
const originalOrders={1:['Bobby','Vinny','Jake','Dan','Fritz','Nick','Tyler','Ben','Brent','James','Jack','Jeff'],2:['Vinny','Jake','Bobby','James','Dan','Nick','Tyler','Ben','Brent','Jack','Fritz','Jeff'],3:['Dan','James','Bobby','Jake','Vinny','Brent','Nick','Ben','Tyler','Jack','Fritz','Jeff']};
const blurbs=[];
for(const week of [1,2,3,4,5]){const rows=archive.editions[week].teams;assert.equal(rows.length,12);assert.equal(new Set(rows.map(r=>r.roster_id)).size,12);assert.deepEqual(rows.map(r=>r.rank),Array.from({length:12},(_,i)=>i+1));if(originalOrders[week])assert.deepEqual(rows.map(r=>r.manager),originalOrders[week],'original Week '+week+' order is frozen');for(const t of rows){assert.ok(t.blurb.split(/\s+/).length>=55,week+' '+t.manager+' has a complete review');assert.equal(t.record.w+t.record.l+t.record.t,week);blurbs.push(t.blurb);}}
assert.equal(new Set(blurbs).size,60,'every team-week has a distinct review');
const ctx={};vm.createContext(ctx);for(const name of ['scoring','football-model'])vm.runInContext(fs.readFileSync(path.join(root,'public/assets/js',name+'.js'),'utf8'),ctx);
const input=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'source/rankings-2026-input.json.gz'))));
for(const week of [4,5])assert.deepEqual(Array.from(ctx.DIRTY_DS_MODEL.historicalRanks(input,week),t=>t.roster_id),archive.editions[week].teams.map(t=>t.roster_id),'Week '+week+' order reconciles with captured roster/projection inputs');
ctx.window=ctx;ctx.SL={data:input};ctx.weekComplete=week=>week<=5;
ctx.liveTeams=()=>archive.editions[1].teams.map(t=>({...t,r:input.rosters.find(r=>r.roster_id===t.roster_id)}));
vm.runInContext(fs.readFileSync(path.join(root,'public/assets/js/rankings.js'),'utf8'),ctx);
vm.runInContext('publishedAnalystEditions='+JSON.stringify(archive.editions),ctx);
const jackOrders={1:['Brent','Vinny','Ben','Dan','Jack','Tyler','James','Jake','Fritz','Jeff','Nick','Bobby'],2:['Brent','James','Ben','Vinny','Jack','Jeff','Fritz','Dan','Nick','Tyler','Jake','Bobby'],3:['James','Ben','Brent','Vinny','Jack','Jeff','Fritz','Dan','Nick','Tyler','Jake','Bobby'],4:['Ben','James','Dan','Brent','Jack','Vinny','Tyler','Jeff','Nick','Jake','Fritz','Bobby'],5:['Ben','James','Jack','Dan','Brent','Vinny','Tyler','Jeff','Jake','Fritz','Nick','Bobby']};
for(const [week,order] of Object.entries(jackOrders)){
 assert.deepEqual(Array.from(vm.runInContext('jackEditions['+week+']',ctx),t=>t[0]),order);
 for(const [i,manager] of order.entries()){
  assert.equal(ctx.powerRankFor(manager,0,Number(week),'jack'),i+1);
  assert.equal(ctx.powerRankMovement(manager,0,i+1,Number(week),'jack'),week==='1'?null:jackOrders[week-1].indexOf(manager)-i,'Jack movement: Week '+week+' '+manager);
 }
}
const standingsOrders={1:['Brent','Tyler','Dan','Ben','Jack','James','Vinny','Fritz','Nick','Jeff','Bobby','Jake'],2:['Brent','James','Ben','Jeff','Nick','Fritz','Jack','Tyler','Dan','Vinny','Jake','Bobby'],3:['James','Ben','Brent','Jeff','Jack','Vinny','Fritz','Nick','Tyler','Jake','Dan','Bobby'],4:['Ben','James','Jack','Brent','Dan','Tyler','Jeff','Vinny','Fritz','Nick','Jake','Bobby'],5:['Ben','James','Jack','Tyler','Dan','Jeff','Vinny','Brent','Jake','Fritz','Nick','Bobby']};
for(const [week,order] of Object.entries(standingsOrders))assert.deepEqual(Array.from(ctx.standingsForPowerWeek(Number(week)),t=>t.manager),order,'standings at end of Week '+week);
for(const manager of jackOrders[1])for(const author of ['jack','analyst']){
 const history=ctx.rankingTrendHistory(manager,author);
 for(const row of history){
  assert.equal(row.standing,standingsOrders[row.week].indexOf(manager)+1);
  assert.equal(row.power,author==='jack'?jackOrders[row.week].indexOf(manager)+1:archive.editions[row.week].teams.find(t=>t.manager===manager).rank);
 }
}
// Missing matchup feeds use the complete saved record archive; absent records
// leave gaps rather than drawing today's standings for a historical week.
ctx.weekComplete=()=>false;
assert.deepEqual(Array.from(ctx.standingsForPowerWeek(5),t=>t.manager),standingsOrders[5]);
vm.runInContext('delete publishedAnalystEditions[5]',ctx);
assert.equal(ctx.rankingTrendHistory('Jack','jack')[4].standing,null);
assert.equal(ctx.powerRankMovement('Jack',0,5,1,'jack'),null);
console.log('PASS: Analyst editions preserved, Jack Weeks 1–5 orders and movements, all managers’ weekly standings / ranking trajectories and missing-data gaps');
