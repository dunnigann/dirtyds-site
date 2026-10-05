/* 2026 SEASON */
function renderSeason2026(){
  app.innerHTML=liveLoading('2026 Season');
  ensureLive().then(drawSeason2026).catch(err=>{if(currentPage==='season2026')app.innerHTML=liveError(err);});
}
function drawSeason2026(){
  if(currentPage!=='season2026')return;
  const groups=matchupGroups(liveWeek), through=weekComplete(liveWeek)?liveWeek:liveWeek-1, standings=liveTeams().map(x=>({...x,weekResult:recordAt(x.r.roster_id,through)})).sort((a,b)=>b.weekResult.w-a.weekResult.w||b.weekResult.pf-a.weekResult.pf);
  const scored=groups.flat().filter(Boolean);
  const highTeam=scored.slice().sort((a,b)=>num(b.points)-num(a.points))[0];
  const highRoster=highTeam?SL.roster(highTeam.roster_id):null;
  let closest=null;
  groups.forEach(g=>{if(g.length<2)return;const margin=Math.abs(num(g[0].points)-num(g[1].points));if(!closest||margin<closest.margin)closest={margin,g};});
  let topPlayer={id:'',score:-Infinity};
  scored.forEach(r=>Object.entries(r.players_points||{}).forEach(([id,v])=>{if(num(v)>topPlayer.score)topPlayer={id,score:num(v)};}));
  const current=SL.currentWeek();
  app.innerHTML=`<div class="page z-page"><section class="z-season-hero"><div class="wrap"><div class="eyebrow">2026 SEASON · WEEK ${liveWeek}</div><h1>DIRTY D'S.<br><span>LIVE ON SLEEPER.</span></h1><p>2026 Season</p><div class="z-hero-actions"><a href="#matchups" data-go="matchups">Explore the matchups ↗</a><span>${liveWeek<current?`Week ${liveWeek} archive`:`Current Sleeper week ${current}`}</span></div></div></section><div class="wrap">${liveWeekButtons()}<div class="z-week-highlights"><div><small>HIGH SCORE</small><strong>${highTeam?pts(highTeam.points):'—'}</strong><span>${highRoster?e(SL.teamName(highRoster)):'—'}</span></div><div><small>CLOSEST GAME</small><strong>${closest?pts(closest.margin):'—'}</strong><span>${closest?'Point margin':'—'}</span></div><div><small>BIGGEST PLAYER SCORE</small><strong>${topPlayer.id?pts(topPlayer.score):'—'}</strong><span>${topPlayer.id?e(SL.fullName(topPlayer.id)):'—'}</span></div></div>
  <section class="z-section"><div class="z-section-head"><div class="eyebrow">THE TABLE</div><h2>Standings through Week ${Math.max(through,0)}.</h2></div><div class="z-standings-shell"><table class="z-standings"><thead><tr><th>#</th><th>Manager / Team</th><th>Record</th><th>PF</th><th>PA</th></tr></thead><tbody>${standings.map((x,i)=>`<tr><td><strong>${i+1}</strong></td><td><strong>${e(x.manager)}</strong><small style="display:block;color:#758493">${e(x.team)}</small></td><td>${weekRecord(x.weekResult)}</td><td>${fmt(x.weekResult.pf)}</td><td>${fmt(x.weekResult.pa)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="z-section"><div class="z-section-head"><div class="eyebrow">THE WEEKLY REVIEW</div><h2>Every matchup.</h2></div><div class="z-recap-grid">${groups.map(g=>recapCard(g,liveWeek)).join('')||note('No matchup data is available for this week.')}</div></section>
  </div></div>`;
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=ev=>{ev.preventDefault();go(b.dataset.go);});
  bindLiveWeekButtons(drawSeason2026);
  wireImageFallback(app);
}
function recapCard(group,week){
  const [a,b]=group,ra=SL.roster(a.roster_id),rb=SL.roster(b.roster_id);
  const finished=weekComplete(week),aw=num(a.points)>=num(b.points),winner=aw?ra:rb,loser=aw?rb:ra,winRow=aw?a:b,loseRow=aw?b:a;
  const starters=lineupSlots(winRow).map(x=>({id:x.id,points:scoreFor(winRow,x.id),projection:projectionFor(x.id,week)})).sort((x,y)=>num(y.points)-num(x.points));
  const opponent=lineupSlots(loseRow).map(x=>({id:x.id,points:scoreFor(loseRow,x.id),projection:projectionFor(x.id,week)}));
  const star=starters[0],other=opponent.slice().sort((x,y)=>num(y.points)-num(x.points))[0];
  const dud=[...starters,...opponent].filter(x=>x.projection>=7).sort((x,y)=>(num(x.points)-x.projection)-(num(y.points)-y.projection))[0];
  const margin=Math.abs(num(a.points)-num(b.points));
  const injured=[...starters,...opponent].filter(x=>['Out','IR','Doubtful'].includes(SL.player(x.id).injury_status));
  const tight=margin<5,blowout=margin>35;
  const review=finished&&num(a.points)===num(b.points)?`A tie for ${SL.teamName(ra)} and ${SL.teamName(rb)}: both finished with ${pts(a.points)} points.`:finished?`${tight?'A nail-biter':blowout?'A statement win':'A hard-fought result'} for ${managerFor(winner)}: ${SL.teamName(winner)} took down ${SL.teamName(loser)} by ${pts(margin)}. ${star?`${SL.fullName(star.id)} supplied the fireworks with ${pts(star.points)} starter points${star.projection?` (${num(star.points)>=star.projection?'+':''}${pts(num(star.points)-star.projection)} versus projection)`:''}. `:''}${other?`${SL.fullName(other.id)} kept the other side in it with ${pts(other.points)}, but the comeback fell short. `:''}${dud&&num(dud.points)<dud.projection-5?`${SL.fullName(dud.id)} was the swing miss: ${pts(dud.points)} against ${pts(dud.projection)} projected. `:''}${injured.length?`${injured.map(x=>SL.fullName(x.id)).slice(0,2).join(' and ')} ${injured.length===1?'is':'are'} currently tagged with an injury by Sleeper, a storyline to watch after this matchup. `:''}${tight?'One extra catch or a single lineup decision could have flipped it.':blowout?'That margin will linger into next week.':'The margins in this league remain unforgiving.'}`:`Week ${week} is in progress. The review will fill in when Sleeper finalizes the scores.`;
  return `<article class="z-recap"><div class="z-recap-heading">${photo(userAvatar(SL.rosterUser(winner)),SL.teamName(winner))}<div><small>${e(managerFor(winner))}</small><h3>${e(SL.teamName(winner))}</h3></div><strong>${finished?pts(winRow.points):'—'}</strong></div><div class="z-result">${finished?`${num(a.points)===num(b.points)?'TIE':'WIN'} vs. ${e(SL.teamName(loser))} · ${pts(winRow.points)}–${pts(loseRow.points)}`:`${e(SL.teamName(ra))} vs. ${e(SL.teamName(rb))}`}</div><p>${e(review)}</p></article>`;
}
function teamProjection(r){
  const row=matchupRowForRoster(r.roster_id,liveWeek);
  if(!row)return null;
  const values=(row.starters||[]).filter(id=>id&&id!=='0').map(id=>projectionFor(id,liveWeek));return values.some(v=>v===null)?null:values.reduce((sum,n)=>sum+n,0);
}
