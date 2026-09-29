/* Dirty D's archive — ZYNFL-parity UI with live Sleeper 2026 data. */
'use strict';
const D=window.DIRTY_DS_DATA, H=window.DIRTY_DS_HISTORY, SL=window.DIRTY_DS_LIVE;
const app=document.getElementById('app'), nav=[...document.querySelectorAll('.nav-link')];
const backdrop=document.getElementById('modalBackdrop'), modalContent=document.getElementById('modalContent');
const years=(H?.league||[]).map(x=>Number(x.year)).sort((a,b)=>b-a);
let currentPage='home', liveWeek=1, matchMode='dirtyds', matchIndex=0, powerView='analyst';
let archiveMatchYear=2025, archiveMatchWeek=17;
let seasonYear=2026, playerSearch='', playerPos='ALL', playerOwner='ALL', playerSort='points', playerLimit=40, playerTopPos='QB';
let draftYear=2026, draftPos='ALL', draftOwner='ALL', draftKind='ALL', h2hScope='all';
const nflCache={};

const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x||0);
const fmt=(n,d=2)=>Number(n||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const dollar=n=>n==null?'—':`$${Math.round(Number(n||0)).toLocaleString()}`;
const initials=s=>String(s||'').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase();
const norm=s=>String(s||'').toLowerCase().replace(/[’'.]/g,'').replace(/\b(jr|sr|ii|iii|iv)\b/g,'').replace(/[^a-z0-9]/g,'');
const pts=n=>n==null?'—':Number(n).toFixed(2);
const teamName=owner=>D?.owners?.[owner]?.currentTeam||owner;
const heading=(k,t,desc='')=>`<div class="section-heading"><div><div class="kicker">${e(k)}</div><h2>${e(t)}</h2></div>${desc?`<p>${e(desc)}</p>`:''}</div>`;
const pageHero=(k,t,desc='')=>`<section class="page-hero"><div class="wrap"><div class="eyebrow">${e(k)}</div><h1>${e(t)}</h1>${desc?`<p>${e(desc)}</p>`:''}</div></section>`;
const stat=(label,value)=>`<div class="stat"><div class="stat-value">${e(value)}</div><div class="stat-label">${e(label)}</div></div>`;
const note=html=>`<div class="dd-note">${html}</div>`;
const recordCard=r=>`<article class="record-card"><div class="record-title">${e(r.title)}</div><div class="record-value">${e(r.value)}</div><div class="record-detail">${e(r.owner||'')}${r.team?` · ${e(r.team)}`:''}${r.year?` · ${e(r.year)}`:''}</div>${r.detail?`<div class="record-subdetail">${e(r.detail)}</div>`:''}</article>`;
function openModal(html){modalContent.innerHTML=html;backdrop.hidden=false;document.body.style.overflow='hidden';}
function closeModal(){backdrop.hidden=true;document.body.style.overflow='';}
document.getElementById('modalClose').onclick=closeModal;
backdrop.onclick=ev=>{if(ev.target===backdrop)closeModal();};
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!backdrop.hidden)closeModal();});
document.getElementById('mobileMenu').onclick=()=>{const n=document.getElementById('mainNav');const open=n.classList.toggle('open');document.getElementById('mobileMenu').setAttribute('aria-expanded',String(open));};
nav.forEach(b=>b.onclick=()=>go(b.dataset.page));

function liveLoading(title='Loading live 2026 data…'){
  return `<div class="page z-page">${pageHero('LIVE FROM SLEEPER',title,'Dirty D’s current-season pages pull directly from the league’s public Sleeper feed.')}<div class="wrap"><div class="z-loading"><strong>Syncing the league</strong><span>Rosters, standings, matchups, player scoring and auction data.</span></div></div></div>`;
}
function liveError(err){
  return `<div class="page z-page">${pageHero('LIVE DATA','Sleeper data unavailable','The historical archive is still available.')}<div class="wrap"><div class="live-error"><strong>Could not load the current Sleeper feed.</strong><br>${e(err?.message||String(err||'Unknown error'))}</div></div></div>`;
}
async function ensureLive(){
  if(!SL) throw new Error('Sleeper live module did not load.');
  await SL.ready;
  liveWeek=Math.max(1,Math.min(SL.currentWeek(),18));
  return SL.data;
}
function userAvatar(user){
  const id=user?.avatar;
  return id?`https://sleepercdn.com/avatars/thumbs/${encodeURIComponent(id)}`:'';
}
function photo(src,name,cls=''){
  return `<span class="z-photo ${cls}">${src?`<img src="${e(src)}" alt="" loading="lazy">`:`<span>${e(initials(name)||'—')}</span>`}</span>`;
}
function wireImageFallback(root=document){
  root.querySelectorAll('.z-photo img').forEach(img=>img.addEventListener('error',()=>{const p=img.parentElement;img.remove();p.innerHTML='<span>—</span>';},{once:true}));
}
function rosterPF(r){const s=r?.settings||{};return num(s.fpts)+num(s.fpts_decimal)/100;}
function rosterPA(r){const s=r?.settings||{};return num(s.fpts_against)+num(s.fpts_against_decimal)/100;}
function liveTeams(){
  return (SL?.data?.rosters||[]).map(r=>({r,user:SL.rosterUser(r),manager:SL.managerName(r),team:SL.teamName(r)}));
}
function liveStandings(){
  return liveTeams().sort((a,b)=>{
    const A=a.r.settings||{},B=b.r.settings||{};
    return num(B.wins)-num(A.wins)||num(B.ties)-num(A.ties)||rosterPF(b.r)-rosterPF(a.r);
  });
}
function rosterRecord(r){const s=r?.settings||{};return `${num(s.wins)}–${num(s.losses)}${num(s.ties)?`–${num(s.ties)}`:''}`;}
function findRosterByPlayer(id){return (SL?.data?.rosters||[]).find(r=>(r.players||[]).map(String).includes(String(id)));}
function ownerLabelByPlayer(id){const r=findRosterByPlayer(id);return r?SL.teamName(r):'Free Agent';}
function managerLabelByPlayer(id){const r=findRosterByPlayer(id);return r?SL.managerName(r):'';}
function matchupGroups(week=liveWeek){
  const rows=SL?.data?.weeks?.[week]||[];
  const groups={};
  rows.forEach(r=>{const k=String(r.matchup_id??r.roster_id);(groups[k]??=[]).push(r);});
  return Object.values(groups).map(g=>g.sort((a,b)=>num(a.roster_id)-num(b.roster_id))).filter(g=>g.length>=2);
}
function matchupRowForRoster(rosterId,week=liveWeek){return (SL?.data?.weeks?.[week]||[]).find(x=>num(x.roster_id)===num(rosterId));}
function scoreFor(row,id){const pp=row?.players_points||{};const v=pp[String(id)];return v==null?null:Number(v);}
function lineupSlots(row){
  const starters=row?.starters||[], positions=SL?.data?.league?.roster_positions||[];
  return starters.map((id,i)=>({id:String(id),slot:positions[i]||SL.player(id).position||'FLEX'}));
}
function livePlayerObj(id,row=null,slot=''){
  const p=SL.player(id);
  return {id:String(id),name:SL.fullName(id),position:p.position||'',nfl:p.team||'',slot,points:row?scoreFor(row,id):null,owner:ownerLabelByPlayer(id),manager:managerLabelByPlayer(id),headshot:SL.headshot(id)};
}
function rosterPlayers(row){
  const starters=lineupSlots(row).map(x=>livePlayerObj(x.id,row,x.slot));
  const starterIds=new Set(starters.map(x=>x.id));
  const reserve=new Set((SL.roster(row?.roster_id)?.reserve||[]).map(String));
  const all=(row?.players||SL.roster(row?.roster_id)?.players||[]).map(String);
  const bench=all.filter(id=>!starterIds.has(id)&&!reserve.has(id)).map(id=>livePlayerObj(id,row,'BN'));
  const ir=all.filter(id=>reserve.has(id)).map(id=>livePlayerObj(id,row,'IR'));
  return {starters,bench,ir};
}
function projectionFor(id,week=liveWeek){return SL.projectionPoints(SL?.data?.projections?.[week]?.[String(id)]);}
function playerBubble(p,nfl=false,compact=false){
  const score=p.points, size=compact?50:Math.round(44+8*Math.sqrt(Math.max(0,Math.min(50,score??0))));
  const color='#8fb695';
  return `<button class="z-player ${compact?'z-compact':''}" data-live-player="${e(p.id)}" style="--bubble:${size}px;--owner:${color}" aria-label="Open ${e(p.name)} player details">${photo(p.headshot,p.name,'z-player-photo')}<strong>${e(p.name)}</strong>${nfl?`<em>${e(p.owner)}</em>`:`<small>${e(p.slot)} · ${e(p.nfl||'FA')}</small>`}</button>`;
}
function formation(rows,top,nfl=false){
  const qbs=rows.filter(p=>p.position==='QB').slice(0,2);
  const backs=rows.filter(p=>['RB','FB'].includes(p.position)).slice(0,2);
  let wings=rows.filter(p=>!['QB','RB','FB','K','DEF'].includes(p.position)).slice(0,4);
  if(wings.length<4) wings=[...wings,...qbs.slice(1)].slice(0,4);
  const specialists=rows.filter(p=>['K','DEF'].includes(p.position)||['K','DEF'].includes(p.slot));
  const line=`<div class="z-line" aria-hidden="true">${['LT','LG','C','RG','RT'].map(x=>`<span class="${x==='C'?'z-center':''}"></span>`).join('')}</div>`;
  return `<div class="z-formation ${top?'z-top':'z-bottom'}"><div class="z-backs">${backs.map(p=>playerBubble(p,nfl)).join('')}</div><div class="z-qb">${qbs.map(p=>playerBubble(p,nfl)).join('')}</div><div class="z-receivers">${wings.map(p=>playerBubble(p,nfl)).join('')}</div>${line}<div class="z-field-specialists">${specialists.map(p=>playerBubble(p,nfl,true)).join('')}</div></div>`;
}
function teamHeader(team,score,bottom=false,subtitle=''){
  return `<div class="z-team-header ${bottom?'z-header-bottom':''}">${photo(team.avatar,team.name)}<div><span class="z-eyebrow">${e(subtitle)}</span><h2>${e(team.name)}</h2></div><div class="z-team-score"><strong>${score==null?'—':pts(score)}</strong><small>Week ${liveWeek} points</small></div></div>`;
}
function liveWeekButtons(onClickName=''){
  const current=SL?.currentWeek?.()||liveWeek;
  return `<div class="z-weekbar" aria-label="2026 week"><span>2026</span>${Array.from({length:current},(_,i)=>i+1).map(w=>`<button data-live-week="${w}" class="${w===liveWeek?'active':''}" aria-pressed="${w===liveWeek}">Week ${w}</button>`).join('')}</div>`;
}
function bindLiveWeekButtons(callback){
  document.querySelectorAll('[data-live-week]').forEach(b=>b.onclick=async()=>{liveWeek=Number(b.dataset.liveWeek);matchIndex=0;await SL.getWeek(liveWeek).catch(()=>[]);await SL.getProjections(liveWeek).catch(()=>({}));callback();});
}
function wireLivePlayerButtons(root=document){root.querySelectorAll('[data-live-player]').forEach(b=>b.onclick=()=>showLivePlayer(b.dataset.livePlayer));wireImageFallback(root);}

