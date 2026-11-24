/* Exact seed paths from Sleeper and the existing server forecast are independent. */
const playoffView={teamId:null,seed:null,route:null,key:null,paths:new Map()};
let playoffWorker,playoffRequest=0,playoffGuideGeneration=0,playoffOddsGeneration=0;
const playoffInflight=new Map();

function calculatePlayoffPaths(model,teamId){
 const key=`${model.stamp}:${teamId}`;
 if(playoffView.paths.has(key))return playoffView.paths.get(key);
 const result=new Promise((resolve,reject)=>{
  // The same solver runs directly when workers are unavailable.
  const direct=()=>setTimeout(()=>{try{resolve(window.DIRTY_DS_SEED_GUIDE.buildPaths(model,teamId));}catch(error){reject(error);}},0);
  try{
   if(!playoffWorker){
    playoffWorker=new Worker(window.DIRTY_DS_ASSETS['assets/js/seed-scenarios.js']);
    playoffWorker.onmessage=({data})=>{
     const done=playoffInflight.get(data.request);
     if(!done)return;
     playoffInflight.delete(data.request);
     data.error?done():done(data.paths);
    };
    playoffWorker.onerror=()=>{
     playoffWorker.terminate();playoffWorker=null;
     for(const done of playoffInflight.values())done();
     playoffInflight.clear();
    };
   }
   const request=++playoffRequest;
   playoffInflight.set(request,paths=>paths?resolve(paths):direct());
   try{playoffWorker.postMessage({request,model,teamId});}
   catch{playoffInflight.delete(request);direct();}
  }catch{direct();}
 });
 playoffView.paths.set(key,result);
 result.catch(()=>playoffView.paths.delete(key));
 return result;
}
const spPoints=cents=>(Math.abs(cents)/100).toFixed(2);
const spTeam=(model,id)=>model.teams.find(t=>t.id===id);
const spOwner=(model,id)=>e(spTeam(model,id)?.owner||'Unknown team');
const spOwners=(model,ids)=>new Intl.ListFormat('en',{style:'long',type:'conjunction'}).format(ids.map(id=>spOwner(model,id)));
const spRecord=t=>`${t.w}–${t.l}${t.t?`–${t.t}`:''}`;
const spBracket=(model,seed)=>seed<=model.byes?'First-round bye':seed<=model.qualifiers?'Championship bracket':'Outside the playoff field';

