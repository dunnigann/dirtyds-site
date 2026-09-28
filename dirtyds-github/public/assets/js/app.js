/* Dirty D's archive. Visual system follows the current ZYNFL site. */
const D=window.DIRTY_DS_DATA, H=window.DIRTY_DS_HISTORY;
const app=document.getElementById('app'), nav=[...document.querySelectorAll('.nav-link')];
const backdrop=document.getElementById('modalBackdrop'), modalContent=document.getElementById('modalContent');
const years=H.league.map(x=>x.year).sort((a,b)=>b-a);
let matchupYear=2025, matchupWeek=17, matchupOwner='ALL', seasonYear=2025;
let playerSearch='',playerPos='ALL',playerOwner='ALL',playerSort='points',playerLimit=36;
let draftYear=2025,draftPos='ALL',draftKind='ALL',draftOwner='ALL',h2hScope='all';

function e(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(n,d=2){return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});}
function dollar(n){return `$${Math.round(Number(n||0)).toLocaleString()}`;}
function initials(s){return String(s||'').split(/\s+/).map(x=>x[0]||'').join('').slice(0,3).toUpperCase();}
function teamName(owner){return D.owners[owner]?.currentTeam||owner;}
function heading(k,t,desc=''){return `<div class="section-heading"><div><div class="kicker">${e(k)}</div><h2>${e(t)}</h2></div>${desc?`<p>${e(desc)}</p>`:''}</div>`;}
function pageHero(k,t,desc){return `<section class="page-hero"><div class="wrap"><div class="eyebrow">${e(k)}</div><h1>${e(t)}</h1><p>${e(desc)}</p></div></section>`;}
function note(t){return `<div class="dd-note">${t}</div>`;}
function stat(label,value){return `<div class="stat"><div class="stat-value">${e(value)}</div><div class="stat-label">${e(label)}</div></div>`;}
function recordCard(r){return `<article class="record-card"><div class="record-title">${e(r.title)}</div><div class="record-value">${e(r.value)}</div><div class="record-detail">${e(r.owner||'')}${r.team?` · ${e(r.team)}`:''}${r.year?` · ${r.year}`:''}</div>${r.detail?`<div class="record-subdetail">${e(r.detail)}</div>`:''}</article>`;}
function escUrl(url){try{const x=new URL(url);return ['https:','http:'].includes(x.protocol)?e(x.href):'#';}catch{return '#';}}
function openModal(html){modalContent.innerHTML=html;backdrop.hidden=false;document.body.style.overflow='hidden';document.getElementById('modalClose').focus();}
function closeModal(){backdrop.hidden=true;document.body.style.overflow='';}
document.getElementById('modalClose').onclick=closeModal;
backdrop.onclick=ev=>{if(ev.target===backdrop)closeModal();};
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!backdrop.hidden)closeModal();});
document.getElementById('mobileMenu').onclick=()=>{const n=document.getElementById('mainNav');const open=n.classList.toggle('open');document.getElementById('mobileMenu').setAttribute('aria-expanded',open?'true':'false');};
nav.forEach(b=>b.onclick=()=>go(b.dataset.page));

function go(page){
 const routes={home:renderHome,season2025:render2025,matchups:renderMatchups,seasons:renderSeasons,history:renderHistory,players:renderPlayers,teams:renderTeams,draft:renderDraft};
 const key=routes[page]?page:'home';
 nav.forEach(b=>b.classList.toggle('active',b.dataset.page===key));
 document.getElementById('mainNav').classList.remove('open');document.getElementById('mobileMenu').setAttribute('aria-expanded','false');
 routes[key]();history.replaceState(null,'',`#${key}`);window.scrollTo({top:0,behavior:'instant'});
}

