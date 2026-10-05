const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
module.exports=async function(){
 const LEAGUE='1388389962587590656',script=require('esbuild').buildSync({entryPoints:[path.resolve(__dirname,'../worker.js')],bundle:true,write:false,format:'esm',external:['cloudflare:workers']}).outputFiles[0].text;
 let offline=false,week=2,last=1,team='BUF',calls=0;
 const outbound=async request=>{calls++;if(offline)return new Response('Offline',{status:503});const p=new URL(request.url).pathname;
  let value;if(p==='/v1/league/'+LEAGUE)value={season:'2026',settings:{leg:week,last_scored_leg:last}};
  else if(p.endsWith('/users'))value=[{user_id:'test',display_name:'Owner'}];
  else if(p.endsWith('/rosters'))value=[{roster_id:1,owner_id:'test',players:['q'],reserve:[]}];
  else if(p==='/v1/players/nfl')value={q:{full_name:'Quarterback',team,position:'QB',fantasy_positions:['QB']}};
  else if(p.includes('/matchups/'))value=[{roster_id:1,matchup_id:1,points:10,players:['q'],starters:['q'],players_points:{q:10}}];
  else throw new Error('Unexpected worker fixture '+request.url);
  return Response.json(value);
 };
 const options=convertV4MiniflareOptions({name:'dirtyds-test',modules:true,script,compatibilityDate:'2026-10-05',durableObjects:{LEAGUE_STORE:{className:'LeagueStore',useSQLite:true}},outboundService:outbound,serviceBindings:{ASSETS:()=>new Response('static')},host:'127.0.0.1',port:0});options.unsafeInspectDurableObjects=true;const mf=new Miniflare(options);
 try{
  assert.equal((await mf.dispatchFetch('http://test/api/sleeper/league/not-our-league')).status,404);assert.equal((await mf.dispatchFetch('http://test/api/sleeper/state/nfl',{method:'POST'})).status,405);
  const env=await mf.getBindings(),store=env.LEAGUE_STORE.getByName(LEAGUE);await store.capture();
  let snapshots=await (await mf.dispatchFetch('http://test/api/snapshots')).json();assert.equal(snapshots.weeks[1].players.q.team,'BUF');assert.equal(snapshots.weeks[1].historicalMetadataUnknown,true);assert.equal(snapshots.weeks[2].historicalMetadataUnknown,false);
  const count=calls;await mf.dispatchFetch('http://test/api/sleeper/league/'+LEAGUE);await mf.dispatchFetch('http://test/api/sleeper/league/'+LEAGUE);assert.equal(calls,count,'server cache shares upstream requests');
  const storage=await mf.unsafeGetDurableObjectStorage('dirtyds-test','LeagueStore',{name:LEAGUE});await storage.exec('UPDATE feeds SET updated = 0');team='NYJ';week=3;last=2;await store.capture();
  snapshots=await (await mf.dispatchFetch('http://test/api/snapshots')).json();assert.equal(snapshots.weeks[1].players.q.team,'BUF','closed snapshots keep player metadata');assert.equal(snapshots.weeks[2].finalized,true);assert.equal(snapshots.weeks[3].players.q.team,'NYJ');
  await storage.exec('UPDATE feeds SET updated = 0');offline=true;const cached=await mf.dispatchFetch('http://test/api/sleeper/league/'+LEAGUE);assert.equal(cached.status,200);assert.equal(cached.headers.get('X-Data-Stale'),'true','server cache labels stale fallback');
  console.log('PASS: Cloudflare runtime, SQLite cache, Durable Object snapshots, path restrictions and stale fallback');
 }finally{await mf.dispose();}
};
