function renderMatchups(){
  app.innerHTML=liveLoading('Matchups');
  ensureLive().then(drawMatchupsPage).catch(err=>{if(currentPage==='matchups')app.innerHTML=liveError(err);});
}
function drawMatchupsPage(){
  if(currentPage!=='matchups')return;
  app.innerHTML=`<div class="page z-page"><section class="z-page-heading wrap"><div><div class="eyebrow">THE LEAGUE, ON THE FIELD</div><h1>Matchups</h1><p>Every player. Every owner. One field.</p></div><a class="z-text-link" href="#season2026" data-go="season2026">Read Week ${liveWeek} ↗</a></section><div class="wrap">${liveWeekButtons()}<div class="z-match-layout"><aside class="z-sidebar"><label for="liveMatchMode">Matchup view</label><select id="liveMatchMode"><option value="dirtyds">Dirty D's matchups</option><option value="nfl">NFL matchups</option></select><label for="liveMatchSelect" style="margin-top:14px">Choose a matchup</label><select id="liveMatchSelect"></select><div id="liveMatchList" class="z-match-list"></div></aside><section class="z-match-main"><div class="match-view-toolbar"><div class="z-toggle" role="group" aria-label="Lineup presentation"><button data-match-view="field">Field</button><button data-match-view="list">List</button></div><span class="mobile-list-hint">Use List for a readable mobile lineup.</span></div><div class="z-field-note">Tap a player for career starter points, auction prices and roster history.</div><div id="liveField">${note('Building the field…')}</div></section></div><section class="live-archive-link">${heading('HISTORICAL MATCHUPS','2018–2025 archive.','')}<div id="archiveMatchups"></div></section></div></div>`;
  document.querySelectorAll('[data-match-view]').forEach(b=>{b.classList.toggle('active',b.dataset.matchView===matchPresentation);b.setAttribute('aria-pressed',String(b.dataset.matchView===matchPresentation));b.onclick=()=>{matchPresentation=b.dataset.matchView;syncRoute();drawMatchupsPage();};});
  document.getElementById('liveMatchMode').value=matchMode;
  document.getElementById('liveMatchMode').onchange=()=>{matchMode=document.getElementById('liveMatchMode').value;matchIndex=0;syncRoute();drawLiveMatchups();};
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=ev=>{ev.preventDefault();go(b.dataset.go);});
  bindLiveWeekButtons(()=>{drawMatchupsPage();});
  drawLiveMatchups();
  drawArchiveMatchups();
}
async function fetchNflGames(week){return SL.getNflGames(week);}
function nflLineup(abbr){
  const pool=Object.values(SL.data.players).filter(p=>p.team===abbr&&['QB','RB','WR','TE','K'].includes(p.position)&&p.status!=='Inactive');
  const rank=(a,b)=>(num(a.depth_chart_order)||99)-(num(b.depth_chart_order)||99)||projectedPlayer(b.player_id)-projectedPlayer(a.player_id)||a.full_name.localeCompare(b.full_name);
  const selected=[];
  for(const [pos,count] of [['QB',1],['RB',2],['WR',3],['TE',2],['K',1]]){
    pool.filter(p=>p.position===pos).sort(rank).slice(0,count).forEach((p,i)=>selected.push(livePlayerObj(p.player_id,null,`${pos}${pos==='K'?'':i+1}`)));
  }
  selected.push(livePlayerObj(abbr,null,'DEF'));
  const defense=selected.at(-1);defense.position='DEF';defense.nfl=abbr;defense.name=`${abbr} D/ST`;defense.headshot='';
  return selected;
}
let matchupRenderGeneration=0;
async function drawLiveMatchups(){
  const generation=++matchupRenderGeneration,selectedWeek=liveWeek;
  const list=document.getElementById('liveMatchList'),select=document.getElementById('liveMatchSelect'),field=document.getElementById('liveField');
  if(!list||!select||!field)return;
  if(matchMode==='nfl'){
    field.innerHTML=note('Loading the NFL schedule…');
    const games=await fetchNflGames(liveWeek);
    if(currentPage!=='matchups'||matchMode!=='nfl'||generation!==matchupRenderGeneration||selectedWeek!==liveWeek)return;
    if(!games.length){list.innerHTML='';select.innerHTML='';field.innerHTML=`<div class="live-error">The NFL schedule feed did not load. Switch to “Dirty D's matchups” for the Sleeper league view.</div>`;return;}
    if(matchIndex>=games.length)matchIndex=0;
    const label=g=>`${g.a} vs. ${g.b}`;
    select.innerHTML=games.map((g,i)=>`<option value="${i}">${label(g)}</option>`).join('');select.value=String(matchIndex);select.onchange=()=>{matchIndex=Number(select.value);syncRoute();drawLiveMatchups();};
    list.innerHTML=games.map((g,i)=>`<button class="z-match-choice ${i===matchIndex?'selected':''}" data-match="${i}"><small>WEEK ${liveWeek} · ${e(g.status||'NFL')}</small><span><b>${e(g.a)}</b><strong>${g.aScore??'—'}</strong></span><span><b>${e(g.b)}</b><strong>${g.bScore??'—'}</strong></span></button>`).join('');
    list.querySelectorAll('[data-match]').forEach(b=>b.onclick=()=>{matchIndex=Number(b.dataset.match);syncRoute();drawLiveMatchups();});
    const g=games[matchIndex],aPlayers=nflLineup(g.a),bPlayers=nflLineup(g.b);
    field.innerHTML=`<div class="z-field-scroll"><div class="z-field">${teamHeader({name:g.a,nfl:g.a},g.aScore,false,`NFL · Week ${liveWeek}`)}${formation(aPlayers,true,true)}<div class="z-midfield"><span>DIRTY D'S</span><small>NFL VIEW</small></div>${formation(bPlayers,false,true)}${teamHeader({name:g.b,nfl:g.b},g.bScore,true,`NFL · Week ${liveWeek}`)}</div></div>`;
    field.innerHTML+=lineupList({name:g.a},aPlayers,null)+lineupList({name:g.b},bPlayers,null);field.dataset.presentation=matchPresentation;field.querySelector('.z-field-scroll').classList.toggle('hide-field',matchPresentation==='list');wireLivePlayerButtons(field);
    return;
  }
  const groups=matchupGroups(liveWeek);
  if(!groups.length){list.innerHTML='';select.innerHTML='';field.innerHTML=note('No Sleeper matchup data is available for this week.');return;}
  if(matchIndex>=groups.length)matchIndex=0;
  const desc=g=>g.slice(0,2).map(r=>identityAtWeek(r.roster_id).team).join(' vs. ');
  select.innerHTML=groups.map((g,i)=>`<option value="${i}">${e(desc(g))}</option>`).join('');select.value=String(matchIndex);select.onchange=()=>{matchIndex=Number(select.value);syncRoute();drawLiveMatchups();};
  list.innerHTML=groups.map((g,i)=>`<button class="z-match-choice ${i===matchIndex?'selected':''}" data-match="${i}"><small>WEEK ${liveWeek} · SLEEPER</small>${g.slice(0,2).map(r=>`<span><b>${e(identityAtWeek(r.roster_id).team)}</b><strong>${pts(r.points)}</strong></span>`).join('')}</button>`).join('');
  list.querySelectorAll('[data-match]').forEach(b=>b.onclick=()=>{matchIndex=Number(b.dataset.match);syncRoute();drawLiveMatchups();});
  await SL.getNflGames(liveWeek);if(currentPage!=='matchups'||matchMode!=='dirtyds'||generation!==matchupRenderGeneration||selectedWeek!==liveWeek)return;
  const g=groups[matchIndex],a=g[0],b=g[1],ra=SL.roster(a.roster_id),rb=SL.roster(b.roster_id),ia=identityAtWeek(a.roster_id),ib=identityAtWeek(b.roster_id),pa=rosterPlayers(a),pb=rosterPlayers(b);
  field.innerHTML=matchSummary(g)+`<div class="z-field-scroll ${matchPresentation==='list'?'hide-field':''}"><div class="z-field">${teamHeader({name:ia.team,avatar:userAvatar(ia.user)},a.points,false,`${ia.manager} · ${weekRecord(recordAt(ra.roster_id,liveWeek))}`)}${formation(pa.starters,true)}<div class="z-midfield"><span>DIRTY D'S</span><small>WEEK ${String(liveWeek).padStart(2,'0')}</small></div>${formation(pb.starters,false)}${teamHeader({name:ib.team,avatar:userAvatar(ib.user)},b.points,true,`${ib.manager} · ${weekRecord(recordAt(rb.roster_id,liveWeek))}`)}</div></div>${[[ra,pa],[rb,pb]].map(([r,p])=>`<details class="z-reserves"><summary>${e(identityAtWeek(r.roster_id).team)} bench · ${p.bench.length} players</summary><div class="z-bench-grid">${p.bench.map(x=>playerBubble(x,false,true)).join('')||'<p>No bench players.</p>'}</div></details>${p.ir.length?`<details class="z-reserves"><summary>${e(identityAtWeek(r.roster_id).team)} IR · ${p.ir.length} players</summary><div class="z-bench-grid">${p.ir.map(x=>playerBubble(x,false,true)).join('')}</div></details>`:''}`).join('')}`;
  field.innerHTML+=lineupList(ra,pa.starters,a)+lineupList(rb,pb.starters,b);
  const snapshot=SL.data.snapshots?.[liveWeek],metadataDate=snapshot?.metadataAvailableFrom;
  if(liveWeek<SL.currentWeek())field.innerHTML+=`<p class="data-note">Historical points and starters come from Sleeper’s weekly results. ${metadataDate?`Names, NFL teams and reserve tags reflect metadata first captured ${e(new Date(metadataDate).toLocaleDateString())}.`:'Player metadata was not captured for this week; names and NFL teams use the current feed. Historical reserve tags are unavailable.'}</p>`;
  field.dataset.presentation=matchPresentation;wireLivePlayerButtons(field);
}
function archiveAvailableWeeks(year){return Object.keys(H.matchups?.[String(year)]||{}).map(Number).sort((a,b)=>a-b);}
function drawArchiveMatchups(){
  const root=document.getElementById('archiveMatchups');if(!root)return;
  const weeks=archiveAvailableWeeks(archiveMatchYear);if(!weeks.includes(archiveMatchWeek))archiveMatchWeek=weeks.at(-1)||1;
  const games=H.matchups?.[String(archiveMatchYear)]?.[String(archiveMatchWeek)]||[];
  root.innerHTML=`<div class="dd-controls"><label>Season</label><select id="amYear">${years.map(y=>`<option value="${y}" ${y===archiveMatchYear?'selected':''}>${y}</option>`).join('')}</select><label>Week</label><select id="amWeek">${weeks.map(w=>`<option value="${w}" ${w===archiveMatchWeek?'selected':''}>Week ${w}</option>`).join('')}</select></div><div style="margin-top:18px">${games.map(g=>`<article class="dd-match"><div class="dd-match-side ${num(g.a.score)>num(g.b.score)?'winner':''}"><div class="dd-initial">${e(initials(g.a.owner))}</div><div class="dd-side-name"><strong>${e(g.a.owner)}</strong><small>${e(g.a.team)}</small></div><span class="dd-score">${fmt(g.a.score)}</span></div><div class="dd-versus">VS</div><div class="dd-match-side right ${num(g.b.score)>num(g.a.score)?'winner':''}"><span class="dd-score">${fmt(g.b.score)}</span><div class="dd-side-name"><strong>${e(g.b.owner)}</strong><small>${e(g.b.team)}</small></div><div class="dd-initial">${e(initials(g.b.owner))}</div></div></article>`).join('')||note('No archived games found.')}</div>`;
  document.getElementById('amYear').onchange=async()=>{const selected=archiveMatchYear=Number(document.getElementById('amYear').value);await ensureArchive({years:[selected]});if(currentPage==='matchups'&&archiveMatchYear===selected){archiveMatchWeek=archiveAvailableWeeks(selected).at(-1)||1;syncRoute();drawArchiveMatchups();}};
  document.getElementById('amWeek').onchange=()=>{archiveMatchWeek=Number(document.getElementById('amWeek').value);syncRoute();drawArchiveMatchups();};
}
async function showLivePlayer(id){
  await ensureLive().catch(()=>{});await ensureArchive({players:true});syncPlayerRoute(id);
  playerProfile(SL.fullName(id),id);
}
