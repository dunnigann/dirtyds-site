import {DurableObject} from 'cloudflare:workers';
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
   if(url.pathname==='/api/snapshots'){const season=await this.ctx.storage.get('snapshot-season');if(!season)return Response.json({weeks:{}});const entries=await this.ctx.storage.list({prefix:`snapshot:${season}:`});return Response.json({season,weeks:Object.fromEntries([...entries].map(([,v])=>[v.week,v]))},{headers:{'Cache-Control':'no-store'}});}
   const path=url.pathname.slice('/api/sleeper/'.length)+url.search;
   if(!allowedPath(path))return Response.json({error:'Unsupported feed'},{status:404});
   const r=await this.feed(path);return Response.json(r.value,{headers:{'X-Data-Updated':String(r.saved),'X-Data-Stale':String(r.stale),'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'Feed temporarily unavailable'},{status:503});}
 }
}
export default {
 async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/')){if(request.method!=='GET')return new Response('Method not allowed',{status:405});return env.LEAGUE_STORE.getByName(LEAGUE).fetch(request);}return env.ASSETS.fetch(request);},
 async scheduled(controller,env,ctx){ctx.waitUntil(env.LEAGUE_STORE.getByName(LEAGUE).capture());}
};
