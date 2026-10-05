import {DurableObject} from 'cloudflare:workers';
import './public/assets/js/scoring.js';
import './public/assets/js/football-model.js';
import {parseCBS,expertURL} from './lib/expert-projections.mjs';
const MODEL=globalThis.DIRTY_DS_MODEL;
const PUBLISHED_RANKING_WEEKS=[1,2,3];
const MANAGERS={"466440358671151104":"James","607004933086052352":"Jake","729555035901534208":"Fritz","1060045335881457664":"Jack","1388342142245572608":"Dan","1388389695032938496":"Vinny","1388890524814966784":"Bobby","1388895706860777472":"Nick","1388907771327451136":"Tyler","1389748221072384001":"Brent","1389752255158177792":"Ben","1393744257201750016":"Jeff"};
const LEAGUE='1388389962587590656';
function compactPlayers(raw){const fields=['player_id','full_name','first_name','last_name','position','fantasy_positions','team','espn_id','injury_status','depth_chart_order','depth_chart_position','status'];return Object.fromEntries(Object.entries(raw||{}).filter(([id,p])=>p&&(['QB','RB','WR','TE','K','DEF'].includes(p.position)||/^[A-Z]{2,3}$/.test(id))).map(([id,p])=>[id,Object.fromEntries(fields.filter(k=>p[k]!=null).map(k=>[k,p[k]]))]));}
export function allowedPath(path){return path==='state/nfl'||path==='players/nfl?active=true'||new RegExp(`^league/${LEAGUE}(?:/(?:users|rosters|drafts)|/(?:matchups|transactions)/(?:[0-9]|1[0-8]))?$`).test(path)||/^draft\/\d+\/picks$/.test(path)||/^(?:stats|projections)\/nfl\/regular\/20\d{2}(?:\/(?:[1-9]|1[0-8]))?$/.test(path);}
export class LeagueStore extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.inflight=new Map();this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS feeds (path TEXT PRIMARY KEY, value TEXT NOT NULL, updated INTEGER NOT NULL)');}
 async feed(path){
  if(!allowedPath(path))throw new Error('Unsupported feed');
  const old=this.ctx.storage.sql.exec('SELECT value,updated FROM feeds WHERE path = ?',path).toArray()[0];
  const ttl=path.startsWith('players/')||path.startsWith('draft/')||path.endsWith('/drafts')?86400000:path.startsWith('projections/')?900000:path.startsWith('stats/')?300000:30000;
  if(old&&Date.now()-old.updated<ttl)return {value:JSON.parse(old.value),saved:old.updated,stale:false};
  if(this.inflight.has(path))return this.inflight.get(path);
  const work=(async()=>{try{const r=await fetch('https://api.sleeper.app/v1/'+path,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Sleeper unavailable');const raw=await r.json(),value=path.startsWith('players/')?compactPlayers(raw):raw,saved=Date.now();this.ctx.storage.sql.exec('INSERT INTO feeds (path,value,updated) VALUES (?,?,?) ON CONFLICT(path) DO UPDATE SET value=excluded.value,updated=excluded.updated',path,JSON.stringify(value),saved);return {value,saved,stale:false};}catch(error){if(old)return {value:JSON.parse(old.value),saved:old.updated,stale:true};throw error;}})();this.inflight.set(path,work);try{return await work;}finally{this.inflight.delete(path);}
 }
 async cachedSource(key,ttl,loader){
  const old=this.ctx.storage.sql.exec('SELECT value,updated FROM feeds WHERE path = ?',key).toArray()[0];
  if(old&&Date.now()-old.updated<ttl)return {value:JSON.parse(old.value),saved:old.updated,stale:false};
  if(this.inflight.has(key))return this.inflight.get(key);
  const work=(async()=>{try{const value=await loader(),saved=Date.now();this.ctx.storage.sql.exec('INSERT INTO feeds (path,value,updated) VALUES (?,?,?) ON CONFLICT(path) DO UPDATE SET value=excluded.value,updated=excluded.updated',key,JSON.stringify(value),saved);return {value,saved,stale:false};}catch(error){if(old)return {value:JSON.parse(old.value),saved:old.updated,stale:true};throw error;}})();
  this.inflight.set(key,work);try{return await work;}finally{this.inflight.delete(key);}
 }
 async nflGames(season,week){
  return this.cachedSource(`nfl-schedule:${season}:${week}`,86400000,async()=>{
   const response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('NFL schedule unavailable');
   const raw=await response.json(),aliases={WSH:'WAS',JAC:'JAX',LA:'LAR'},games=(raw.events||[]).map(ev=>{const c=ev.competitions?.[0]?.competitors||[],abbr=x=>aliases[x?.team?.abbreviation]||x?.team?.abbreviation;return {a:abbr(c[0]),b:abbr(c[1])};}).filter(g=>g.a&&g.b);
   if(games.length<6)throw new Error('NFL schedule is incomplete.');return games;
  });
 }
 async experts(season){
  return this.cachedSource('cbs-ros:'+season,21600000,async()=>{
   const results=await Promise.all(['QB','RB','WR','TE'].map(async pos=>{const response=await fetch(expertURL(pos,season),{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('CBS ROS expert projections are unavailable.');return parseCBS(await response.text(),pos);}));return results.flat();
  });
 }
 async modelData({ranking=false}={}){
  const lf=await this.feed('league/'+LEAGUE),league=lf.value,season=String(league.season),end=Number(league.settings?.playoff_week_start||15)-1,last=Math.min(end,Number(league.settings?.last_scored_leg||0));
  const [uf,rf,pf]=await Promise.all([this.feed('league/'+LEAGUE+'/users'),this.feed('league/'+LEAGUE+'/rosters'),this.feed('players/nfl?active=true')]);
  const data={league,season,users:uf.value,rosters:rf.value,players:pf.value,weeks:{},projections:{},nflGames:{},snapshots:{}},feeds=[lf,uf,rf,pf];
  const jobs=[];
  const run=async()=>{while(jobs.length){const job=jobs.shift();await job();}};
  const finalWeek=ranking?Math.min(3,last):end;
  for(let w=1;w<=finalWeek;w++)jobs.push(async()=>{const f=await this.feed(`league/${LEAGUE}/matchups/${w}`);data.weeks[w]=f.value;feeds.push(f);});
  const start=ranking?1:last+1;
  for(let w=start;w<=(ranking?3:end);w++)jobs.push(async()=>{const f=await this.feed(`projections/nfl/regular/${season}/${w}`);data.projections[w]=Array.isArray(f.value)?Object.fromEntries(f.value.map(r=>[String(r.player_id||r.id),r])):f.value;feeds.push(f);});
  for(let w=ranking?1:last+1;w<=18;w++)jobs.push(async()=>{const f=await this.nflGames(season,w);data.nflGames[w]=f.value;feeds.push(f);});
  await Promise.all(Array.from({length:4},run));
  return {data,last,stale:feeds.some(f=>f.stale),dataAsOf:Math.min(...feeds.map(f=>f.saved))};
 }
 identity(data,id){const roster=data.rosters.find(r=>r.roster_id===id),user=data.users.find(u=>u.user_id===roster?.owner_id);return {manager:MANAGERS[roster?.owner_id]||user?.display_name||'Manager',team:user?.metadata?.team_name||user?.display_name||'Team',avatar:user?.avatar||null};}
 async rankingArchive(){
  return this.cachedSource('published-rankings:2026:v1',86400000,async()=>{
   const {data,last}=await this.modelData({ranking:true}),editions={};
   for(const week of PUBLISHED_RANKING_WEEKS){if(week>last)continue;const key=`analyst-edition:${data.season}:${week}:v1`,saved=await this.ctx.storage.get(key);
    if(saved){editions[week]=saved;continue;}
    const teams=MODEL.historicalRanks(data,week).map(t=>({...t,...this.identity(data,t.roster_id)}));
    const edition={week,teams,reconstructed:true,createdAt:Date.now()};await this.ctx.storage.put(key,edition);editions[week]=edition;
   }
   return {season:data.season,publishedWeeks:PUBLISHED_RANKING_WEEKS,editions};
  });
 }
 async playoffForecast(){
  return this.cachedSource('playoff-model:2026:v1',300000,async()=>{
   const [built,expertFeed]=await Promise.all([this.modelData(),this.experts('2026')]),{data,last,stale,dataAsOf}=built,input=MODEL.buildPlayoffInput(data,expertFeed.value,last),iterations=20000;
   const hashInput=JSON.stringify({teams:input.teams,schedule:input.schedule,spots:input.spots,divisions:input.divisions,median:input.median});let seed=2166136261;for(let i=0;i<hashInput.length;i++)seed=Math.imul(seed^hashInput.charCodeAt(i),16777619)>>>0;
   const teams=MODEL.simulate(input,iterations,seed).map(t=>({...t,...this.identity(data,t.roster_id),record:input.teams.find(x=>x.id===t.roster_id)}));
   return {season:data.season,through:input.through,end:input.end,spots:input.spots,iterations,seed,generatedAt:Date.now(),dataAsOf,expertAsOf:expertFeed.saved,stale:stale||expertFeed.stale,expertSource:'CBS Sports ROS counting-stat projections',expertLinks:['QB','RB','WR','TE'].map(pos=>expertURL(pos,data.season)),expertSlots:input.expertSlots,fallbackSlots:input.fallbackSlots,unsupportedScoring:input.unsupportedScoring,median:input.median,divisions:input.divisions,teams:teams.map(t=>({...t,record:{w:t.record.w,l:t.record.l,t:t.record.t,pf:t.record.pf,pa:t.record.pa}}))};
  });
 }
 async capture(){
  const leagueFeed=await this.feed('league/'+LEAGUE);if(leagueFeed.stale)return;
  const league=leagueFeed.value,season=String(league.season),week=Number(league.settings?.leg||1),last=Math.min(18,Number(league.settings?.last_scored_leg||0));
  const results=await Promise.all([this.feed('league/'+LEAGUE+'/users'),this.feed('league/'+LEAGUE+'/rosters'),this.feed('players/nfl?active=true')]);
  if(results.some(x=>x.stale))return;
  const [users,rosters,players]=results.map(x=>x.value);
  for(const w of new Set([Math.min(18,week),...Array.from({length:last},(_,i)=>i+1)])){
   const key=`snapshot:${season}:${w}`,old=await this.ctx.storage.get(key);
   const response=await this.feed(`league/${LEAGUE}/matchups/${w}`);if(response.stale)continue;
   const rows=response.value;if(rows.length!==rosters.length)continue;
   let meta=old;
   if(!old?.finalized){const ids=new Set(rows.flatMap(r=>r.players||[]));meta={season,week:w,capturedAt:Date.now(),metadataAvailableFrom:old?.metadataAvailableFrom||Date.now(),users,rosters:rosters.map(r=>({roster_id:r.roster_id,owner_id:r.owner_id,reserve:r.reserve||[],players:r.players||[]})),players:Object.fromEntries([...ids].map(id=>[id,players[id]]).filter(([,p])=>p).map(([id,p])=>[id,{player_id:id,full_name:p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' '),position:p.position,fantasy_positions:p.fantasy_positions,team:p.team,injury_status:p.injury_status}]))};}
   await this.ctx.storage.put(key,{...meta,rows,historicalMetadataUnknown:old?.historicalMetadataUnknown??w<week,finalized:w<=last});
  }
  await this.ctx.storage.put('snapshot-season',season);
 }
 async fetch(request){
  const url=new URL(request.url);
  try{
   if(url.pathname==='/api/playoffs'||url.pathname==='/api/rankings'){try{const feed=url.pathname==='/api/playoffs'?await this.playoffForecast():await this.rankingArchive();return Response.json({...feed.value,stale:feed.stale||feed.value.stale},{headers:{'Cache-Control':'no-store'}});}catch(error){return Response.json({error:error.message},{status:503});}}
   if(url.pathname==='/api/snapshots'){const season=await this.ctx.storage.get('snapshot-season');if(!season)return Response.json({weeks:{}});const entries=await this.ctx.storage.list({prefix:`snapshot:${season}:`});return Response.json({season,weeks:Object.fromEntries([...entries].map(([,v])=>[v.week,v]))},{headers:{'Cache-Control':'no-store'}});}
   const path=url.pathname.slice('/api/sleeper/'.length)+url.search;
   if(!allowedPath(path))return Response.json({error:'Unsupported feed'},{status:404});
   const r=await this.feed(path);return Response.json(r.value,{headers:{'X-Data-Updated':String(r.saved),'X-Data-Stale':String(r.stale),'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Feed temporarily unavailable'},{status:503});}
 }
}
export default {
 async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/')){if(request.method!=='GET')return new Response('Method not allowed',{status:405});return env.LEAGUE_STORE.getByName(LEAGUE).fetch(request);}return env.ASSETS.fetch(request);},
 async scheduled(controller,env,ctx){const store=env.LEAGUE_STORE.getByName(LEAGUE);ctx.waitUntil((async()=>{await store.capture();await Promise.allSettled([store.playoffForecast(),store.rankingArchive()]);})());}
};