async function go(page){
  const routes={home:renderHome,season2026:renderSeason2026,matchups:renderMatchups,seasons:renderSeasons,history:renderHistory,players:renderPlayers,teams:renderTeams,gallery:renderGallery,draft:renderDraft};
  if(!routes[page]) page='home';
  currentPage=page;
  nav.forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.getElementById('mainNav').classList.remove('open');
  document.getElementById('mobileMenu').setAttribute('aria-expanded','false');
  routes[page]();
  history.replaceState(null,'',`#${page}`);
  window.scrollTo({top:0,behavior:'instant'});
}

/* HOME */
function renderHome(){
  const champ=D.champions.find(c=>Number(c.year)===2025)||D.champions.at(-1);
  app.innerHTML=`<div class="page"><section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">EST. 2018 · AUCTION · HALF-PPR · SUPERFLEX</div><h1>DIRTY <span class="accent">D'S</span></h1><p class="hero-deck">Eight completed seasons of auction receipts and matchup history, plus a live 2026 season feed from Sleeper.</p></div><div class="hero-side"><div class="hero-logo-lockup"><img src="assets/images/logo/dirtyds-logo.svg" alt="Dirty D's"><div style="font-size:26px;font-weight:900;line-height:1.1">DIRTY D'S</div></div><div class="hero-side-label">Defending Champion</div><div class="hero-side-value">${e(champ?.team||'2025 Champion')}</div><div class="hero-side-sub">${e(champ?.owner||'')} · 2025 Champion · ${e(champ?.record||'')}</div></div></div></section>
  <div class="stats-strip"><div class="wrap stat-grid">${stat('Completed Seasons',8)}${stat('Archived Matchups',H.meta?.games||H.meta?.workbookGames||'—')}${stat('Historical Players',H.players?.length||'—')}${stat('Auction / Keeper Entries',D.draftHistory?.length||'—')}</div></div>
  <section class="section dark"><div class="wrap">${heading('THE CHAMPIONSHIP HALL','Every banner so far.','The 2026 season remains in progress.')}<div class="banners">${D.champions.map(c=>`<div class="banner"><div class="banner-year">${c.year}</div><div class="banner-team">${e(c.team)}</div><div class="banner-owner">${e(c.owner)}</div><div class="banner-record">${e(c.record)}</div></div>`).join('')}</div></div></section>
  <section class="section"><div class="wrap">${heading('2026 LIVE','The league moved to Sleeper.','Standings, rosters, matchups, scoring and auction data update from the current Sleeper league.')}<div id="homeLive">${note('Loading the live league pulse…')}</div></div></section>
  <section class="section alt"><div class="wrap">${heading('FROM THE RECORD BOOK','The archive underneath the jokes.','Historical records use the expanded 2018–2025 workbook and original league archive.')}<div class="record-grid">${(H.records||[]).slice(0,4).map(x=>recordCard({...x,value:typeof x.value==='number'?fmt(x.value):x.value})).join('')}</div></div></section></div>`;
  ensureLive().then(()=>{if(currentPage!=='home')return;const st=liveStandings(),lead=st[0],wk=SL.currentWeek();document.getElementById('homeLive').innerHTML=`<div class="dd-grid"><article class="dd-card"><div class="dd-year-label">Current leader</div><h3>${e(lead?.team||'—')}</h3><p>${e(lead?.manager||'')} · ${rosterRecord(lead?.r)} · ${fmt(rosterPF(lead?.r))} PF</p></article><article class="dd-card"><div class="dd-year-label">Current week</div><div class="dd-price">${wk}</div><h3>2026 Season</h3><p>Live matchup data is available through Week ${wk}.</p></article><article class="dd-card"><div class="dd-year-label">Live rosters</div><div class="dd-price">${SL.data.rosters.length}</div><h3>Franchises synced</h3><p>Sleeper is the source of truth for the current season.</p></article></div>`;}).catch(err=>{if(document.getElementById('homeLive'))document.getElementById('homeLive').innerHTML=`<div class="live-error">${e(err.message)}</div>`;});
}

