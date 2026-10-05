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
function renderPowerPage(){
 app.innerHTML=liveLoading('Power Rankings');
 ensureLive().then(async()=>{await SL.loadRankings();if(currentPage!=='power')return;app.innerHTML=`<div class="page z-page">${pageHero('2026 SEASON','Power Rankings','Roster strength. Positional value. Depth that can actually start.')}<section class="section"><div class="wrap"><div class="z-ranking-toolbar"><div class="z-toggle" role="group" aria-label="Ranking author"><button data-power-view="analyst">Analyst Rankings</button><button data-power-view="jack">Jack’s Rankings · Week 3</button></div></div><div id="livePowerContent"></div></div></section></div>`;document.querySelectorAll('[data-power-view]').forEach(b=>b.onclick=()=>{powerView=b.dataset.powerView;syncRoute();drawPowerRankings();});drawPowerRankings();}).catch(err=>{if(currentPage==='power')app.innerHTML=liveError(err);});
}
function drawPowerRankings(){
 const root=document.getElementById('livePowerContent');if(!root)return;document.querySelectorAll('[data-power-view]').forEach(b=>{b.classList.toggle('active',b.dataset.powerView===powerView);b.setAttribute('aria-pressed',String(b.dataset.powerView===powerView));});
 const teams=rankTeams();
 if(powerView==='jack'){teams.sort((a,b)=>jackWeek3.findIndex(j=>j[0]===a.manager)-jackWeek3.findIndex(j=>j[0]===b.manager));root.innerHTML=`<p class="z-muted">Jack’s Week 3 order and team notes · archived edition.</p><ol class="z-ranking-list">${teams.map((t,i)=>`<li><strong class="z-rank">${i+1}</strong>${photo(userAvatar(t.user),t.manager)}<div><h3>${e(t.team)}</h3><small>${e(t.manager)} · ${weekRecord(recordAt(t.r.roster_id,3))}</small><p>${e(jackWeek3.find(x=>x[0]===t.manager)?.[1]||'')}</p></div></li>`).join('')}</ol>`;wireImageFallback(root);return;}
 let previous={};try{previous=JSON.parse(localStorage.getItem('dirtyds-strength-week-'+(SL.currentWeek()-1))||'{}');localStorage.setItem('dirtyds-strength-week-'+SL.currentWeek(),JSON.stringify(Object.fromEntries(teams.map((t,i)=>[t.r.roster_id,i+1]))));}catch{}
 root.innerHTML=`<details class="rank-method"><summary>How these rankings work</summary><p>55% projected weekly starter points over the remaining regular season; 25% starter value above available replacements; 15% usable QB/RB/WR/TE coverage; 5% positional balance. Lineups maximize projected points under league eligibility; they are not predictions of each manager’s choices. Future weekly projections include confirmed byes; unavailable future projections fall back to recorded points per game. Current unavailable players are excluded. Future injuries are not forecasts of recovery.</p><p>ROS is the sum of future weekly lineup projections through Week ${Number(SL.data.league.settings?.playoff_week_start||15)-1}. Weekly movement appears only when a prior-week ranking has been saved in this browser. Missing replacement data is excluded. Kicker distance splits may be estimated.</p></details><ol class="strength-rankings">${teams.map((t,i)=>{const old=previous[t.r.roster_id],delta=old?old-(i+1):null;return `<li class="strength-card"><div class="strength-title"><strong class="z-rank">${String(i+1).padStart(2,'0')}</strong>${photo(userAvatar(t.user),t.manager)}<div><h3>${e(t.team)}</h3><small>${e(t.manager)} · ${weekRecord(t.record)}</small></div><span class="rank-move ${delta>0?'positive':delta<0?'negative':''}">${delta===null?'—':delta===0?'•':`${delta>0?'↑':'↓'} ${Math.abs(delta)}`}</span></div><div class="strength-metrics"><div><strong>${t.powerScore.toFixed(1)}</strong><small>Strength / 100</small></div><div><strong>${t.average.toFixed(1)}</strong><small>Starter pts / week</small></div><div><strong>${fmt(t.ros,0)}</strong><small>ROS starter points</small></div><div><strong>+${t.vor.toFixed(1)}</strong><small>Pts above replacement / week</small></div></div><div class="strength-notes"><p><b>Strength:</b> ${e(t.strength.pos)} · ${Math.round(t.strength.ratio*100)}% of league positional average.</p><p><b>Weakness:</b> ${e(t.weakness.pos)} · ${Math.round(t.weakness.ratio*100)}% of league positional average.</p><p><b>Coverage:</b> ${Object.entries(t.coverage).map(([pos,v])=>`${pos} ${Math.round(v*100)}%`).join(' · ')} of the weakest starter at each position.</p></div>${t.fallback||t.unfilled?`<p class="data-note">${t.fallback} starter-week estimates use points/game fallback${t.unfilled?`; ${t.unfilled} projected slots unfilled`:''}.</p>`:''}</li>`;}).join('')}</ol>`;
 wireImageFallback(root);
}

/* MATCHUPS */
