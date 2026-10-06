const assert=require('node:assert/strict'),path=require('node:path');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const LEAGUE='1388389962587590656',script=require('esbuild').buildSync({entryPoints:[path.resolve(__dirname,'../worker.js')],bundle:true,write:false,format:'esm',external:['cloudflare:workers']}).outputFiles[0].text;
const league={season:'2026',settings:{leg:4,last_scored_leg:3,playoff_week_start:5,playoff_teams:1,divisions:0},scoring_settings:{pass_yd:.04,pass_td:6,rec:.5,rush_yd:.1,rec_yd:.1,rec_td:6,rush_td:6},roster_positions:['QB','BN']};
const players={q1:{full_name:'Alpha QB',position:'QB',fantasy_positions:['QB'],team:'BUF'},q2:{full_name:'Beta QB',position:'QB',fantasy_positions:['QB'],team:'ATL'},backup:{full_name:'Backup QB',position:'QB',fantasy_positions:['QB'],team:'ATL'}};
const rosters=[{roster_id:1,owner_id:'1060045335881457664',players:['q1','backup'],reserve:[]},{roster_id:2,owner_id:'1389752255158177792',players:['q2'],reserve:[]}];
function cbsTable(pos){const keys=pos==='QB'?['gp','passing_yds','passing_td']:['gp','rushing_yds','rushing_td','receiving_rec','receiving_yds','receiving_td'];
 const rows=Array.from({length:12},(_,i)=>{const name=pos==='QB'?['Alpha QB','Beta QB','Backup QB'][i]||'Other QB '+i:'Other '+pos+' '+i,team=i===0?'BUF':'ATL',values=pos==='QB'?[14,i===0?3900:i===1?3500:2100,i===0?26:i===1?28:14]:[14,0,0,20,200,2];return `<tr class="TableBase-bodyTr"><td><span class="CellPlayerName--short"><a href="/nfl/players/${i}/fantasy/">${name[0]}. Short</a><span class="CellPlayerName-team">${team}</span></span><span class="CellPlayerName--long"><a href="/nfl/players/${i}/fantasy/">${name}</a><span class="CellPlayerName-team">${team}</span></span></td>${values.map(v=>'<td>'+v+'</td>').join('')}</tr>`;});
 return `<h1>Rest of Season Proj Fantasy Football</h1><table><thead><tr class="TableBase-headTr"><th><a href="?sortcol=player">Player</a></th>${keys.map(k=>`<th><a href="?sortcol=${k}&amp;sortdir=descending">${k}</a></th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;}
