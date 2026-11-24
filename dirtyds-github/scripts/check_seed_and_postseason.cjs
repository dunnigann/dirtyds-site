const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const seed=require('../public/assets/js/seed-scenarios.js');
const stats=require('../public/assets/js/history-statistics.js');

const rows=(pairs,scores)=>pairs.flatMap(([a,b],i)=>[
 {matchup_id:i+1,roster_id:a,points:scores?.[a]??0},{matchup_id:i+1,roster_id:b,points:scores?.[b]??0}
]);
const teams=Array.from({length:4},(_,i)=>({id:i+1,owner:'Manager '+(i+1),name:'Team '+(i+1)}));
const league={season:'2026',status:'in_season',settings:{start_week:12,leg:13,playoff_week_start:15,playoff_teams:2,last_scored_leg:13}};
const uses=[[[1,3],[2,4]],[[1,4],[2,3]],[[1,2],[3,4]]];
const weeks={12:rows(uses[0],{1:100,2:102,3:110,4:120}),13:rows(uses[1],{1:110,2:100,3:90,4:99}),14:rows(uses[2],{1:999,2:0})};
const modelAt=(config=league,board=weeks,week=14)=>seed.prepare({league:config,state:{season:'2026',season_type:'regular',week},teams,weeks:board});
const model=modelAt();
assert.equal(model.currentWeek,14);
assert.equal(model.through,13);
assert.equal(model.remaining.length,2,'same-week partial scores are not locked into the model');
assert.equal(model.teams[0].pf,21000);
assert.equal(model.teams[0].pa,20900);
assert.equal(model.teams[1].pf,20200);
assert.equal(model.teams[1].pa,21000);
assert.equal(seed.leagueWeek(league,{season:'2026',season_type:'post',week:1}),13);
assert.deepEqual(Array.from({length:18},(_,i)=>i+1).filter(seed.showSeedScenarios),[12,13,14]);
assert.equal(modelAt(league,weeks,15),null);
assert.equal(modelAt({...league,status:'complete'},weeks),null);
assert.equal(modelAt({...league,settings:{...league.settings,leg:11}},weeks,11),null);
assert.throws(()=>modelAt(league,{...weeks,14:weeks[14].slice(0,-1)}),/schedule/);
assert.throws(()=>modelAt({...league,settings:{...league.settings,last_scored_leg:12}}),/finalize/);
assert.throws(()=>modelAt({...league,settings:{...league.settings,league_average_match:1}}),/standard Sleeper seeding/);
const official={...weeks,13:weeks[13].map(r=>r.roster_id===1?{...r,custom_points:99}:r)};
assert.equal(modelAt(league,official).teams[0].t,1,'an official score override creating a tie counts');
const paths=seed.buildPaths(model,1);
assert.ok(paths.seeds.some(x=>x.seed===1)&&paths.seeds.some(x=>x.seed>model.qualifiers));

// A team that must lose its last matchup can tie its direct rival's PF on a
// one-cent loss. Higher PA can make that route work; Yahoo's latest-week rule
// would choose the rival. At exactly equal PF and PA both coin results can occur.
const twoTeams=teams.slice(0,2).map((t,i)=>({...t,i,w:i?0:1,l:i?1:0,t:0,units:i?0:2,pf:i?9999:10000,pa:i?9900:10100,standing:i+1}));
const edge={available:true,teams:twoTeams,remaining:[{week:14,a:0,b:1}],qualifiers:1};
const pathToFirst=m=>seed.buildPaths(m,1).seeds.find(x=>x.seed===1).paths.find(p=>p.route==='L');
assert.equal(pathToFirst(edge).points.rivals[0].tieAheadOnly,true);
const lower={...edge,teams:[{...twoTeams[0],pa:9898},twoTeams[1]]};
assert.equal(pathToFirst(lower),undefined,'a lower PA cannot rescue this loss');
const coin={...edge,teams:[{...twoTeams[0],pa:9899},twoTeams[1]]};
assert.equal(pathToFirst(coin).points.rivals[0].tieAheadOnly,true);
assert.ok(seed.buildPaths(coin,1).seeds.find(x=>x.seed===2).paths.some(p=>p.route==='L'));