function spMargin(r,direction=1){
 const gap=direction*r.gap,tieOnly=direction===1?r.tieAheadOnly:r.tieBehindOnly;
 if(tieOnly)return `${gap<0?`Outscore by exactly <strong>${spPoints(gap)} pts</strong>`:gap>0?`Be outscored by exactly <strong>${spPoints(gap)} pts</strong>`:'Match their remaining points'} to tie in PF, then take the next tiebreaker.`;
 if(gap<=0)return `Outscore by at least <strong>${spPoints(1-gap)} pts</strong> the rest of the way to pass on PF.`;
 if(gap===1)return 'Match or beat their scoring the rest of the way.';
 return `Can be outscored by up to <strong>${spPoints(gap-1)} pts</strong> the rest of the way and stay ahead.`;
}
function spOutcomes(model,games,selfId=null){
 return `<ul class="sp-outcomes">${games.map(g=>{
  const rival=g.a===selfId?g.b:g.a,loser=g.winner===g.a?g.b:g.a;
  const text=selfId===null?(g.winner===null?`${spOwner(model,g.a)} and ${spOwner(model,g.b)} tie`:`${spOwner(model,g.winner)} beats ${spOwner(model,loser)}`):
   `${g.winner===null?'Tie':g.winner===selfId?'Beat':'Lose to'} ${spOwner(model,rival)}`;
  return `<li><span>Week ${g.week}</span><strong>${text}</strong></li>`;
 }).join('')}</ul>`;
}
function spRankConditions(model,team,path){
 const {gate,record}=path,owner=e(team.owner),locked=gate.locked.length,rivals=gate.rivals.length;
 const already=locked?`<p class="sp-context">${spOwners(model,gate.locked)} ${locked===1?'is':'are'} already ahead given these results.</p>`:'';
 if(!rivals)return `${already}<p>These results alone secure this seed.</p>`;
 const direction=gate.extra===0?1:gate.extra===rivals?-1:0;
 const headline=direction===1?`Keep the teams below behind ${owner}.`:direction===-1?`All ${rivals} ${rivals===1?'team needs':'teams need'} to finish ahead of ${owner}.`:
  `Exactly <strong>${gate.extra} of the ${rivals}</strong> teams below must finish ahead of ${owner}.`;
 const details=gate.rivals.map(r=>{
  let line;
  if(direction===1){
   line=r.lower&&r.higher?`Finish ${record} or worse.`:r.higher&&!r.lower?(r.room===0&&r.open>0?`Must lose all ${r.open} remaining ${r.open===1?'game':'games'}.`:`Cannot finish better than ${record}.`):r.lower?`Can only catch ${owner} by matching ${record}.`:`Finishes tied at ${record} given these results.`;
  }else if(direction===-1){
   line=r.higher?`Finish ahead of ${record} or win the tiebreaker.`:`Must reach ${record} to have a chance on points.`;
  }else line=r.higher?`Can finish above ${record} on record.`:`Can only pass ${owner} by matching ${record}.`;
  const points=r.tied&&r.points?` <span class="sp-margin">If records tie: ${direction===-1?`${spOwner(model,r.id)} needs the edge. `:direction===0?`For ${owner} to stay ahead: `:''}${spMargin(r,direction||1)}</span>`:'';
  return `<li><strong>${spOwner(model,r.id)}</strong><div>${line}${points}</div></li>`;
 }).join('');
 return `${already}<p>${headline}</p><ul class="sp-rivals">${details}</ul>`;
}
function spExample(model,path,team){
 const tie=path.points,cases=tie?`<div class="sp-example-points"><p>${e(team.owner)} must finish ahead of <strong>${tie.ahead}</strong> and behind <strong>${tie.behind}</strong> of these teams on the points tiebreaker: ${spOwners(model,tie.rivals.map(r=>r.id))}.</p></div>`:'';
 if(!path.help.length&&!cases)return '';
 const others=path.help.length?spOutcomes(model,path.help):'<p>No other matchup results are required for this example.</p>';
 return `<details class="sp-example"><summary>One set of results that works</summary><div>${others}${cases}<p class="sp-context">Unlisted matchups can go either way for this example.</p></div></details>`;
}