function renderHome(){
 const champ=D.champions.find(c=>c.year===2025), latest=H.standings['2025'];
 app.innerHTML=`<div class="page"><section class="hero"><div class="wrap hero-grid"><div><div class="eyebrow">EST. 2018 · 12 FRANCHISES · AUCTION · HALF-PPR SUPERFLEX</div><h1>DIRTY <span class="accent">D'S</span></h1><p class="hero-deck">Eight seasons of championship runs, auction steals, nail-biters, and lineup decisions with permanent receipts.</p><div style="margin-top:25px"><button class="dd-action gold" data-go="matchups">Explore Matchups →</button></div></div><div class="hero-side"><div class="hero-logo-lockup"><img src="assets/images/logo/dirtyds-logo.svg" alt="Dirty D's"><strong style="font-size:26px">DIRTY D'S</strong></div><div class="hero-side-label">Defending Champion</div><div class="hero-side-value">${e(champ.team)}</div><div class="hero-side-sub">${e(champ.owner)} · 2025 Champion · ${e(champ.record)} regular season</div></div></div></section>
 <div class="stats-strip"><div class="wrap stat-grid">${stat('Completed seasons',8)}${stat('Archived matchups',H.meta.games)}${stat('Historical players',H.players.length)}${stat('Auction & keeper entries',fmt(D.draftHistory.length,0))}</div></div>
 <section class="section"><div class="wrap">${heading('THE CHAMPIONSHIP HALL','Eight banners. Eight stories.','The champions are confirmed from the original league archive.')}<div class="banners">${D.champions.map(c=>`<div class="banner"><div class="banner-year">${c.year}</div><div class="banner-team">${e(c.team)}</div><div class="banner-owner">${e(c.owner)}</div><div class="banner-record">${e(c.record)}</div></div>`).join('')}</div></div></section>
 <section class="section alt"><div class="wrap">${heading('THE LAST COMPLETE SEASON','2025 belonged to Tyler.','The regular-season table and championship told different stories.')}<div class="dd-two"><article class="dd-card"><div class="dd-year-label">2025 championship</div><h3>${e(champ.team)}</h3><p>${e(D.season2025.headline)}</p><div class="dd-stat-row"><div><strong>217.54</strong><small>Final score</small></div><div><strong>9–5</strong><small>Regular season</small></div></div><button class="dd-action" style="margin-top:18px" data-go="season2025">Read the season →</button></article><article class="dd-card"><div class="dd-year-label">Regular-season leaders</div>${latest.slice(0,4).map((x,i)=>`<div class="dd-roster"><span>${i+1}. ${e(x.owner)} <small>· ${e(x.team)}</small></span><b>${x.w}–${x.l} · ${fmt(x.pf)} PF</b></div>`).join('')}<button class="dd-action" style="margin-top:20px" data-go="seasons">See all seasons →</button></article></div></div></section>
 <section class="section dark"><div class="wrap">${heading('FROM THE RECORD BOOK','The numbers that stuck.','Recalculated from the expanded historical workbook, with the 2025 final retained from the original archive.')}<div class="record-grid record-grid-dark">${H.records.filter((x,i)=>[0,2,5,7].includes(i)).map(x=>recordCard({...x,value:typeof x.value==='number'?fmt(x.value):x.value})).join('')}</div></div></section>
 <section class="section"><div class="wrap">${heading('AUCTION RECEIPTS','Everyone had a price.','Eight completed auction boards and the keeper costs that followed.')}<div class="dd-grid"><article class="dd-card"><div class="dd-year-label">Highest auction price</div><div class="dd-price">${dollar(H.auction.highest[0].cost)}</div><h3>${e(H.auction.highest[0].player)}</h3><p>${e(H.auction.highest[0].owner)} · ${H.auction.highest[0].year}</p></article><article class="dd-card"><div class="dd-year-label">Auction seasons</div><div class="dd-price">8</div><h3>2018–2025</h3><p>Browse paid prices and keeper costs by season, position and manager.</p></article><article class="dd-card"><div class="dd-year-label">2026 keeper snapshot</div><div class="dd-price">${D.current.keeperCount}</div><h3>Players retained</h3><p>Preserved from the original site's pre-auction board.</p></article></div><button class="dd-action" style="margin-top:20px" data-go="draft">Open Draft Central →</button></div></section></div>`;
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
}

