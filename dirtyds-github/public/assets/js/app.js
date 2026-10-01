/* Dirty D's archive — ZYNFL-parity UI with live Sleeper 2026 data. */
'use strict';
const D=window.DIRTY_DS_DATA, H=window.DIRTY_DS_HISTORY, A=window.DIRTY_DS_AWARDS, P=window.DIRTY_DS_PHOTOS, L=window.DIRTY_DS_LINEUPS, SL=window.DIRTY_DS_LIVE;
const K26=window.DIRTY_DS_KEEPERS_2026||[];
const app=document.getElementById('app'), nav=[...document.querySelectorAll('.nav-link')];
const backdrop=document.getElementById('modalBackdrop'), modalContent=document.getElementById('modalContent');
const years=(H?.league||[]).map(x=>Number(x.year)).sort((a,b)=>b-a);
let currentPage='home', liveWeek=1, matchMode='dirtyds', matchIndex=0, powerView='analyst';
let archiveMatchYear=2025, archiveMatchWeek=17;
let seasonYear=2026, playerSearch='', playerPos='ALL', playerOwner='ALL', playerSort='points', playerLimit=40, playerTopPos='QB';
let draftYear=2026, draftPos='ALL', draftOwner='ALL', draftKind='ALL', h2hScope='all', recordYear='all';
const nflCache={};
const optimalCache=new Map();
const managerHandles={zwack12:'Ben',zwack:'Ben',mrwick:'James',bdunnigan:'Brent',jwosman1981:'Jeff',jdunnigan:'Jack',vincat:'Vinny',iamfritz:'Fritz',nickmo2699:'Nick',tymid02:'Tyler',rocknflow:'Jake',dcorello:'Dan',gryf6:'Bobby'};
function canonicalManager(roster){
  const u=SL?.rosterUser(roster);
  return managerHandles[String(u?.display_name||u?.username||'').toLowerCase()]||managerHandles[String(u?.username||'').toLowerCase()]||null;
}
function weekComplete(week){
  const rows=SL?.data?.weeks?.[week]||[];
  return rows.length===SL?.data?.rosters?.length && rows.every(r=>r.points!=null) &&
    (week<SL.currentWeek() || (week===SL.currentWeek() && num(SL.data.league?.settings?.last_scored_leg)>=week));
}
function completedWeeks(through=SL?.currentWeek?.()||0){return Array.from({length:through},(_,i)=>i+1).filter(weekComplete);}
function managerFor(roster){return canonicalManager(roster)||SL.managerName(roster);}
function recordAt(rosterId,week){
  const record={w:0,l:0,t:0,pf:0,pa:0};
  for(const w of completedWeeks(week)){
    const pair=matchupGroups(w).find(g=>g.some(x=>num(x.roster_id)===num(rosterId)));
    if(!pair)continue;
    const a=pair.find(x=>num(x.roster_id)===num(rosterId)),b=pair.find(x=>x!==a);
    record.pf+=num(a.points);record.pa+=num(b.points);
    if(num(a.points)>num(b.points))record.w++;else if(num(a.points)<num(b.points))record.l++;else record.t++;
  }
  return record;
}
const weekRecord=x=>`${x.w}–${x.l}${x.t?`–${x.t}`:''}`;

const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x||0);
const fmt=(n,d=2)=>Number(n||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
const dollar=n=>n==null?'—':`$${Math.round(Number(n||0)).toLocaleString()}`;
const initials=s=>String(s||'').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase();
const norm=s=>String(s||'').toLowerCase().replace(/[’'.]/g,'').replace(/\b(jr|sr|ii|iii|iv)\b/g,'').replace(/[^a-z0-9]/g,'');
const pts=n=>n==null?'—':Number(n).toFixed(2);
function posBadge(value){
  const raw=String(value||'').toUpperCase(), pos=raw==='DST'||raw==='D/ST'?'DEF':raw==='SUPER_FLEX'||raw==='SF'?'SUPERFLEX':raw;
  const base=pos.match(/^(QB|RB|WR|TE|SUPERFLEX|FLEX|DEF|K)/)?.[1]||'';
  return `<span class="pos-badge pos-${e(base)}">${e(pos||'—')}</span>`;
}
const nflLogo=abbr=>`https://a.espncdn.com/i/teamlogos/nfl/500/${encodeURIComponent(({JAX:'jax',WAS:'wsh',LAR:'lar',LV:'lv',SF:'sf',NO:'no',TB:'tb'}[abbr]||abbr||'').toLowerCase())}.png`;
const teamName=owner=>D?.owners?.[owner]?.currentTeam||owner;
const heading=(k,t,desc='')=>`<div class="section-heading"><div><div class="kicker">${e(k)}</div><h2>${e(t)}</h2></div>${desc?`<p>${e(desc)}</p>`:''}</div>`;
const pageHero=(k,t,desc='')=>`<section class="page-hero"><div class="wrap"><div class="eyebrow">${e(k)}</div><h1>${e(t)}</h1>${desc?`<p>${e(desc)}</p>`:''}</div></section>`;
const stat=(label,value)=>`<div class="stat"><div class="stat-value">${e(value)}</div><div class="stat-label">${e(label)}</div></div>`;
const note=html=>`<div class="dd-note">${html}</div>`;
const recordCard=r=>`<article class="record-card"><div class="record-title">${e(r.title).replace(/\b(QB|RB|WR|TE|FLEX|SUPERFLEX|K|DEF)\b/g,posBadge)}</div><div class="record-value">${e(r.value)}</div><div class="record-detail">${e(r.owner||'')}${r.team?` · ${e(r.team)}`:''}${r.year?` · ${e(r.year)}`:''}</div>${r.detail?`<div class="record-subdetail">${e(r.detail)}</div>`:''}</article>`;
const bannerCard=c=>`<button class="banner" type="button" data-champion-year="${Number(c.year)}" aria-label="Show ${e(c.year)} champion starting lineup"><span class="banner-year">${e(c.year)} CHAMPION</span><span class="banner-team">${e(c.team)}</span><span class="banner-owner">${e(c.owner)}</span><span class="banner-record">${e(c.record)}</span><span class="banner-cta">View championship lineup ↗</span></button>`;
function wireBanners(){document.querySelectorAll('[data-champion-year]').forEach(b=>b.onclick=()=>showChampionship(Number(b.dataset.championYear)));}
function showChampionship(year){
  const x=L?.championships?.[year];
  if(!x)return openModal(`<div class="modal-body"><h2>${e(year)} championship</h2><p>The archived player rows do not include this lineup.</p></div>`);
  openModal(`<div class="modal-hero"><div class="eyebrow">${year} CHAMPIONSHIP · WEEK ${x.week}</div><h2>${e(x.team)}</h2><p>${e(x.owner)} · ${fmt(x.score)} starter points</p></div><div class="modal-body"><h3>Championship starting lineup</h3><div class="champ-lineup">${x.starters.map(p=>`<div><span class="champ-slot">${posBadge(p.slot)}</span><strong>${e(p.name)}</strong><b>${fmt(p.points)} pts</b></div>`).join('')}</div></div>`);
}
function openModal(html){modalContent.innerHTML=html;backdrop.hidden=false;document.body.style.overflow='hidden';}
function closeModal(){backdrop.hidden=true;document.body.style.overflow='';}
document.getElementById('modalClose').onclick=closeModal;
backdrop.onclick=ev=>{if(ev.target===backdrop)closeModal();};
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!backdrop.hidden)closeModal();});
document.getElementById('mobileMenu').onclick=()=>{const n=document.getElementById('mainNav');const open=n.classList.toggle('open');document.getElementById('mobileMenu').setAttribute('aria-expanded',String(open));};
nav.forEach(b=>b.onclick=()=>go(b.dataset.page));
const seasonMenu=document.getElementById('seasonMenu');
seasonMenu.onclick=()=>{const expanded=seasonMenu.getAttribute('aria-expanded')==='true';seasonMenu.setAttribute('aria-expanded',String(!expanded));seasonMenu.parentElement.classList.toggle('expanded',!expanded);};
document.addEventListener('click',ev=>{if(!ev.target.closest('.nav-dropdown')){seasonMenu.setAttribute('aria-expanded','false');seasonMenu.parentElement.classList.remove('expanded');}});

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
const defenseAbbr={'49ers':'sf',Bears:'chi',Bengals:'cin',Bills:'buf',Broncos:'den',Browns:'cle',Buccaneers:'tb',Cardinals:'ari',Chargers:'lac',Chiefs:'kc',Colts:'ind',Commanders:'wsh',Cowboys:'dal',Dolphins:'mia',Eagles:'phi',Falcons:'atl',Giants:'nyg',Jaguars:'jax',Jets:'nyj',Lions:'det',Packers:'gb',Panthers:'car',Patriots:'ne',Raiders:'lv',Rams:'lar',Ravens:'bal',Saints:'no',Seahawks:'sea',Steelers:'pit',Texans:'hou',Titans:'ten',Vikings:'min'};
function archivePortrait(player){
  const abbr=player.position==='DEF'?defenseAbbr[player.name]:null;
  return abbr?`https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`:P?.[player.key]||'';
}
function wireImageFallback(root=document){
  root.querySelectorAll('.z-photo img').forEach(img=>img.addEventListener('error',()=>{const p=img.parentElement;img.remove();p.innerHTML='<span>—</span>';},{once:true}));
}
function rosterPF(r){const s=r?.settings||{};return num(s.fpts)+num(s.fpts_decimal)/100;}
function rosterPA(r){const s=r?.settings||{};return num(s.fpts_against)+num(s.fpts_against_decimal)/100;}
function liveTeams(){
  return (SL?.data?.rosters||[]).map(r=>({r,user:SL.rosterUser(r),manager:managerFor(r),team:SL.teamName(r)}));
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
  const score=p.points, size=compact?42:Math.round(38+Math.min(12,Math.sqrt(Math.max(0,score??0))*2));
  const color='#8fb695';
  const logo=p.position==='DEF'||p.slot==='DEF'?nflLogo(p.nfl):p.headshot;
  return `<button class="z-player ${compact?'z-compact':''}" data-live-player="${e(p.id)}" style="--bubble:${size}px;--owner:${color}" aria-label="Open ${e(p.name)} player details">${photo(logo,p.name,'z-player-photo')}${posBadge(p.slot&&p.slot!=='BN'&&p.slot!=='IR'?p.slot:p.position)}<strong>${e(p.name)}</strong>${nfl?`<em>${e(p.owner)}</em>`:`<small>${e(p.nfl||'FA')}${p.points!=null?` · ${pts(p.points)} pts`:''}</small>`}</button>`;
}
function formation(rows,top,nfl=false){
  const qbs=rows.filter(p=>p.position==='QB'||p.slot==='SUPER_FLEX');
  const backs=rows.filter(p=>['RB','FB','K','DEF'].includes(p.position)&&!['FLEX','SUPER_FLEX'].includes(p.slot));
  const wings=rows.filter(p=>!qbs.includes(p)&&!backs.includes(p));
  const line=`<div class="z-line" aria-hidden="true">${['LT','LG','C','RG','RT'].map(x=>`<span class="${x==='C'?'z-center':''}"></span>`).join('')}</div>`;
  return `<div class="z-formation ${top?'z-top':'z-bottom'}"><div class="z-backs">${backs.map(p=>playerBubble(p,nfl)).join('')}</div><div class="z-qb">${qbs.map(p=>playerBubble(p,nfl)).join('')}</div><div class="z-receivers">${wings.map(p=>playerBubble(p,nfl)).join('')}</div>${line}</div>`;
}
function teamHeader(team,score,bottom=false,subtitle=''){
  return `<div class="z-team-header ${bottom?'z-header-bottom':''}">${photo(team.nfl?nflLogo(team.nfl):team.avatar,team.name)}<div><span class="z-eyebrow">${e(subtitle)}</span><h2>${e(team.name)}</h2></div><div class="z-team-score"><strong>${score==null?'—':pts(score)}</strong><small>Week ${liveWeek} points</small></div></div>`;
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
  const routes={home:renderHome,season2026:renderSeason2026,power:renderPowerPage,matchups:renderMatchups,seasons:renderSeasons,history:renderHistory,players:renderPlayers,teams:renderTeams,draft:renderDraft};
  if(!routes[page]) page='home';
  currentPage=page;
  nav.forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  seasonMenu.classList.toggle('active',['season2026','power'].includes(page));
  seasonMenu.setAttribute('aria-expanded','false');seasonMenu.parentElement.classList.remove('expanded');
  document.getElementById('mainNav').classList.remove('open');
  document.getElementById('mobileMenu').setAttribute('aria-expanded','false');
  routes[page]();
  history.replaceState(null,'',`#${page}`);
  window.scrollTo({top:0,behavior:'instant'});
}