let offline=false,futureProjectionDown=false,calls=0;const projectionWeeks=new Set();
const outbound=async request=>{calls++;if(offline)return new Response('offline',{status:503});const u=new URL(request.url),p=u.pathname;
 if(u.hostname==='www.cbssports.com')return new Response(cbsTable(p.split('/')[4]),{headers:{'content-type':'text/html'}});
 if(u.hostname==='site.api.espn.com'){const w=Number(u.searchParams.get('week')),pairs=[['ATL','NYJ'],['NYG','DAL'],['BAL','MIA'],['KC','DEN'],['LAR','SEA'],['LV','NO'],['CAR','DET']];if(w!==4)pairs.push(['BUF','NE']);return Response.json({events:pairs.map(([a,b])=>({competitions:[{competitors:[{team:{abbreviation:a}},{team:{abbreviation:b}}]}]}))});}
 let value;if(p==='/v1/league/'+LEAGUE)value=league;
 else if(p.endsWith('/users'))value=rosters.map((r,i)=>({user_id:r.owner_id,display_name:i?'Zwack':'jdunnigan',metadata:{team_name:i?'Team Beta':'Team Alpha'}}));
 else if(p.endsWith('/rosters'))value=rosters;
 else if(p==='/v1/players/nfl')value=players;
 else if(p.includes('/matchups/')){const week=Number(p.split('/').at(-1));value=rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:1,points:week<=3?(i?80:100):0,players:r.players,starters:[r.players[0]],players_points:{[r.players[0]]:week<=3?20:0}}));}
 else if(p.startsWith('/v1/projections/')){const week=Number(p.split('/').at(-1));projectionWeeks.add(week);if(futureProjectionDown&&week===4)return new Response('not published',{status:404});value={q1:{pass_yd:400},q2:{pass_yd:300},backup:{pass_yd:200},kBest:{fgm:3},kSecond:{fgm:2},ATL:{def_td:2},NYJ:{def_td:1}};}
 else throw new Error('Unexpected model fixture: '+request.url);
 return Response.json(value);
};
(async()=>{
 const {parseCBS}=await import('../lib/expert-projections.mjs');const rb=parseCBS(cbsTable('RB'),'RB');assert.equal(rb[0].stats.rec,20);assert.equal(rb[0].stats.rec_td,2);assert.equal(parseCBS(cbsTable('QB'),'QB')[0].name,'Alpha QB');assert.throws(()=>parseCBS('<html>broken</html>','QB'),/header changed/);
 const options=convertV4MiniflareOptions({name:'dirtyds-model-test',modules:true,script,compatibilityDate:'2026-10-05',durableObjects:{LEAGUE_STORE:{className:'LeagueStore',useSQLite:true}},outboundService:outbound,serviceBindings:{ASSETS:()=>new Response('static')},host:'127.0.0.1',port:0});options.unsafeInspectDurableObjects=true;const mf=new Miniflare(options);
 try{
  const response=await mf.dispatchFetch('http://test/api/playoffs');assert.equal(response.status,200,await response.clone().text());const model=await response.json();assert.equal(model.through,3);assert.equal(model.iterations,20000);assert.equal(model.teams[0].manager,'Jack');assert.equal(model.teams[0].odds,100);assert.equal(model.teams[0].record.w,3);assert.equal(model.expertSlots,2);assert.equal(model.fallbackSlots,0);
  const count=calls;const cached=await (await mf.dispatchFetch('http://test/api/playoffs')).json();assert.equal(calls,count,'cached simulation avoids upstream and resampling');assert.equal(cached.seed,model.seed);
  const archive=await (await mf.dispatchFetch('http://test/api/rankings')).json();assert.deepEqual(Object.keys(archive.editions),['1','2','3']);assert.equal(archive.editions[4],undefined);assert.equal(archive.editions[1].teams.length,2);
  const bindings=await mf.getBindings(),store=bindings.LEAGUE_STORE.getByName(LEAGUE);const input=await store.modelData();assert.equal(input.data.weeks[4].length,2);
  const storage=await mf.unsafeGetDurableObjectStorage('dirtyds-model-test','LeagueStore',{name:LEAGUE});
  league.roster_positions=['QB','K','DEF','BN'];league.scoring_settings.fgm=3;league.scoring_settings.def_td=6;
  for(const [id,pos,team] of [['kBest','K','ATL'],['kSecond','K','ATL'],['ATL','DEF','ATL'],['NYJ','DEF','NYJ']])players[id]={full_name:id,position:pos,fantasy_positions:[pos],team};
  // Remove the cached future feed to exercise an actually absent endpoint,
  // rather than merely testing the existing stale-feed fallback.
  await storage.exec('DELETE FROM feeds WHERE path = ?',`projections/nfl/regular/2026/4`);await storage.exec('UPDATE feeds SET updated = 0');futureProjectionDown=true;
  const repairedResponse=await mf.dispatchFetch('http://test/api/playoffs');assert.equal(repairedResponse.status,200,await repairedResponse.clone().text());const repaired=await repairedResponse.json();assert.equal(repaired.waiverSlots,4);assert.equal(repaired.recentProjectionSlots,4);assert.equal(repaired.estimatedReplacementSlots,0);assert.deepEqual(repaired.unavailableProjectionWeeks,[4]);assert.ok([1,2,3].every(w=>projectionWeeks.has(w)),'recent projections loaded by the Worker');
  const repairedCount=calls;await mf.dispatchFetch('http://test/api/playoffs');assert.equal(calls,repairedCount,'waiver-based forecast remains cached');
  await storage.exec('UPDATE feeds SET updated = 0');offline=true;const stale=await (await mf.dispatchFetch('http://test/api/playoffs')).json();assert.equal(stale.stale,true,'stale inputs are labeled');assert.equal(stale.teams[0].odds,100);
  console.log('PASS: CBS parser, Cloudflare model API, exclusive waiver replacements, recent projections with absent future endpoint, shared cache, stale labeling and frozen Weeks 1–3 publication');
 }finally{await mf.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