function table(headers,rows,extra=''){
 return `<div class="dd-table-wrap"><table class="dd-table ${extra}"><thead><tr>${headers.map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function standingRows(year){return (H.standings[String(year)]||[]).map(x=>`<tr><td><strong>${x.rank}</strong></td><td><strong>${e(x.owner)}</strong><small>${e(x.team)}</small></td><td>${x.w}–${x.l}${x.t?`–${x.t}`:''}</td><td>${fmt(x.pf)}</td><td>${fmt(x.pa)}</td><td>${fmt(x.pf-x.pa)}</td></tr>`);}
function standingsTable(year){return table(['#','Manager / team','W–L','PF','PA','Diff'],standingRows(year));}
function render2025(){
 const S=D.season2025;
 app.innerHTML=`<div class="page"><section class="season-hero"><div class="wrap season-hero-grid"><div><div class="eyebrow">2025 SEASON FILE</div><h1>${e(S.championTeam.toUpperCase())} TAKES THE TITLE</h1><p>${e(S.headline)}</p></div><div class="champion-lockup"><span>2025 Champion</span><strong>${e(S.championTeam)}</strong><b>${e(S.champion)} · 9–5 regular season</b><small>Championship: ${e(S.finalScore)}</small></div></div></section>
 <div class="stats-strip"><div class="wrap stat-grid">${stat('Winning final score','217.54')}${stat('Regular-season wins · Vinny','10')}${stat('Regular season PF · Vinny','1,817.36')}${stat('Completed trades · Tyler','6')}</div></div>
 <section class="section"><div class="wrap">${heading('THE SEASON','A wild finish.','') }<p class="dd-lead">${e(S.overview)}</p>${note('<strong>Data coverage:</strong> The workbook contains 2025 matchups through Week 16. The Week 17 title game and final placement results below are preserved from the original Dirty D’s site.')}<div class="dd-grid">${S.timeline.map(t=>`<article class="dd-card"><div class="dd-year-label">${e(t.label)}</div><h3>${e(t.title)}</h3><p>${e(t.body)}</p></article>`).join('')}</div></div></section>
 <section class="section alt"><div class="wrap">${heading('2025 STANDINGS','How the regular season finished.','Sorted by wins and points scored; playoff finish is shown separately below.')}${standingsTable(2025)}</div></section>
 <section class="section"><div class="wrap">${heading('PLAYOFF RESULTS','Tyler closed it out.','Week 17 placement scores come from the original site.')}${table(['Round','Winner','Loser','Score'],S.playoffs.map(g=>`<tr><td>${e(g.round)}</td><td><strong>${e(g.winner)}</strong></td><td>${e(g.loser)}</td><td>${e(g.score)}</td></tr>`))}</div></section>
 <section class="section alt"><div class="wrap">${heading('FRANCHISE DEBRIEFS','Twelve different seasons.','Tap a manager for the full 2025 story and keeper context.')}<div class="dd-grid">${S.teams.slice().sort((a,b)=>a.finish-b.finish).map(t=>`<button class="dd-team" data-2025="${e(t.owner)}"><div class="dd-year-label">${t.finish===1?'Champion':`Finish #${t.finish}`}</div><h3>${e(t.owner)}</h3><p>${e(t.team)}</p><div class="dd-stat-row"><div><strong>${e(t.record)}</strong><small>Regular</small></div><div><strong>${fmt(t.pf)}</strong><small>Points for</small></div></div></button>`).join('')}</div></div></section></div>`;
 document.querySelectorAll('[data-2025]').forEach(b=>b.onclick=()=>show2025Team(b.dataset['2025']));
}
function show2025Team(owner){const t=D.season2025.teams.find(x=>x.owner===owner);if(!t)return;
 openModal(`<div class="modal-hero"><div class="modal-hero-grid"><div class="modal-avatar">${e(initials(owner))}</div><div><div class="eyebrow">2025 SEASON FILE</div><h2>${e(owner)}</h2><p>${e(t.team)} · ${e(t.record)} regular season · finish #${t.finish}</p></div></div></div><div class="modal-body"><p class="dd-modal-caption">${e(t.narrative)}</p><div class="dd-profile-grid"><div><strong>${fmt(t.pf)}</strong><small>Points for</small></div><div><strong>${fmt(t.pa)}</strong><small>Points against</small></div><div><strong>${t.trades}</strong><small>Trades</small></div></div><div class="dd-modal-block"><h3>2025 keepers</h3>${t.keepers2025.map(k=>`<span class="dd-tag">${e(k.player)} · ${dollar(k.cost)}</span>`).join('')||'None logged'}</div></div>`);
}

function renderMatchups(){
 app.innerHTML=`<div class="page">${pageHero('EVERY WEEK ON RECORD','Matchups','Browse 762 workbook matchups from 2018–2025, plus three 2025 Week 17 placement games preserved by the original site.')}
 <section class="section"><div class="wrap">${heading('THE SCOREBOARD','Pick a season and week.','Matchups include the actual opponents, scores, and available team-level bench and projection totals.')}
 <div class="dd-controls"><label for="mYear">Season</label><select id="mYear">${years.map(y=>`<option value="${y}" ${y===matchupYear?'selected':''}>${y}</option>`).join('')}</select><label for="mWeek">Week</label><select id="mWeek"></select><label for="mOwner">Manager</label><select id="mOwner"><option>ALL</option>${D.ownerOrder.map(o=>`<option ${o===matchupOwner?'selected':''}>${e(o)}</option>`).join('')}</select></div>
 <div id="matchupSummary"></div><div id="matchupList"></div></div></section></div>`;
 document.getElementById('mYear').onchange=ev=>{matchupYear=Number(ev.target.value);matchupWeek=Math.max(...Object.keys(H.matchups[matchupYear]).map(Number));fillWeeks();drawMatchups();};
 document.getElementById('mOwner').onchange=ev=>{matchupOwner=ev.target.value;drawMatchups();};fillWeeks();drawMatchups();
}
function fillWeeks(){const el=document.getElementById('mWeek'),available=Object.keys(H.matchups[String(matchupYear)]).map(Number).sort((a,b)=>a-b);if(!available.includes(matchupWeek))matchupWeek=available.at(-1);el.innerHTML=available.map(w=>`<option value="${w}" ${w===matchupWeek?'selected':''}>Week ${w}</option>`).join('');el.onchange=ev=>{matchupWeek=Number(ev.target.value);drawMatchups();};}
function drawMatchups(){
 const games=(H.matchups[String(matchupYear)]?.[String(matchupWeek)]||[]).filter(g=>matchupOwner==='ALL'||g.a.owner===matchupOwner||g.b.owner===matchupOwner);
 const weeks=H.weekly[String(matchupYear)]?.[String(matchupWeek)]||[];
 const top=weeks[0];
 document.getElementById('matchupSummary').innerHTML=`<div class="dd-stat-row" style="margin:18px 0 24px"><div><strong>${games.length}</strong><small>Games shown</small></div><div><strong>${top?fmt(top.score):'—'}</strong><small>Weekly high · ${e(top?.owner||'')}</small></div><div><strong>${games.filter(g=>g.playoff).length?'Playoffs':'Regular'}</strong><small>Yahoo week label</small></div></div>${matchupYear===2025&&matchupWeek===17?note('<strong>Week 17 coverage:</strong> Three placement games were retained from the original site. Bench totals, projections, other Week 17 games and player-week lineups were not supplied.'):''}`;
 const extra=(side)=>weeks.find(w=>side.teamId==null?w.owner===side.owner:w.teamId===side.teamId);
 document.getElementById('matchupList').innerHTML=games.length?games.map(g=>{
  const a=extra(g.a),b=extra(g.b),winA=g.a.score>g.b.score,winB=g.b.score>g.a.score;
  return `<article class="dd-match"><div class="dd-match-side ${winA?'winner':''}"><div class="dd-initial">${e(initials(g.a.owner))}</div><div style="flex:1;min-width:0"><strong>${e(g.a.owner)}</strong><small>${e(g.a.team)} · ${e(g.round||(g.playoff?'Playoffs':'Regular season'))}</small><small>Bench ${a?.bench!=null?fmt(a.bench):'—'} · Proj ${a?.projection!=null?fmt(a.projection):'—'}</small></div><span class="dd-score">${fmt(g.a.score)}</span></div><div class="dd-versus">VS</div><div class="dd-match-side right ${winB?'winner':''}"><span class="dd-score">${fmt(g.b.score)}</span><div style="flex:1;min-width:0"><strong>${e(g.b.owner)}</strong><small>${e(g.b.team)} · ${g.tie?'Tie':e(g.round||(g.playoff?'Playoffs':'Regular season'))}</small><small>Bench ${b?.bench!=null?fmt(b.bench):'—'} · Proj ${b?.projection!=null?fmt(b.projection):'—'}</small></div><div class="dd-initial">${e(initials(g.b.owner))}</div></div>${g.url?`<div style="grid-column:1/-1;text-align:right"><a class="dd-link" href="${escUrl(g.url)}" target="_blank" rel="noopener noreferrer" style="font-size:11px">Original Yahoo matchup ↗</a></div>`:''}</article>`;
 }).join(''):note('No matchups match this manager and week.');
}

function renderSeasons(){
 app.innerHTML=`<div class="page">${pageHero('THE YEARBOOK','All Seasons','Eight completed seasons. Every regular-season table, champion, and weekly score archive.')}
 <section class="section"><div class="wrap">${heading('SEASON ARCHIVE','Choose a year.','Each file opens the expanded standings and a link to its matchups.')}<div class="season-grid">${years.map(y=>{const c=D.champions.find(x=>x.year===y);return `<button class="season-card live" data-year="${y}"><div class="season-status">Complete</div><div class="season-year">${y}</div><h3>${e(c.owner)} · ${e(c.team)}</h3><p>${e(c.record)} regular season · champion</p></button>`;}).join('')}</div><div id="seasonDetail"></div></div></section></div>`;
 document.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>{seasonYear=Number(b.dataset.year);drawSeason();document.getElementById('seasonDetail').scrollIntoView({behavior:'smooth',block:'start'});});drawSeason();
}
function drawSeason(){
 const y=seasonYear,c=D.champions.find(x=>x.year===y),games=Object.values(H.matchups[String(y)]).flat(),highest=games.flatMap(g=>[g.a,g.b]).sort((a,b)=>b.score-a.score)[0];
 document.querySelectorAll('[data-year]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.year)===y));
 document.getElementById('seasonDetail').innerHTML=`<div class="dd-preview" style="margin:32px 0 20px"><div class="dd-year-label">${y} season file</div><h2 style="margin:5px 0">${e(c.team)}</h2><p style="margin:0">${e(c.owner)} · Champion · ${e(c.record)} regular season · beat ${e(c.runnerUp)} in the final.</p><div class="dd-stat-row"><div><strong>${games.length}</strong><small>Known matchups</small></div><div><strong>${fmt(highest.score)}</strong><small>Highest recorded week · ${e(highest.owner)}</small></div></div></div>
 ${heading('REGULAR SEASON','The standings.','Sorted by wins, then points for; playoff finishes are represented by the championship banner.')}${standingsTable(y)}
 <div style="margin-top:22px">${y===2025?note('Three Week 17 placement games come from the original site. The 2025 workbook stops at Week 16.'):''}<button class="dd-action" id="viewYearGames">Browse ${y} matchups →</button></div>`;
 document.getElementById('viewYearGames').onclick=()=>{matchupYear=y;matchupWeek=Math.max(...Object.keys(H.matchups[String(y)]).map(Number));go('matchups');};
}

function auctionRecordCards(){
 const avg=Object.entries(H.auction.averageBids).filter(([,x])=>x.count).sort((a,b)=>b[1].average-a[1].average);
 const spend=Object.entries(H.auction.keeperSpend).sort((a,b)=>b[1]-a[1]);
 const high=H.auction.highest[0];
 return [
  {title:'Largest Auction Purchase',value:dollar(high.cost),owner:high.owner,team:high.player,year:high.year},
  {title:'Highest Average Auction Bid',value:`$${fmt(avg[0][1].average)}`,owner:avg[0][0],detail:`${avg[0][1].count} purchases`},
  {title:'Lowest Average Auction Bid',value:`$${fmt(avg.at(-1)[1].average)}`,owner:avg.at(-1)[0],detail:`${avg.at(-1)[1].count} purchases`},
  {title:'Most Historical Keeper Spend',value:dollar(spend[0][1]),owner:spend[0][0]},
  {title:'Least Historical Keeper Spend',value:dollar(spend.at(-1)[1]),owner:spend.at(-1)[0]},
 ];
}
function renderHistory(){
 const transactionTitles=new Set(['Most Completed Trades','Most Pickups','Most FAB Spent','Most Total Transactions','Fewest Total Transactions','Highest Waiver Bid Win %','Lowest Waiver Bid Win %']);
 const originalRecords=D.superlatives.filter(x=>transactionTitles.has(x.title));
 app.innerHTML=`<div class="page">${pageHero('THE ARCHIVE','League History','Championships, recalculated scoring records, 762 workbook games plus three Week 17 placement games, and the original transaction history.')}
 <section class="section"><div class="wrap">${heading('THE PODIUM','Champions, runners-up & third.','Final playoff placements from the original league archive.')}${table(['Season','Champion','Runner-up','Third place'],D.podium.map(p=>`<tr><td><strong>${p.year}</strong></td><td><strong>🥇 ${e(p.gold)}</strong><small>${e(p.goldTeam)}</small></td><td>🥈 ${e(p.silver)}<small>${e(p.silverTeam)}</small></td><td>🥉 ${e(p.bronze)}<small>${e(p.bronzeTeam)}</small></td></tr>`))}</div></section>
 <section class="section alt"><div class="wrap">${heading('RECALCULATED RECORDS','The scoring book.','Team seasons, matchups and lineup totals use the expanded workbook; the 2025 Week 17 final uses the original site.')}<div class="record-grid">${H.records.map(x=>recordCard({...x,value:typeof x.value==='number'?fmt(x.value):x.value})).join('')}</div></div></section>
 <section class="section dark"><div class="wrap">${heading('AUCTION RECORDS','The price of a roster.','Historical auction purchases and keepers are counted separately.')}
 <div class="record-grid record-grid-dark">${auctionRecordCards().map(recordCard).join('')}</div>
 </div></section>
 <section class="section"><div class="wrap">${heading('TRADE & WAIVER FILE','The old records still count.','Preserved from the existing site; the workbook did not contain transaction or waiver exports.')}<div class="record-grid">${originalRecords.map(recordCard).join('')}</div></div></section>
 <section class="section alt"><div class="wrap">${heading('ALL-TIME H2H','Who owns whom?','Each cell is the row manager’s wins and losses versus the column manager. Workbook playoff flags include consolation games.')}
 <div class="dd-season-bar">${[['all','All Games'],['regular','Regular'],['playoffs','Playoff-labeled']].map(([k,v])=>`<button data-h2h="${k}" class="${h2hScope===k?'active':''}">${v}</button>`).join('')}</div><div id="h2h"></div></div></section>
 <section class="section"><div class="wrap">${heading('TRADE NETWORK','Who dealt with whom?','Completed trades preserved from the original site.')}<div id="tradeMatrix"></div></div></section></div>`;
 document.querySelectorAll('[data-h2h]').forEach(b=>b.onclick=()=>{h2hScope=b.dataset.h2h;document.querySelectorAll('[data-h2h]').forEach(x=>x.classList.toggle('active',x===b));drawH2H();});drawH2H();drawTradeMatrix();
}
function matrix(data,trade=false){const order=D.ownerOrder;return `<div class="matrix-shell"><table class="matrix"><thead><tr><th>Manager</th>${order.map(o=>`<th>${e(o)}</th>`).join('')}</tr></thead><tbody>${order.map(a=>`<tr><td>${e(a)}</td>${order.map(b=>{if(a===b)return '<td class="diagonal">—</td>';const v=data[a]?.[b];if(trade)return `<td>${v||'—'}</td>`;return v?.gp?`<td class="${v.w>v.l?'positive':v.w<v.l?'negative':'even'}" title="${e(a)} vs ${e(b)}: ${v.gp} games, ${fmt(v.pf)} points for">${v.w}–${v.l}${v.t?`–${v.t}`:''}</td>`:'<td>—</td>';}).join('')}</tr>`).join('')}</tbody></table></div>`;}
function drawH2H(){document.getElementById('h2h').innerHTML=matrix(H.h2h[h2hScope]);}
function drawTradeMatrix(){document.getElementById('tradeMatrix').innerHTML=matrix(D.tradeMatrix,true);}

function renderPlayers(){
 app.innerHTML=`<div class="page">${pageHero('THE PLAYER LEDGER','Players',`${H.players.length} players across eight seasons, with actual league roster history and auction prices.`)}
 <section class="section"><div class="wrap">${heading('SEARCH THE ARCHIVE','Every name has a file.','Career points here are points scored in a Dirty D’s starting lineup; see each player for year-by-year totals and auction receipts.')}
 <div class="dd-controls"><input id="pSearch" type="search" aria-label="Search players" placeholder="Search player…" value="${e(playerSearch)}"><select id="pPos" aria-label="Position">${['ALL','QB','RB','WR','TE','K','DEF','FLEX'].map(p=>`<option ${p===playerPos?'selected':''}>${p}</option>`).join('')}</select><select id="pOwner" aria-label="Manager"><option>ALL</option>${D.ownerOrder.map(o=>`<option ${o===playerOwner?'selected':''}>${e(o)}</option>`).join('')}</select><select id="pSort" aria-label="Sort"><option value="points" ${playerSort==='points'?'selected':''}>Starter points</option><option value="starts" ${playerSort==='starts'?'selected':''}>Starts</option><option value="price" ${playerSort==='price'?'selected':''}>Highest price</option><option value="name" ${playerSort==='name'?'selected':''}>Name</option></select></div><div id="playerCount" class="dd-muted" style="margin-bottom:18px"></div><div id="playerResults" class="dd-player-list"></div><button id="morePlayers" class="dd-action dd-load">Show more players</button></div></section></div>`;
 const update=()=>{playerSearch=document.getElementById('pSearch').value;playerPos=document.getElementById('pPos').value;playerOwner=document.getElementById('pOwner').value;playerSort=document.getElementById('pSort').value;playerLimit=36;drawPlayers();};
 ['pSearch','pPos','pOwner','pSort'].forEach(id=>document.getElementById(id).addEventListener(id==='pSearch'?'input':'change',update));
 document.getElementById('morePlayers').onclick=()=>{playerLimit+=36;drawPlayers();};drawPlayers();
}
function drawPlayers(){
 let rows=H.players.filter(p=>(playerPos==='ALL'||p.position===playerPos)&&
 (playerOwner==='ALL'||p.owners.includes(playerOwner)||p.seasons.some(r=>r.owner===playerOwner))&&p.name.toLowerCase().includes(playerSearch.trim().toLowerCase()));
 rows.sort((a,b)=>playerSort==='name'?a.name.localeCompare(b.name):playerSort==='starts'?b.starts-a.starts||b.points-a.points:playerSort==='price'?(b.maxPrice??-1)-(a.maxPrice??-1)||b.points-a.points:b.points-a.points||a.name.localeCompare(b.name));
 document.getElementById('playerCount').textContent=`Showing ${Math.min(playerLimit,rows.length)} of ${rows.length} matching players`;
 document.getElementById('playerResults').innerHTML=rows.slice(0,playerLimit).map(p=>`<button class="dd-player" data-player="${e(p.key)}"><span class="dd-initial">${e(initials(p.name))}</span><span class="dd-player-info"><strong>${e(p.name)}</strong><small>${e(p.position)} · ${p.starts} starts · ${p.drafted} auction / keeper entries</small></span><span class="dd-player-value">${playerSort==='price'?(p.maxPrice==null?'—':dollar(p.maxPrice)):fmt(p.points,1)}<small>${playerSort==='price'?'top price':'starter pts'}</small></span></button>`).join('');
 document.getElementById('morePlayers').hidden=playerLimit>=rows.length;
 document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>showPlayer(b.dataset.player));
}
function showPlayer(key){const p=H.players.find(x=>x.key===key);if(!p)return;
 const drafts=p.events.filter(x=>x.type==='Draft'||x.type==='Keeper').sort((a,b)=>b.year-a.year);
 const other=p.events.filter(x=>x.type!=='Draft'&&x.type!=='Keeper').sort((a,b)=>b.year-a.year).slice(0,30);
 const seasons=p.seasons.slice().sort((a,b)=>b.year-a.year||b.points-a.points);
 openModal(`<div class="modal-hero"><div class="modal-hero-grid"><div class="modal-avatar">${e(p.position)}</div><div><div class="eyebrow">DIRTY D'S PLAYER FILE</div><h2>${e(p.name)}</h2><p>${e(p.position)}${p.nflTeam?` · ${e(p.nflTeam)}`:''} · ${p.owners.length} manager${p.owners.length===1?'':'s'}</p></div></div></div><div class="modal-body">
 <div class="dd-profile-grid"><div><strong>${p.starts}</strong><small>League starts</small></div><div><strong>${fmt(p.points,1)}</strong><small>Starter points</small></div><div><strong>${p.maxPrice==null?'—':dollar(p.maxPrice)}</strong><small>Highest auction / keeper price</small></div></div>
 <div class="dd-modal-block"><h3>Auction & keeper history</h3><p class="dd-modal-caption">Each entry uses the actual historical dollar cost. Nomination order does not indicate a draft round.</p>${drafts.length?drafts.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span><b>${e(x.player||p.name)}</b><br><small>${e(x.owner)} · ${e(x.team||teamName(x.owner))} · ${e(x.type)}</small></span><b>${dollar(x.cost)}</b></div>`).join(''):'No auction or keeper entry in the original archive.'}</div>
 <div class="dd-modal-block"><h3>Dirty D's scoring by season and team</h3>${seasons.length?seasons.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span>${e(x.owner||x.team)} · ${e(x.team)}<br><small>${x.starts} starts · ${x.benchApps} bench appearances</small></span><b>${fmt(x.points,1)} pts</b></div>`).join(''):'No league scoring row in the workbook.'}</div>
 ${other.length?`<div class="dd-modal-block"><h3>Other roster events</h3>${other.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span>${e(x.type)} · ${e(x.owner)}${x.fromOwner?` · from ${e(x.fromOwner)}`:''}</span><small>${e(x.date||'')}</small></div>`).join('')}</div>`:''}</div>`);
}

