/* Retriable, timestamped data bridge. No playoff calculations. */
(() => {
 'use strict';
 const LEAGUE_ID='1388389962587590656',API='https://api.sleeper.app/v1',DAY=86400000;
 const data={league:null,users:[],rosters:[],players:{},state:null,drafts:[],picks:[],weeks:{},transactions:{},stats:{},projections:{},rosProjections:{},snapshots:{},nflGames:{},season:'2026',feeds:{},updatedAt:0};
 const clock={},pending=new Map();let readyPromise=null,refreshPromise=null,proxy=null;
 const cacheKey=p=>'dirtyds-v6:'+p;
 const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
 const getSaved=p=>{try{return JSON.parse(localStorage.getItem(cacheKey(p))||'null');}catch{return null;}};
 const save=(p,v)=>{try{localStorage.setItem(cacheKey(p),JSON.stringify(v));}catch{}};
 const mark=(p,saved,stale,error='')=>{data.feeds[p]={saved,stale,error};};
 async function request(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),10000);try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(`Feed returned ${r.status}`);return {value:await r.json(),saved:Number(r.headers.get('X-Data-Updated'))||Date.now(),stale:r.headers.get('X-Data-Stale')==='true'};}finally{clearTimeout(timer);}}
 async function json(path,ttl=60000,force=false,transform=x=>x){
  const saved=getSaved(path);if(!force&&saved&&Date.now()-saved.saved<ttl){mark(path,saved.saved,Boolean(saved.stale));return saved.value;}
  if(pending.has(path))return pending.get(path);
  const work=(async()=>{let error;for(let attempt=0;attempt<2;attempt++){try{let result;if(proxy!==false){try{result=await request('/api/sleeper/'+path);proxy=true;}catch{proxy=false;}}if(!result)result=await request(API+'/'+path);result.value=transform(result.value);save(path,result);mark(path,result.saved,result.stale);return result.value;}catch(err){error=err;if(attempt===0)await new Promise(r=>setTimeout(r,250));}}
   if(saved){mark(path,saved.saved,true,error.message);return saved.value;}mark(path,0,true,error?.message||'Unavailable');throw error;
  })();pending.set(path,work);try{return await work;}finally{pending.delete(path);}
 }
 function slimPlayerMap(raw){return Object.fromEntries(Object.entries(raw||{}).filter(([id,p])=>p&&(['QB','RB','WR','TE','K','DEF'].includes(p.position)||/^[A-Z]{2,3}$/.test(id))).map(([id,p])=>[String(id),{player_id:String(p.player_id||id),first_name:p.first_name||'',last_name:p.last_name||'',full_name:p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' '),position:p.position||p.fantasy_positions?.[0]||'',fantasy_positions:p.fantasy_positions||[],team:p.team||'',espn_id:p.espn_id||'',injury_status:p.injury_status||null,depth_chart_order:p.depth_chart_order??null,depth_chart_position:p.depth_chart_position||'',status:p.status||''}]))}
 function normalizeMap(raw){return Array.isArray(raw)?Object.fromEntries(raw.map(x=>[String(x.player_id||x.id||''),x]).filter(x=>x[0])):raw||{};}
 function slimStats(raw){const keys=new Set([...Object.keys(data.league?.scoring_settings||{}),'gp','fgm_50p','fgmiss','fgmiss_0_19','fgmiss_20_29','fgmiss_30_39','fgmiss_40_49','fgmiss_50p']);return Object.fromEntries(Object.entries(normalizeMap(raw)).filter(([id])=>/^[A-Z]{2,3}$/.test(id)||['QB','RB','WR','TE','K'].includes(data.players[id]?.position)).map(([id,row])=>[id,Object.fromEntries(Object.entries(row.stats||row).filter(([k,v])=>keys.has(k)&&v!==null&&Number.isFinite(Number(v))))]).filter(([,row])=>Object.keys(row).some(k=>k!=='gp')));}
 function currentWeek(){return Math.max(1,Math.min(18,Number(data.state?.season===data.season?data.state?.week:data.league?.settings?.leg)||1));}
 const finalized=w=>Number(w)<=Number(data.league?.settings?.last_scored_leg||0);
 async function getWeek(w,force=false){w=Number(w);if(!Number.isInteger(w)||w<1||w>18)throw new Error('Invalid week');const ttl=finalized(w)?21600000:45000;if(!force&&data.weeks[w]&&Date.now()-(clock['w'+w]||0)<ttl)return data.weeks[w];data.weeks[w]=await json(`league/${LEAGUE_ID}/matchups/${w}`,ttl,force);clock['w'+w]=Date.now();captureSnapshot(w);return data.weeks[w];}
 async function getProjections(w,force=false){w=Number(w);if(!force&&data.projections[w]&&Date.now()-(clock['p'+w]||0)<900000)return data.projections[w];try{data.projections[w]=await json(`projections/nfl/regular/${data.season}/${w}`,900000,force,slimStats);clock['p'+w]=Date.now();}catch{delete data.projections[w];}return data.projections[w]||{};}
 async function getROSProjections(force=false){try{data.rosProjections=await json(`projections/nfl/regular/${data.season}`,DAY,force,slimStats);}catch{}return data.rosProjections;}
 async function getTransactions(w,force=false){w=Number(w);if(w<0||w>18||!Number.isInteger(w))throw new Error('Invalid transaction week');const ttl=w<currentWeek()?21600000:60000;if(!force&&data.transactions[w]&&Date.now()-(clock['t'+w]||0)<ttl)return data.transactions[w];data.transactions[w]=await json(`league/${LEAGUE_ID}/transactions/${w}`,ttl,force);clock['t'+w]=Date.now();return data.transactions[w];}
 function captureSnapshot(w){
  if(!data.weeks[w]||!data.users.length)return;
  const key='snapshot/'+data.season+'/'+w,old=data.snapshots[w]||getSaved(key)?.value,ids=new Set(data.weeks[w].flatMap(r=>r.players||[]));
  const meta=old?.finalized?old:{capturedAt:Date.now(),season:data.season,week:w,users:data.users,rosters:data.rosters,players:Object.fromEntries([...ids].map(id=>[id,data.players[id]]).filter(([,p])=>p)),metadataAvailableFrom:old?.metadataAvailableFrom||Date.now(),historicalMetadataUnknown:old?.historicalMetadataUnknown??w<currentWeek()};
  data.snapshots[w]=clone({...meta,rows:data.weeks[w],finalized:finalized(w)});save(key,{value:data.snapshots[w],saved:Date.now()});
 }
 async function loadSnapshots(){try{const result=await request('/api/snapshots');if(result.value.season===data.season)Object.assign(data.snapshots,result.value.weeks||{});}catch{}}
 async function init(force=false){
  if(readyPromise&&!force)return readyPromise;
  if(force&&proxy===false)proxy=null;
  readyPromise=(async()=>{
   data.league=await json(`league/${LEAGUE_ID}`,60000,force);data.season=String(data.league.season||'2026');
   [data.users,data.rosters]=await Promise.all([json(`league/${LEAGUE_ID}/users`,300000,force),json(`league/${LEAGUE_ID}/rosters`,45000,force)]);
   const optional=await Promise.allSettled([json('state/nfl',60000,force),json(`league/${LEAGUE_ID}/drafts`,DAY,force),json('players/nfl?active=true',DAY,false,slimPlayerMap)]);
   if(optional[0].status==='fulfilled')data.state=optional[0].value;if(optional[1].status==='fulfilled')data.drafts=optional[1].value;if(optional[2].status==='fulfilled')data.players=optional[2].value;
   const draftId=data.league.draft_id||data.drafts[0]?.draft_id;if(draftId)try{data.picks=await json(`draft/${draftId}/picks`,DAY,false);}catch{}
   await loadSnapshots();await Promise.allSettled([getWeek(currentWeek(),force),getProjections(currentWeek(),force)]);data.updatedAt=Date.now();return data;
  })();try{return await readyPromise;}catch(err){readyPromise=null;throw err;}
 }
 async function loadHistory(){await init();await Promise.allSettled(Array.from({length:currentWeek()},(_,i)=>getWeek(i+1)));}
 async function loadStats(force=false){await init();try{data.stats=await json(`stats/nfl/regular/${data.season}`,300000,force,slimStats);}catch{}return data.stats;}
 async function getNflGames(w,force=false){
  const key='espn/'+data.season+'/'+w,saved=getSaved(key),ttl=w===currentWeek()?45000:DAY;
  if(!force&&saved&&Date.now()-saved.saved<ttl){data.nflGames[w]=saved.value;return saved.value;}
  try{const result=await request(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${data.season}&seasontype=2&week=${w}`);const aliases={WSH:'WAS',JAC:'JAX',LA:'LAR'};
   const games=(result.value.events||[]).map(ev=>{const c=ev.competitions?.[0]?.competitors||[],abbr=x=>aliases[x?.team?.abbreviation]||x?.team?.abbreviation||'',period=Number(ev.status?.period||0),parts=String(ev.status?.displayClock||'0:00').split(':').map(Number),seconds=(parts[0]||0)*60+(parts[1]||0);return {a:abbr(c[1]),b:abbr(c[0]),aScore:Number(c[1]?.score||0),bScore:Number(c[0]?.score||0),status:ev.status?.type?.shortDetail||'',state:ev.status?.type?.state||'pre',completed:Boolean(ev.status?.type?.completed),remaining:ev.status?.type?.state==='pre'?1:ev.status?.type?.completed?0:Math.max(0,Math.min(1,((4-period)*900+seconds)/3600))};}).filter(g=>g.a&&g.b);
   if(!games.length)throw new Error('Schedule unavailable');save(key,{value:games,saved:Date.now()});data.nflGames[w]=games;return games;
  }catch{data.nflGames[w]=saved?.value||[];return data.nflGames[w];}
 }
 async function loadRankings(force=false){await init();await Promise.all([loadHistory(),loadStats(force)]);const end=Math.min(18,Number(data.league.settings?.playoff_week_start||15)-1);let next=currentWeek();async function worker(){while(next<=end){const w=next++;await Promise.all([getProjections(w,force),getNflGames(w,force)]);}}await Promise.all(Array.from({length:3},worker));return data;}
 async function refresh(){if(refreshPromise)return refreshPromise;refreshPromise=init(true);try{return await refreshPromise;}finally{refreshPromise=null;}}
 const user=id=>data.users.find(x=>String(x.user_id)===String(id)),roster=id=>data.rosters.find(x=>Number(x.roster_id)===Number(id)),rosterUser=r=>user(r?.owner_id);
 const teamName=r=>{const u=rosterUser(r);return u?.metadata?.team_name||u?.display_name||u?.username||`Roster ${r?.roster_id??''}`;};
 const managerName=r=>{const u=rosterUser(r);return u?.display_name||u?.username||teamName(r);};
 const player=id=>data.players[String(id)]||(/^[A-Z]{2,3}$/.test(String(id))?{player_id:String(id),full_name:`${id} D/ST`,position:'DEF',fantasy_positions:['DEF'],team:String(id)}:{player_id:String(id),full_name:`Player ${id}`,position:'',team:''});
 const fullName=id=>player(id).full_name,headshot=id=>id&&player(id).position!=='DEF'?`https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(id)}.jpg`:'';
 const scoreDetails=(row,id)=>window.DIRTY_DS_SCORING.calculate(row,data.league?.scoring_settings||{},{actual:data.stats[id]}),leaguePoints=(row,id)=>scoreDetails(row,id).points;
 const pickCost=p=>{const m=p?.metadata||{},v=m.amount??m.price??m.cost??m.bid_amount??p?.amount??p?.price;return v==null||v===''?null:Number(v);},pickPlayerId=p=>String(p?.player_id||p?.metadata?.player_id||'');
 window.DIRTY_DS_LIVE={LEAGUE_ID,data,init,refresh,loadHistory,loadStats,loadRankings,getNflGames,getWeek,getTransactions,getProjections,getROSProjections,currentWeek,user,roster,rosterUser,teamName,managerName,player,fullName,headshot,leaguePoints,statPoints:leaguePoints,projectionPoints:leaguePoints,scoreDetails,pickCost,pickPlayerId};
 Object.defineProperty(window.DIRTY_DS_LIVE,'ready',{get:()=>init()});
})();