/* HOME */
function renderHome(){
  app.innerHTML=`<div class="page home-page"><section class="hero"><div class="wrap home-hero"><img src="assets/images/logo/dirtyds-chicken.jpg" alt="Dirty D's chicken logo"><div><div class="eyebrow">EST. 2018 · HALF-PPR · SUPERFLEX</div><h1>DIRTY <span class="accent">D'S</span></h1><p class="hero-deck">The league, all in one place.</p></div></div></section><section class="section"><div class="wrap"><div class="home-routes"><button data-go="power"><span>01 / THE OUTLOOK</span><strong>Power Rankings</strong><small>Who looks built for the rest of the season ↗</small></button><button data-go="matchups"><span>02 / GAME DAY</span><strong>Matchups</strong><small>Every starter, on the field ↗</small></button><button data-go="history"><span>03 / THE ARCHIVE</span><strong>League History</strong><small>Champions, records and rivalries ↗</small></button></div></div></section><section class="section alt"><div class="wrap">${heading('AROUND THE NFL','Latest headlines.','Open a story from ESPN.') }<div id="homeNews" class="home-news">${note('Loading NFL headlines…')}</div></div></section></div>`;
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  loadNews();
}
async function loadNews(){
  const root=document.getElementById('homeNews');if(!root)return;
  try{
    const response=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=6');
    if(!response.ok)throw new Error('News feed unavailable');
    const data=await response.json();if(currentPage!=='home')return;
    const articles=(data.articles||[]).filter(x=>{try{const u=new URL(x.links?.web?.href);return x.headline&&u.protocol==='https:'&&(u.hostname==='espn.com'||u.hostname.endsWith('.espn.com'));}catch{return false;}}).slice(0,6);
    if(!articles.length)throw new Error('No articles returned');
    root.innerHTML=articles.map(x=>`<a class="news-story" href="${e(x.links.web.href)}" target="_blank" rel="noopener noreferrer"><span>ESPN NFL · ${e(x.published?new Date(x.published).toLocaleDateString(): 'LATEST')}</span><strong>${e(x.headline)}</strong><small>Read story ↗</small></a>`).join('');
  }catch{if(currentPage==='home')root.innerHTML='<p class="z-muted">Headlines are temporarily unavailable. <a href="https://www.espn.com/nfl/" target="_blank" rel="noopener noreferrer">See NFL news at ESPN ↗</a></p>';}
}

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
  const review=finished?`${tight?'A nail-biter':blowout?'A statement win':'A hard-fought result'} for ${managerFor(winner)}: ${SL.teamName(winner)} took down ${SL.teamName(loser)} by ${pts(margin)}. ${star?`${SL.fullName(star.id)} supplied the fireworks with ${pts(star.points)} starter points${star.projection?` (${num(star.points)>=star.projection?'+':''}${pts(num(star.points)-star.projection)} versus projection)`:''}. `:''}${other?`${SL.fullName(other.id)} kept the other side in it with ${pts(other.points)}, but the comeback fell short. `:''}${dud&&num(dud.points)<dud.projection-5?`${SL.fullName(dud.id)} was the swing miss: ${pts(dud.points)} against ${pts(dud.projection)} projected. `:''}${injured.length?`${injured.map(x=>SL.fullName(x.id)).slice(0,2).join(' and ')} ${injured.length===1?'is':'are'} currently tagged with an injury by Sleeper, a storyline to watch after this matchup. `:''}${tight?'One extra catch or a single lineup decision could have flipped it.':blowout?'That margin will linger into next week.':'The margins in this league remain unforgiving.'}`:`Week ${week} is in progress. The review will fill in when Sleeper finalizes the scores.`;
  return `<article class="z-recap"><div class="z-recap-heading">${photo(userAvatar(SL.rosterUser(winner)),SL.teamName(winner))}<div><small>${e(managerFor(winner))}</small><h3>${e(SL.teamName(winner))}</h3></div><strong>${finished?pts(winRow.points):'—'}</strong></div><div class="z-result">${finished?`${num(a.points)===num(b.points)?'TIE':'WIN'} vs. ${e(SL.teamName(loser))} · ${pts(winRow.points)}–${pts(loseRow.points)}`:`${e(SL.teamName(ra))} vs. ${e(SL.teamName(rb))}`}</div><p>${e(review)}</p></article>`;
}
function teamProjection(r){
  const row=matchupRowForRoster(r.roster_id,liveWeek);
  if(!row)return 0;
  return (row.starters||[]).reduce((sum,id)=>sum+projectionFor(id,liveWeek),0);
}
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
function renderPowerPage(){
  app.innerHTML=liveLoading('Power Rankings');
  ensureLive().then(async()=>{
    await Promise.all([SL.getROSProjections(),SL.getProjections(SL.currentWeek())]);
    if(currentPage!=='power')return;
    app.innerHTML=`<div class="page z-page">${pageHero('2026 SEASON','Power Rankings','Two takes on the league’s playoff race.')}<section class="section"><div class="wrap"><div class="z-ranking-toolbar"><div class="z-toggle" role="group" aria-label="Ranking author"><button data-power-view="analyst">Analyst Rankings</button><button data-power-view="jack">Jack’s Rankings · Week 3</button></div></div><div id="livePowerContent"></div></div></section></div>`;
    document.querySelectorAll('[data-power-view]').forEach(b=>b.onclick=()=>{powerView=b.dataset.powerView;drawPowerRankings();});
    drawPowerRankings();
  }).catch(err=>{if(currentPage==='power')app.innerHTML=liveError(err);});
}
function projectedPlayer(id,remaining){
  const p=SL.player(id),season=SL.projectionPoints(SL.data.rosProjections?.[id]);
  const actual=SL.statPoints(SL.data.stats?.[id]);
  const weekly=projectionFor(id,SL.currentWeek());
  const historical=actual/Math.max(1,completedWeeks().length);
  const rest=season>actual?Math.max(0,(season-actual)/Math.max(1,18-SL.currentWeek())):0;
  const base=rest&&weekly?0.6*rest+0.4*weekly:rest||weekly||historical;
  return Math.max(0,base)*(['IR','Out'].includes(p.injury_status)?0.55:p.injury_status==='Doubtful'?0.72:1);
}
function starterProjection(roster){
  const players=(roster.players||[]).map(id=>({id:String(id),pos:SL.player(id).position,points:projectedPlayer(String(id))})).filter(p=>p.points>0);
  const used=new Set(),lineup=[];
  const take=(eligible)=>{const candidate=players.filter(p=>!used.has(p.id)&&eligible.includes(p.pos)).sort((a,b)=>b.points-a.points)[0];if(candidate){used.add(candidate.id);lineup.push(candidate);}return candidate;};
  const slots=SL.data.league?.roster_positions||['QB','RB','RB','WR','WR','TE','FLEX','SUPER_FLEX','K','DEF'];
  for(const slot of slots.filter(s=>!['FLEX','SUPER_FLEX','REC_FLEX','WRRB_FLEX','BN','IR'].includes(s)))take([slot==='DST'?'DEF':slot]);
  for(const slot of slots.filter(s=>['FLEX','REC_FLEX','WRRB_FLEX'].includes(s)))take(slot==='REC_FLEX'?['WR','TE']:['RB','WR','TE']);
  for(const slot of slots.filter(s=>s==='SUPER_FLEX'))take(['QB','RB','WR','TE']);
  const mean=lineup.reduce((n,p)=>n+p.points,0),backup=players.filter(p=>!used.has(p.id)).sort((a,b)=>b.points-a.points);
  const cover=backup.filter(p=>['QB','RB','WR','TE'].includes(p.pos)).slice(0,3).reduce((n,p)=>n+p.points,0);
  return {mean,cover,lineup,backup};
}
function simulateRest(teams,through){
  const finalWeek=Math.min(14,num(SL.data.league?.settings?.playoff_week_start||15)-1);
  const odds=Object.fromEntries(teams.map(t=>[t.manager,0]));
  if(finalWeek<=through)return odds;
  let seed=20261001+through;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let trial=0;trial<1000;trial++){
    const standings=teams.map(t=>({manager:t.manager,w:t.record.w+.5*t.record.t,pf:t.record.pf}));
    for(let week=through+1;week<=finalWeek;week++){
      const scored=teams.map(t=>Math.max(0,t.projection.mean+(random()+random()+random()-1.5)*48));
      const schedule=matchupGroups(week);
      const pairs=schedule.length===teams.length/2?schedule.map(g=>g.map(row=>teams.findIndex(t=>t.r.roster_id===row.roster_id))):Array.from({length:teams.length/2},(_,i)=>[(i+week)%teams.length,(teams.length-1-i+week)%teams.length]);
      for(const [a,b] of pairs){if(a<0||b<0)continue;standings[a].pf+=scored[a];standings[b].pf+=scored[b];if(scored[a]===scored[b]){standings[a].w+=.5;standings[b].w+=.5;}else standings[scored[a]>scored[b]?a:b].w++;}
    }
    standings.sort((a,b)=>b.w-a.w||b.pf-a.pf);
    standings.slice(0,6).forEach(t=>odds[t.manager]++);
  }
  for(const key of Object.keys(odds))odds[key]/=10;
  return odds;
}
function drawPowerRankings(){
  const root=document.getElementById('livePowerContent');if(!root)return;
  document.querySelectorAll('[data-power-view]').forEach(b=>{const active=b.dataset.powerView===powerView;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  const through=powerView==='jack'?3:Math.max(...completedWeeks(),0);
  const teams=liveTeams().map(x=>{const record=recordAt(x.r.roster_id,through),games=Math.max(1,record.w+record.l+record.t);return {...x,record,pfpg:record.pf/games,projection:starterProjection(x.r)};});
  if(powerView==='jack')teams.sort((a,b)=>jackWeek3.findIndex(j=>j[0]===a.manager)-jackWeek3.findIndex(j=>j[0]===b.manager));
  else{
    const odds=simulateRest(teams,through),means=teams.map(t=>t.projection.mean),min=Math.min(...means),max=Math.max(...means);
    teams.forEach(t=>{t.playoff=odds[t.manager]||0;t.powerScore=.76*(max===min?.5:(t.projection.mean-min)/(max-min))+.18*t.playoff/100+.06*Math.min(1,t.projection.cover/45);});
    teams.sort((a,b)=>b.powerScore-a.powerScore||b.projection.mean-a.projection.mean);
  }
  root.innerHTML=`<p class="z-muted">${powerView==='jack'?'Jack’s Week 3 order and team notes.':'Analyst Rankings are built on roster depth, future expected points, and ROS predictions.'}</p>${powerView==='analyst'?'<p class="rank-method">Projected points use Sleeper season and weekly projections, adjusted by scoring to date and current injury tags. The model fills only legal starter slots, gives limited value to reserve cover, and runs 1,000 remaining-season simulations. Playoff odds are estimates, not guarantees.</p>':''}<ol class="z-ranking-list">${teams.map((x,i)=>{
    const lineup=x.projection.lineup.slice().sort((a,b)=>b.points-a.points),stars=lineup.slice(0,2).map(p=>SL.fullName(p.id));
    const byPos=Object.entries(lineup.reduce((o,p)=>(o[p.pos]=(o[p.pos]||0)+p.points,o),{})).sort((a,b)=>b[1]-a[1]);
    const thin=x.projection.backup.filter(p=>p.points>=8).length<2;
    const explanation=powerView==='jack'?jackWeek3.find(row=>row[0]===x.manager)?.[1]||'':`${stars.length?`${stars.join(' and ')} project as the weekly anchors. `:''}${byPos.length?`${byPos[0][0]} contributes the largest share of the optimized starting lineup, while ${byPos.at(-1)[0]} is the position with the smallest projected return. `:''}${thin?'Reliable replacement options are scarce, so an injury or bye could hurt more than it would for deeper rivals.':`The bench has ${x.projection.backup.filter(p=>p.points>=8).length} useful replacement options, giving this team a cushion through byes and injuries.`} An estimated ${Math.round(x.playoff||0)}% of the remaining-season simulations put this roster in the top six.`;
    return `<li><strong class="z-rank">${String(i+1).padStart(2,'0')}</strong>${photo(userAvatar(x.user),x.manager)}<div><h3>${e(x.team)}</h3><small>${e(x.manager)} · ${weekRecord(x.record)} · ${x.pfpg.toFixed(1)} PF/game${powerView==='analyst'?` · ${x.projection.mean.toFixed(1)} projected starter pts/week`:''}</small><p>${e(explanation)}</p></div></li>`;
  }).join('')}</ol>`;
  wireImageFallback(root);
}

/* MATCHUPS */
function renderMatchups(){
  app.innerHTML=liveLoading('Matchups');
  ensureLive().then(drawMatchupsPage).catch(err=>{if(currentPage==='matchups')app.innerHTML=liveError(err);});
}
function drawMatchupsPage(){
  if(currentPage!=='matchups')return;
  app.innerHTML=`<div class="page z-page"><section class="z-page-heading wrap"><div><div class="eyebrow">THE LEAGUE, ON THE FIELD</div><h1>Matchups</h1><p>Every player. Every owner. One field.</p></div><a class="z-text-link" href="#season2026" data-go="season2026">Read Week ${liveWeek} ↗</a></section><div class="wrap">${liveWeekButtons()}<div class="z-match-layout"><aside class="z-sidebar"><label for="liveMatchMode">Matchup view</label><select id="liveMatchMode"><option value="dirtyds">Dirty D's matchups</option><option value="nfl">NFL matchups</option></select><label for="liveMatchSelect" style="margin-top:14px">Choose a matchup</label><select id="liveMatchSelect"></select><div id="liveMatchList" class="z-match-list"></div></aside><section class="z-match-main"><div class="z-field-note">Tap a player for points, projection, auction price and 2026 game log.</div><div id="liveField">${note('Building the field…')}</div></section></div><section class="live-archive-link">${heading('HISTORICAL MATCHUPS','2018–2025 archive.','')}<div id="archiveMatchups"></div></section></div></div>`;
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
    const g=games[matchIndex],aPlayers=nflLineup(g.a),bPlayers=nflLineup(g.b);
    field.innerHTML=`<div class="z-field-scroll"><div class="z-field">${teamHeader({name:g.a,nfl:g.a},g.aScore,false,`NFL · Week ${liveWeek}`)}${formation(aPlayers,true,true)}<div class="z-midfield"><span>DIRTY D'S</span><small>NFL VIEW</small></div>${formation(bPlayers,false,true)}${teamHeader({name:g.b,nfl:g.b},g.bScore,true,`NFL · Week ${liveWeek}`)}</div></div>`;
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
  field.innerHTML=`<div class="z-field-scroll"><div class="z-field">${teamHeader({name:SL.teamName(ra),avatar:userAvatar(SL.rosterUser(ra))},a.points,false,`${managerFor(ra)} · ${weekRecord(recordAt(ra.roster_id,liveWeek))}`)}${formation(pa.starters,true)}<div class="z-midfield"><span>DIRTY D'S</span><small>WEEK ${String(liveWeek).padStart(2,'0')}</small></div>${formation(pb.starters,false)}${teamHeader({name:SL.teamName(rb),avatar:userAvatar(SL.rosterUser(rb))},b.points,true,`${managerFor(rb)} · ${weekRecord(recordAt(rb.roster_id,liveWeek))}`)}</div></div>${[[ra,pa],[rb,pb]].map(([r,p])=>`<details class="z-reserves"><summary>${e(SL.teamName(r))} bench · ${p.bench.length} players</summary><div class="z-bench-grid">${p.bench.map(x=>playerBubble(x,false,true)).join('')||'<p>No bench players.</p>'}</div></details>${p.ir.length?`<details class="z-reserves"><summary>${e(SL.teamName(r))} IR · ${p.ir.length} players</summary><div class="z-bench-grid">${p.ir.map(x=>playerBubble(x,false,true)).join('')}</div></details>`:''}`).join('')}`;
  wireLivePlayerButtons(field);
}
function archiveAvailableWeeks(year){return Object.keys(H.matchups?.[String(year)]||{}).map(Number).sort((a,b)=>a-b);}
function drawArchiveMatchups(){
  const root=document.getElementById('archiveMatchups');if(!root)return;
  const weeks=archiveAvailableWeeks(archiveMatchYear);if(!weeks.includes(archiveMatchWeek))archiveMatchWeek=weeks.at(-1)||1;
  const games=H.matchups?.[String(archiveMatchYear)]?.[String(archiveMatchWeek)]||[];
  root.innerHTML=`<div class="dd-controls"><label>Season</label><select id="amYear">${years.map(y=>`<option value="${y}" ${y===archiveMatchYear?'selected':''}>${y}</option>`).join('')}</select><label>Week</label><select id="amWeek">${weeks.map(w=>`<option value="${w}" ${w===archiveMatchWeek?'selected':''}>Week ${w}</option>`).join('')}</select></div><div style="margin-top:18px">${games.map(g=>`<article class="dd-match"><div class="dd-match-side ${num(g.a.score)>num(g.b.score)?'winner':''}"><div class="dd-initial">${e(initials(g.a.owner))}</div><div class="dd-side-name"><strong>${e(g.a.owner)}</strong><small>${e(g.a.team)}</small></div><span class="dd-score">${fmt(g.a.score)}</span></div><div class="dd-versus">VS</div><div class="dd-match-side right ${num(g.b.score)>num(g.a.score)?'winner':''}"><span class="dd-score">${fmt(g.b.score)}</span><div class="dd-side-name"><strong>${e(g.b.owner)}</strong><small>${e(g.b.team)}</small></div><div class="dd-initial">${e(initials(g.b.owner))}</div></div></article>`).join('')||note('No archived games found.')}</div>`;
  document.getElementById('amYear').onchange=()=>{archiveMatchYear=Number(document.getElementById('amYear').value);archiveMatchWeek=archiveAvailableWeeks(archiveMatchYear).at(-1)||1;drawArchiveMatchups();};
  document.getElementById('amWeek').onchange=()=>{archiveMatchWeek=Number(document.getElementById('amWeek').value);drawArchiveMatchups();};
}
async function showLivePlayer(id){
  await ensureLive().catch(()=>{});
  playerProfile(SL.fullName(id),id);
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
  app.innerHTML=`<div class="page">${pageHero('THE YEARBOOK','All Seasons','Eight completed Yahoo seasons plus the live 2026 Sleeper season.')}<section class="section"><div class="wrap">${heading('SEASON ARCHIVE','Choose a year.','')}<div class="season-grid"><button class="season-card live ${seasonYear===2026?'selected':''}" data-season-year="2026"><div class="season-status">LIVE</div><div class="season-year">2026</div><h3>${e(lead?.team||'Sleeper season')}</h3><p>${lead?`${e(lead.manager)} · ${rosterRecord(lead.r)} current leader`:'Current season'}</p></button>${years.map(y=>{const c=D.champions.find(x=>Number(x.year)===y);return `<button class="season-card live ${seasonYear===y?'selected':''}" data-season-year="${y}"><div class="season-status">Complete</div><div class="season-year">${y}</div><h3>${e(c?.owner||'')} · ${e(c?.team||'')}</h3><p>${e(c?.record||'')} regular season · champion</p></button>`;}).join('')}</div><div id="seasonDetail"></div></div></section></div>`;
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
    const st=liveStandings();root.innerHTML=`<div class="dd-preview" style="margin:32px 0 20px"><div class="dd-year-label">2026 season file · live</div><h2 style="margin:5px 0">${e(SL.data.league?.name||"Dirty D's")}</h2><p style="margin:0">Week ${SL.currentWeek()}</p></div><div class="z-standings-shell"><table class="z-standings"><thead><tr><th>#</th><th>Manager / Team</th><th>Record</th><th>PF</th><th>PA</th></tr></thead><tbody>${st.map((x,i)=>`<tr><td>${i+1}</td><td><strong>${e(x.manager)}</strong><small style="display:block">${e(x.team)}</small></td><td>${rosterRecord(x.r)}</td><td>${fmt(rosterPF(x.r))}</td><td>${fmt(rosterPA(x.r))}</td></tr>`).join('')}</tbody></table></div>`;return;
  }
  const c=D.champions.find(x=>Number(x.year)===seasonYear),games=Object.values(H.matchups?.[String(seasonYear)]||{}).flat(),high=games.flatMap(g=>[g.a,g.b]).sort((a,b)=>num(b.score)-num(a.score))[0];
  root.innerHTML=`<div class="dd-preview" style="margin:32px 0 20px"><div class="dd-year-label">${seasonYear} season file</div><h2 style="margin:5px 0">${e(c?.team||'')}</h2><p style="margin:0">${e(c?.owner||'')} · Champion · ${e(c?.record||'')} regular season.</p><div class="dd-stat-row"><div><strong>${games.length}</strong><small>Known matchups</small></div><div><strong>${high?fmt(high.score):'—'}</strong><small>Highest archived week · ${e(high?.owner||'')}</small></div></div></div>${heading('REGULAR SEASON','The standings.','')}${historicalStandingsTable(seasonYear)}`;
}

function seasonRows(year){
  if(year===2026){
    const end=Math.min(Math.max(...completedWeeks(),0),num(SL?.data?.league?.settings?.playoff_week_start||15)-1);
    return liveTeams().map(x=>{const r=recordAt(x.r.roster_id,end);return {year:2026,owner:x.manager,team:x.team,pf:r.pf,pa:r.pa,w:r.w,l:r.l,t:r.t,rosterId:x.r.roster_id};});
  }
  return H.standings?.[String(year)]||[];
}
function seasonDraft(year){return year===2026?liveDraftRows():(D.draftHistory||[]).filter(x=>x.year===year);}
function seasonPlayerRows(year){
  if(year===2026){
    const out={};
    for(const w of completedWeeks())for(const row of SL.data.weeks[w]||[]){
      const roster=SL.roster(row.roster_id),owner=managerFor(roster);
      lineupSlots(row).forEach(({id,slot})=>{const key=`${owner}:${id}`,p=SL.player(id);const x=out[key]??={year,owner,id,player:SL.fullName(id),position:p.position||slot,slot,points:0,starts:0};x.points+=num(scoreFor(row,id));x.starts++;});
    }
    return Object.values(out);
  }
  return (H.players||[]).flatMap(p=>(p.seasons||[]).filter(s=>s.year===year&&s.starts).map(s=>({...s,player:p.name,position:p.position})));
}
function optimalLineup(row){
  const key=`${row.roster_id}:${row.matchup_id}:${JSON.stringify(row.players_points||{})}`;
  if(optimalCache.has(key))return optimalCache.get(key);
  const slots=(SL.data.league?.roster_positions||[]).filter(x=>!['BN','IR','TAXI'].includes(x)).sort((a,b)=>({QB:0,K:1,DEF:2,TE:3,RB:4,WR:5,FLEX:6,SUPER_FLEX:7}[a]??8)-({QB:0,K:1,DEF:2,TE:3,RB:4,WR:5,FLEX:6,SUPER_FLEX:7}[b]??8));
  const ids=(row.players||[]).filter(id=>id&&id!=='0').slice(0,22),memo=new Map();
  const eligible=(id,slot)=>{const p=SL.player(id),positions=p.fantasy_positions?.length?p.fantasy_positions:[p.position];return slot==='FLEX'?positions.some(x=>['RB','WR','TE'].includes(x)):slot==='SUPER_FLEX'?positions.some(x=>['QB','RB','WR','TE'].includes(x)):positions.includes(slot);};
  const solve=(index,mask)=>{
    if(index>=slots.length)return 0;
    const state=`${index}:${mask}`;if(memo.has(state))return memo.get(state);
    let best=-Infinity;
    for(let i=0;i<ids.length;i++)if(!(mask&(1<<i))&&eligible(ids[i],slots[index]))best=Math.max(best,num(scoreFor(row,ids[i]))+solve(index+1,mask|(1<<i)));
    memo.set(state,best);return best;
  };
  const value=solve(0,0),safe=Number.isFinite(value)?Math.max(value,num(row.points)):num(row.points);
  optimalCache.set(key,safe);return safe;
}
function recordCandidates(year){
  const rows=seasonRows(year),games=year===2026?completedWeeks().flatMap(w=>matchupGroups(w).map(g=>({year,week:w,a:{owner:managerFor(SL.roster(g[0].roster_id)),score:g[0].points},b:{owner:managerFor(SL.roster(g[1].roster_id)),score:g[1].points}}))):Object.values(H.matchups?.[String(year)]||{}).flat();
  const weeks=year===2026?completedWeeks().flatMap(w=>(SL.data.weeks[w]||[]).map(r=>({year,week:w,owner:managerFor(SL.roster(r.roster_id)),score:num(r.points)}))):Object.values(H.weekly?.[String(year)]||{}).flat();
  const purchases=seasonDraft(year).filter(x=>x.cost!=null&&!x.keeper);
  const players=seasonPlayerRows(year);
  const costByPlayer=new Map(seasonDraft(year).filter(x=>x.cost!=null).map(x=>[norm(x.player),num(x.cost)]));
  const draftedBy=new Map(seasonDraft(year).map(x=>[norm(x.player),x.owner]));
  const byOwner={};
  for(const p of players){
    const x=byOwner[p.owner]??={year,owner:p.owner,points:0,kd:0,ownDraft:0,otherDraft:0,storage:0,positions:{}};
    x.points+=num(p.points);if(['K','DEF'].includes(p.position))x.kd+=num(p.points);
    if(draftedBy.get(norm(p.player))===p.owner)x.ownDraft+=num(p.points);else x.otherDraft+=num(p.points);
    x.storage+=num(p.points)/Math.max(1,costByPlayer.get(norm(p.player))||1);
    x.positions[p.position]=(x.positions[p.position]||0)+num(p.points);
  }
  if(year===2026)for(const w of completedWeeks())for(const row of SL.data.weeks[w]||[]){
    const owner=managerFor(SL.roster(row.roster_id)),x=byOwner[owner];if(!x)continue;
    const optimal=optimalLineup(row);x.optimal=(x.optimal||0)+optimal;x.missed=(x.missed||0)+Math.max(0,optimal-num(row.points));
    x.actual=(x.actual||0)+num(row.points);x.games=(x.games||0)+1;
    x.effSum=(x.effSum||0)+(optimal?num(row.points)/optimal:0);
    const pair=matchupGroups(w).find(g=>g.some(r=>r.roster_id===row.roster_id));
    const opponent=pair?.find(r=>r.roster_id!==row.roster_id);
    if(opponent)x.opponentMissed=(x.opponentMissed||0)+Math.max(0,optimalLineup(opponent)-num(opponent.points));
  }
  if(year===2026)for(const x of Object.values(byOwner)){
    const r=liveTeams().find(t=>t.manager===x.owner)?.r;
    x.transactions=num(r?.settings?.total_moves);
    x.spend=seasonDraft(2026).filter(p=>p.owner===x.owner&&p.cost!=null).reduce((n,p)=>n+num(p.cost),0)+num(r?.settings?.waiver_budget_used);
    const claims=Object.values(SL.data.transactions||{}).flat().filter(t=>t.status==='complete'&&t.type==='waiver'&&num(t.settings?.waiver_bid)>0);
    const acquired=new Map();let faab=0;
    for(const claim of claims)for(const [id,rosterId] of Object.entries(claim.adds||{}))if(managerFor(SL.roster(rosterId))===x.owner){acquired.set(id,Math.min(acquired.get(id)||99,num(claim.leg)||1));faab+=num(claim.settings.waiver_bid);}
    x.cheapPoints=completedWeeks().reduce((total,w)=>total+(SL.data.weeks[w]||[]).filter(row=>managerFor(SL.roster(row.roster_id))===x.owner).reduce((sum,row)=>sum+lineupSlots(row).filter(p=>acquired.has(p.id)&&w>=acquired.get(p.id)).reduce((n,p)=>n+num(scoreFor(row,p.id)),0),0),0);
    x.cheapRatio=faab?x.cheapPoints/faab:null;
  }
  if(year===2026)for(const x of Object.values(byOwner)){x.efficiency=x.games?100*x.effSum/x.games:null;x.unused=x.missed||0;x.pointsPerDollar=x.spend?x.points/x.spend:null;}
  const archived=(A?.seasons?.[String(year)]||[]).map(r=>({...r,points:r.starterPoints,kd:num(r.positions?.K)+num(r.positions?.DST),positions:{...r.positions,DEF:r.positions?.DST||0}}));
  return {year,rows,games,weeks,purchases,players,byOwner:year===2026?Object.values(byOwner):(archived.length?archived:Object.values(byOwner))};
}
function recordDefinitions(){
  const definitions=[
    ['Goat','Most Regular Season Points For',x=>x.rows.map(r=>({value:r.pf,owner:r.owner,team:r.team,year:x.year}))],
    ['SEC Schedule','Most Regular Season Points Against',x=>x.rows.map(r=>({value:r.pa,owner:r.owner,team:r.team,year:x.year}))],
    ['Fantasy GOD','Highest PF − PA',x=>x.rows.map(r=>({value:num(r.pf)-num(r.pa),owner:r.owner,team:r.team,year:x.year}))],
    ['Loser','Smallest PF − PA',x=>x.rows.map(r=>({value:num(r.pf)-num(r.pa),owner:r.owner,team:r.team,year:x.year})),true],
    ['COTY','Highest Season Average Legal Lineup Efficiency',x=>x.byOwner.map(r=>({value:r.efficiency,owner:r.owner,year:x.year,format:'percent'}))],
    ['Spectator Sport','Most Optimal Lineup Points Left Unused in a Season',x=>x.byOwner.map(r=>({value:r.unused,owner:r.owner,year:x.year}))],
    ['Waiver Wire Warrior','Most Transactions in a Season',x=>x.byOwner.map(r=>({value:r.transactions,owner:r.owner,year:x.year,detail:'Recorded adds plus distinct trades'}))],
    ['Our Guys','Most starter points from players drafted by that manager in a season',x=>x.byOwner.map(r=>({value:r.ownDraft,owner:r.owner,year:x.year}))],
    ['Moneyball','Most starter points from players not drafted by that manager',x=>x.byOwner.map(r=>({value:r.otherDraft,owner:r.owner,year:x.year}))],
    ['True Gambler','Most Starter Points from Kickers and Defense',x=>x.byOwner.map(r=>({value:r.kd,owner:r.owner,year:x.year}))],
    ["God's Favorite",'Most Opponent Missed Lineup Points',x=>x.byOwner.map(r=>({value:r.opponentUnused??r.opponentMissed,owner:r.owner,year:x.year}))],
    ['Cheapskate','Most Starter Points from FAAB-winning Players per FAAB Dollar',x=>x.byOwner.map(r=>({value:r.cheapRatio,owner:r.owner,year:x.year}))],
    ['Revolutionary','Most Points per Dollar Spent (FAAB + Auction)',x=>x.byOwner.map(r=>({value:r.pointsPerDollar,owner:r.owner,year:x.year}))],
    ['Troubled Times','Least Points per Dollar Spent',x=>x.byOwner.map(r=>({value:r.pointsPerDollar,owner:r.owner,year:x.year})),true],
    ['Highest Weekly Score','Single team score',x=>x.weeks.map(r=>({value:r.score,owner:r.owner,year:x.year,detail:`Week ${r.week}`}))],
    ['Largest Auction Purchase','Single auction bid',x=>x.purchases.map(r=>({value:r.cost,owner:r.owner,team:r.player,year:x.year,format:'money'}))]
  ];
  for(const pos of ['QB','RB','WR','TE','K','DEF']){
    definitions.push([`Most ${pos} Points · Season`,'Starter production at the position',x=>x.byOwner.map(r=>({value:r.positions[pos]||0,owner:r.owner,year:x.year}))]);
    definitions.push([`Least ${pos} Points · Season`,'Starter production at the position',x=>x.byOwner.map(r=>({value:r.positions[pos]||0,owner:r.owner,year:x.year})),true]);
  }
  return definitions;
}
function unavailableReason(title,selection){
  const year=Number(selection);
  if([2018,2019].includes(year)&&['Cheapskate','Revolutionary','Troubled Times'].includes(title))return 'The 2018–2019 Yahoo transaction export has no winning FAAB dollar amounts, so this dollar-based award cannot be verified.';
  if(title==='Cheapskate')return 'No positive-dollar winning FAAB claim with a recorded starter game is available for this selection.';
  if(year===2026)return 'Sleeper has no completed matchup or transaction data for this award yet.';
  return 'The captured source rows contain no qualifying value for this award.';
}
function recordsFor(selection){
  const selected=selection==='all'?[...years,2026]:[Number(selection)];
  const sources=selected.map(recordCandidates);
  return recordDefinitions().map(([title,detail,fn,ascending])=>{
    const seasonFinished=completedWeeks().length>=num(SL?.data?.league?.settings?.playoff_week_start||15)-1;
    const eligible=selection==='all'?sources.filter(x=>x.year!==2026||seasonFinished||['Highest Weekly Score','Largest Auction Purchase'].includes(title)):sources;
    const candidates=eligible.flatMap(fn).filter(r=>typeof r.value==='number'&&Number.isFinite(r.value));
    candidates.sort((a,b)=>ascending?a.value-b.value:b.value-a.value);
    const result=candidates[0];
    if(!result)return {title,value:'Unavailable',detail:unavailableReason(title,selection)};
    const value=result.format==='money'?dollar(result.value):result.format==='percent'?`${fmt(result.value,1)}%`:fmt(result.value);
    return {title,value,owner:result.owner,team:result.team,year:result.year,detail:result.detail||detail};
  });
}
function drawRecords(){
  const root=document.getElementById('recordWall');if(!root)return;
  const records=recordsFor(recordYear),positional=records.filter(r=>/^(Most|Least) (QB|RB|WR|TE|K|DEF) Points · Season$/.test(r.title));
  root.innerHTML=`<div class="record-grid">${records.filter(r=>!positional.includes(r)).map(recordCard).join('')}</div><div class="record-divider"><span>POSITION PRODUCTION</span><h3>Most and least starter points by position</h3></div><div class="record-grid">${positional.map(recordCard).join('')}</div>`;
  document.querySelectorAll('[data-record-year]').forEach(b=>{b.classList.toggle('active',b.dataset.recordYear===recordYear);b.setAttribute('aria-pressed',String(b.dataset.recordYear===recordYear));});
}
function h2hWithCurrent(scope){
  const source=H.h2h?.[scope]||{},out={};
  for(const [a,opp] of Object.entries(source)){out[a]={};for(const [b,v] of Object.entries(opp))out[a][b]={...v};}
  for(const w of completedWeeks()){
    const playoff=w>=num(SL?.data?.league?.settings?.playoff_week_start||15);
    if(scope==='regular'&&playoff||scope==='playoffs'&&!playoff)continue;
    for(const [a,b] of matchupGroups(w)){
    const aa=managerFor(SL.roster(a.roster_id)),bb=managerFor(SL.roster(b.roster_id));
    if(!out[aa]||!out[bb])continue;
    for(const [me,other] of [[a,b],[b,a]]){
      const m=managerFor(SL.roster(me.roster_id)),o=managerFor(SL.roster(other.roster_id));
      const v=out[m][o]??={w:0,l:0,t:0,gp:0,pf:0,pa:0};v.gp++;v.pf+=num(me.points);v.pa+=num(other.points);
      if(num(me.points)>num(other.points))v.w++;else if(num(me.points)<num(other.points))v.l++;else v.t++;
    }
    }
  }
  return out;
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
  app.innerHTML=`<div class="page">${pageHero('THE ARCHIVE','League History')}<section class="section history-banner"><div class="wrap"><div class="eyebrow">EST. 2018 · DIRTY D'S</div><h2>One league. Nine seasons.</h2><p>Select a banner to see the championship week starting lineup.</p><div class="history-banner-grid banners">${D.champions.map(bannerCard).join('')}</div></div></section><section class="section"><div class="wrap">${heading('THE PODIUM','Champions, runners-up & third.')}<div class="dd-table-wrap"><table class="dd-table"><thead><tr><th>Season</th><th>Champion</th><th>Runner-up</th><th>Third</th></tr></thead><tbody>${(D.podium||[]).map(x=>`<tr><td><strong>${x.year}</strong></td><td><strong>🥇 ${e(x.gold)}</strong><small>${e(x.goldTeam)}</small></td><td>🥈 ${e(x.silver)}<small>${e(x.silverTeam)}</small></td><td>🥉 ${e(x.bronze)}<small>${e(x.bronzeTeam)}</small></td></tr>`).join('')}</tbody></table></div></div></section><section class="section alt"><div class="wrap">${heading('SUPERLATIVES','The awards wall.')}<div class="dd-season-bar record-year-bar">${[['all','All Time'],[2026,'2026'],...years.map(y=>[y,String(y)])].map(([k,label])=>`<button data-record-year="${k}">${label}</button>`).join('')}</div><div id="recordWall"></div></div></section><section class="section alt"><div class="wrap">${heading('HEAD TO HEAD','Who owns whom?')}<div class="dd-season-bar">${[['all','All Games'],['regular','Regular'],['playoffs','Playoffs']].map(([k,v])=>`<button data-h2h="${k}" class="${h2hScope===k?'active':''}">${v}</button>`).join('')}</div><div id="h2h"></div></div></section></div>`;
  wireBanners();
  document.querySelectorAll('[data-record-year]').forEach(b=>b.onclick=()=>{recordYear=b.dataset.recordYear;drawRecords();});drawRecords();
  document.querySelectorAll('[data-h2h]').forEach(b=>b.onclick=()=>{h2hScope=b.dataset.h2h;document.querySelectorAll('[data-h2h]').forEach(x=>x.classList.toggle('active',x===b));drawH2H();});drawH2H();
  ensureLive().then(()=>{if(currentPage==='history'){drawRecords();drawH2H();}}).catch(()=>{});
}
function drawH2H(){
  const root=document.getElementById('h2h');if(!root)return;const data=h2hWithCurrent(h2hScope),order=D.ownerOrder||[];
  root.innerHTML=`<div class="matrix-shell"><table class="matrix"><thead><tr><th>Manager</th>${order.map(o=>`<th>${e(o)}</th>`).join('')}</tr></thead><tbody>${order.map(a=>`<tr><td>${e(a)}</td>${order.map(b=>{if(a===b)return'<td class="diagonal">—</td>';const v=data[a]?.[b];return v?.gp?`<td class="${v.w>v.l?'positive':v.w<v.l?'negative':'even'}">${v.w}–${v.l}${v.t?`–${v.t}`:''}</td>`:'<td>—</td>';}).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function liveIdForName(name){
  const draft=currentAuctionByName(name);if(draft)return draft.id;
  return Object.keys(SL?.data?.players||{}).find(id=>norm(SL.fullName(id))===norm(name));
}
function playerProfile(name,id){
  const historical=(H.players||[]).find(p=>norm(p.name)===norm(name));
  id=id||liveIdForName(name);
  const current=id?SL.player(id):null;
  const playerName=current?.full_name||historical?.name||name;
  const history=(historical?.seasons||[]).slice().sort((a,b)=>b.year-a.year);
  const auction=(historical?.events||[]).filter(x=>['Draft','Keeper'].includes(x.type)).map(x=>({year:x.year,owner:x.owner,cost:x.cost,type:x.type}));
  const pick=id?SL.data.picks.find(x=>SL.pickPlayerId(x)===String(id)):null;
  if(pick)auction.push({year:2026,owner:managerFor(SL.roster(pick.roster_id)),cost:SL.pickCost(pick),type:pick.is_keeper?'Keeper':'Draft'});
  auction.sort((a,b)=>b.year-a.year);
  const priced=auction.filter(x=>x.cost!=null);
  const logs=[];let liveStarts=0,livePoints=0;
  if(id)for(const w of completedWeeks())for(const row of SL.data.weeks[w]||[]){
    const starter=lineupSlots(row).some(x=>x.id===String(id));if(!starter)continue;
    const score=num(scoreFor(row,id)),owner=managerFor(SL.roster(row.roster_id));
    liveStarts++;livePoints+=score;logs.push({week:w,owner,score});
  }
  const currentRoster=id?findRosterByPlayer(id):null;
  const trophies={gold:[],silver:[],bronze:[],last:[]};
  if(historical){
    const appeared=new Set(history.filter(x=>num(x.weeks)>0||num(x.starts)>0||num(x.benchApps)>0).map(x=>`${x.year}:${x.owner}`));
    for(const finish of D.podium||[])for(const medal of ['gold','silver','bronze'])if(appeared.has(`${finish.year}:${finish[medal]}`))trophies[medal].push(finish.year);
    for(const finish of D.wallOfShame||[])if(appeared.has(`${finish.year}:${finish.owner}`))trophies.last.push(finish.year);
  }
  const trophyRows=[['gold','🥇','Gold'],['silver','🥈','Silver'],['bronze','🥉','Bronze'],['last','💀','Last']].filter(([key])=>trophies[key].length);
  const head=(id&&current?.position!=='DEF'?SL.headshot(id):'')||(historical?archivePortrait(historical):'');
  const summary=history.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span>${e(x.owner||x.team)} · ${e(x.team)}<br><small>${x.starts} starts · ${x.benchApps} bench</small></span><b>${fmt(x.points,1)} pts</b></div>`).join('');
  openModal(`<div class="modal-hero"><div class="modal-hero-grid">${head?photo(head,playerName):`<div class="modal-avatar">${e(historical?.position||current?.position||initials(playerName))}</div>`}<div><div class="eyebrow">PLAYER FILE</div><h2>${e(playerName)}</h2><p>${posBadge(current?.position||historical?.position)} · ${e(current?.team||historical?.nflTeam||'NFL')}${currentRoster?` · ${e(managerFor(currentRoster))}`:''}</p></div></div></div><div class="modal-body"><div class="player-career-grid"><div><strong>${num(historical?.starts)+liveStarts}</strong><small>Career starts</small></div><div><strong>${fmt(num(historical?.points)+livePoints,1)}</strong><small>Career starter points</small></div><div><strong>${priced.length?dollar(priced.reduce((n,x)=>n+num(x.cost),0)/priced.length):'—'}</strong><small>Avg overall draft cost</small></div><div><strong>${auction.length}</strong><small>Times drafted</small></div></div><div class="player-profile-columns"><div class="dd-modal-block"><h3>Trophy case</h3>${trophyRows.length?trophyRows.map(([key,icon,label])=>`<div class="dd-history-row"><strong>${icon}</strong><span>${trophies[key].length}× ${label}<br><small>${trophies[key].join(', ')}</small></span></div>`).join(''):'No recorded podium or last-place roster appearance.'}</div><div class="dd-modal-block"><h3>Draft history</h3>${auction.length?auction.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span>${e(x.owner)} · ${e(x.type)}</span><b>${x.cost==null?'—':dollar(x.cost)}</b></div>`).join(''):'No recorded auction or keeper entry.'}</div></div><div class="dd-modal-block"><h3>Roster history</h3>${logs.length?`<div class="dd-history-row"><strong>2026</strong><span>${e(currentRoster?managerFor(currentRoster):logs.at(-1).owner)} · ${liveStarts} starts</span><b>${fmt(livePoints,1)} pts</b></div>`:''}${summary||!logs.length&&'No archived roster appearances.'}</div></div>`);
  wireImageFallback(modalContent);
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
  root.innerHTML=`<div class="player-top-grid">${rows.map((p,i)=>{const ratio=hi===lo?1:(p.points-lo)/(hi-lo),head=Math.round(58+42*ratio),owner=ownerLabelByPlayer(p.id);return `<button class="player-top-card" data-live-player="${e(p.id)}" style="--head:${head}px"><span class="player-top-rank">#${i+1}</span><span class="football-figure"><span class="football-head">${photo(p.headshot,p.name)}</span><span class="football-body"><span class="football-shoulders"></span><span class="football-jersey">${posBadge(p.position)}</span><span class="football-waist"></span></span><span class="football-legs"><i></i><i></i></span></span><strong>${e(p.name)}</strong><span class="player-top-owner ${owner==='Free Agent'?'free-agent':''}">${e(owner)}</span><small class="player-top-points">${pts(p.points)} pts</small></button>`;}).join('')||note('Season leader stats have not loaded yet.')}</div>`;
  wireLivePlayerButtons(root);wireImageFallback(root);
}
function currentAuctionByName(name){
  const key=norm(name);
  const pick=SL.data.picks.find(x=>norm(SL.fullName(SL.pickPlayerId(x)))===key);
  return pick?{pick,cost:SL.pickCost(pick),id:SL.pickPlayerId(pick)}:null;
}
function drawPlayersPage(hasLive=true){
  if(currentPage!=='players')return;
  const owners=['ALL',...(D.ownerOrder||[])],positions=['ALL','QB','RB','WR','TE','K','DEF','FLEX'];
  app.innerHTML=`<div class="page">${pageHero('THE PLAYER INDEX','Players','')}<section class="player-top-section"><div class="wrap"><div class="player-top-heading"><div><div class="eyebrow">2026 SCORING LEADERS</div><div class="player-top-title">Top <select id="playerTopPos" class="player-top-select pos-${e(playerTopPos)}">${['QB','RB','WR','TE','FLEX','K','DEF'].map(x=>`<option ${x===playerTopPos?'selected':''}>${x}</option>`).join('')}</select></div><p>Top 10 by 2026 season points. Bubble size scales with scoring.</p></div><span class="player-top-note">LIVE SLEEPER DATA</span></div><div id="playerTopTen"></div></div></section><section class="section"><div class="wrap">${heading('SEARCH THE ARCHIVE','Every name has a file.','Career starts, scoring, auction prices and roster history.')}<div class="dd-controls"><input id="pSearch" type="search" placeholder="Search player…" value="${e(playerSearch)}"><select id="pPos">${positions.map(x=>`<option ${x===playerPos?'selected':''}>${x}</option>`).join('')}</select><select id="pOwner">${owners.map(x=>`<option ${x===playerOwner?'selected':''}>${e(x)}</option>`).join('')}</select><select id="pSort"><option value="points" ${playerSort==='points'?'selected':''}>Starter points</option><option value="starts" ${playerSort==='starts'?'selected':''}>Starts</option><option value="price" ${playerSort==='price'?'selected':''}>Highest price</option><option value="name" ${playerSort==='name'?'selected':''}>Name</option></select></div><div id="playerCount" class="dd-muted" style="margin-bottom:18px"></div><div id="playerResults" class="dd-player-list"></div><button id="morePlayers" class="dd-action dd-load">Show more players</button></div></section></div>`;
  document.getElementById('playerTopPos').onchange=ev=>{playerTopPos=ev.target.value;ev.target.className=`player-top-select pos-${playerTopPos}`;drawTopPlayers();};
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
  document.getElementById('playerResults').innerHTML=rows.slice(0,playerLimit).map(p=>{const live=currentAuctionByName(p.name);return `<button class="dd-player" data-archive-player="${e(p.key)}"><span class="dd-player-portrait">${photo(archivePortrait(p),p.name)}</span><span class="dd-player-info"><strong>${e(p.name)}</strong><small>${posBadge(p.position)} · ${p.starts} starts · ${p.drafted} auction / keeper entries${live?.cost!=null?` · 2026 ${dollar(live.cost)}`:''}</small></span><span class="dd-player-value">${playerSort==='price'?(p.maxPrice==null?'—':dollar(p.maxPrice)):fmt(p.points,1)}<small>${playerSort==='price'?'top price':'starter pts'}</small></span></button>`;}).join('');
  document.getElementById('morePlayers').hidden=playerLimit>=rows.length;wireImageFallback(document.getElementById('playerResults'));
  document.querySelectorAll('[data-archive-player]').forEach(b=>b.onclick=()=>showArchivePlayer(b.dataset.archivePlayer));
}
function showArchivePlayer(key){
  const p=H.players.find(x=>x.key===key);if(p)playerProfile(p.name);
}

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
/* DRAFT CENTRAL */
function renderDraft(){
  app.innerHTML=liveLoading('Draft Central');
  ensureLive().then(drawDraftPage).catch(()=>drawDraftPage(false));
}
function liveDraftRows(){
  const confirmed=new Map(K26.map(k=>[norm(k.player),k]));
  const seen=new Set();
  const rows=(SL.data.picks||[]).map((pick,i)=>{
    const id=SL.pickPlayerId(pick),r=SL.roster(pick.roster_id),u=r?SL.rosterUser(r):SL.user(pick.picked_by),p=SL.player(id);
    const player=SL.fullName(id),key=norm(player),locked=confirmed.get(key),manager=locked?.owner||(r?managerFor(r):(managerHandles[String(u?.display_name||'').toLowerCase()]||u?.display_name||u?.username||'Unknown'));
    if(locked)seen.add(key);
    return {year:2026,player:locked?.player||player,id,position:locked?.position||p.position||pick.metadata?.position||'',nflTeam:p.team||pick.metadata?.team||'',owner:manager,teamName:teamName(manager),cost:locked?.cost??SL.pickCost(pick),keeper:Boolean(locked||pick.is_keeper||pick.keeper||pick.metadata?.is_keeper||pick.metadata?.keeper),order:num(pick.pick_no||i+1)};
  });
  for(const [key,k] of confirmed)if(!seen.has(key)){
    const match=Object.values(SL.data.players).find(p=>norm(p.full_name)===key);
    rows.push({year:2026,player:k.player,id:match?.player_id||'',position:k.position,nflTeam:match?.team||'',owner:k.owner,teamName:teamName(k.owner),cost:k.cost,keeper:true,order:0});
  }
  return rows;
}
function drawDraftPage(hasLive=true){
  if(currentPage!=='draft')return;
  const yearOptions=hasLive?[2026,...years]:years;
  if(!hasLive && draftYear===2026) draftYear=2025;
  const ownerOptions=draftYear===2026?(hasLive?liveTeams().map(x=>x.manager):[]):D.ownerOrder;
  app.innerHTML=`<div class="page">${pageHero('AUCTION HEADQUARTERS','Draft Central')}<div class="stats-strip"><div class="wrap stat-grid">${stat('Completed historical auctions',8)}${stat('Historical entries',D.draftHistory.length)}${stat('Largest auction purchase',dollar(Math.max(...[...D.draftHistory,...(hasLive?liveDraftRows():[])].filter(x=>!x.keeper&&x.cost!=null).map(x=>num(x.cost)))))}${stat('2026 confirmed keepers',K26.length)}</div></div><section class="section"><div class="wrap">${heading('THE AUCTION BOARD','What everybody paid.')}<div class="dd-controls"><label>Year</label><select id="dYear">${yearOptions.map(y=>`<option value="${y}" ${y===draftYear?'selected':''}>${y}</option>`).join('')}</select><label>Position</label><select id="dPos">${['ALL','QB','RB','WR','TE','K','DEF'].map(x=>`<option ${x===draftPos?'selected':''}>${x}</option>`).join('')}</select><label>Manager</label><select id="dOwner"><option>ALL</option>${ownerOptions.map(x=>`<option ${x===draftOwner?'selected':''}>${e(x)}</option>`).join('')}</select><label>Entry</label><select id="dKind"><option value="ALL" ${draftKind==='ALL'?'selected':''}>Auction + keeper</option><option value="Auction" ${draftKind==='Auction'?'selected':''}>Auction purchases</option><option value="Keeper" ${draftKind==='Keeper'?'selected':''}>Keepers</option></select></div><div id="draftSummary"></div><div id="draftBoard"></div></div></section><section class="section alt"><div class="wrap">${heading('AUCTION HISTORY','Where the biggest dollars went.','Auction purchases exclude keeper entries.')}<div class="dd-grid">${[...D.draftHistory,...(hasLive?liveDraftRows():[])].filter(x=>!x.keeper&&x.cost!=null).sort((a,b)=>b.cost-a.cost).slice(0,6).map(x=>`<article class="dd-card"><div class="dd-year-label">${x.year} · ${posBadge(x.position)}</div><div class="dd-price">${dollar(x.cost)}</div><h3>${e(x.player)}</h3><p>${e(x.owner)} · ${e(x.teamName)}</p></article>`).join('')}</div></div></section></div>`;
  ['dYear','dPos','dOwner','dKind'].forEach(id=>document.getElementById(id).onchange=()=>{draftYear=Number(document.getElementById('dYear').value);draftPos=document.getElementById('dPos').value;draftOwner=document.getElementById('dOwner').value;draftKind=document.getElementById('dKind').value;if(id==='dYear'){draftOwner='ALL';drawDraftPage(hasLive);}else drawDraftBoard();});
  drawDraftBoard();
}
function drawDraftBoard(){
  const root=document.getElementById('draftBoard'),sum=document.getElementById('draftSummary');if(!root||!sum)return;
  let rows=draftYear===2026?liveDraftRows():(D.draftHistory||[]).filter(x=>Number(x.year)===draftYear).map(x=>({...x,keeper:Boolean(x.keeper)}));
  rows=rows.filter(x=>(draftPos==='ALL'||x.position===draftPos)&&(draftOwner==='ALL'||x.owner===draftOwner)&&(draftKind==='ALL'||(draftKind==='Keeper')===Boolean(x.keeper))).sort((a,b)=>(b.cost??-1)-(a.cost??-1)||a.player.localeCompare(b.player));
  const spend=rows.reduce((s,x)=>s+(x.cost==null?0:num(x.cost)),0),withPrice=rows.filter(x=>x.cost!=null).length;
  sum.innerHTML=`<div class="dd-stat-row" style="margin:12px 0 24px"><div><strong>${rows.length}</strong><small>Entries shown</small></div><div><strong>${dollar(spend)}</strong><small>Known dollars shown</small></div><div><strong>${withPrice}</strong><small>Entries with API price</small></div></div>${draftYear===2026&&rows.some(x=>x.cost==null)?note('Sleeper returned the draft picks but did not expose a dollar amount on every entry. Those rows are shown with “—” rather than inventing a price.'):''}`;
  root.innerHTML=rows.length?`<div class="dd-table-wrap"><table class="dd-table draft-board-table"><thead><tr><th>Price</th><th>Player</th><th>Position</th><th>Manager</th><th>Team</th><th>Type</th></tr></thead><tbody>${rows.map(x=>`<tr><td data-label="Price" class="money">${x.cost==null?'—':dollar(x.cost)}</td><td data-label="Player"><button ${draftYear===2026&&x.id?`data-live-player="${e(x.id)}"`:`data-draft-name="${e(x.player)}"`}>${e(x.player)}</button><small>${e(x.nflTeam||'')}</small></td><td data-label="Position">${posBadge(x.position)}</td><td data-label="Manager"><strong>${e(x.owner||'')}</strong></td><td data-label="Team">${e(x.teamName||'')}</td><td data-label="Type"><span class="dd-tag">${x.keeper?'Keeper':'Auction'}</span></td></tr>`).join('')}</tbody></table></div>`:note('No auction entries match these filters.');
  wireLivePlayerButtons(root);
  document.querySelectorAll('[data-draft-name]').forEach(b=>b.onclick=()=>{const p=H.players.find(x=>norm(x.name)===norm(b.dataset.draftName));if(p)showArchivePlayer(p.key);});
}

document.getElementById('footerMeta').textContent='2018–2025 archive · 2026 live via Sleeper';
go((location.hash||'#home').slice(1));