/* 2026 SEASON */
function renderSeason2026(){
  app.innerHTML=liveLoading('2026 Season');
  ensureLive().then(drawSeason2026).catch(err=>{if(currentPage==='season2026')app.innerHTML=liveError(err);});
}
function drawSeason2026(){
  if(currentPage!=='season2026')return;
  const groups=matchupGroups(liveWeek), standings=liveStandings();
  const scored=groups.flat().filter(Boolean);
  const highTeam=scored.slice().sort((a,b)=>num(b.points)-num(a.points))[0];
  const highRoster=highTeam?SL.roster(highTeam.roster_id):null;
  let closest=null;
  groups.forEach(g=>{if(g.length<2)return;const margin=Math.abs(num(g[0].points)-num(g[1].points));if(!closest||margin<closest.margin)closest={margin,g};});
  let topPlayer={id:'',score:-Infinity};
  scored.forEach(r=>Object.entries(r.players_points||{}).forEach(([id,v])=>{if(num(v)>topPlayer.score)topPlayer={id,score:num(v)};}));
  const current=SL.currentWeek();
  app.innerHTML=`<div class="page z-page"><section class="z-season-hero"><div class="wrap"><div class="eyebrow">2026 SEASON · WEEK ${liveWeek}</div><h1>DIRTY D'S.<br><span>LIVE ON SLEEPER.</span></h1><p>Current standings, weekly scoring and roster results are pulled from Sleeper. Historical records remain anchored to the 2018–2025 archive.</p><div class="z-hero-actions"><a href="#matchups" data-go="matchups">Explore the matchups ↗</a><span>${liveWeek<current?`Week ${liveWeek} archive`:`Current Sleeper week ${current}`}</span></div></div></section><div class="wrap">${liveWeekButtons()}<div class="z-week-highlights"><div><small>HIGH SCORE</small><strong>${highTeam?pts(highTeam.points):'—'}</strong><span>${highRoster?e(SL.teamName(highRoster)):'—'}</span></div><div><small>CLOSEST GAME</small><strong>${closest?pts(closest.margin):'—'}</strong><span>${closest?'Point margin':'—'}</span></div><div><small>BIGGEST PLAYER SCORE</small><strong>${topPlayer.id?pts(topPlayer.score):'—'}</strong><span>${topPlayer.id?e(SL.fullName(topPlayer.id)):'—'}</span></div></div>
  <section class="z-section"><div class="z-section-head"><div class="eyebrow">THE TABLE</div><h2>2026 standings.</h2><p>Wins, losses and points for come directly from Sleeper roster settings.</p></div><div class="z-standings-shell"><table class="z-standings"><thead><tr><th>#</th><th>Manager / Team</th><th>Record</th><th>PF</th><th>PA</th><th>Moves</th><th>FAAB Used</th></tr></thead><tbody>${standings.map((x,i)=>`<tr><td><strong>${i+1}</strong></td><td><strong>${e(x.manager)}</strong><small style="display:block;color:#758493">${e(x.team)}</small></td><td>${rosterRecord(x.r)}</td><td>${fmt(rosterPF(x.r))}</td><td>${fmt(rosterPA(x.r))}</td><td>${num(x.r.settings?.total_moves)}</td><td>${dollar(x.r.settings?.waiver_budget_used)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="z-section"><div class="z-section-head"><div class="eyebrow">THE WEEKLY REVIEW</div><h2>Every matchup.</h2><p>These are factual Sleeper scores for the selected week; no editorial power rankings are being added yet.</p></div><div class="z-recap-grid">${groups.map(g=>{const a=g[0],b=g[1],ra=SL.roster(a.roster_id),rb=SL.roster(b.roster_id),aw=num(a.points)>=num(b.points),winner=aw?ra:rb,loser=aw?rb:ra,winRow=aw?a:b,loseRow=aw?b:a;return `<article class="z-recap"><div class="z-recap-heading">${photo(userAvatar(SL.rosterUser(winner)),SL.teamName(winner))}<div><small>${e(SL.managerName(winner))}</small><h3>${e(SL.teamName(winner))}</h3></div><strong>${pts(winRow.points)}</strong></div><div class="z-result">${num(a.points)===num(b.points)?'TIE':`WIN vs. ${e(SL.teamName(loser))}`} · ${pts(winRow.points)}–${pts(loseRow.points)}</div><p>${num(a.points)===num(b.points)?'The matchup finished tied.':`${e(SL.teamName(winner))} posted the higher team score in Week ${liveWeek}.`}</p></article>`;}).join('')||note('No matchup data is available for this week.')}</div></section>
  <section class="z-section" id="livePowerRankings"><div class="z-section-head"><div class="eyebrow">THE BIGGER PICTURE</div><h2>Power rankings.</h2><p>The analyst view is generated from current scoring pace, record and current-week starter projections. Jack’s rankings are reserved for later.</p></div><div class="z-ranking-toolbar"><div class="z-toggle" role="group" aria-label="Ranking author"><button data-power-view="analyst">Analyst rankings</button><button data-power-view="jack">Jack's rankings</button></div></div><div id="livePowerContent"></div></section></div></div>`;
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=ev=>{ev.preventDefault();go(b.dataset.go);});
  document.querySelectorAll('[data-power-view]').forEach(b=>b.onclick=()=>{powerView=b.dataset.powerView;drawPowerRankings();});
  bindLiveWeekButtons(drawSeason2026);
  drawPowerRankings();
  wireImageFallback(app);
}
function teamProjection(r){
  const row=matchupRowForRoster(r.roster_id,liveWeek);
  if(!row)return 0;
  return (row.starters||[]).reduce((sum,id)=>sum+projectionFor(id,liveWeek),0);
}
function drawPowerRankings(){
  const root=document.getElementById('livePowerContent');if(!root)return;
  document.querySelectorAll('[data-power-view]').forEach(b=>{const active=b.dataset.powerView===powerView;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  if(powerView==='jack'){root.innerHTML=`<div class="z-rank-placeholder"><h3>Jack's rankings coming later.</h3><p>The switch and layout are in place, but no Jack rankings were added in this update.</p></div>`;return;}
  const teams=liveTeams().map(x=>{const settings=x.r.settings||{},games=Math.max(1,num(settings.wins)+num(settings.losses)+num(settings.ties)),pfpg=rosterPF(x.r)/games,winPct=(num(settings.wins)+0.5*num(settings.ties))/games,proj=teamProjection(x.r);return {...x,pfpg,winPct,proj};});
  const normalize=(key,v)=>{const vals=teams.map(x=>x[key]),lo=Math.min(...vals),hi=Math.max(...vals);return hi===lo?0.5:(v-lo)/(hi-lo);};
  teams.forEach(x=>x.powerScore=.55*normalize('pfpg',x.pfpg)+.25*normalize('winPct',x.winPct)+.20*normalize('proj',x.proj));
  teams.sort((a,b)=>b.powerScore-a.powerScore||b.pfpg-a.pfpg);
  root.innerHTML=`<p class="z-muted">Automated Week ${liveWeek} snapshot: 55% scoring pace, 25% win percentage, 20% current starter projection.</p><ol class="z-ranking-list">${teams.map((x,i)=>`<li><strong class="z-rank">${String(i+1).padStart(2,'0')}</strong>${photo(userAvatar(x.user),x.manager)}<div><h3>${e(x.team)}</h3><small>${e(x.manager)} · ${rosterRecord(x.r)} · ${x.pfpg.toFixed(1)} PF/game</small><p>${x.proj?`Week ${liveWeek} current-starter projection: ${x.proj.toFixed(1)}.`:'Current-week projection unavailable.'}</p></div></li>`).join('')}</ol>`;
  wireImageFallback(root);
}

/* MATCHUPS */
function renderMatchups(){
  app.innerHTML=liveLoading('Matchups');
  ensureLive().then(drawMatchupsPage).catch(err=>{if(currentPage==='matchups')app.innerHTML=liveError(err);});
}
function drawMatchupsPage(){
  if(currentPage!=='matchups')return;
  app.innerHTML=`<div class="page z-page"><section class="z-page-heading wrap"><div><div class="eyebrow">THE LEAGUE, ON THE FIELD</div><h1>Matchups</h1><p>Every player. Every owner. One field.</p></div><a class="z-text-link" href="#season2026" data-go="season2026">Read Week ${liveWeek} ↗</a></section><div class="wrap">${liveWeekButtons()}<div class="z-match-layout"><aside class="z-sidebar"><label for="liveMatchMode">Matchup view</label><select id="liveMatchMode"><option value="dirtyds">Dirty D's matchups</option><option value="nfl">NFL matchups</option></select><label for="liveMatchSelect" style="margin-top:14px">Choose a matchup</label><select id="liveMatchSelect"></select><div id="liveMatchList" class="z-match-list"></div></aside><section class="z-match-main"><div class="z-field-note">Tap a player for points, projection, auction price and 2026 game log. Bigger bubbles mean more fantasy points.</div><div id="liveField">${note('Building the field…')}</div></section></div><section class="live-archive-link">${heading('HISTORICAL MATCHUPS','2018–2025 archive.','The live field above is for 2026; older Yahoo matchups remain fully browsable below.')}<div id="archiveMatchups"></div></section></div></div>`;
  document.getElementById('liveMatchMode').value=matchMode;
  document.getElementById('liveMatchMode').onchange=()=>{matchMode=document.getElementById('liveMatchMode').value;matchIndex=0;drawLiveMatchups();};
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=ev=>{ev.preventDefault();go(b.dataset.go);});
  bindLiveWeekButtons(()=>{drawMatchupsPage();});
  drawLiveMatchups();
  drawArchiveMatchups();
}
async function fetchNflGames(week){
  if(nflCache[week])return nflCache[week];
  const season=SL.data.season||'2026';
  const url=`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`;
  try{
    const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw new Error();
    const raw=await res.json();
    const alias={WSH:'WAS',JAC:'JAX',LA:'LAR'};
    nflCache[week]=(raw.events||[]).map(ev=>{const cs=ev.competitions?.[0]?.competitors||[];const get=c=>{const a=c?.team?.abbreviation||'';return alias[a]||a;};return {a:get(cs[1]),b:get(cs[0]),aScore:num(cs[1]?.score),bScore:num(cs[0]?.score),status:ev.status?.type?.shortDetail||''};}).filter(x=>x.a&&x.b);
  }catch{nflCache[week]=[];}
  return nflCache[week];
}
async function drawLiveMatchups(){
  const list=document.getElementById('liveMatchList'),select=document.getElementById('liveMatchSelect'),field=document.getElementById('liveField');
  if(!list||!select||!field)return;
  if(matchMode==='nfl'){
    field.innerHTML=note('Loading the NFL schedule…');
    const games=await fetchNflGames(liveWeek);
    if(currentPage!=='matchups'||matchMode!=='nfl')return;
    if(!games.length){list.innerHTML='';select.innerHTML='';field.innerHTML=`<div class="live-error">The NFL schedule feed did not load. Switch to “Dirty D's matchups” for the Sleeper league view.</div>`;return;}
    if(matchIndex>=games.length)matchIndex=0;
    const label=g=>`${g.a} vs. ${g.b}`;
    select.innerHTML=games.map((g,i)=>`<option value="${i}">${label(g)}</option>`).join('');select.value=String(matchIndex);select.onchange=()=>{matchIndex=Number(select.value);drawLiveMatchups();};
    list.innerHTML=games.map((g,i)=>`<button class="z-match-choice ${i===matchIndex?'selected':''}" data-match="${i}"><small>WEEK ${liveWeek} · ${e(g.status||'NFL')}</small><span><b>${e(g.a)}</b><strong>${g.aScore||'—'}</strong></span><span><b>${e(g.b)}</b><strong>${g.bScore||'—'}</strong></span></button>`).join('');
    list.querySelectorAll('[data-match]').forEach(b=>b.onclick=()=>{matchIndex=Number(b.dataset.match);drawLiveMatchups();});
    const g=games[matchIndex];
    const allRows=SL.data.weeks[liveWeek]||[];
    const allPlayers=[];
    for(const r of SL.data.rosters){const row=allRows.find(x=>num(x.roster_id)===num(r.roster_id));for(const id of (r.players||[])){const p=livePlayerObj(id,row,'');if([g.a,g.b].includes(p.nfl))allPlayers.push(p);}}
    const aPlayers=allPlayers.filter(p=>p.nfl===g.a),bPlayers=allPlayers.filter(p=>p.nfl===g.b);
    field.innerHTML=`<div class="z-field-scroll"><div class="z-field">${teamHeader({name:g.a,avatar:''},g.aScore,false,`NFL · Week ${liveWeek}`)}${formation(aPlayers,true,true)}<div class="z-midfield"><span>DIRTY D'S</span><small>NFL VIEW</small></div>${formation(bPlayers,false,true)}${teamHeader({name:g.b,avatar:''},g.bScore,true,`NFL · Week ${liveWeek}`)}</div></div><div class="z-depth-note">Only players currently rostered in Dirty D's are shown. Owner labels come from Sleeper.</div>`;
    wireLivePlayerButtons(field);
    return;
  }
  const groups=matchupGroups(liveWeek);
  if(!groups.length){list.innerHTML='';select.innerHTML='';field.innerHTML=note('No Sleeper matchup data is available for this week.');return;}
  if(matchIndex>=groups.length)matchIndex=0;
  const desc=g=>g.slice(0,2).map(r=>SL.teamName(SL.roster(r.roster_id))).join(' vs. ');
  select.innerHTML=groups.map((g,i)=>`<option value="${i}">${e(desc(g))}</option>`).join('');select.value=String(matchIndex);select.onchange=()=>{matchIndex=Number(select.value);drawLiveMatchups();};
  list.innerHTML=groups.map((g,i)=>`<button class="z-match-choice ${i===matchIndex?'selected':''}" data-match="${i}"><small>WEEK ${liveWeek} · SLEEPER</small>${g.slice(0,2).map(r=>`<span><b>${e(SL.teamName(SL.roster(r.roster_id)))}</b><strong>${pts(r.points)}</strong></span>`).join('')}</button>`).join('');
  list.querySelectorAll('[data-match]').forEach(b=>b.onclick=()=>{matchIndex=Number(b.dataset.match);drawLiveMatchups();});
  const g=groups[matchIndex],a=g[0],b=g[1],ra=SL.roster(a.roster_id),rb=SL.roster(b.roster_id),pa=rosterPlayers(a),pb=rosterPlayers(b);
  field.innerHTML=`<div class="z-field-scroll"><div class="z-field">${teamHeader({name:SL.teamName(ra),avatar:userAvatar(SL.rosterUser(ra))},a.points,false,`${SL.managerName(ra)} · ${rosterRecord(ra)}`)}${formation(pa.starters,true)}<div class="z-midfield"><span>DIRTY D'S</span><small>WEEK ${String(liveWeek).padStart(2,'0')}</small></div>${formation(pb.starters,false)}${teamHeader({name:SL.teamName(rb),avatar:userAvatar(SL.rosterUser(rb))},b.points,true,`${SL.managerName(rb)} · ${rosterRecord(rb)}`)}</div></div>${[[ra,pa],[rb,pb]].map(([r,p])=>`<details class="z-reserves"><summary>${e(SL.teamName(r))} bench · ${p.bench.length} players</summary><div class="z-bench-grid">${p.bench.map(x=>playerBubble(x,false,true)).join('')||'<p>No bench players.</p>'}</div></details>${p.ir.length?`<details class="z-reserves"><summary>${e(SL.teamName(r))} IR · ${p.ir.length} players</summary><div class="z-bench-grid">${p.ir.map(x=>playerBubble(x,false,true)).join('')}</div></details>`:''}`).join('')}`;
  wireLivePlayerButtons(field);
}
function archiveAvailableWeeks(year){return Object.keys(H.matchups?.[String(year)]||{}).map(Number).sort((a,b)=>a-b);}
function drawArchiveMatchups(){
  const root=document.getElementById('archiveMatchups');if(!root)return;
  const weeks=archiveAvailableWeeks(archiveMatchYear);if(!weeks.includes(archiveMatchWeek))archiveMatchWeek=weeks.at(-1)||1;
  const games=H.matchups?.[String(archiveMatchYear)]?.[String(archiveMatchWeek)]||[];
  root.innerHTML=`<div class="dd-controls"><label>Season</label><select id="amYear">${years.map(y=>`<option value="${y}" ${y===archiveMatchYear?'selected':''}>${y}</option>`).join('')}</select><label>Week</label><select id="amWeek">${weeks.map(w=>`<option value="${w}" ${w===archiveMatchWeek?'selected':''}>Week ${w}</option>`).join('')}</select></div><div style="margin-top:18px">${games.map(g=>`<article class="dd-match"><div class="dd-match-side ${num(g.a.score)>num(g.b.score)?'winner':''}"><div class="dd-initial">${e(initials(g.a.owner))}</div><div style="flex:1"><strong>${e(g.a.owner)}</strong><small>${e(g.a.team)}</small></div><span class="dd-score">${fmt(g.a.score)}</span></div><div class="dd-versus">VS</div><div class="dd-match-side right ${num(g.b.score)>num(g.a.score)?'winner':''}"><span class="dd-score">${fmt(g.b.score)}</span><div style="flex:1"><strong>${e(g.b.owner)}</strong><small>${e(g.b.team)}</small></div><div class="dd-initial">${e(initials(g.b.owner))}</div></div></article>`).join('')||note('No archived games found.')}</div>`;
  document.getElementById('amYear').onchange=()=>{archiveMatchYear=Number(document.getElementById('amYear').value);archiveMatchWeek=archiveAvailableWeeks(archiveMatchYear).at(-1)||1;drawArchiveMatchups();};
  document.getElementById('amWeek').onchange=()=>{archiveMatchWeek=Number(document.getElementById('amWeek').value);drawArchiveMatchups();};
}
async function showLivePlayer(id){
  await ensureLive().catch(()=>{});
  const p=SL.player(id),r=findRosterByPlayer(id),owner=r?SL.teamName(r):'Free Agent',manager=r?SL.managerName(r):'';
  const logs=[];
  for(let w=1;w<=SL.currentWeek();w++){
    const rows=SL.data.weeks[w]||[];const row=rows.find(x=>(x.players||[]).map(String).includes(String(id)));
    if(!row)continue;logs.push({w,points:scoreFor(row,id),team:SL.teamName(SL.roster(row.roster_id))});
  }
  const pick=SL.data.picks.find(x=>SL.pickPlayerId(x)===String(id)),cost=pick?SL.pickCost(pick):null,proj=projectionFor(id,liveWeek);
  openModal(`<div class="modal-hero"><div class="modal-hero-grid">${photo(SL.headshot(id),SL.fullName(id))}<div><div class="eyebrow">2026 SLEEPER PLAYER FILE</div><h2>${e(SL.fullName(id))}</h2><p>${e(p.position||'')} · ${e(p.team||'FA')} · ${e(owner)}${manager?` · ${e(manager)}`:''}</p></div></div></div><div class="modal-body"><div class="dd-profile-grid"><div><strong>${pts(logs.find(x=>x.w===liveWeek)?.points)}</strong><small>Week ${liveWeek} points</small></div><div><strong>${proj?pts(proj):'—'}</strong><small>Week ${liveWeek} projection</small></div><div><strong>${cost==null?'—':dollar(cost)}</strong><small>2026 auction / keeper price</small></div></div><div class="dd-modal-block"><h3>2026 game log</h3>${logs.length?logs.map(x=>`<div class="dd-history-row"><strong>W${x.w}</strong><span>${e(x.team)}</span><b>${pts(x.points)} pts</b></div>`).join(''):'No Sleeper matchup appearances found.'}</div></div>`);
  wireImageFallback(modalContent);
}

/* ALL SEASONS */
function renderSeasons(){
  app.innerHTML=liveLoading('All Seasons');
  ensureLive().then(drawSeasons).catch(()=>drawSeasons(false));
}
function drawSeasons(hasLive=true){
  if(currentPage!=='seasons')return;
  if(!hasLive && seasonYear===2026) seasonYear=2025;
  const st=hasLive?liveStandings():[],lead=st[0];
  app.innerHTML=`<div class="page">${pageHero('THE YEARBOOK','All Seasons','Eight completed Yahoo seasons plus the live 2026 Sleeper season.')}<section class="section"><div class="wrap">${heading('SEASON ARCHIVE','Choose a year.','2026 is live; 2018–2025 are completed historical files.')}<div class="season-grid"><button class="season-card live ${seasonYear===2026?'selected':''}" data-season-year="2026"><div class="season-status">LIVE</div><div class="season-year">2026</div><h3>${e(lead?.team||'Sleeper season')}</h3><p>${lead?`${e(lead.manager)} · ${rosterRecord(lead.r)} current leader`:'Current season'}</p></button>${years.map(y=>{const c=D.champions.find(x=>Number(x.year)===y);return `<button class="season-card live ${seasonYear===y?'selected':''}" data-season-year="${y}"><div class="season-status">Complete</div><div class="season-year">${y}</div><h3>${e(c?.owner||'')} · ${e(c?.team||'')}</h3><p>${e(c?.record||'')} regular season · champion</p></button>`;}).join('')}</div><div id="seasonDetail"></div></div></section></div>`;
  document.querySelectorAll('[data-season-year]').forEach(b=>b.onclick=()=>{seasonYear=Number(b.dataset.seasonYear);drawSeasonDetail();document.getElementById('seasonDetail').scrollIntoView({behavior:'smooth',block:'start'});});drawSeasonDetail();
}
function historicalStandingsTable(y){
  const rows=H.standings?.[String(y)]||[];
  return `<div class="dd-table-wrap"><table class="dd-table"><thead><tr><th>#</th><th>Manager / Team</th><th>W–L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${x.rank}</strong></td><td><strong>${e(x.owner)}</strong><small>${e(x.team)}</small></td><td>${x.w}–${x.l}${x.t?`–${x.t}`:''}</td><td>${fmt(x.pf)}</td><td>${fmt(x.pa)}</td><td>${fmt(num(x.pf)-num(x.pa))}</td></tr>`).join('')}</tbody></table></div>`;
}
function drawSeasonDetail(){
  const root=document.getElementById('seasonDetail');if(!root)return;
  document.querySelectorAll('[data-season-year]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.seasonYear)===seasonYear));
  if(seasonYear===2026){
    const st=liveStandings();root.innerHTML=`<div class="dd-preview" style="margin:32px 0 20px"><div class="dd-year-label">2026 season file · live</div><h2 style="margin:5px 0">${e(SL.data.league?.name||"Dirty D's")}</h2><p style="margin:0">Week ${SL.currentWeek()} · Sleeper is the current-season source of truth.</p></div><div class="z-standings-shell"><table class="z-standings"><thead><tr><th>#</th><th>Manager / Team</th><th>Record</th><th>PF</th><th>PA</th></tr></thead><tbody>${st.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${e(x.manager)}</strong><small style="display:block">${e(x.team)}</small></td><td>${rosterRecord(x.r)}</td><td>${fmt(rosterPF(x.r))}</td><td>${fmt(rosterPA(x.r))}</td></tr>`).join('')}</tbody></table></div>`;return;
  }
  const c=D.champions.find(x=>Number(x.year)===seasonYear),games=Object.values(H.matchups?.[String(seasonYear)]||{}).flat(),high=games.flatMap(g=>[g.a,g.b]).sort((a,b)=>num(b.score)-num(a.score))[0];
  root.innerHTML=`<div class="dd-preview" style="margin:32px 0 20px"><div class="dd-year-label">${seasonYear} season file</div><h2 style="margin:5px 0">${e(c?.team||'')}</h2><p style="margin:0">${e(c?.owner||'')} · Champion · ${e(c?.record||'')} regular season.</p><div class="dd-stat-row"><div><strong>${games.length}</strong><small>Known matchups</small></div><div><strong>${high?fmt(high.score):'—'}</strong><small>Highest archived week · ${e(high?.owner||'')}</small></div></div></div>${heading('REGULAR SEASON','The standings.','')}${historicalStandingsTable(seasonYear)}`;
}

