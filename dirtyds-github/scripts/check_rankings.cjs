const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),archive=JSON.parse(fs.readFileSync(path.join(root,'public/data/rankings-2026.json')));
const originalOrders={1:['Bobby','Vinny','Jake','Dan','Fritz','Nick','Tyler','Ben','Brent','James','Jack','Jeff'],2:['Vinny','Jake','Bobby','James','Dan','Nick','Tyler','Ben','Brent','Jack','Fritz','Jeff'],3:['Dan','James','Bobby','Jake','Vinny','Brent','Nick','Ben','Tyler','Jack','Fritz','Jeff']};
const blurbs=[];
for(const week of [1,2,3,4,5]){const rows=archive.editions[week].teams;assert.equal(rows.length,12);assert.equal(new Set(rows.map(r=>r.roster_id)).size,12);assert.deepEqual(rows.map(r=>r.rank),Array.from({length:12},(_,i)=>i+1));if(originalOrders[week])assert.deepEqual(rows.map(r=>r.manager),originalOrders[week],'original Week '+week+' order is frozen');for(const t of rows){assert.ok(t.blurb.split(/\s+/).length>=55,week+' '+t.manager+' has a complete review');assert.equal(t.record.w+t.record.l+t.record.t,week);blurbs.push(t.blurb);}}
assert.equal(new Set(blurbs).size,60,'every team-week has a distinct review');
const ctx={};vm.createContext(ctx);for(const name of ['scoring','football-model'])vm.runInContext(fs.readFileSync(path.join(root,'public/assets/js',name+'.js'),'utf8'),ctx);
const input=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'source/rankings-2026-input.json.gz'))));
for(const week of [4,5])assert.deepEqual(Array.from(ctx.DIRTY_DS_MODEL.historicalRanks(input,week),t=>t.roster_id),archive.editions[week].teams.map(t=>t.roster_id),'Week '+week+' order reconciles with captured roster/projection inputs');
console.log('PASS: Weeks 1–3 order retained, Weeks 4–5 source reconciliation, 60 individual reviews');
