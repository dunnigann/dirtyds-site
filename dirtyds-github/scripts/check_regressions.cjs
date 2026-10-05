const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM,requestInterceptor,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),pub=path.join(root,'public'),source=f=>fs.readFileSync(path.join(pub,'assets/js',f+'.js'),'utf8');
const LEAGUE='1388389962587590656';
const players={q1:{full_name:'Test QB One',position:'QB',fantasy_positions:['QB'],team:'BUF'},q2:{full_name:'Test QB Two',position:'QB',fantasy_positions:['QB'],team:'ATL'},r1:{full_name:'Test RB One',position:'RB',fantasy_positions:['RB'],team:'BUF'},r2:{full_name:'Test RB Two',position:'RB',fantasy_positions:['RB'],team:'ATL'},w1:{full_name:'Test WR One',position:'WR',fantasy_positions:['WR'],team:'BUF'},free:{full_name:'Free RB',position:'RB',fantasy_positions:['RB'],team:'ATL'},k1:{full_name:'Test Kicker',position:'K',fantasy_positions:['K'],team:'BUF'}};
const league={season:'2026',name:'Test League',settings:{leg:2,last_scored_leg:1,playoff_week_start:4},scoring_settings:{pass_yd:.04,rush_yd:.1,rec:.5,fgm_50_59:5,fgm_60p:6,fgmiss:-1,fgmiss_20_29:-4},roster_positions:['QB','RB','FLEX','SUPER_FLEX','BN']};
const users=[{user_id:'1060045335881457664',display_name:'renamed-handle',metadata:{team_name:'Test Team One'}},{user_id:'1389752255158177792',display_name:'Zwack',metadata:{team_name:'Test Team Two'}}];
const rosters=[{roster_id:1,owner_id:users[0].user_id,settings:{wins:1,losses:0,fpts:40,fpts_against:30},players:['q1','r1','w1','q2'],reserve:[]},{roster_id:2,owner_id:users[1].user_id,settings:{wins:0,losses:1,fpts:30,fpts_against:40},players:['r2','k1'],reserve:[]}];
const rows=w=>rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:1,points:w===1?(i?30:40):0,players:r.players,starters:r.players.slice(0,4),players_points:Object.fromEntries(r.players.map(id=>[id,w===1?10:0]))}));
const projection={q1:{pass_yd:500},q2:{pass_yd:375},r1:{rush_yd:100},r2:{rush_yd:90},w1:{rec:16},free:{rush_yd:50},k1:{fgm_50p:1}};
const scoreboard={events:[{competitions:[{competitors:[{team:{abbreviation:'ATL'},score:'0'},{team:{abbreviation:'BUF'},score:'0'}]}],status:{period:0,displayClock:'15:00',type:{state:'pre',completed:false,shortDetail:'Scheduled'}}}]};
const response=(value,status=200,stale=false)=>({ok:status===200,status,headers:{get:key=>key==='X-Data-Stale'?String(stale):null},json:async()=>structuredClone(value)});
function fixtures(url){
 const u=new URL(url,'https://dirtyds.test'),p=u.pathname.replace(/^\/api\/sleeper\//,'').replace(/^\/v1\//,'')+u.search;
 if(u.pathname==='/api/snapshots')return {weeks:{}};
 if(u.pathname==='/api/rankings')return {editions:Object.fromEntries([1,2,3].map(week=>[week,{week,teams:rosters.map((r,i)=>({roster_id:r.roster_id,manager:i?'Ben':'Jack',team:'Test Team '+(i+1),rank:i+1,record:{w:i?0:1,l:i?1:0,t:0},powerScore:50,ros:100,vor:5,depth:.3,strength:{pos:'QB'},weakness:{pos:'RB'}}))}]))};
 if(u.pathname==='/api/playoffs')return {season:'2026',spots:1,through:1,end:3,iterations:20000,expertAsOf:Date.now(),generatedAt:Date.now(),teams:rosters.map((r,i)=>({roster_id:r.roster_id,team:'Test Team '+(i+1),manager:i?'Ben':'Jack',record:{w:i?0:1,l:i?1:0,t:0},odds:i?30:70}))};
 if(u.hostname==='site.api.espn.com')return u.pathname.endsWith('/news')?{articles:[]}:scoreboard;
 if(p==='league/'+LEAGUE)return league;
 if(p.endsWith('/users'))return users;if(p.endsWith('/rosters'))return rosters;if(p.endsWith('/drafts'))return [];
 if(p==='state/nfl')return {season:'2026',week:2};if(p==='players/nfl?active=true')return players;
 if(p.includes('/matchups/'))return rows(Number(p.split('/').at(-1)));
 if(p.includes('/transactions/'))return [];
 if(p.startsWith('projections/'))return projection;
 if(p.startsWith('stats/'))return {q1:{pass_yd:250,gp:1},r1:{rush_yd:80,gp:1}};
 throw new Error('Unexpected test request: '+url);
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(test,label){for(let i=0;i<400;i++){if(test())return;await tick();}throw new Error('Timed out: '+label);}
async function bridgeChecks(){
 const dom=new JSDOM('',{url:'https://dirtyds.test/',runScripts:'outside-only'}),w=dom.window,ctx=dom.getInternalVMContext();
 let offline=true,calls=[];w.fetch=async url=>{calls.push(url);if(offline)throw new Error('offline');return response(fixtures(url));};
 vm.runInContext(source('scoring'),ctx);vm.runInContext(source('sleeper-live'),ctx);
 const SL=w.DIRTY_DS_LIVE;
 await assert.rejects(SL.init(),/offline/);offline=false;await SL.init();assert.equal(SL.data.rosters.length,2,'initialization recovers after rejection');
 const before=calls.length;await Promise.all([SL.getWeek(2),SL.getWeek(2)]);assert.equal(calls.length,before,'fresh cache prevents duplicate requests');
 const txBefore=calls.length;await Promise.all([SL.getTransactions(2),SL.getTransactions(2)]);assert.equal(calls.length,txBefore+1,'uncached concurrent requests deduplicate');
 await SL.getWeek(1);const frozen=SL.data.snapshots[1].players.q1.team;SL.data.players.q1.team='NYJ';await SL.getWeek(1,true);assert.equal(SL.data.snapshots[1].players.q1.team,frozen,'finalized metadata remains frozen');assert.equal(SL.data.snapshots[1].historicalMetadataUnknown,true);
 offline=true;await SL.refresh();assert.equal(SL.data.rosters.length,2);assert.ok(Object.values(SL.data.feeds).some(x=>x.stale),'offline refresh retains and labels cached data');
 const score=w.DIRTY_DS_SCORING.calculate;
 assert.equal(score(null,league.scoring_settings).points,null);assert.equal(score({pass_yd:0},league.scoring_settings).points,0);assert.equal(score({adp:1},league.scoring_settings).points,null);
 const fg=score({fgm_50p:2},league.scoring_settings,{actual:{fgm_50_59:3,fgm_60p:1}});assert.equal(fg.points,10.5);assert.equal(fg.approximate,true);
 assert.equal(score({fgm_50p:2,fgm_50_59:1,fgm_60p:1},league.scoring_settings).points,11,'exact FG buckets do not get counted twice');
 assert.equal(score({fgmiss_20_29:1},league.scoring_settings).points,-5,'aggregate and distance-specific league miss penalties combine');
 dom.window.close();console.log('PASS: missing vs zero, kicker scoring, retries, deduplication, stale fallback and frozen snapshots');
}
const localResources={interceptors:[requestInterceptor(request=>{const u=new URL(request.url),file=path.join(pub,decodeURIComponent(u.pathname));return new Response(u.hostname==='dirtyds.test'&&fs.existsSync(file)?fs.readFileSync(file):'',{status:u.hostname==='dirtyds.test'&&fs.existsSync(file)?200:404,headers:{'Content-Type':file.endsWith('.css')?'text/css':'application/javascript'}});})]};
async function pageChecks(mobile=false){
 const errors=[],requests=[],v=new VirtualConsole();v.on('jsdomError',err=>errors.push(err));
 const dom=new JSDOM(fs.readFileSync(path.join(pub,'index.html'),'utf8'),{url:'https://dirtyds.test/#home',resources:localResources,runScripts:'dangerously',virtualConsole:v,pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:mobile});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.fetch=async url=>{requests.push(url);return response(fixtures(url));};}});
 const w=dom.window,ctx=dom.getInternalVMContext(),run=code=>vm.runInContext(code,ctx),d=w.document;
 await until(()=>d.getElementById('homeRoster'),'home league panel');
 assert.equal(run('canonicalManager(SL.roster(1))'),'Jack','identity survives renamed handles');
 assert.ok(!w.DIRTY_DS_HISTORY,'home does not eagerly load archive payloads');
 await run("go('power')");await until(()=>d.querySelectorAll('.unified-rankings>li').length===2,'Analyst rankings');
 assert.doesNotMatch(d.getElementById('livePowerContent').textContent,/playoff odds|simulations/i);await w.DIRTY_DS_LIVE.loadRankings();
 const lineup=run('selectProjectedLineup(SL.roster(1),2)');assert.equal(lineup.mean,53);assert.equal(new Set(lineup.lineup.map(p=>p.id)).size,4);assert.equal(lineup.lineup.find(p=>p.slot==='SUPER_FLEX').id,'q2');
 // Compare the efficient assignment to an independent exhaustive search.
 let seed=7;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let attempt=0;attempt<40;attempt++){
  const slots=['QB','RB','FLEX','SUPER_FLEX'],candidates=Array.from({length:6},(_,i)=>{const pos=['QB','RB','WR','TE'][Math.floor(random()*4)];return {id:String(i),pos,positions:[pos],points:Math.round(random()*30)-5,available:true};});
  let best={filled:-1,points:-Infinity};
  function search(i,used,filled,points){if(i===slots.length){if(filled>best.filled||filled===best.filled&&points>best.points)best={filled,points};return;}search(i+1,used,filled,points);candidates.forEach((p,j)=>{const allowed=slots[i]==='SUPER_FLEX'||slots[i]==='FLEX'&&p.pos!=='QB'||slots[i]===p.pos;if(!used.has(j)&&allowed)search(i+1,new Set([...used,j]),filled+1,points+p.points);});}
  search(0,new Set(),0,0);const chosen=run(`assignLegalLineup(${JSON.stringify(slots)},${JSON.stringify(candidates)})`);assert.equal(chosen.lineup.filter(p=>p.id).length,best.filled);assert.equal(chosen.mean,best.points);
 }
 const scoreBefore=run('rankTeams().find(t=>t.r.roster_id===1).powerScore');w.DIRTY_DS_LIVE.data.weeks[1][0].points=1;assert.equal(run('rankTeams().find(t=>t.r.roster_id===1).powerScore'),scoreBefore,'power score does not use record or schedule results');
 w.DIRTY_DS_LIVE.data.players.q1.injury_status='Out';assert.equal(run("projectionEstimate('q1',2).available"),false);assert.equal(run("projectionEstimate('q1',3).available"),true);delete w.DIRTY_DS_LIVE.data.players.q1.injury_status;
 w.DIRTY_DS_LIVE.data.nflGames[3]=[{a:'ATL',b:'NYJ'}];assert.equal(run("projectionEstimate('q1',3).source"),'Bye');
 delete w.DIRTY_DS_LIVE.data.projections[3].r1;w.DIRTY_DS_LIVE.data.nflGames[3]=[{a:'ATL',b:'BUF'}];assert.equal(run("projectionEstimate('r1',3).source"),'Fallback · season points/game');
 const slots=w.DIRTY_DS_LIVE.data.league.roster_positions;w.DIRTY_DS_LIVE.data.league.roster_positions=['K'];w.DIRTY_DS_LIVE.data.projections[2].k1={fgmiss:1};assert.equal(run('selectProjectedLineup(SL.roster(2),2).lineup[0].id'),'k1','negative projected points still fill a legal slot');w.DIRTY_DS_LIVE.data.league.roster_positions=slots;
 await run("go('matchups')");await until(()=>d.querySelector('.z-field'),'matchup field');
 assert.equal(d.querySelector('[data-match-view]'),null);assert.equal(d.querySelector('.match-scoreboard'),null);
 assert.doesNotMatch(d.getElementById('liveField').textContent,/players remaining/);assert.equal(run('matchProgress(SL.data.weeks[1][0],1).label'),'Final');
 const archiveYear=d.getElementById('amYear');archiveYear.value='2018';archiveYear.dispatchEvent(new w.Event('change'));await until(()=>w.DIRTY_DS_HISTORY.matchups['2018']&&d.getElementById('amWeek').options.length>0&&Number(d.getElementById('amWeek').value)===Math.max(...Object.keys(w.DIRTY_DS_HISTORY.matchups['2018']).map(Number)),'lazy season selection');
 await run("go('history')");await until(()=>d.querySelectorAll('.record-category').length===3,'categorized records');
 await run("go('teams')");await until(()=>d.querySelectorAll('[data-manager]').length===13,'teams');
 await run("go('draft')");await until(()=>d.getElementById('dYear'),'draft controls');await tick();assert.ok(d.querySelector('label[for="dOwner"]'),'visible filter labels');
 await run("go('transactions')");await until(()=>d.getElementById('txMoveResults'),'transactions');assert.ok(!requests.some(x=>/transactions\/(?:[3-9]|1\d)$/.test(x)),'future transaction weeks are not fetched');
 await run("go('players')");await until(()=>d.querySelectorAll('[data-archive-player]').length>0,'players');await tick();
 const search=d.getElementById('pSearch');search.value='Allen';search.dispatchEvent(new w.Event('input'));assert.match(w.location.hash,/search=Allen/);
 const results=d.querySelectorAll('[data-archive-player]');assert.ok(results.length>0);results[0].focus();results[0].click();assert.equal(d.activeElement.id,'modalClose');assert.equal(d.getElementById('app').inert,true);d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(d.getElementById('modalBackdrop').hidden,true);assert.equal(d.activeElement,results[0],'modal restores keyboard focus');
 d.querySelector('[data-reset-filters]').click();await tick();assert.equal(d.getElementById('pSearch').value,'');
 const restoredSearch=d.getElementById('pSearch');restoredSearch.value='Allen';restoredSearch.dispatchEvent(new w.Event('input'));await run("go('teams')");await until(()=>d.querySelectorAll('[data-manager]').length===13,'teams before Back');w.history.back();await until(()=>d.getElementById('pSearch')?.value==='Allen','Back restores page and filters');
 await run("showLivePlayer('q1')");assert.match(w.location.hash,/player=q1/);d.getElementById('modalClose').click();assert.doesNotMatch(w.location.hash,/player=/,'closing details removes the modal URL parameter');
 await run("go('seasons')");await until(()=>d.getElementById('seasonDetail'),'standings');
 await run("go('season2026')");await until(()=>d.querySelector('.z-recap'),'weekly review');
 assert.equal(d.querySelector('[data-standings-link]'),null);
 await run("go('playoffs')");await until(()=>d.querySelectorAll('.playoff-row').length===2,'playoff predictor');assert.match(d.getElementById('app').textContent,/70.0%/);
 await run("go('power')");await until(()=>d.querySelectorAll('[data-power-week]').length===3,'ranking publication controls');assert.equal(d.querySelector('[data-power-week="4"]'),null);run("powerView='jack';powerWeek=1;drawPowerRankings()");assert.equal(d.querySelectorAll('.unified-rankings>li').length,0);assert.match(d.getElementById('livePowerContent').textContent,/not been submitted/);run("powerWeek=2;drawPowerRankings()");assert.equal(d.querySelectorAll('.unified-rankings>li').length,0);
 assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));dom.window.close();console.log(`PASS: ${mobile?'phone defaults':'desktop defaults'}, all ten pages, legal rankings, URLs, lazy archives, controls and modal focus`);
}
(async()=>{await bridgeChecks();await pageChecks();await pageChecks(true);await require('./check_worker.cjs')();})().catch(error=>{console.error(error);process.exitCode=1;});
