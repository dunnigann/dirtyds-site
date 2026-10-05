/* TEAMS */
function renderTeams(){
  app.innerHTML=liveLoading('Teams');
  ensureLive().then(drawTeamsPage).catch(()=>drawTeamsPage(false));
}
function drawTeamsPage(hasLive=true){
  if(currentPage!=='teams')return;
  const current=hasLive?liveStandings():[];
  const byOwner=Object.fromEntries(current.map(x=>[x.manager,x]));
  const card=owner=>{
    const x=byOwner[owner],profile=D.owners[owner],history=years.flatMap(y=>(H.standings?.[String(y)]||[]).filter(r=>r.owner===owner));
    const oldW=history.reduce((n,r)=>n+num(r.w),0),oldL=history.reduce((n,r)=>n+num(r.l),0);
    const currentRecord=x?recordAt(x.r.roster_id,Math.max(...completedWeeks(),0)):{w:0,l:0};
    return `<button class="team-card ${owner==='Hunter'?'alumni':''}" data-manager="${e(owner)}"><div class="team-photo"><div class="team-initials">${e(initials(owner))}</div></div><div class="team-body"><div class="team-name">${e(owner)}</div><div class="team-franchise">${e(x?.team||profile.currentTeam)}</div><div class="team-record"><strong>${oldW+currentRecord.w}–${oldL+currentRecord.l}</strong><span>League regular-season record</span></div></div></button>`;
  };
  app.innerHTML=`<div class="page">${pageHero('THE FRANCHISES','Teams')}<section class="section"><div class="wrap">${heading('CURRENT MANAGERS','The franchises.')}<div class="team-grid">${(D.ownerOrder||[]).filter(owner=>owner!=='Hunter').map(card).join('')}</div></div></section><section class="section alt"><div class="wrap">${heading('HISTORICAL MANAGERS','Past members of the league.')}<div class="team-grid">${card('Hunter')}</div></div></section></div>`;
  document.querySelectorAll('[data-manager]').forEach(b=>b.onclick=()=>showManager(b.dataset.manager));wireImageFallback(app);
}
function managerFinalPlace(owner,year){
  if(year===2026)return 'In progress';
  if(year===2025){const places={Tyler:1,Vinny:2,Bobby:3,Brent:4,Nick:5,Ben:6,Dan:7,Jake:8,James:9,Fritz:10,Jack:11,Jeff:12};return places[owner]?`${places[owner]}${['st','nd','rd'][places[owner]-1]||'th'}`:'Unrecorded';}
  const podium=(D.podium||[]).find(x=>x.year===year);
  if(podium?.gold===owner)return '1st';if(podium?.silver===owner)return '2nd';if(podium?.bronze===owner)return '3rd';
  if((D.wallOfShame||[]).some(x=>x.year===year&&x.owner===owner))return 'Last';
  return 'Unrecorded';
}
function managerMostStarted(owner){
  const entries=new Map();
  for(const p of L?.managerLeaders?.[owner]||[])entries.set(norm(p.name),{...p});
  const r=liveTeams().find(x=>x.manager===owner)?.r;
  if(r)for(const week of completedWeeks()){
    const row=matchupRowForRoster(r.roster_id,week);if(!row)continue;
    for(const {id} of lineupSlots(row)){
      const player=SL.player(id);if(['K','DEF'].includes(player.position))continue;
      const name=SL.fullName(id),key=norm(name),value=entries.get(key)||{name,starts:0,points:0};
      value.starts++;value.points+=num(scoreFor(row,id));entries.set(key,value);
    }
  }
  return [...entries.values()].sort((a,b)=>b.starts-a.starts||b.points-a.points||a.name.localeCompare(b.name)).slice(0,10);
}
function managerSeasonTotals(owner,year,fallback){
  const games=Object.values(H.matchups?.[String(year)]||{}).flat(),totals={pf:0,pa:0,games:0};
  for(const g of games){
    const a=g.a?.owner===owner,b=g.b?.owner===owner;
    if(!a&&!b)continue;
    totals.pf+=num(a?g.a.score:g.b.score);totals.pa+=num(a?g.b.score:g.a.score);totals.games++;
  }
  return totals.games?{pf:totals.pf,pa:totals.pa}:fallback;
}
function showManager(owner){
  const p=D.owners[owner],r=liveTeams().find(x=>x.manager===owner),history=years.flatMap(y=>(H.standings?.[String(y)]||[]).filter(x=>x.owner===owner));
  const current=r?recordAt(r.r.roster_id,Math.max(...completedWeeks(),0)):null;
  const rows=[...(current?[{year:2026,team:r.team,...current}]:[]),...history.map(x=>({...x,...managerSeasonTotals(owner,x.year,x)}))];
  const leaders=managerMostStarted(owner);
  openModal(`<div class="modal-hero"><div class="modal-hero-grid">${r?photo(userAvatar(r.user),owner):`<div class="modal-avatar">${e(initials(owner))}</div>`}<div><div class="eyebrow">DIRTY D'S FRANCHISE FILE</div><h2>${e(owner)}</h2><p>${e(r?.team||p.currentTeam)}</p></div></div></div><div class="modal-body"><div class="dd-profile-grid"><div><strong>${p.trophies?.gold||0}</strong><small>Titles</small></div><div><strong>${rows.reduce((n,x)=>n+num(x.w),0)}–${rows.reduce((n,x)=>n+num(x.l),0)}</strong><small>Regular-season record</small></div><div><strong>${rows.length}</strong><small>Seasons</small></div></div><div class="dd-modal-block"><h3>Top 10 Most Started Players (Points Scored)</h3><ol class="manager-leaders">${leaders.map(x=>`<li><strong>${e(x.name)}</strong> — ${x.starts} Games Started (${fmt(x.points,1)} Points Scored as a starter for this team)</li>`).join('')}</ol></div><div class="dd-modal-block"><h3>Season history</h3><p class="dd-modal-caption">PF and PA include every recorded matchup that season. The W–L column is the regular-season record.</p>${rows.map(x=>`<div class="manager-season-row"><strong>${x.year} · ${e(x.team)}</strong><span>${x.w}–${x.l}${x.t?`–${x.t}`:''} · ${fmt(x.pf)} total PF · ${fmt(x.pa)} total PA</span><b>Final place: ${e(managerFinalPlace(owner,x.year))}</b>${managerFinalPlace(owner,x.year)==='Unrecorded'?`<small>Regular-season place: #${x.rank}; final placement was not captured.</small>`:''}</div>`).join('')}</div></div>`);wireImageFallback(modalContent);
}
function showLiveTeam(rosterId){
  const r=SL.roster(rosterId),u=SL.rosterUser(r),row=matchupRowForRoster(rosterId,liveWeek),players=(r.players||[]).map(id=>SL.player(id)).filter(Boolean);
  openModal(`<div class="modal-hero"><div class="modal-hero-grid">${photo(userAvatar(u),SL.managerName(r))}<div><div class="eyebrow">2026 FRANCHISE FILE</div><h2>${e(SL.teamName(r))}</h2><p>${e(SL.managerName(r))} · ${rosterRecord(r)}</p></div></div></div><div class="modal-body"><div class="dd-profile-grid"><div><strong>${fmt(rosterPF(r))}</strong><small>Points for</small></div><div><strong>${fmt(rosterPA(r))}</strong><small>Points against</small></div><div><strong>${num(r.settings?.total_moves)}</strong><small>Transactions</small></div></div><div class="dd-modal-block"><h3>Current roster</h3><div class="tag-list">${players.map(p=>`<span class="tag">${e(p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' '))} · ${posBadge(p.position)}</span>`).join('')}</div></div></div>`);wireImageFallback(modalContent);
}