/* HISTORY */
function auctionRecordCards(){
  const avg=Object.entries(H.auction?.averageBids||{}).filter(([,x])=>x.count).sort((a,b)=>num(b[1].average)-num(a[1].average));
  const spend=Object.entries(H.auction?.keeperSpend||{}).sort((a,b)=>num(b[1])-num(a[1]));
  const high=H.auction?.highest?.[0];
  return [
    high&&{title:'Largest Auction Purchase',value:dollar(high.cost),owner:high.owner,team:high.player,year:high.year},
    avg[0]&&{title:'Highest Average Auction Bid',value:dollar(avg[0][1].average),owner:avg[0][0],detail:`${avg[0][1].count} purchases`},
    avg.at(-1)&&{title:'Lowest Average Auction Bid',value:dollar(avg.at(-1)[1].average),owner:avg.at(-1)[0],detail:`${avg.at(-1)[1].count} purchases`},
    spend[0]&&{title:'Most Historical Keeper Spend',value:dollar(spend[0][1]),owner:spend[0][0]}
  ].filter(Boolean);
}
function renderHistory(){
  const txTitles=new Set(['Most Completed Trades','Most Pickups','Most FAB Spent','Most Total Transactions','Fewest Total Transactions','Highest Waiver Bid Win %','Lowest Waiver Bid Win %']);
  const original=(D.superlatives||[]).filter(x=>txTitles.has(x.title));
  app.innerHTML=`<div class="page">${pageHero('THE ARCHIVE','League History','Championships, scoring records, auction superlatives, head-to-head history and transaction records.')}<section class="section"><div class="wrap">${heading('THE PODIUM','Champions, runners-up & third.','2018–2025 completed seasons.')}<div class="dd-table-wrap"><table class="dd-table"><thead><tr><th>Season</th><th>Champion</th><th>Runner-up</th><th>Third</th></tr></thead><tbody>${(D.podium||[]).map(x=>`<tr><td><strong>${x.year}</strong></td><td><strong>🥇 ${e(x.gold)}</strong><small>${e(x.goldTeam)}</small></td><td>🥈 ${e(x.silver)}<small>${e(x.silverTeam)}</small></td><td>🥉 ${e(x.bronze)}<small>${e(x.bronzeTeam)}</small></td></tr>`).join('')}</tbody></table></div></div></section><section class="section alt"><div class="wrap">${heading('RECALCULATED RECORDS','The scoring book.','Historical records use the expanded workbook.')}<div class="record-grid">${(H.records||[]).map(x=>recordCard({...x,value:typeof x.value==='number'?fmt(x.value):x.value})).join('')}</div></div></section><section class="section dark"><div class="wrap">${heading('AUCTION RECORDS','The price of a roster.','Auction purchases and keeper costs are tracked separately.')}<div class="record-grid record-grid-dark">${auctionRecordCards().map(recordCard).join('')}</div></div></section><section class="section"><div class="wrap">${heading('TRADE & WAIVER FILE','The old records still count.','Preserved from the original Dirty D’s site.')}<div class="record-grid">${original.map(recordCard).join('')}</div></div></section><section class="section alt"><div class="wrap">${heading('ALL-TIME H2H','Who owns whom?','Historical head-to-head results through 2025.')}<div class="dd-season-bar">${[['all','All Games'],['regular','Regular'],['playoffs','Playoff-labeled']].map(([k,v])=>`<button data-h2h="${k}" class="${h2hScope===k?'active':''}">${v}</button>`).join('')}</div><div id="h2h"></div></div></section></div>`;
  document.querySelectorAll('[data-h2h]').forEach(b=>b.onclick=()=>{h2hScope=b.dataset.h2h;document.querySelectorAll('[data-h2h]').forEach(x=>x.classList.toggle('active',x===b));drawH2H();});drawH2H();
}
function drawH2H(){
  const root=document.getElementById('h2h');if(!root)return;const data=H.h2h?.[h2hScope]||{},order=D.ownerOrder||[];
  root.innerHTML=`<div class="matrix-shell"><table class="matrix"><thead><tr><th>Manager</th>${order.map(o=>`<th>${e(o)}</th>`).join('')}</tr></thead><tbody>${order.map(a=>`<tr><td>${e(a)}</td>${order.map(b=>{if(a===b)return'<td class="diagonal">—</td>';const v=data[a]?.[b];return v?.gp?`<td class="${v.w>v.l?'positive':v.w<v.l?'negative':'even'}">${v.w}–${v.l}${v.t?`–${v.t}`:''}</td>`:'<td>—</td>';}).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* PLAYERS */
function renderPlayers(){
  app.innerHTML=liveLoading('Players');
  ensureLive().then(drawPlayersPage).catch(()=>drawPlayersPage(false));
}
function aggregateSeasonPoints(){
  const totals={};for(let w=1;w<=SL.currentWeek();w++){for(const row of (SL.data.weeks[w]||[])){for(const [id,v] of Object.entries(row.players_points||{}))totals[id]=(totals[id]||0)+num(v);}}return totals;
}
function topLivePlayers(pos){
  const stats=SL.data.stats||{},fallback=aggregateSeasonPoints(),ids=new Set([...Object.keys(stats),...Object.keys(fallback)]);
  const out=[];
  ids.forEach(id=>{const p=SL.player(id),position=p.position||'';if(pos==='FLEX'?!['RB','WR','TE'].includes(position):position!==pos)return;const points=SL.statPoints(stats[id])||fallback[id]||0;if(points<=0)return;out.push({id,name:SL.fullName(id),position,nfl:p.team||'',points,headshot:SL.headshot(id)});});
  return out.sort((a,b)=>b.points-a.points).slice(0,10);
}
function drawTopPlayers(){
  const root=document.getElementById('playerTopTen');if(!root)return;
  const rows=topLivePlayers(playerTopPos),vals=rows.map(x=>x.points),hi=Math.max(...vals,1),lo=Math.min(...vals,0);
  root.innerHTML=`<div class="player-top-grid">${rows.map((p,i)=>{const ratio=hi===lo?1:(p.points-lo)/(hi-lo),head=Math.round(58+42*ratio),owner=ownerLabelByPlayer(p.id);return `<button class="player-top-card" data-live-player="${e(p.id)}" style="--head:${head}px"><span class="player-top-rank">#${i+1}</span><span class="football-figure"><span class="football-head">${photo(p.headshot,p.name)}</span><span class="football-body">${e(p.position)}</span><span class="football-legs"><i></i><i></i></span></span><strong>${e(p.name)}</strong><span class="player-top-owner ${owner==='Free Agent'?'free-agent':''}">${e(owner)}</span><small class="player-top-points">${pts(p.points)} pts</small></button>`;}).join('')||note('Season leader stats have not loaded yet.')}</div>`;
  wireLivePlayerButtons(root);
}
function currentAuctionByName(name){
  const key=norm(name);
  const pick=SL.data.picks.find(x=>norm(SL.fullName(SL.pickPlayerId(x)))===key);
  return pick?{pick,cost:SL.pickCost(pick),id:SL.pickPlayerId(pick)}:null;
}
function drawPlayersPage(hasLive=true){
  if(currentPage!=='players')return;
  const owners=['ALL',...(D.ownerOrder||[])],positions=['ALL','QB','RB','WR','TE','K','DEF','FLEX'];
  app.innerHTML=`<div class="page">${pageHero('THE PLAYER INDEX','Players','Live 2026 scoring leaders plus the complete 2018–2025 Dirty D’s player archive.')}<section class="player-top-section"><div class="wrap"><div class="player-top-heading"><div><div class="eyebrow">2026 SCORING LEADERS</div><div class="player-top-title">Top <select id="playerTopPos" class="player-top-select">${['QB','RB','WR','TE','FLEX','K','DEF'].map(x=>`<option ${x===playerTopPos?'selected':''}>${x}</option>`).join('')}</select></div><p>Top 10 by Sleeper half-PPR season scoring when available. Ownership is current and bubble size scales with season points.</p></div><span class="player-top-note">LIVE SLEEPER DATA</span></div><div id="playerTopTen"></div></div></section><section class="section"><div class="wrap">${heading('SEARCH THE ARCHIVE','Every name has a file.','Historical player files show starts, scoring and actual auction / keeper prices. Current 2026 auction information is added when the name matches Sleeper.')}<div class="dd-controls"><input id="pSearch" type="search" placeholder="Search player…" value="${e(playerSearch)}"><select id="pPos">${positions.map(x=>`<option ${x===playerPos?'selected':''}>${x}</option>`).join('')}</select><select id="pOwner">${owners.map(x=>`<option ${x===playerOwner?'selected':''}>${e(x)}</option>`).join('')}</select><select id="pSort"><option value="points" ${playerSort==='points'?'selected':''}>Starter points</option><option value="starts" ${playerSort==='starts'?'selected':''}>Starts</option><option value="price" ${playerSort==='price'?'selected':''}>Highest price</option><option value="name" ${playerSort==='name'?'selected':''}>Name</option></select></div><div id="playerCount" class="dd-muted" style="margin-bottom:18px"></div><div id="playerResults" class="dd-player-list"></div><button id="morePlayers" class="dd-action dd-load">Show more players</button></div></section></div>`;
  document.getElementById('playerTopPos').onchange=ev=>{playerTopPos=ev.target.value;drawTopPlayers();};
  const update=()=>{playerSearch=document.getElementById('pSearch').value;playerPos=document.getElementById('pPos').value;playerOwner=document.getElementById('pOwner').value;playerSort=document.getElementById('pSort').value;playerLimit=40;drawArchivePlayers();};
  ['pSearch','pPos','pOwner','pSort'].forEach(id=>document.getElementById(id).addEventListener(id==='pSearch'?'input':'change',update));
  document.getElementById('morePlayers').onclick=()=>{playerLimit+=40;drawArchivePlayers();};
  if(hasLive)drawTopPlayers();else document.getElementById('playerTopTen').innerHTML=`<div class="live-error">Live Sleeper scoring did not load; the archive below is still available.</div>`;
  drawArchivePlayers();
}
function drawArchivePlayers(){
  let rows=(H.players||[]).filter(p=>(playerPos==='ALL'||p.position===playerPos)&&(playerOwner==='ALL'||(p.owners||[]).includes(playerOwner)||(p.seasons||[]).some(r=>r.owner===playerOwner))&&p.name.toLowerCase().includes(playerSearch.trim().toLowerCase()));
  rows.sort((a,b)=>playerSort==='name'?a.name.localeCompare(b.name):playerSort==='starts'?num(b.starts)-num(a.starts)||num(b.points)-num(a.points):playerSort==='price'?num(b.maxPrice??-1)-num(a.maxPrice??-1)||num(b.points)-num(a.points):num(b.points)-num(a.points)||a.name.localeCompare(b.name));
  document.getElementById('playerCount').textContent=`Showing ${Math.min(playerLimit,rows.length)} of ${rows.length} matching historical players`;
  document.getElementById('playerResults').innerHTML=rows.slice(0,playerLimit).map(p=>{const live=currentAuctionByName(p.name);return `<button class="dd-player" data-archive-player="${e(p.key)}"><span class="dd-initial">${e(initials(p.name))}</span><span class="dd-player-info"><strong>${e(p.name)}</strong><small>${e(p.position)} · ${p.starts} starts · ${p.drafted} auction / keeper entries${live?.cost!=null?` · 2026 ${dollar(live.cost)}`:''}</small></span><span class="dd-player-value">${playerSort==='price'?(p.maxPrice==null?'—':dollar(p.maxPrice)):fmt(p.points,1)}<small>${playerSort==='price'?'top price':'starter pts'}</small></span></button>`;}).join('');
  document.getElementById('morePlayers').hidden=playerLimit>=rows.length;
  document.querySelectorAll('[data-archive-player]').forEach(b=>b.onclick=()=>showArchivePlayer(b.dataset.archivePlayer));
}
function showArchivePlayer(key){
  const p=H.players.find(x=>x.key===key);if(!p)return;const drafts=(p.events||[]).filter(x=>x.type==='Draft'||x.type==='Keeper').sort((a,b)=>num(b.year)-num(a.year)),seasons=(p.seasons||[]).slice().sort((a,b)=>num(b.year)-num(a.year)),live=currentAuctionByName(p.name),liveRoster=live?findRosterByPlayer(live.id):null;
  openModal(`<div class="modal-hero"><div class="modal-hero-grid"><div class="modal-avatar">${e(p.position)}</div><div><div class="eyebrow">DIRTY D'S PLAYER FILE</div><h2>${e(p.name)}</h2><p>${e(p.position)}${p.nflTeam?` · ${e(p.nflTeam)}`:''}</p></div></div></div><div class="modal-body"><div class="dd-profile-grid"><div><strong>${p.starts}</strong><small>Historical starts</small></div><div><strong>${fmt(p.points,1)}</strong><small>Historical starter points</small></div><div><strong>${live?.cost!=null?dollar(live.cost):(p.maxPrice==null?'—':dollar(p.maxPrice))}</strong><small>${live?.cost!=null?'2026 price':'Highest historical price'}</small></div></div>${live?`<div class="dd-modal-block"><h3>2026 Sleeper status</h3><p>${liveRoster?`${e(SL.teamName(liveRoster))} · ${e(SL.managerName(liveRoster))}`:'Free Agent'} · auction / keeper price ${live.cost==null?'not exposed by API':dollar(live.cost)}.</p></div>`:''}<div class="dd-modal-block"><h3>Auction & keeper history</h3>${drafts.length?drafts.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span><b>${e(x.player||p.name)}</b><br><small>${e(x.owner)} · ${e(x.type)}</small></span><b>${dollar(x.cost)}</b></div>`).join(''):'No historical auction entry.'}</div><div class="dd-modal-block"><h3>Dirty D's scoring by season</h3>${seasons.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span>${e(x.owner||x.team)} · ${e(x.team)}<br><small>${x.starts} starts</small></span><b>${fmt(x.points,1)} pts</b></div>`).join('')}</div></div>`);
}

/* TEAMS */
function renderTeams(){
  app.innerHTML=liveLoading('Teams');
  ensureLive().then(drawTeamsPage).catch(()=>drawTeamsPage(false));
}
function drawTeamsPage(hasLive=true){
  if(currentPage!=='teams')return;
  const current=hasLive?liveStandings():[];
  app.innerHTML=`<div class="page">${pageHero('THE FRANCHISES','Teams','Current Sleeper franchises first, followed by the historical manager archive.')}<section class="section"><div class="wrap">${heading('CURRENT LEAGUE','2026 Sleeper franchises.','Team pictures can be added later; Sleeper avatars or initials are used for now.')}<div class="team-grid">${current.map(x=>`<button class="team-card" data-live-team="${x.r.roster_id}"><div class="team-photo ${userAvatar(x.user)?'has-photo':''}">${userAvatar(x.user)?`<img src="${e(userAvatar(x.user))}" alt="">`:`<div class="team-initials">${e(initials(x.manager))}</div>`}</div><div class="team-body"><div class="team-name">${e(x.manager)}</div><div class="team-franchise">${e(x.team)}</div><div class="team-record"><strong>${rosterRecord(x.r)}</strong><span>2026 Record</span></div></div></button>`).join('')||note('Live Sleeper team data did not load.')}</div><div class="alumni-label">Historical Manager Files</div><div class="team-grid">${(D.ownerOrder||[]).map(o=>{const x=D.owners[o],s=years.flatMap(y=>(H.standings?.[String(y)]||[]).filter(r=>r.owner===o)),w=s.reduce((n,r)=>n+num(r.w),0),l=s.reduce((n,r)=>n+num(r.l),0);return `<button class="team-card ${x.active?'':'alumni'}" data-history-team="${e(o)}"><div class="team-photo"><div class="team-initials">${e(initials(o))}</div></div><div class="team-body"><div class="team-name">${e(o)}</div><div class="team-franchise">${e(x.currentTeam)}</div><div class="team-record"><strong>${w}–${l}</strong><span>2018–2025 Record</span></div></div></button>`;}).join('')}</div></div></section></div>`;
  document.querySelectorAll('[data-live-team]').forEach(b=>b.onclick=()=>showLiveTeam(Number(b.dataset.liveTeam)));
  document.querySelectorAll('[data-history-team]').forEach(b=>b.onclick=()=>showHistoricalTeam(b.dataset.historyTeam));wireImageFallback(app);
}
function showLiveTeam(rosterId){
  const r=SL.roster(rosterId),u=SL.rosterUser(r),row=matchupRowForRoster(rosterId,liveWeek),players=(r.players||[]).map(id=>SL.player(id)).filter(Boolean);
  openModal(`<div class="modal-hero"><div class="modal-hero-grid">${photo(userAvatar(u),SL.managerName(r))}<div><div class="eyebrow">2026 FRANCHISE FILE</div><h2>${e(SL.teamName(r))}</h2><p>${e(SL.managerName(r))} · ${rosterRecord(r)}</p></div></div></div><div class="modal-body"><div class="dd-profile-grid"><div><strong>${fmt(rosterPF(r))}</strong><small>Points for</small></div><div><strong>${fmt(rosterPA(r))}</strong><small>Points against</small></div><div><strong>${num(r.settings?.total_moves)}</strong><small>Transactions</small></div></div><div class="dd-modal-block"><h3>Current roster</h3><div class="tag-list">${players.map(p=>`<span class="tag">${e(p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' '))} · ${e(p.position||'')}</span>`).join('')}</div></div></div>`);wireImageFallback(modalContent);
}
function showHistoricalTeam(owner){
  const p=D.owners[owner],s=years.flatMap(y=>(H.standings?.[String(y)]||[]).filter(x=>x.owner===owner));
  openModal(`<div class="modal-hero"><div class="modal-hero-grid"><div class="modal-avatar">${e(initials(owner))}</div><div><div class="eyebrow">HISTORICAL FRANCHISE FILE</div><h2>${e(owner)}</h2><p>${e(p.currentTeam)}</p></div></div></div><div class="modal-body"><div class="dd-profile-grid"><div><strong>${p.trophies?.gold||0}</strong><small>Titles</small></div><div><strong>${s.reduce((n,x)=>n+num(x.w),0)}–${s.reduce((n,x)=>n+num(x.l),0)}</strong><small>Regular-season table</small></div><div><strong>${p.transactions?.trades??0}</strong><small>Historical trades</small></div></div><div class="dd-modal-block"><h3>Season history</h3>${s.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span>${e(x.team)} · ${x.w}–${x.l}</span><b>${fmt(x.pf)} PF</b></div>`).join('')}</div></div>`);
}

/* GALLERY */
function renderGallery(){
  app.innerHTML=`<div class="page">${pageHero('THE CAMERA ROLL','Gallery','This tab is reserved so Dirty D’s keeps the same navigation structure as ZYNFL.')}<section class="gallery-placeholder"><div class="wrap"><div class="eyebrow">COMING LATER</div><h2>Gallery</h2><p>No gallery images were added in this update, as requested.</p></div></section></div>`;
}

/* DRAFT CENTRAL */
function renderDraft(){
  app.innerHTML=liveLoading('Draft Central');
  ensureLive().then(drawDraftPage).catch(()=>drawDraftPage(false));
}
function liveDraftRows(){
  return (SL.data.picks||[]).map((pick,i)=>{const id=SL.pickPlayerId(pick),r=SL.roster(pick.roster_id),u=r?SL.rosterUser(r):SL.user(pick.picked_by);const manager=r?SL.managerName(r):(u?.display_name||u?.username||'Unknown'),team=r?SL.teamName(r):(u?.metadata?.team_name||manager),p=SL.player(id),keeper=Boolean(pick.is_keeper||pick.keeper||pick.metadata?.is_keeper||pick.metadata?.keeper);return {year:2026,player:SL.fullName(id),id,position:p.position||pick.metadata?.position||'',nflTeam:p.team||pick.metadata?.team||'',owner:manager,teamName:team,cost:SL.pickCost(pick),keeper,order:num(pick.pick_no||i+1)};});
}
function drawDraftPage(hasLive=true){
  if(currentPage!=='draft')return;
  const yearOptions=hasLive?[2026,...years]:years;
  if(!hasLive && draftYear===2026) draftYear=2025;
  const ownerOptions=draftYear===2026?(hasLive?liveTeams().map(x=>x.manager):[]):D.ownerOrder;
  app.innerHTML=`<div class="page">${pageHero('AUCTION HEADQUARTERS','Draft Central','2026 comes from Sleeper; 2018–2025 preserve the historical auction and keeper boards.')}<div class="stats-strip"><div class="wrap stat-grid">${stat('Completed historical auctions',8)}${stat('Historical entries',D.draftHistory.length)}${stat('Largest historical purchase',dollar(H.auction?.highest?.[0]?.cost))}${stat('2026 Sleeper entries',hasLive?SL.data.picks.length:'—')}</div></div><section class="section"><div class="wrap">${heading('THE AUCTION BOARD','What everybody paid.','Prices are dollar values, not snake-draft rounds or picks.')}<div class="dd-controls"><label>Year</label><select id="dYear">${yearOptions.map(y=>`<option value="${y}" ${y===draftYear?'selected':''}>${y}</option>`).join('')}</select><label>Position</label><select id="dPos">${['ALL','QB','RB','WR','TE','K','DEF'].map(x=>`<option ${x===draftPos?'selected':''}>${x}</option>`).join('')}</select><label>Manager</label><select id="dOwner"><option>ALL</option>${ownerOptions.map(x=>`<option ${x===draftOwner?'selected':''}>${e(x)}</option>`).join('')}</select><label>Entry</label><select id="dKind"><option value="ALL" ${draftKind==='ALL'?'selected':''}>Auction + keeper</option><option value="Auction" ${draftKind==='Auction'?'selected':''}>Auction purchases</option><option value="Keeper" ${draftKind==='Keeper'?'selected':''}>Keepers</option></select></div><div id="draftSummary"></div><div id="draftBoard"></div></div></section><section class="section alt"><div class="wrap">${heading('AUCTION HISTORY','Where the biggest dollars went.','Historical top purchases exclude keepers.')}<div class="dd-grid">${(H.auction?.highest||[]).slice(0,6).map(x=>`<article class="dd-card"><div class="dd-year-label">${x.year} · ${e(x.position)}</div><div class="dd-price">${dollar(x.cost)}</div><h3>${e(x.player)}</h3><p>${e(x.owner)} · ${e(x.teamName)}</p></article>`).join('')}</div></div></section></div>`;
  ['dYear','dPos','dOwner','dKind'].forEach(id=>document.getElementById(id).onchange=()=>{draftYear=Number(document.getElementById('dYear').value);draftPos=document.getElementById('dPos').value;draftOwner=document.getElementById('dOwner').value;draftKind=document.getElementById('dKind').value;if(id==='dYear'){draftOwner='ALL';drawDraftPage(hasLive);}else drawDraftBoard();});
  drawDraftBoard();
}
function drawDraftBoard(){
  const root=document.getElementById('draftBoard'),sum=document.getElementById('draftSummary');if(!root||!sum)return;
  let rows=draftYear===2026?liveDraftRows():(D.draftHistory||[]).filter(x=>Number(x.year)===draftYear).map(x=>({...x,keeper:Boolean(x.keeper)}));
  rows=rows.filter(x=>(draftPos==='ALL'||x.position===draftPos)&&(draftOwner==='ALL'||x.owner===draftOwner)&&(draftKind==='ALL'||(draftKind==='Keeper')===Boolean(x.keeper))).sort((a,b)=>(b.cost??-1)-(a.cost??-1)||a.player.localeCompare(b.player));
  const spend=rows.reduce((s,x)=>s+(x.cost==null?0:num(x.cost)),0),withPrice=rows.filter(x=>x.cost!=null).length;
  sum.innerHTML=`<div class="dd-stat-row" style="margin:12px 0 24px"><div><strong>${rows.length}</strong><small>Entries shown</small></div><div><strong>${dollar(spend)}</strong><small>Known dollars shown</small></div><div><strong>${withPrice}</strong><small>Entries with API price</small></div></div>${draftYear===2026&&rows.some(x=>x.cost==null)?note('Sleeper returned the draft picks but did not expose a dollar amount on every entry. Those rows are shown with “—” rather than inventing a price.'):''}`;
  root.innerHTML=rows.length?`<div class="dd-table-wrap"><table class="dd-table"><thead><tr><th>Price</th><th>Player</th><th>Position</th><th>Manager</th><th>Team</th><th>Type</th></tr></thead><tbody>${rows.map(x=>`<tr><td class="money">${x.cost==null?'—':dollar(x.cost)}</td><td><button ${draftYear===2026?`data-live-player="${e(x.id)}"`:`data-draft-name="${e(x.player)}"`}>${e(x.player)}</button><small>${e(x.nflTeam||'')}</small></td><td>${e(x.position||'')}</td><td><strong>${e(x.owner||'')}</strong></td><td>${e(x.teamName||'')}</td><td><span class="dd-tag">${x.keeper?'Keeper':'Auction'}</span></td></tr>`).join('')}</tbody></table></div>`:note('No auction entries match these filters.');
  wireLivePlayerButtons(root);
  document.querySelectorAll('[data-draft-name]').forEach(b=>b.onclick=()=>{const p=H.players.find(x=>norm(x.name)===norm(b.dataset.draftName));if(p)showArchivePlayer(p.key);});
}

document.getElementById('footerMeta').textContent='2018–2025 archive · 2026 live via Sleeper';
go((location.hash||'#home').slice(1));
