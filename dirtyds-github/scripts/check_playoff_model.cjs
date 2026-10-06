const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx={};ctx.globalThis=ctx;vm.createContext(ctx);
for(const name of ['scoring','football-model'])vm.runInContext(fs.readFileSync(path.join(root,'public/assets/js',name+'.js'),'utf8'),ctx);
const M=ctx.DIRTY_DS_MODEL,clone=x=>JSON.parse(JSON.stringify(x));
const players={q1:{full_name:'Alpha QB',position:'QB',fantasy_positions:['QB'],team:'BUF'},q2:{full_name:'Beta QB',position:'QB',fantasy_positions:['QB'],team:'ATL'},backup:{full_name:'Backup QB',position:'QB',fantasy_positions:['QB'],team:'ATL'}};
const rosters=[{roster_id:1,players:['q1','backup'],reserve:[],settings:{}},{roster_id:2,players:['q2'],reserve:[],settings:{}}];
const data={league:{settings:{playoff_week_start:5,playoff_teams:1,last_scored_leg:3},scoring_settings:{pass_yd:.04,pass_td:6,rec:.5},roster_positions:['QB','BN']},players,rosters,weeks:{},projections:{},nflGames:{}};
for(let w=1;w<=4;w++){data.weeks[w]=rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:1,points:w<=3?(i?80:100):0,players:r.players,starters:[r.players[0]]}));data.projections[w]={q1:{pass_yd:400},q2:{pass_yd:300},backup:{pass_yd:200}};}
for(let w=1;w<=18;w++)data.nflGames[w]=w===4?[{a:'ATL',b:'NYJ'}]:[{a:'ATL',b:'BUF'}];
const experts=[{name:'Alpha QB',pos:'QB',team:'BUF',stats:{gp:13,pass_yd:3900,pass_td:26}},{name:'Beta QB',pos:'QB',team:'ATL',stats:{gp:14,pass_yd:3500,pass_td:28}},{name:'Backup QB',pos:'QB',team:'ATL',stats:{gp:14,pass_yd:2100,pass_td:14}}];
let input=M.buildPlayoffInput(data,experts,3);assert.equal(input.teams[0].weekly[0].players[0].id,'backup','BUF bye forces a bench substitution');assert.equal(input.teams[0].w,3);assert.equal(input.teams[1].l,3);assert.equal(input.teams[0].pf,300);assert.equal(input.teams[0].weekly[0].mean,12,'league six-point passing TDs applied');
const odds=M.simulate(input,20000,123);assert.equal(odds.find(x=>x.roster_id===1).odds,100,'clinched record beats projected remaining-week weakness');assert.equal(odds.find(x=>x.roster_id===2).odds,0);assert.equal(odds.reduce((n,x)=>n+x.odds,0),100);
assert.equal(JSON.stringify(M.simulate(input,20000,123)),JSON.stringify(odds),'repeatable sampling for unchanged inputs');
const broken=clone(data);broken.weeks[4][1].matchup_id=2;assert.throws(()=>M.buildPlayoffInput(broken,experts,3),/real league schedule/);
const missing=clone(data);missing.rosters[0].players=['unknown'];const rescued=M.buildPlayoffInput(missing,experts,3);assert.equal(rescued.teams[0].weekly[0].players[0].id,'backup');assert.equal(rescued.waiverSlots,1,'a legal available free agent fills a missing projection');
const noExperts=clone(data);assert.throws(()=>M.buildPlayoffInput(noExperts,[],3),/Expert ROS/);
const tie=[{id:1,w:5,l:4,t:1,pf:1000,pa:900,coin:.5},{id:2,w:5,l:4,t:1,pf:1000,pa:950,coin:.2}];assert.equal(M.seedTeams(tie)[0].id,2,'higher PA breaks tied records and PF');tie[0].pf=1100;assert.equal(M.seedTeams(tie)[0].id,1,'PF takes precedence over PA');tie[1].w=6;assert.equal(M.seedTeams(tie)[0].id,2,'record takes precedence over PF');
const divisions=[{id:1,division:1,w:10,l:0,t:0,pf:200,pa:0,coin:0},{id:2,division:1,w:9,l:1,t:0,pf:200,pa:0,coin:0},{id:3,division:2,w:5,l:5,t:0,pf:100,pa:0,coin:0}];assert.equal(M.seedTeams(divisions,2)[1].id,3,'division winner reserved');
const median=clone(data);median.league.settings.league_average_match=1;assert.equal(M.recordThrough(median,3)[1].w,6);assert.equal(M.recordThrough(median,3)[2].l,6);
const symmetry={spots:1,divisions:0,median:false,schedule:[{week:1,pairs:[[0,1]]}],teams:[1,2].map(id=>({id,w:0,l:0,t:0,pf:0,pa:0,weekly:[{mean:100,sd:20}]}))};const equal=M.simulate(symmetry,20000,456);assert.ok(equal.every(t=>Math.abs(t.odds-50)<1.5),'equal teams have equal chances');
const before=M.historicalRanks(data,1),later=clone(data);later.rosters[0].players=['q2'];later.projections[4].q1={pass_yd:99999};later.weeks[4][0].points=99999;assert.equal(JSON.stringify(M.historicalRanks(later,1)),JSON.stringify(before),'later roster moves, projections and results do not change Week 1 reconstruction');
const historical=clone(data);historical.weeks[1][0].players=['backup'];assert.notEqual(M.historicalRanks(historical,1).find(t=>t.roster_id===1).average,before.find(t=>t.roster_id===1).average,'historical roster lists actually drive each edition');
const own=JSON.parse(fs.readFileSync(path.join(root,'public/data/history-data.js'),'utf8').replace(/^window.DIRTY_DS_HISTORY=/,'').replace(/;\s*$/,''));for(const [year,rows] of Object.entries(own.standings)){assert.deepEqual(rows.map(r=>r.finalPlace).sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i+1),year+' has exactly one of each final place');}
// FLEX is rearranged before any waiver pickup; even a stronger free agent does
// not turn this gap-filling assumption into unlimited roster upgrades.
const flex=clone(data);flex.league.roster_positions=['QB','RB','RB','WR','WR','TE','FLEX','BN'];flex.league.scoring_settings.rush_yd=.1;flex.league.scoring_settings.rec_yd=.1;
for(const [id,pos,points,team] of [['r1','RB',15,'ATL'],['r2','RB',12,'ATL'],['w1','WR',11,'ATL'],['w2','WR',10,'ATL'],['wbye','WR',30,'BUF'],['t1','TE',9,'ATL'],['t2','TE',8,'ATL'],['freeWR','WR',100,'ATL']]){flex.players[id]={full_name:id,position:pos,fantasy_positions:[pos],team};flex.projections[4][id]={[pos==='RB'?'rush_yd':'rec_yd']:points*10};}
flex.rosters[0].players=['q1','backup','r1','r2','w1','w2','wbye','t1','t2'];
const arranged=M.buildPlayoffInput(flex,experts,3),a=arranged.teams[0].weekly[0];assert.equal(a.players.find(p=>p.slot==='FLEX').id,'t2','bench TE covers FLEX while WRs fill WR slots');assert.ok(a.players.every(p=>!p.pickup),'full legal owned lineup needs no waivers');assert.equal(new Set(a.players.map(p=>p.id)).size,a.players.length);
// Recent projections rescue unpublished future K/DEF feeds. Free agents are
// never on bye, injured, zero-projected, rostered, reserved or on taxi.
const stream=clone(data);stream.league.settings.playoff_week_start=6;stream.league.roster_positions=['QB','K','DEF','BN'];stream.league.scoring_settings.fgm=3;stream.league.scoring_settings.def_td=6;
stream.weeks[5]=clone(stream.weeks[4]);stream.nflGames[5]=[{a:'ATL',b:'NYJ'}];stream.projections[5]={};
const add=(id,pos,team,stat,value,extra={})=>{stream.players[id]={full_name:id,position:pos,fantasy_positions:[pos],team,...extra};stream.projections[3][id]={[stat]:value};stream.projections[4][id]={[stat]:0};};
add('kBest','K','ATL','fgm',3);add('kSecond','K','ATL','fgm',2);add('kBye','K','BUF','fgm',10);add('kOut','K','ATL','fgm',10,{injury_status:'Out'});add('kIR','K','BUF','fgm',20);add('kTaxi','K','ATL','fgm',20);add('kZero','K','ATL','fgm',0);
add('ATL','DEF','ATL','def_td',2);add('NYJ','DEF','NYJ','def_td',1);add('BUF','DEF','BUF','def_td',10);
stream.rosters[0].reserve=['kIR'];stream.rosters[0].taxi=['kTaxi'];stream.rosters[0].settings.waiver_position=2;stream.rosters[1].settings.waiver_position=1;
const saved=JSON.stringify(stream),filled=M.buildPlayoffInput(stream,experts,3);assert.equal(JSON.stringify(stream),saved,'modeled pickups never mutate actual rosters');
for(let wi=0;wi<2;wi++){
 const first=filled.teams[0].weekly[wi],second=filled.teams[1].weekly[wi];assert.equal(second.players.find(p=>p.slot==='K').id,wi?'kOut':'kBest','first waiver priority gets highest available positive forecast');assert.equal(first.players.find(p=>p.slot==='K').id,wi?'kBest':'kSecond');assert.equal(second.players.find(p=>p.slot==='DEF').id,'ATL');assert.equal(first.players.find(p=>p.slot==='DEF').id,'NYJ');
 const ids=filled.teams.flatMap(t=>t.weekly[wi].players).filter(p=>p.pickup).map(p=>p.id);assert.equal(new Set(ids).size,ids.length,'same-week free agents are exclusive');
 assert.ok(filled.teams.every(t=>t.weekly[wi].unfilled===0&&t.weekly[wi].players.every(p=>p.points>0)),'every starter is positive and every lineup is filled');
}
assert.equal(filled.waiverSlots,8);assert.equal(filled.recentProjectionSlots,8);assert.equal(filled.estimatedReplacementSlots,0);
// Complete absence of a position feed is explicitly estimated, not fabricated
// as a named player, and cannot stop a valid remaining-schedule simulation.
const emergency=clone(data);emergency.league.roster_positions=['QB','K','DEF','BN'];const e=M.buildPlayoffInput(emergency,experts,3);assert.equal(e.estimatedReplacementSlots,4);assert.ok(e.teams.every(t=>t.weekly[0].unfilled===0&&t.weekly[0].players.every(p=>p.points>0)));assert.ok(e.teams.every(t=>t.weekly[0].players.filter(p=>p.estimated).every(p=>p.name.startsWith('Replacement-level'))));assert.ok(M.simulate(e,20000,77).every(t=>Number.isFinite(t.odds)));
console.log('PASS: Monte Carlo, records/seeding, FLEX rearrangement, legal unique starters, waiver priority/exclusivity, byes/injuries/ownership, missing and zero future forecasts, emergency estimates, immutable historical rankings and all 96 final places');
