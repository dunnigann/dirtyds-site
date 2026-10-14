const jackWeek1=['Brent','Vinny','Ben','Dan','Jack','Tyler','James','Jake','Fritz','Jeff','Nick','Bobby'].map(manager=>[manager,'']);
const jackWeek2=['Brent','James','Ben','Vinny','Jack','Jeff','Fritz','Dan','Nick','Tyler','Jake','Bobby'].map(manager=>[manager,'']);
const jackWeek3=[
  ['James','The three-time champion is looking to get back into the Hall of Winners with a deadly team stacked with the QB2, this year’s WR darling Parker Washington, and a deep bench of QBs for Superflex needs. That quarterback insurance matters when the bye weeks arrive, and the early undefeated run has given this roster room to breathe.'],
  ['Ben','The other 3–0 team is firmly in the hunt for his first chip after Drake London returned to form with Penix back. There is plenty of depth, while Adams benefits from Puka’s absence. The streak feels sustainable if those receivers keep delivering, with enough roster options to absorb an off week.'],
  ['Brent','Unc has to be happy with how his four-QB strategy worked out. He traded into the TE1 to complement an adept QB core and star RBs. If Hampton picks it up and injuries stay away, Brent has the kind of balance that could make a deep playoff run.'],
  ['Vinny','The 1–2 start should not fool anyone: the commissioner has somehow stacked his team again. The RB1 complements Ja’Marr Chase and a slew of other studs. QB play and receiver depth remain questions, but if the LGBTQB comes back, Vinny will unfortunately be right in the mix.'],
  ['Jack','My team has had plenty of struggles but still sits at 2–1, even without Josh Jacobs and Zay Flowers for the past two weeks. The next stretch hinges on health and whether the Chargers pull it together. If both break right, there is a clear path to the playoffs.'],
  ['Jeff','Josh Allen and the Sun God form the backbone of a 2–1 team, a big swing for the reigning toilet bowl champion (loser?). Depth is fine, although star power beyond that duo feels thin. If Allen keeps playing like Allen, I am not sure another star is needed.'],
  ['Fritz','There is a notable fall-off after the top six. Bijan and Goff are an incredible base, but much of the supporting cast looks mid. Jones is a temporary RB answer and depth behind him is scarce. The receivers and two solid tight ends offer a route to the playoffs if the floor holds.'],
  ['Dan','The Puka injury is devastating, but there is a solid team underneath. I do not love stacking an RB with a QB and WR, though Jeanty and Bowers have enough talent to make it work when the Raiders win. Watson looks like a solid WR2 and Young has performed. Can the first-ever champ stay afloat until Puka returns?'],
  ['Nick','JSN is the highest-scoring player overall, yet that has not translated into enough wins with Saquon and the quarterbacks underperforming. Depth is thin across the board. A deal or two could give this lineup more weekly flexibility, because one spectacular WR cannot carry every starter slot.'],
  ['Tyler','Injuries have decimated the defending champ: six rostered players are hurt right now. The blockbuster trade with Brent could help launch a title defense once the team heals. Starting three Steelers adds another layer of weekly volatility while Tyler waits for the roster to recover.'],
  ['Jake','After keeping nobody, Jake may have buyer’s remorse. The WR room looks decent on paper, but injuries and underperformance have hurt the team. With Baker out multiple weeks, it is hard to ask Jonathan Taylor to carry the whole squad through Superflex.'],
  ['Bobby','If anyone can climb out of the basement, it is the two-time champion. Injuries to Achane and Collins have cut deeply into his depth, though. Pollard and Godwin may not be enough on their own, so expect Bobby to work the waivers or trade market for a playoff berth.']
];
const jackWeek4=[
 ['Ben',"A new number 1, Ben's team looks like an unstoppable train at this point (unlike his Packers :/). Rocking a top 3 RB, a top 3 WR, and two top 5 TEs along with a pair of adept QBs, as long as Ben can avoid injuries he's looking like the early favorite."],
 ['James',"MrWick moved to 4–0, but at what cost? Hall and Jackson both are injured, and while he does have some solid depth, I don't know if they'll be able to replicate the points. I still think James is a title contender but hopefully those injuries aren't that severe."],
 ['Dan',"The first ever champion has never been more back. Puka and Bowers being back reinvigorated this team, and Tet's explosion propelled him to the highest point total for any team this season. He lacks depth but if injuries stay away, Dan is looking primed for a title fight."],
 ['Brent',"Times have been tough for Brent, with some unfortunate injury luck and some close losses, but there's a lot to like about the team. As long as Dak and Henry continue to play well and Jefferson heals up, I think playoffs are still on the horizon."],
 ['Jack',"The younger Dunnigan moved to 3–1, but now that BYE weeks are starting, his lack of real depth at the RB spot is becoming concerning. A big matchup looms in the Dunnigan rivalry so hopefully Jack can take down his old man and move to 4–1."],
 ['Vinny',"The good news: Kamara is back and looking like a workhorse. The bad? Chase is hurt and the receiver depth is concerning. Overall, I am not too worried. Gibbs is still a top 2 back and there's plenty to love about the RB room. With some patented Vinny waiver moves I'm sure he'll be right in the race come playoff time."],
 ['Tyler',"I think Tyler has the record for least amount of unique names on a team. Like two Wilsons, two Georges, two Michaels, even a Jayden/Jaylen issue. I wonder if that's a locker room problem... Either way Tyler has a surprising amount of depth after the E. Wilson pickup worked out great. I like this squad."],
 ['Jeff',"Allen and The Sun God put up some lackluster performances this week, but there's still a lot to like on this squad. I think El Jefe just has to accept that his team is pretty boom/bust and try to hope for no injuries."],
 ['Nick',"Mid-game injuries doomed this squad this week, but Nick's bench has come to life so I'm hoping he can figure things out and replace Saquon and Mariota without too much issue. It would be nice to see the Chicago native in the title hunt for once."],
 ['Jake',"There's some high highs and low lows for RockNFlow. JT is a certified baller, and Nabers and Kirko finally stepped into form. But Rice is out and the Vikings have the 32nd ranked offense so QB is a question mark. The bench is decent though so maybe if Deebo keeps it up and Rome gets the start, some magic can happen."],
 ['Fritz',"It's hard to rank a team with Bijan this low, but the level of talent on this team is... suspect. Jamo and Waddle are extremely hit or miss and they're starters, Moore is injured, and the bench looks grim. Fritz may be relying too much on Bijan, but let's see if some of the other players can pick up the slack."],
 ['Bobby',"Injuries have decimated this team and I think they'll continue to have an impact, even if indirectly. Ja'Marr being out hurts Burrow and Brown, and DeVonta being out severely caps Hurts. I don't want to say it's a lost season, but at some point something big has to change when you're sitting at 1–3 with the least points for."]
];
const jackWeek5=['Ben','James','Jack','Dan','Brent','Vinny','Tyler','Jeff','Jake','Fritz','Nick','Bobby'].map(manager=>[manager,'']);
const jackEditions={1:jackWeek1,2:jackWeek2,3:jackWeek3,4:jackWeek4,5:jackWeek5};
function projectionEstimate(id,week=SL.currentWeek()){
 const p=SL.player(id),row=SL.data.projections?.[week]?.[id],games=SL.data.nflGames?.[week]||[],game=games.find(g=>g.a===p.team||g.b===p.team);
 if(games.length&&!game&&p.team)return {points:0,source:'Bye',available:false};
 if(week===SL.currentWeek()&&['Out','IR','Suspended','Doubtful'].includes(p.injury_status))return {points:0,source:p.injury_status,available:false};
 const detail=SL.scoreDetails(row,id);
 if(detail.points!==null)return {...detail,source:detail.approximate?'Projection · estimated FG split':'Weekly projection',available:true};
 const actual=SL.statPoints(SL.data.stats?.[id],id),gp=Number(SL.data.stats?.[id]?.gp||0);
 if(actual!==null&&gp>0)return {points:actual/gp,source:'Fallback · season points/game',available:true,approximate:true};
 return {points:null,source:'Unavailable',available:false};
}
function projectedPlayer(id){return projectionEstimate(String(id)).points??0;}
function selectProjectedLineup(roster,week){
 const slots=(SL.data.league.roster_positions||[]).filter(s=>!['BN','IR','TAXI'].includes(s));
 const players=[...new Set((roster.players||[]).filter(id=>id&&id!=='0').map(String))].map(id=>({id,pos:SL.player(id).position,positions:SL.player(id).fantasy_positions?.length?SL.player(id).fantasy_positions:[SL.player(id).position],...projectionEstimate(id,week)}));
 return assignLegalLineup(slots,players);
}
function starterProjection(roster){return selectProjectedLineup(roster,SL.currentWeek());}
function rankTeams(){
 const start=SL.currentWeek(),end=Math.min(18,Number(SL.data.league.settings?.playoff_week_start||15)-1),weeks=Array.from({length:Math.max(0,end-start+1)},(_,i)=>start+i);
 const rostered=new Set(SL.data.rosters.flatMap(r=>r.players||[]).map(String)),replacement={};
 for(const pos of ['QB','RB','WR','TE','K','DEF']){const pool=[...new Set(Object.keys(SL.data.players).concat(pos==='DEF'?Object.keys(SL.data.projections[start]||{}).filter(id=>/^[A-Z]{2,3}$/.test(id)):[]))].filter(id=>!rostered.has(id)&&SL.player(id).position===pos).map(id=>projectionEstimate(id,start).points).filter(v=>v!==null&&v>0).sort((a,b)=>b-a);replacement[pos]=pool.length?pool.slice(0,3).reduce((n,v)=>n+v,0)/Math.min(3,pool.length):null;}
 const teams=liveTeams().map(t=>{
  const projection=starterProjection(t.r),byPos={},weekly=weeks.map(w=>selectProjectedLineup(t.r,w)),ros=weekly.reduce((n,x)=>n+x.mean,0),average=weekly.length?ros/weekly.length:projection.mean;
  projection.lineup.forEach(p=>{if(p.id)byPos[p.pos]=(byPos[p.pos]||0)+p.points;});
  const vor=projection.lineup.reduce((n,p)=>n+(p.id&&replacement[p.pos]!==null?Math.max(0,p.points-replacement[p.pos]):0),0),coverage={};
  for(const pos of ['QB','RB','WR','TE']){const reserve=projection.backup.filter(p=>p.pos===pos)[0],starter=projection.lineup.filter(p=>p.pos===pos).sort((a,b)=>a.points-b.points)[0];coverage[pos]=starter&&reserve?Math.min(1,reserve.points/Math.max(1,starter.points)):0;}
  const depth=Object.values(coverage).reduce((n,x)=>n+x,0)/4;
  const observed=recordAt(t.r.roster_id,Math.max(...completedWeeks(),0)),fallback=weekly.reduce((n,x)=>n+x.lineup.filter(p=>p.source.startsWith('Fallback')).length,0),unfilled=weekly.reduce((n,x)=>n+x.lineup.filter(p=>!p.id).length,0);
  return {...t,record:observed,projection,byPos,coverage,ros,average,vor,depth,weeks:weeks.length,fallback,unfilled};
 });
 const percentile=(t,key)=>{const vals=teams.map(x=>x[key]),lo=Math.min(...vals),hi=Math.max(...vals);return hi===lo?.5:(t[key]-lo)/(hi-lo);};
 teams.forEach(t=>{const compare=['QB','RB','WR','TE'].map(pos=>{const vals=teams.map(x=>x.byPos[pos]||0),avg=vals.reduce((n,v)=>n+v,0)/Math.max(1,vals.length);return {pos,ratio:avg?(t.byPos[pos]||0)/avg:1};}).sort((a,b)=>b.ratio-a.ratio);t.strength=compare[0];t.weakness=compare.at(-1);const balance=compare.reduce((n,p)=>n+Math.min(1,p.ratio),0)/4;t.powerScore=100*(.55*percentile(t,'average')+.25*percentile(t,'vor')+.15*t.depth+.05*balance);});
 return teams.sort((a,b)=>b.powerScore-a.powerScore||b.average-a.average);
}
// Publication is deliberate: adding a new edition requires a code update.
const PUBLISHED_POWER_WEEKS=[1,2,3,4,5];
let publishedAnalystEditions={},rankingArchiveNote='';
let rankingTrendManager='Jack',rankingTrendResizeObserver=null;
function powerRankFor(manager,rosterId,week,author=powerView){
 if(author==='jack'){
  const index=(jackEditions[week]||[]).findIndex(([name])=>name===manager);
  return index<0?null:index+1;
 }
 return publishedAnalystEditions[week]?.teams.find(t=>Number(t.roster_id)===Number(rosterId))?.rank??null;
}
function powerRankMovement(manager,rosterId,rank,week,author=powerView){
 const previous=powerRankFor(manager,rosterId,week-1,author);
 return previous===null?null:previous-rank;
}
function standingsForPowerWeek(week){
 const teams=liveTeams(),model=window.DIRTY_DS_MODEL;
 let records;
 // Rebuild end-of-week standings, rather than applying today's record to old weeks.
 if(Array.from({length:week},(_,i)=>i+1).every(weekComplete)){
  try{records=model.recordThrough(SL.data,week);}catch{}
 }
 if(!records){
  const saved=publishedAnalystEditions[week]?.teams||[];
  const complete=teams.length&&teams.every(t=>{
   const record=saved.find(row=>Number(row.roster_id)===Number(t.r.roster_id))?.record;
   return record&&['w','l','t','pf','pa'].every(key=>Number.isFinite(record[key]));
  });
  if(!complete)return [];
  records=Object.fromEntries(saved.map(t=>[t.roster_id,t.record]));
 }
 // Match the playoff model's record / PF / PA tiebreakers. Roster ID makes a
 // complete tie deterministic, without using power rank as a standings input.
 return teams.map(t=>({...t,id:t.r.roster_id,...records[t.r.roster_id]}))
  .sort((a,b)=>model.compareSeeds(a,b)||a.id-b.id)
  .map((t,i)=>({...t,rank:i+1}));
}
function rankingTrendHistory(manager,author=powerView){
 const team=liveTeams().find(t=>t.manager===manager);
 if(!team)return [];
 return PUBLISHED_POWER_WEEKS.map(week=>({week,
  standing:standingsForPowerWeek(week).find(t=>Number(t.id)===Number(team.r.roster_id))?.rank??null,
  power:powerRankFor(manager,team.r.roster_id,week,author)
 }));
}
function rankingTrendMarkup(){
 const teams=liveTeams().sort((a,b)=>a.manager.localeCompare(b.manager));
 if(!teams.some(t=>t.manager===rankingTrendManager))rankingTrendManager=teams[0]?.manager||'';
 return `<section class="ranking-trend" aria-labelledby="rankingTrendTitle"><div class="ranking-trend-header"><div><div class="kicker">WEEK BY WEEK</div><h2 id="rankingTrendTitle">Ranking trajectory</h2><p>Standings vs. ${powerView==='jack'?'Jack’s':'Analyst'} power rankings. No. 1 is at the top.</p></div><label class="ranking-trend-picker" for="rankingTrendManager">Team / manager<select id="rankingTrendManager">${teams.map(t=>`<option value="${e(t.manager)}"${t.manager===rankingTrendManager?' selected':''}>${e(t.manager)} · ${e(t.team)}</option>`).join('')}</select></label></div><div class="ranking-trend-legend"><span><i class="trend-standings"></i>Standings</span><span><i class="trend-power"></i>${powerView==='jack'?'Jack’s':'Analyst'} power ranking</span></div><div id="rankingTrendPlot"></div></section>`;
}
function drawRankingTrend(){
 const root=document.getElementById('rankingTrendPlot');if(!root)return;
 const history=rankingTrendHistory(rankingTrendManager),author=powerView==='jack'?'Jack’s':'Analyst';
 const size=Math.max(liveTeams().length,...Object.values(jackEditions).map(rows=>rows.length),2);
 const width=Math.max(240,Math.round(root.clientWidth||680)),height=360,left=52,right=20,top=24,bottom=height-54;
 const x=i=>left+i*(width-left-right)/Math.max(1,history.length-1),y=rank=>top+(rank-1)*(bottom-top)/(size-1);
 const path=key=>history.map((row,i)=>row[key]===null?'':`${i===0||history[i-1][key]===null?'M':'L'}${x(i).toFixed(2)},${y(row[key]).toFixed(2)}`).join(' ');
 const pointLabel=row=>`${rankingTrendManager}, Week ${row.week}: standings ${row.standing??'unavailable'}, ${author} power ranking ${row.power??'unavailable'}`;
 root.innerHTML=`<svg class="ranking-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="rankingTrendSvgTitle rankingTrendSvgDesc"><title id="rankingTrendSvgTitle">${e(rankingTrendManager)}: standings and ${author} power ranking by week</title><desc id="rankingTrendSvgDesc">${e(history.map(pointLabel).join('. '))}</desc>${Array.from({length:size},(_,i)=>`<line class="trend-grid" x1="${left}" x2="${width-right}" y1="${y(i+1)}" y2="${y(i+1)}"/><text class="trend-tick" x="${left-12}" y="${y(i+1)+4}" text-anchor="end">${i+1}</text>`).join('')}<text class="trend-axis-label" transform="translate(15 ${(top+bottom)/2}) rotate(-90)" text-anchor="middle">Ranking</text>${history.map((row,i)=>`<text class="trend-tick" x="${x(i)}" y="${bottom+23}" text-anchor="middle">${row.week}</text>`).join('')}<text class="trend-axis-label" x="${(left+width-right)/2}" y="${height-6}" text-anchor="middle">Week</text><path class="trend-line trend-standings" d="${path('standing')}"/><path class="trend-line trend-power" d="${path('power')}"/>${history.map((row,i)=>`${row.standing===null?'':`<circle class="trend-dot trend-standings" cx="${x(i)}" cy="${y(row.standing)}" r="4.5"><title>${e(pointLabel(row))}</title></circle>`}${row.power===null?'':`<path class="trend-dot trend-power" d="M${x(i)},${y(row.power)-5} l5,5 -5,5 -5,-5 Z"><title>${e(pointLabel(row))}</title></path>`}`).join('')}</svg><p class="ranking-trend-note">Standings after each completed week, ordered by record, then points for and points against.${history.some(row=>row.standing===null||row.power===null)?' Gaps mean that week’s data is unavailable.':''}</p><details class="ranking-trend-data"><summary>View weekly numbers for ${e(rankingTrendManager)}</summary><table class="dd-table"><caption>${e(rankingTrendManager)} · weekly ranking comparison</caption><thead><tr><th scope="col">Week</th><th scope="col">Standings</th><th scope="col">${author} power rank</th></tr></thead><tbody>${history.map(row=>`<tr><th scope="row">${row.week}</th><td>${row.standing??'—'}</td><td>${row.power??'—'}</td></tr>`).join('')}</tbody></table></details>`;
}
function wireRankingTrend(){
 const picker=document.getElementById('rankingTrendManager'),plot=document.getElementById('rankingTrendPlot');
 if(picker)picker.onchange=()=>{rankingTrendManager=picker.value;drawRankingTrend();};
 rankingTrendResizeObserver?.disconnect();
 if(plot&&window.ResizeObserver){
  let lastWidth=0;
  rankingTrendResizeObserver=new ResizeObserver(entries=>{
   const width=Math.round(entries[0].contentRect.width);
   if(width!==lastWidth){lastWidth=width;drawRankingTrend();}
  });
  rankingTrendResizeObserver.observe(plot);
 }
 drawRankingTrend();
}
async function loadPublishedRankings(){
 if(Object.keys(publishedAnalystEditions).length)return;
 const valid=value=>value?.editions&&PUBLISHED_POWER_WEEKS.every(w=>Array.isArray(value.editions[w]?.teams)&&value.editions[w].teams.length);
 try{const c=new AbortController(),timer=setTimeout(()=>c.abort(),30000);let response;try{response=await fetch('/api/rankings',{signal:c.signal,cache:'no-store'});}finally{clearTimeout(timer);}const value=await response.json();if(!response.ok||!valid(value))throw new Error(value.error||'Ranking archive unavailable');publishedAnalystEditions=value.editions;rankingArchiveNote='';return;}catch{}
 // The fingerprinted publication preserves the same order and editorial notes
 // in static previews and while a new Worker deployment is rolling out.
 const asset=window.DIRTY_DS_ASSETS?.['data/rankings-2026.json']||'data/rankings-2026.json';
 const response=await fetch(asset,{cache:'no-store'}),value=await response.json();
 if(!response.ok||!valid(value))throw new Error('Published rankings could not be loaded.');
 publishedAnalystEditions=value.editions;rankingArchiveNote='Showing the saved published editions.';
}
function renderPowerPage(){
 app.innerHTML=liveLoading('Power Rankings');
 ensureLive().then(async()=>{
  await loadPublishedRankings();if(currentPage!=='power')return;
  app.innerHTML=`<div class="page z-page">${pageHero('2026 SEASON','Power Rankings','A weekly pulse check. Same league. Two opinions.')}<section class="section"><div class="wrap"><div class="z-ranking-toolbar"><div class="z-toggle" role="group" aria-label="Ranking author"><button data-power-view="analyst">Analyst Rankings</button><button data-power-view="jack">Jack’s Rankings</button></div></div><div class="z-weekbar ranking-weeks" aria-label="Published power ranking weeks"><span>2026</span>${PUBLISHED_POWER_WEEKS.map(w=>`<button data-power-week="${w}" aria-pressed="${w===powerWeek}">Week ${w}</button>`).join('')}</div><div id="livePowerContent"></div></div></section></div>`;
  document.querySelectorAll('[data-power-view]').forEach(b=>b.onclick=()=>{powerView=b.dataset.powerView;syncRoute();drawPowerRankings();});
  document.querySelectorAll('[data-power-week]').forEach(b=>b.onclick=()=>{powerWeek=Number(b.dataset.powerWeek);syncRoute();drawPowerRankings();});drawPowerRankings();
 }).catch(err=>{if(currentPage==='power')app.innerHTML=liveError(err);});
}
function drawPowerRankings(){
 const root=document.getElementById('livePowerContent');if(!root)return;
 document.querySelectorAll('[data-power-view]').forEach(b=>{const active=b.dataset.powerView===powerView;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 document.querySelectorAll('[data-power-week]').forEach(b=>{const active=Number(b.dataset.powerWeek)===powerWeek;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 if(powerView==='jack'&&!jackEditions[powerWeek]){root.innerHTML=`<div class="ranking-empty">Jack’s Week ${powerWeek} rankings have not been submitted yet.</div>`;return;}
 const edition=publishedAnalystEditions[powerWeek];
 if(powerView==='analyst'&&!edition){root.innerHTML=note('This edition could not be loaded. Use Refresh to retry.');return;}
 const teams=powerView==='jack'?jackEditions[powerWeek].map(([manager,blurb],i)=>{const t=liveTeams().find(t=>t.manager===manager);return t?{...t,roster_id:t.r.roster_id,rank:i+1,record:recordAt(t.r.roster_id,powerWeek),blurb}:null;}).filter(Boolean):edition.teams.map((t,i)=>({...t,blurb:t.blurb}));
 root.innerHTML=`<p class="z-muted">${powerView==='jack'?'Jack’s':'Analyst'} Rankings · Week ${powerWeek}</p><ol class="z-ranking-list unified-rankings">${teams.map((t,i)=>{const user=t.user||SL.rosterUser(SL.roster(t.roster_id)),delta=powerRankMovement(t.manager,t.roster_id,t.rank,powerWeek);return `<li data-ranking-manager="${e(t.manager)}"><strong class="z-rank">${t.rank}</strong>${photo(t.avatar?'https://sleepercdn.com/avatars/thumbs/'+encodeURIComponent(t.avatar):userAvatar(user),t.manager)}<div><h3>${e(t.team)}</h3><small>${e(t.manager)} · ${weekRecord(t.record)}</small>${t.blurb?`<p>${e(t.blurb).replace(/\b(QB|RB|WR|TE|FLEX|SUPERFLEX|K|DEF)\b/g,posBadge)}</p>`:''}</div><span class="rank-move ${delta>0?'positive':delta<0?'negative':''}" aria-label="${delta===null?'No prior published ranking':delta===0?'No change, 0 places':`${delta>0?'Up':'Down'} ${Math.abs(delta)} places`}">${delta===null?'—':delta===0?'↔ 0':`${delta>0?'↑':'↓'} ${Math.abs(delta)}`}</span></li>`;}).join('')}</ol>${rankingTrendMarkup()}${powerView==='analyst'?`<details class="method-disclosure"><summary>About these rankings</summary><p>55% projected remaining-season starter points per week, 25% value above available replacements, 15% usable positional depth, and 5% roster balance. Eligible lineups maximize projected points with unique players and confirmed NFL bye weeks. Records are shown for context and do not determine the strength score.</p><p>Weeks 1–5 are reconstructed from Sleeper’s roster lists for those weeks, with weekly projection feeds through each edition as the forecast baseline. Later roster moves and later player scores are excluded. Original ROS forecasts and some early-season injury metadata were not archived, so these are reconstructions rather than original forecasts. Historical projection scoring does not retroactively apply today’s injury tags. NFL team metadata uses the captured feed where available. Weeks 1–3 retain their original published order. Each edition has a separately written team review. Editions are published deliberately and are not added automatically.</p>${rankingArchiveNote?`<p>${e(rankingArchiveNote)}</p>`:''}<p>Underlying figures are tucked below for anyone checking the math.</p><div class="dd-table-wrap"><table class="dd-table"><thead><tr><th>Team</th><th>Strength</th><th>ROS starter points</th><th>Value / week</th><th>Depth</th></tr></thead><tbody>${teams.map(t=>`<tr><td>${e(t.team)}</td><td>${t.powerScore.toFixed(1)}</td><td>${fmt(t.ros,0)}</td><td>${t.vor.toFixed(1)}</td><td>${Math.round(t.depth*100)}%</td></tr>`).join('')}</tbody></table></div></details>`:''}`;
 wireImageFallback(root);wireRankingTrend();
}