function drawPlayoffSeed(model,team,seeds,inside){
 const result=seeds.find(x=>x.seed===playoffView.seed)||seeds[0];
 playoffView.seed=result.seed;
 const path=result.paths.find(x=>x.route===playoffView.route)||result.paths[0];
 playoffView.route=path.route;
 inside.querySelectorAll('[data-playoff-seed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.playoffSeed)===result.seed)));
 inside.querySelector('.sp-path').innerHTML=`<div class="sp-path-top"><div><span class="sp-tag">${spBracket(model,result.seed)}</span><h3>Seed ${result.seed}</h3></div>${result.paths.length>1?`<label class="sp-select-label"><span>Remaining results</span><select class="sp-select" id="sp-finish">${result.paths.map(p=>`<option value="${p.route}" ${p.route===path.route?'selected':''}>${p.finish} · ${p.own.map((g,i)=>`W${g.week} ${({W:'Win',L:'Loss',T:'Tie'})[p.route[i]]}`).join(', ')}</option>`).join('')}</select></label>`:''}</div>
 <div class="sp-plan"><section><h4>${e(team.owner)}’s games</h4>${path.own.length?spOutcomes(model,path.own,team.id):'<p>Regular season complete.</p>'}<p class="sp-finish">Final record <strong>${path.record}</strong></p></section><section><h4>Around the league</h4>${spRankConditions(model,team,path)}</section></div>${spExample(model,path,team)}`;
 inside.querySelector('#sp-finish')?.addEventListener('change',event=>{
  playoffView.route=event.target.value;drawPlayoffSeed(model,team,seeds,inside);
  inside.querySelector('#sp-finish')?.focus({preventScroll:true});
 });
}

async function drawPlayoffGuide(model,inside){
 const team=spTeam(model,playoffView.teamId);
 if(!team)return;
 inside.setAttribute('aria-busy','true');
 inside.innerHTML='<p class="sp-state" role="status">Calculating possible seeds…</p>';
 try{
  const result=await calculatePlayoffPaths(model,team.id);
  if(!inside.isConnected||playoffView.teamId!==team.id||inside.dataset.team!==String(team.id))return;
  if(!result){inside.innerHTML='<p class="sp-state">Waiting for Sleeper to finalize the previous week.</p>';return;}
  if(result.eliminated){inside.innerHTML='<p class="sp-state sp-eliminated"><strong>Eliminated</strong></p>';return;}
  inside.innerHTML=`<div class="sp-seed-picker"><div class="sp-seed-label"><strong>Possible seeds</strong>${result.clinched?'<span class="sp-clinched">Playoff spot clinched</span>':''}</div><div class="sp-seed-buttons" role="group" aria-label="Choose a possible seed">${result.seeds.map(({seed})=>`<button type="button" aria-pressed="false" aria-label="Seed ${seed}, ${spBracket(model,seed).toLowerCase()}" data-playoff-seed="${seed}" class="${seed<=model.qualifiers?'sp-in-bracket':''}">${seed}</button>`).join('')}</div></div><div class="sp-path"></div>`;
  const wanted=playoffView.seed,defaultSeed=result.seeds.some(x=>x.seed===team.standing)?team.standing:result.seeds[0].seed;
  if(!result.seeds.some(x=>x.seed===wanted))playoffView.seed=defaultSeed;
  inside.querySelectorAll('[data-playoff-seed]').forEach(b=>b.onclick=()=>{
   if(Number(b.dataset.playoffSeed)!==playoffView.seed)playoffView.route=null;
   playoffView.seed=Number(b.dataset.playoffSeed);drawPlayoffSeed(model,team,result.seeds,inside);
  });
  drawPlayoffSeed(model,team,result.seeds,inside);
 }catch{
  if(inside.isConnected&&inside.dataset.team===String(team.id))inside.innerHTML='<p class="sp-state">Seed paths couldn’t be calculated. Refresh to try again.</p>';
 }finally{
  if(inside.dataset.team===String(team.id))inside.setAttribute('aria-busy','false');
 }
}

async function refreshPlayoffGuide(force=false){
 const root=document.getElementById('playoffGuide');
 if(!root)return;
 const generation=++playoffGuideGeneration;
 const active=()=>root.isConnected&&currentPage==='playoffs'&&generation===playoffGuideGeneration;
 const drawStatus=message=>{
  root.hidden=false;root.innerHTML=`<section class="sp-block" aria-labelledby="sp-guide-heading"><div class="sp-section-top"><h2 id="sp-guide-heading">Seed scenarios</h2></div><p class="sp-state" role="status">${e(message)}</p></section>`;
 };
 try{
  const data=await SL.loadSeedSchedule(force);
  if(!active())return;
  if(!data){root.hidden=true;root.replaceChildren();return;}
  if(data.waiting||data.error){drawStatus(data.error||'Waiting for Sleeper to finalize the previous week.');return;}
  const teams=data.rosters.map(r=>{
   const user=data.users.find(u=>String(u.user_id)===String(r.owner_id)),owner=canonicalUser(user)||user?.display_name||'Roster '+r.roster_id;
   return {id:r.roster_id,owner,name:user?.metadata?.team_name||user?.display_name||owner};
  });
  let model;
  try{model=window.DIRTY_DS_SEED_GUIDE.prepare({...data,teams});}
  catch(error){drawStatus(error.message);return;}
  if(!model){root.hidden=true;root.replaceChildren();return;}
  if(playoffView.key===model.stamp&&!root.hidden&&root.querySelector('#sp-team'))return;
  if(playoffView.key!==model.stamp){playoffView.key=model.stamp;playoffView.paths.clear();}
  if(!spTeam(model,playoffView.teamId))playoffView.teamId=(model.order.find(t=>t.owner==='Jack')||model.order[0]).id;
  root.hidden=false;
  root.innerHTML=`<section class="sp-block" aria-labelledby="sp-guide-heading">
   <div class="sp-section-top"><div><h2 id="sp-guide-heading">Seed scenarios</h2><p class="sp-context">Results through Week ${model.through}${model.remaining.length?` · ${model.through+1===model.end?`Week ${model.end}`:`Weeks ${model.through+1}–${model.end}`} left`:''}</p></div>
    <label class="sp-select-label"><span>Team</span><select id="sp-team" class="sp-select">${model.order.map(t=>`<option value="${t.id}" ${t.id===playoffView.teamId?'selected':''}>${e(t.name)} · ${e(t.owner)}</option>`).join('')}</select></label></div>
   <div id="sp-team-current" class="sp-team-current"></div><div id="sp-guide"></div>
   <details class="sp-method"><summary>Seeding rules</summary><p>The top ${model.qualifiers} make the playoffs${model.byes?` and the top ${model.byes} get a bye`:''}. Sleeper ranks teams by record (a tie is half a win), points for, then higher points against. If all three are tied, Sleeper uses a coin toss unless the commissioner overrides the seed. Unfinished games can go either way.</p></details></section>`;
  const pick=root.querySelector('#sp-team'),guide=root.querySelector('#sp-guide');
  const teamChange=()=>{
   guide.dataset.team=String(playoffView.teamId);
   const t=spTeam(model,playoffView.teamId);
   root.querySelector('#sp-team-current').innerHTML=`<span>Current seed <strong>${t.standing}</strong></span><span>Record <strong>${spRecord(t)}</strong></span><span>Points for <strong>${spPoints(t.pf)}</strong></span>`;
   drawPlayoffGuide(model,guide);
  };
  pick.addEventListener('change',()=>{playoffView.teamId=Number(pick.value);playoffView.seed=null;playoffView.route=null;teamChange();});
  teamChange();
 }catch{
  if(!active())return;
  // With no verified league week, don't leave a stale Week 12–14 guide on the page.
  root.hidden=true;root.replaceChildren();
 }
}

const playoffPercent=n=>n===100?'100%':n===0?'0%':n>=99.95?'>99.9%':n<.05?'<0.1%':n.toFixed(1)+'%';
function playoffProbability(value,label){
 if(!Number.isFinite(value))return '—';
 const n=Math.max(0,Math.min(100,value));
 return `<div class="sp-probability"><span>${e(playoffPercent(n))}</span><span class="sp-probability-track" role="meter" aria-label="${e(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n.toFixed(2)}"><i style="width:${n}%"></i></span></div>`;
}
async function refreshPlayoffOdds(){
 const root=document.getElementById('playoffOdds');
 if(!root)return;
 const generation=++playoffOddsGeneration;
 const active=()=>root.isConnected&&currentPage==='playoffs'&&generation===playoffOddsGeneration;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);let response;
  try{response=await fetch('/api/playoffs',{signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timer);}
  const model=await response.json();if(!response.ok)throw new Error(model.error||'The playoff model is temporarily unavailable.');
  if(!active())return;
  if(!Array.isArray(model.teams)||!model.teams.length)throw new Error('No validated simulation results were returned.');
  const byes=2**Math.ceil(Math.log2(model.spots))-model.spots,average=t=>Number.isFinite(t)?t.toFixed(1):'—';
  root.innerHTML=`<p class="sp-context">${model.spots} playoff spots · Records through Week ${model.through} · ${fmt(model.iterations,0)} simulations${model.stale?' · Last saved forecast':''}</p>
  ${model.cutoff?`<div class="sp-cutoff"><strong>Projected cutoff <span>${weekRecord(model.cutoff.record)}</span></strong><p>Most common record for Seed ${model.cutoff.seed} (${playoffPercent(model.cutoff.probability)} of simulations). The same record can miss on tiebreakers.</p></div>`:''}
  <div class="sp-table-wrap"><table aria-label="Playoff odds by team"><thead><tr><th scope="col">Team</th><th scope="col">Playoffs</th><th scope="col">First-round bye</th><th scope="col">Expected seed</th><th scope="col">Expected wins</th></tr></thead><tbody>${model.teams.map(t=>{
   const seeds=Array.isArray(t.seedProbabilities)?t.seedProbabilities:null;
   const bye=seeds?.slice(0,byes).reduce((a,b)=>a+b,0),expected=seeds?.reduce((sum,n,i)=>sum+n*(i+1)/100,0);
   return `<tr><th scope="row"><strong>${e(t.team)}</strong><small>${e(t.manager)} · ${weekRecord(t.record)}</small></th><td>${playoffProbability(t.odds,`${t.manager} playoff odds`)}</td><td>${playoffProbability(bye,`${t.manager} first-round bye odds`)}</td><td>${average(expected)}</td><td>${average(t.expectedWins)}</td></tr>`;
  }).join('')}</tbody></table></div><details class="sp-method"><summary>How the forecast works</summary><p>Each simulation starts with finalized games through Week ${model.through}: wins, losses, ties, points for and points against stay fixed. ${model.through<model.end?`The real Sleeper opponent pairings are simulated from Week ${model.through+1} through Week ${model.end}.`:'The regular season is complete.'} An unfinished week is simulated in full; in-progress points are not locked into this forecast.</p><p>CBS Sports expert ROS counting-stat projections are re-scored under this league’s scoring settings and divided by projected games played. For each future week, we select the highest-projected legal lineup from each current roster, using each player once. Confirmed NFL byes force bench replacements. Current unavailable players miss the earliest scheduled games implied by the expert games-played forecast (at least one); this is a recovery assumption, not a confirmed return date. If rearranging the roster still leaves a gap, the model adds the highest-projected eligible free agents needed to complete it. These are temporary weekly streaming assumptions, not actual transactions; full rosters are not upgraded. Free agents exclude every team’s roster, IR and taxi squad. Same-week pickups are exclusive, awarded in current waiver-position order (otherwise worst current record/PF first); availability resets next week. Future trades are not forecast.</p><p>Scores vary using position-based player standard deviations: QB 35%, RB 50%, WR 60%, TE 65%, K 45%, DEF 75% of the expected score, with a 3-point minimum (5 for defense). Same-NFL-team players have 15% positive correlation. These are modeling assumptions, not a calibrated claim of predictive accuracy. Team scores are sampled from a normal distribution and rounded to two decimals; ties remain ties.</p><p>Seeding follows Sleeper: overall winning percentage (ties count as half a win), total points for, then higher points against, then a random coin toss. ${model.divisions>1?'Division winners receive the leading seeds before remaining qualifiers.':'There are no division-winner reservations.'} ${model.median?'The league’s extra game against the median is included.':''} Commissioner overrides cannot be inferred from the API.</p><p>${model.expertSlots} starter-week slots use CBS ROS; ${model.fallbackSlots} use fallback projections or replacement estimates. ${model.waiverSlots||0} slots are modeled waiver pickups. ${model.recentProjectionSlots||0} use the average of up to three recent positive Sleeper projections when a future projection is missing or zero, with current availability and future byes still checked. ${model.estimatedReplacementSlots||0} use a generic replacement-level estimate because no eligible free agent had a positive forecast; these are explicitly estimates, not named expert-projected pickups. Emergency estimates are QB 12, RB 5, WR 6, TE 4, K 6 and DEF 5 points. No starting slot is left empty or projected at zero. Missing finalized results or opponent schedules can still stop publication. ${model.unsupportedScoring?.length?`The ROS stat source does not project these scoring fields: ${e(model.unsupportedScoring.join(', '))}. They are omitted from ROS scoring, so the forecast is approximate.`:''}</p><p>Expert data checked ${e(new Date(model.expertAsOf).toLocaleString())}. Forecast generated ${e(new Date(model.generatedAt).toLocaleString())}. Cached for five minutes; expert forecasts refresh every six hours. With 20,000 simulations, the largest Monte Carlo sampling error is about ±0.7 percentage points at 95% confidence; forecast uncertainty is larger.</p><p>${(model.expertLinks||[]).map((url,i)=>`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">CBS ${['QB','RB','WR','TE'][i]} ROS projections</a>`).join(' · ')} · <a href="https://support.sleeper.com/en/articles/2203518-how-do-playoff-teams-get-determined" target="_blank" rel="noopener noreferrer">Sleeper seeding rules</a></p></details>`;
 }catch(error){
  if(!active())return;
  root.innerHTML=`<div class="live-error"><strong>The playoff forecast could not be refreshed.</strong><p>${e(error.name==='AbortError'?'The initial forecast took too long. Try again in a moment.':error instanceof SyntaxError?'The forecast endpoint is unavailable.':error.message)}</p><button class="dd-action" id="retryPlayoffs">Retry forecast</button></div>`;
  root.querySelector('#retryPlayoffs').onclick=refreshPlayoffOdds;
 }
}
function renderPlayoffs(){
 app.innerHTML=`<div class="page sp-page">${pageHeading('Playoff Predictor')}<div class="wrap sp-layout">
  <div id="playoffGuide" hidden></div>
  <section class="sp-block sp-forecast" aria-labelledby="sp-forecast-heading"><div class="sp-section-top"><h2 id="sp-forecast-heading">Playoff odds</h2></div><div id="playoffOdds"><p class="sp-state" role="status">Loading playoff odds…</p></div></section>
 </div></div>`;
 refreshPlayoffGuide();
 refreshPlayoffOdds();
}