function ownerSeasons(owner){return years.flatMap(y=>(H.standings[String(y)]||[]).filter(x=>x.owner===owner));}
function renderTeams(){
 const active=D.ownerOrder.filter(o=>D.owners[o].active),former=D.ownerOrder.filter(o=>!D.owners[o].active);
 const cards=items=>`<div class="dd-grid">${items.map(o=>{const p=D.owners[o],s=ownerSeasons(o),wins=s.reduce((n,x)=>n+x.w,0),loss=s.reduce((n,x)=>n+x.l,0);return `<button class="dd-team" data-team="${e(o)}"><div class="dd-team-top"><div class="dd-initial">${e(initials(o))}</div><div><h3>${e(o)}</h3><p>${e(p.currentTeam)}</p></div></div><div class="dd-stat-row"><div><strong>${p.trophies.gold} 🏆</strong><small>Championships</small></div><div><strong>${wins}–${loss}</strong><small>Season table record</small></div></div></button>`;}).join('')}</div>`;
 app.innerHTML=`<div class="page">${pageHero('THE FRANCHISES','Teams','Manager histories, team-name changes, championships, and season-by-season standings.')}
 <section class="section"><div class="wrap">${heading('ACTIVE MANAGERS','Twelve franchises.','Select a manager to explore every recorded season.')}${cards(active)}${former.length?`<h2 class="dd-alumni">Historical members</h2>${cards(former)}`:''}</div></section></div>`;
 document.querySelectorAll('[data-team]').forEach(b=>b.onclick=()=>showTeam(b.dataset.team));
}
function showTeam(owner){const p=D.owners[owner],s=ownerSeasons(owner),weekRows=Object.values(H.weekly).flatMap(y=>Object.values(y).flat()).filter(x=>x.owner===owner).sort((a,b)=>b.score-a.score),top=weekRows[0],tr=p.transactions||{};
 openModal(`<div class="modal-hero"><div class="modal-hero-grid"><div class="modal-avatar">${e(initials(owner))}</div><div><div class="eyebrow">FRANCHISE FILE</div><h2>${e(owner)}</h2><p>${e(p.currentTeam)}${p.active?'':' · historical member'}</p></div></div></div><div class="modal-body"><div class="dd-profile-grid"><div><strong>${p.trophies.gold}</strong><small>Titles</small></div><div><strong>${s.reduce((n,x)=>n+x.w,0)}–${s.reduce((n,x)=>n+x.l,0)}</strong><small>Regular-season table</small></div><div><strong>${top?fmt(top.score):'—'}</strong><small>Best archived week</small></div></div>
 <div class="dd-modal-block"><h3>Season history</h3>${s.map(x=>`<div class="dd-history-row"><strong>${x.year}</strong><span>${e(x.team)} · ${x.w}–${x.l}<br><small>${fmt(x.pa)} points against</small></span><b>${fmt(x.pf)} PF</b></div>`).join('')}</div>
 <div class="dd-modal-block"><h3>Team names used</h3>${p.aliases.map(x=>`<span class="dd-tag">${e(x)}</span>`).join('')}</div><div class="dd-modal-block"><h3>Transactions from the original site</h3><p>${tr.trades??0} trades · ${tr.pickups??0} pickups · ${tr.fabWins??0} FAAB awards · ${dollar(tr.fabSpent??0)} FAAB spent.</p></div></div>`);
}