const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/data/history-statistics.js'),'utf8'),ctx);
const archive=JSON.parse(JSON.stringify(ctx.window.DIRTY_DS_HISTORY_SUMMARY));
assert.equal(Object.values(archive).length,8);
assert.ok(Object.values(archive).every(s=>s.coverage[0].fieldReady&&s.coverage[0].podiumReady));
assert.deepEqual(archive[2025].missedTopPF.map(t=>[t.owner,t.pfRank]),[['James',4]]);
assert.deepEqual(archive[2025].qualifiedBottomPF.map(t=>[t.owner,t.pfRank]),[['Ben',7]]);
assert.equal(archive[2018].missedTopPF.length,0);
assert.deepEqual(stats.combine(Object.values(archive)).accolades.map(p=>[p.name,p.medals]),[
 ['Nick Chubb',[4,0,0]],['Derrick Henry',[2,3,0]],['Lamar Jackson',[3,0,0]],['Keenan Allen',[1,2,2]],['Deshaun Watson',[0,4,1]]
]);

const seasonTeams=Array.from({length:6},(_,i)=>({id:i+1,owner:'Manager '+(i+1),team:'Team '+(i+1)}));
const game=(a,b,x,y,playoff=false)=>({a:{id:a,score:x},b:{id:b,score:y},playoff});
const realBracket=[{r:1,t1:2,t2:4},{r:2,p:1,t1:1,t2:2,w:1,l:2},{r:2,p:3,t1:4,t2:2,w:4,l:2}];
const regular=[{week:1,games:[game(1,2,110,87),game(4,3,86,105),game(5,6,100,80)]}];
const liveSettings={teams:seasonTeams,weeks:regular,bracket:realBracket,playoffStart:2,spots:3,lastWeek:1,leagueWeek:2};
assert.deepEqual(stats.sleeperPostseason({...liveSettings,leagueWeek:1}),{},'preliminary bracket is not an official field');
const postAtStart=stats.sleeperPostseason(liveSettings);
assert.deepEqual(postAtStart.playoffIds.sort(),[1,2,4],'bye teams belong to the actual championship field');
assert.deepEqual(postAtStart.podium,[]);
const out=stats.summarize({year:2026,teamCount:6,weeks:[],postseason:postAtStart});
assert.deepEqual(out.missedTopPF.map(t=>t.id),[3,5]);
assert.deepEqual(out.qualifiedBottomPF.map(t=>t.id),[2,4]);
const season12=Array.from({length:12},(_,i)=>({id:i+1,owner:'Manager '+(i+1),team:'Team '+(i+1)}));
const reg12=[{week:1,games:Array.from({length:6},(_,i)=>game(i+1,i+7,100+i,80+i))}];
const final=[{week:4,games:[game(1,2,90,83,true),game(3,4,120,99,true)]}];
const starters=name=>[{name,status:'starter'}],rosters=[
 {id:1,players:starters('Final starter').concat({name:'Final IR',status:'ir'})},
 {id:2,players:starters('Final silver')},
 {id:3,players:starters('Final bronze').concat({name:'Final bench',status:'bench'})}
];
const twelve={teams:season12,weeks:reg12.concat(final),playoffStart:2,spots:6,lastWeek:4,leagueWeek:4,finalRosters:{4:rosters},
 bracket:[{r:1,t1:3,t2:4},{r:1,t1:5,t2:6},{r:3,p:1,t1:1,t2:2,w:1,l:2},{r:3,p:3,t1:3,t2:4,w:3,l:4}]};
const complete=stats.sleeperPostseason(twelve);
assert.deepEqual(complete.podium,[1,2,3]);
assert.equal(complete.standings[0].pf,100,'postseason scores do not enter regular-season PF');
const full=stats.summarize({year:2026,teamCount:12,weeks:[],postseason:complete});
assert.equal(full.finishes.find(p=>p.name==='Final IR').place,1);
assert.equal(full.finishes.find(p=>p.name==='Final bench').place,3);
console.log('Verified Sleeper week gating, exact PF/PA edges and historical/live postseason statistics.');
