/* Dirty D's archive — ZYNFL-parity UI with live Sleeper 2026 data. */
'use strict';
let D=window.DIRTY_DS_DATA||{owners:{},ownerOrder:[],champions:[],draftHistory:[]},H=window.DIRTY_DS_HISTORY||{league:[],players:[],matchups:{},weekly:{}},A=window.DIRTY_DS_AWARDS,P=window.DIRTY_DS_PHOTOS,L=window.DIRTY_DS_LINEUPS;const SL=window.DIRTY_DS_LIVE;
const K26=window.DIRTY_DS_KEEPERS_2026||[];
const app=document.getElementById('app'), nav=[...document.querySelectorAll('.nav-link')];
const backdrop=document.getElementById('modalBackdrop'), modalContent=document.getElementById('modalContent');
let years=(H?.league||[]).map(x=>Number(x.year)).sort((a,b)=>b-a);
let currentPage='home', liveWeek=1, matchMode='dirtyds', matchIndex=0, powerView='analyst', powerWeek=3, transactionWeek=0, transactionFetchErrors=0,routeGeneration=0;
let archiveMatchYear=2025, archiveMatchWeek=17;
let seasonYear=2026, playerSearch='', playerPos='ALL', playerOwner='ALL', playerSort='points', playerLimit=40, playerTopPos='QB';
let draftYear=2026, draftPos='ALL', draftOwner='ALL', draftKind='ALL', h2hScope='all', recordYear='all';
const nflCache={};
const optimalCache=new Map();
const managerHandles={zwack12:'Ben',zwack:'Ben',mrwick:'James',bdunnigan:'Brent',jwosman1981:'Jeff',jdunnigan:'Jack',vincat:'Vinny',iamfritz:'Fritz',nickmo2699:'Nick',tymid02:'Tyler',rocknflow:'Jake',dcorello:'Dan',gryf6:'Bobby'};
const managerIds={"466440358671151104": "James", "607004933086052352": "Jake", "729555035901534208": "Fritz", "1060045335881457664": "Jack", "1388342142245572608": "Dan", "1388389695032938496": "Vinny", "1388890524814966784": "Bobby", "1388895706860777472": "Nick", "1388907771327451136": "Tyler", "1389748221072384001": "Brent", "1389752255158177792": "Ben", "1393744257201750016": "Jeff"};
function canonicalUser(u){return managerIds[String(u?.user_id)]||managerHandles[String(u?.display_name||u?.username||'').toLowerCase()]||managerHandles[String(u?.username||'').toLowerCase()]||null;}
function canonicalManager(roster){return canonicalUser(SL?.rosterUser(roster));}
function identityAtWeek(rosterId,week=liveWeek){
 const snapshot=SL.data.snapshots?.[week],r=snapshot?.rosters?.find(r=>Number(r.roster_id)===Number(rosterId))||SL.roster(rosterId),user=snapshot?.users?.find(u=>u.user_id===r?.owner_id)||SL.rosterUser(r);
 return {r,user,manager:canonicalUser(user)||user?.display_name||SL.managerName(r),team:user?.metadata?.team_name||user?.display_name||SL.teamName(r)};
}
function weekComplete(week){
  const rows=SL?.data?.weeks?.[week]||[];
  return rows.length>0 && rows.length===SL?.data?.rosters?.length && rows.every(r=>r.points!=null) &&
    num(SL.data.league?.settings?.last_scored_leg)>=week;
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
let modalReturnFocus=null;
function openModal(html){if(backdrop.hidden)modalReturnFocus=document.activeElement;modalContent.innerHTML=html;backdrop.hidden=false;document.body.style.overflow='hidden';document.querySelectorAll('.site-header,#app,.site-footer,#feedStatus').forEach(x=>x.inert=true);document.getElementById('modalClose').focus();}

function closeModal({clearRoute=true}={}){backdrop.hidden=true;document.body.style.overflow='';document.querySelectorAll('.site-header,#app,.site-footer,#feedStatus').forEach(x=>x.inert=false);const [page,query]=(location.hash||'#home').split('?'),q=new URLSearchParams(query||'');if(clearRoute&&q.has('player')){q.delete('player');history.replaceState(null,'',page+(q.size?'?'+q:''));}if(modalReturnFocus?.isConnected)modalReturnFocus.focus();}
document.getElementById('modalClose').onclick=closeModal;
backdrop.onclick=ev=>{if(ev.target===backdrop)closeModal();};
document.addEventListener('keydown',ev=>{if(backdrop.hidden)return;if(ev.key==='Escape')closeModal();if(ev.key==='Tab'){const nodes=[...backdrop.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last?.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first?.focus();}}});
document.getElementById('mobileMenu').onclick=()=>{const n=document.getElementById('mainNav');const open=n.classList.toggle('open');document.getElementById('mobileMenu').setAttribute('aria-expanded',String(open));};
nav.filter(b=>b.dataset.page).forEach(b=>b.onclick=ev=>{ev.preventDefault();if(b.dataset.page==='seasons')seasonYear=2025;go(b.dataset.page);});
const seasonMenu=document.getElementById('seasonMenu');
seasonMenu.onclick=()=>{const expanded=seasonMenu.getAttribute('aria-expanded')==='true';seasonMenu.setAttribute('aria-expanded',String(!expanded));seasonMenu.parentElement.classList.toggle('expanded',!expanded);};
document.addEventListener('click',ev=>{if(!ev.target.closest('.nav-dropdown')){seasonMenu.setAttribute('aria-expanded','false');seasonMenu.parentElement.classList.remove('expanded');}});

function liveLoading(title='Loading live 2026 data…'){
  return `<div class="page z-page">${pageHero('DIRTY D’S',title)}<div class="wrap skeleton-grid" aria-busy="true" aria-label="Loading ${e(title)}"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div></div>`;
}
function liveError(err){
  return `<div class="page z-page">${pageHero('LIVE DATA','Sleeper data unavailable','The historical archive is still available.')}<div class="wrap"><div class="live-error"><strong>Could not load the current Sleeper feed.</strong><br>${e(err?.message||String(err||'Unknown error'))}<br><button class="dd-action" data-retry>Retry</button></div></div></div>`;
}
async function ensureLive(){
  if(!SL) throw new Error('Sleeper live module did not load.');
  await SL.ready;
  await SL.loadHistory();
  if(!location.hash.includes('week=')&&liveWeek===1)liveWeek=SL.currentWeek();
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
function assignLegalLineup(slots,players){return window.DIRTY_DS_MODEL.assignLegalLineup(slots,players);}
function lineupSlots(row){
  const starters=row?.starters||[], positions=SL?.data?.league?.roster_positions||[];
  return starters.map((id,i)=>({id:String(id),slot:positions[i]||SL.player(id).position||'FLEX'}));
}
function livePlayerObj(id,row=null,slot=''){
  const snapshot=row?SL.data.snapshots?.[liveWeek]:null,p=snapshot?.players?.[id]||SL.player(id);
  const historicalRoster=snapshot?.rosters?.find(r=>r.roster_id===row?.roster_id),u=snapshot?.users?.find(u=>u.user_id===historicalRoster?.owner_id);
  return {id:String(id),name:p.full_name||SL.fullName(id),position:p.position||'',nfl:p.team||'',slot,points:row?scoreFor(row,id):null,owner:row?(u?.metadata?.team_name||SL.teamName(SL.roster(row.roster_id))):ownerLabelByPlayer(id),manager:row?(managerIds[u?.user_id]||managerFor(SL.roster(row.roster_id))):managerLabelByPlayer(id),headshot:SL.headshot(id)};
}
function rosterPlayers(row){
  const starters=lineupSlots(row).map(x=>livePlayerObj(x.id,row,x.slot));
  const starterIds=new Set(starters.map(x=>x.id));
  const historical=SL.data.snapshots?.[liveWeek]?.rosters?.find(r=>r.roster_id===row?.roster_id);
  const snapshot=SL.data.snapshots?.[liveWeek],knownReserve=!snapshot?.historicalMetadataUnknown;
  const reserve=new Set(((knownReserve?historical?.reserve:null)||(liveWeek===SL.currentWeek()?SL.roster(row?.roster_id)?.reserve:[])||[]).map(String));
  const all=(row?.players||SL.roster(row?.roster_id)?.players||[]).map(String);
  const bench=all.filter(id=>!starterIds.has(id)&&!reserve.has(id)).map(id=>livePlayerObj(id,row,'BN'));
  const ir=all.filter(id=>reserve.has(id)).map(id=>livePlayerObj(id,row,'IR'));
  return {starters,bench,ir};
}
function projectionFor(id,week=liveWeek){return SL.projectionPoints(SL?.data?.projections?.[week]?.[String(id)],String(id));}
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
  document.querySelectorAll('[data-live-week]').forEach(b=>b.onclick=async()=>{liveWeek=Number(b.dataset.liveWeek);matchIndex=0;syncRoute();await SL.getWeek(liveWeek).catch(()=>[]);await SL.getProjections(liveWeek).catch(()=>({}));callback();});
}
function wireLivePlayerButtons(root=document){root.querySelectorAll('[data-live-player]').forEach(b=>b.onclick=()=>showLivePlayer(b.dataset.livePlayer));wireImageFallback(root);}

async function ensureArchive(options={}){
 const result=await window.DIRTY_DS_ARCHIVE.load(options);({D,H,A,P,L}=result);years=(H.league||[]).map(x=>Number(x.year)).sort((a,b)=>b-a);
}
function updateNavActive(){nav.forEach(b=>{const active=b.dataset.page===currentPage;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
function routeHash(){
 const q=new URLSearchParams();
 if(['matchups','season2026','transactions'].includes(currentPage))q.set('week',currentPage==='transactions'?transactionWeek:liveWeek);
 if(currentPage==='matchups'){q.set('mode',matchMode);q.set('game',matchIndex);q.set('archiveYear',archiveMatchYear);q.set('archiveWeek',archiveMatchWeek);}
 if(currentPage==='power'){q.set('author',powerView);q.set('week',powerWeek);}
 if(currentPage==='seasons')q.set('year',seasonYear);
 if(currentPage==='players'){if(playerSearch)q.set('search',playerSearch);q.set('position',playerPos);q.set('manager',playerOwner);q.set('sort',playerSort);q.set('leaders',playerTopPos);}
 if(currentPage==='draft'){q.set('year',draftYear);q.set('position',draftPos);q.set('manager',draftOwner);q.set('entry',draftKind);}
 if(currentPage==='history'){q.set('year',recordYear);q.set('scope',h2hScope);}
 return '#'+currentPage+(q.size?'?'+q:'');
}
function syncRoute(){updateNavActive();history.replaceState(null,'',routeHash());if(typeof lastHandledHash!=='undefined')lastHandledHash=location.hash;}
function readRoute(){
 const [page,query]=(location.hash||'#home').slice(1).split('?'),q=new URLSearchParams(query||''),validYear=value=>Number(value)>=2018&&Number(value)<=2026?Number(value):2026;
 if(q.has('week')){const week=Math.max(0,Math.min(18,Number(q.get('week'))||0));if(page==='transactions')transactionWeek=week;else liveWeek=Math.max(1,week);}
 if(q.has('game'))matchIndex=Math.max(0,Number(q.get('game'))||0);
 matchMode=q.get('mode')==='nfl'?'nfl':'dirtyds';
 if(page==='matchups'){if(q.has('archiveYear'))archiveMatchYear=Math.min(2025,validYear(q.get('archiveYear')));if(q.has('archiveWeek'))archiveMatchWeek=Math.max(1,Math.min(18,Number(q.get('archiveWeek'))||17));}
 if(page==='power'){powerView=q.get('author')==='jack'?'jack':'analyst';powerWeek=Math.max(1,Math.min(3,Number(q.get('week'))||3));}
 if(page==='seasons')seasonYear=q.has('year')?validYear(q.get('year')):2026;
 if(page==='history'){recordYear=q.get('year')==='all'||!q.has('year')?'all':String(validYear(q.get('year')));h2hScope=['regular','playoffs'].includes(q.get('scope'))?q.get('scope'):'all';}
 if(page==='players'){playerSearch=q.get('search')||'';playerPos=q.get('position')||'ALL';playerOwner=q.get('manager')||'ALL';playerSort=q.get('sort')||'points';playerTopPos=['QB','RB','WR','TE','FLEX','K','DEF'].includes(q.get('leaders'))?q.get('leaders'):'QB';}
 if(page==='draft'){draftYear=q.has('year')?validYear(q.get('year')):2026;draftPos=q.get('position')||'ALL';draftOwner=q.get('manager')||'ALL';draftKind=q.get('entry')||'ALL';}
 return page;
}
async function go(page,{restore=false}={}){
 const routes={home:renderHome,season2026:renderSeason2026,power:renderPowerPage,playoffs:renderPlayoffs,transactions:renderTransactions,matchups:renderMatchups,seasons:renderSeasons,history:renderHistory,players:renderPlayers,teams:renderTeams,draft:renderDraft};
 if(!routes[page])page='home';const generation=++routeGeneration,requestedPlayer=restore?new URLSearchParams(location.hash.split('?')[1]||'').get('player'):null;currentPage=page;if(!backdrop.hidden)closeModal({clearRoute:!restore});
 updateNavActive();seasonMenu.classList.toggle('active',['season2026','power','playoffs','transactions'].includes(page));seasonMenu.setAttribute('aria-expanded','false');seasonMenu.parentElement.classList.remove('expanded');document.getElementById('mainNav').classList.remove('open');document.getElementById('mobileMenu').setAttribute('aria-expanded','false');
 if(!restore){history.pushState(null,'',routeHash());if(typeof lastHandledHash!=='undefined')lastHandledHash=location.hash;}app.innerHTML=liveLoading(page==='home'?'Dirty D’s':page[0].toUpperCase()+page.slice(1));
 try{if(['matchups','seasons','history','players','teams','draft'].includes(page))await ensureArchive({players:['history','players','teams'].includes(page),years:page==='matchups'?[archiveMatchYear]:page==='history'||page==='teams'?[2018,2019,2020,2021,2022,2023,2024,2025]:page==='seasons'&&seasonYear!==2026?[seasonYear]:[]});if(generation!==routeGeneration)return;routes[page]();window.scrollTo({top:0,behavior:'instant'});if(requestedPlayer&&generation===routeGeneration)await showLivePlayer(requestedPlayer);}catch(err){if(generation===routeGeneration)app.innerHTML=liveError(err);}updateFeedStatus();
}