function renderDraft(){
 app.innerHTML=`<div class="page">${pageHero('AUCTION HEADQUARTERS','Draft Central','Actual prices from the 2018–2025 auction boards, keeper costs, and an archived 2026 keeper snapshot.')}
 <div class="stats-strip"><div class="wrap stat-grid">${stat('Completed auctions',8)}${stat('Draft & keeper entries',fmt(D.draftHistory.length,0))}${stat('Largest purchase',dollar(H.auction.highest[0].cost))}${stat('2026 recorded keepers',D.current.keeperCount)}</div></div>
 <section class="section"><div class="wrap">${heading('THE AUCTION BOARD','What everybody paid.','Filter by season, position, manager, or keeper status. Dollar amounts are auction/keeper values; the original nomination order is not treated as a round.')}
 <div class="dd-controls"><label for="dYear">Year</label><select id="dYear">${years.map(y=>`<option value="${y}" ${y===draftYear?'selected':''}>${y}</option>`).join('')}</select><label for="dPos">Position</label><select id="dPos">${['ALL','QB','RB','WR','TE','K','DEF'].map(p=>`<option ${p===draftPos?'selected':''}>${p}</option>`).join('')}</select><label for="dOwner">Manager</label><select id="dOwner"><option>ALL</option>${D.ownerOrder.map(o=>`<option ${o===draftOwner?'selected':''}>${e(o)}</option>`).join('')}</select><label for="dKind">Entry</label><select id="dKind"><option value="ALL">Auction + keeper</option><option value="Auction" ${draftKind==='Auction'?'selected':''}>Auction purchases</option><option value="Keeper" ${draftKind==='Keeper'?'selected':''}>Keepers</option></select></div><div id="draftSummary"></div><div id="draftBoard"></div></div></section>
 <section class="section alt"><div class="wrap">${heading('AUCTION HISTORY','Where the biggest dollars went.','Top historical auction purchases, excluding keepers.')}<div class="dd-grid">${H.auction.highest.slice(0,6).map(x=>`<article class="dd-card"><div class="dd-year-label">${x.year} · ${e(x.position)}</div><div class="dd-price">${dollar(x.cost)}</div><h3>${e(x.player)}</h3><p>${e(x.owner)} · ${e(x.teamName)}</p></article>`).join('')}</div></div></section>
 <section class="section"><div class="wrap">${heading('KEEPER SNAPSHOT','2026 before the auction.','These were the retained players, budgets, and max bids in the original site’s pre-auction snapshot. This is an archive, not a live 2026 roster.')}
 <div class="dd-grid">${D.draftCentral.teams.map(t=>`<article class="dd-card"><div class="dd-year-label">${e(t.team)}</div><h3>${e(t.owner)}</h3><div class="dd-stat-row"><div><strong>${dollar(t.budgetLeft)}</strong><small>Budget left</small></div><div><strong>${dollar(t.maxBid)}</strong><small>Max next bid</small></div></div><div style="margin-top:12px">${t.keepers.map(k=>`<div class="dd-roster"><span>${e(k.player)} · ${e(k.position)}</span><b>${dollar(k.cost)}</b></div>`).join('')||'<p>No keepers logged</p>'}</div></article>`).join('')}</div></div></section></div>`;
 ['dYear','dPos','dOwner','dKind'].forEach(id=>document.getElementById(id).onchange=()=>{draftYear=Number(document.getElementById('dYear').value);draftPos=document.getElementById('dPos').value;draftOwner=document.getElementById('dOwner').value;draftKind=document.getElementById('dKind').value;drawDraft();});drawDraft();
}
function drawDraft(){
 const rows=D.draftHistory.filter(x=>x.year===draftYear&&(draftPos==='ALL'||x.position===draftPos)&&(draftOwner==='ALL'||x.owner===draftOwner)&&(draftKind==='ALL'||(draftKind==='Keeper')===Boolean(x.keeper)))
 .slice().sort((a,b)=>Number(b.cost)-Number(a.cost)||a.player.localeCompare(b.player));
 const bought=rows.filter(x=>!x.keeper&&typeof x.cost==='number'),retained=rows.filter(x=>x.keeper&&typeof x.cost==='number');
 document.getElementById('draftSummary').innerHTML=`<div class="dd-stat-row" style="margin:12px 0 24px"><div><strong>${rows.length}</strong><small>Entries shown</small></div><div><strong>${dollar(bought.reduce((s,x)=>s+x.cost,0))}</strong><small>Auction purchases shown</small></div><div><strong>${dollar(retained.reduce((s,x)=>s+x.cost,0))}</strong><small>Keeper costs shown</small></div></div>`;
 document.getElementById('draftBoard').innerHTML=rows.length?table(['Price','Player','Position','Manager','Team','Type'],rows.map(x=>`<tr><td class="money">${typeof x.cost==='number'?dollar(x.cost):'—'}</td><td><button data-draft-player="${e(x.player)}">${e(x.player)}</button><small>${e(x.nflTeam||'')}</small></td><td>${e(x.position)}</td><td><strong>${e(x.owner)}</strong></td><td>${e(x.teamName)}</td><td><span class="dd-tag">${x.keeper?'Keeper':'Auction'}</span></td></tr>`)):'<div class="dd-note">No auction entries match these filters.</div>';
 document.querySelectorAll('[data-draft-player]').forEach(b=>b.onclick=()=>{const normalized=b.dataset.draftPlayer.toLowerCase().replace(/[^a-z0-9]/g,'');const p=H.players.find(x=>x.key===normalized);if(p)showPlayer(p.key);});
}

document.getElementById('footerMeta').textContent=`${H.meta.workbookGames} workbook matchups · 3 Week 17 placement games from original site`;
go((location.hash||'#home').slice(1));
