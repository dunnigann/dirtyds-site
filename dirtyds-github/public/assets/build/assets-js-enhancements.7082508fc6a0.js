/* Small view helpers and refresh orchestration, shared by all page modules. */
function matchProgress(row,week=liveWeek){
 const games=SL.data.nflGames?.[week]||[],done=weekComplete(week);let total=num(row.points),remaining=0,missing=false,approx=false;
 if(done)return {total,remaining:0,label:'Final',approx:false};
 for(const id of row.starters||[]){const p=SL.player(id),game=games.find(g=>g.a===p.team||g.b===p.team);if(game?.completed)continue;if(games.length&&!game)continue;remaining++;const projected=projectionFor(id,week);if(projected===null){missing=true;continue;}total+=projected*(game?.remaining??1);if(game?.state==='in')approx=true;}
 return {total:missing?null:total,remaining,label:games.some(g=>g.state==='in')?'In progress':games.every(g=>g.completed)&&games.length?'Awaiting finalization':'Scheduled / in progress',approx};
}
function matchSummary(group){return `<div class="match-scoreboard">${group.slice(0,2).map(row=>{const identity=identityAtWeek(row.roster_id),progress=matchProgress(row);return `<div><small>${e(identity.manager)} · ${e(progress.label)}</small><h3>${e(identity.team)}</h3><strong>${pts(row.points)}</strong><span>Projected final <b>${progress.total===null?'—':pts(progress.total)}</b> · ${progress.remaining} players remaining</span></div>`;}).join('')}</div><p class="data-note">Projected finals use pregame expectations adjusted for game time remaining; in-game estimates are approximate. Finalized scores stay fixed.</p>`;}
function lineupList(roster,players,row){return `<section class="lineup-list"><h3>${e(roster?.name||identityAtWeek(roster.roster_id).team)}</h3><div class="lineup-list-head"><span>Starter</span><span>Points</span><span>Projection</span></div>${players.map(p=>`<button class="lineup-row" data-live-player="${e(p.id)}"><span class="lineup-player">${photo(p.position==='DEF'?nflLogo(p.nfl):p.headshot,p.name)}<span><strong>${e(p.name)}</strong><small>${posBadge(p.slot)} ${e(p.nfl)}</small></span></span><b>${pts(p.points)}</b><span>${pts(projectionFor(p.id))}</span></button>`).join('')}</section>`;}
function syncPlayerRoute(id){const q=new URLSearchParams(routeHash().split('?')[1]||'');q.set('player',id);history.replaceState(null,'','#'+currentPage+'?'+q);}
async function loadHomeLeague(){
 const target=document.getElementById('homeLeaguePanel');if(!target)return;
 try{await SL.init();await Promise.allSettled([SL.getTransactions(SL.currentWeek()),SL.getNflGames(SL.currentWeek())]);if(currentPage!=='home')return;let selected;try{selected=localStorage.getItem('dirtyds-home-roster');}catch{}const roster=SL.roster(selected)||SL.data.rosters[0],week=SL.currentWeek(),row=matchupRowForRoster(roster.roster_id,week),opp=(SL.data.weeks[week]||[]).find(r=>r.matchup_id===row?.matchup_id&&r.roster_id!==row?.roster_id),tx=(SL.data.transactions[week]||[]).filter(t=>t.status==='complete').sort((a,b)=>num(b.created)-num(a.created))[0];
  target.classList.remove('skeleton');target.innerHTML=`<div class="home-live-title"><div><span class="eyebrow">THIS WEEK</span><h2>Week ${week}, at a glance.</h2></div><label>Your matchup<select id="homeRoster">${liveTeams().map(t=>`<option value="${t.r.roster_id}" ${t.r.roster_id===roster.roster_id?'selected':''}>${e(t.team)}</option>`).join('')}</select></label></div><div class="home-summary-grid"><a href="#matchups?week=${week}&game=${Math.max(0,matchupGroups(week).findIndex(g=>g.some(x=>x.roster_id===roster.roster_id)))}"><small>${e(SL.teamName(roster))} · ${rosterRecord(roster)}</small><strong>${row?pts(row.points):'—'} <span>–</span> ${opp?pts(opp.points):'—'}</strong><span>vs. ${e(opp?SL.teamName(SL.roster(opp.roster_id)):'Awaiting matchup')} ↗</span></a><a href="#seasons?year=2026"><small>CURRENT LEADER</small><strong>${e(liveStandings()[0]?.manager||'—')}</strong><span>${e(liveStandings()[0]?.team||'')} · View standings ↗</span></a><a href="#transactions"><small>LATEST LEAGUE MOVE</small><strong>${tx?e(tx.type==='trade'?'Trade':tx.type==='waiver'?'Waiver claim':'Free-agent move'):'No moves this week'}</strong><span>${tx?e(transactionDate(tx)):'Open transaction history'} ↗</span></a></div>`;
  document.getElementById('homeRoster').onchange=ev=>{try{localStorage.setItem('dirtyds-home-roster',ev.target.value);}catch{}loadHomeLeague();};
 }catch{if(currentPage==='home')target.innerHTML='<p class="data-note">League data is unavailable. <button class="dd-action" data-retry>Retry</button></p>';}
 updateFeedStatus();
}
function updateFeedStatus(){const target=document.getElementById('feedStatus');if(!target)return;const feeds=Object.values(SL.data.feeds||{}),stale=feeds.filter(x=>x.stale),times=feeds.map(x=>x.saved).filter(Boolean),latest=SL.data.updatedAt||Math.max(0,...times);target.innerHTML=`<span class="status-dot ${stale.length?'stale':''}"></span><span>${latest?`Checked ${new Date(latest).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`:'Connecting to league'}${stale.length?` · ${stale.length} feed${stale.length>1?'s':''} using older/unavailable data`:''}</span><button id="refreshData" type="button">Refresh</button>`;target.classList.toggle('is-stale',stale.length>0);document.getElementById('refreshData').onclick=()=>refreshPage(true);}
let refreshRunning=false,lastRankingRefresh=0;
async function refreshPage(manual=false){
 if(refreshRunning||(!manual&&(document.hidden||!backdrop.hidden||document.activeElement?.matches('input,select,textarea'))))return;refreshRunning=true;const page=currentPage,week=liveWeek,focus=document.activeElement,scroll=window.scrollY;
 try{await SL.refresh();if(currentPage!==page)return;if(!location.hash.includes('week='))liveWeek=SL.currentWeek();else liveWeek=week;
  if(page==='home')await loadHomeLeague();
  if(page==='matchups'){await SL.getWeek(liveWeek,manual);await SL.getNflGames(liveWeek,manual);if(currentPage===page)await drawLiveMatchups();}
  if(page==='season2026'&&backdrop.hidden)drawSeason2026();
  if(page==='power'){if(manual||Date.now()-lastRankingRefresh>900000){await SL.loadRankings(manual);lastRankingRefresh=Date.now();}if(currentPage===page)drawPowerRankings();}
  if(page==='transactions'){await SL.getTransactions(SL.currentWeek(),manual);if(currentPage===page)drawTransactionsPage();}
  if(page==='players'){await SL.loadStats(manual);if(currentPage===page)drawTopPlayers();}
  if(page==='seasons'&&seasonYear===2026)drawSeasonDetail();
  if(manual&&['teams','draft'].includes(page))page==='teams'?drawTeamsPage(true):drawDraftPage(true);
 }catch(err){const target=document.getElementById('feedStatus');if(target)target.textContent='Refresh unavailable · previous data retained';}
 finally{refreshRunning=false;updateFeedStatus();if(currentPage===page){if(focus?.isConnected)focus.focus({preventScroll:true});else if(focus?.id)document.getElementById(focus.id)?.focus({preventScroll:true});window.scrollTo({top:scroll,behavior:'instant'});}}
}
const filterLabels={pSearch:'Player name',pPos:'Position',pOwner:'Historical manager',pSort:'Sort by',dYear:'Season',dPos:'Position',dOwner:'Manager',dKind:'Entry type',amYear:'Season',amWeek:'Week',playerTopPos:'Leader position'};
function polishControls(){
 document.querySelectorAll('.dd-controls').forEach(root=>{root.querySelectorAll('input,select').forEach(input=>{if(input.dataset.labeled)return;input.dataset.labeled='true';const label=document.createElement('label');label.className='filter-field';label.htmlFor=input.id;const title=document.createElement('span');title.textContent=filterLabels[input.id]||input.getAttribute('aria-label')||'Filter';input.setAttribute('aria-label',title.textContent);input.before(label);label.append(title,input);input.addEventListener('change',syncRoute);});root.querySelectorAll(':scope>label:not(.filter-field)').forEach(label=>label.remove());
  if(!root.querySelector('[data-reset-filters]')){const button=document.createElement('button');button.className='dd-action filter-reset';button.textContent='Reset filters';button.dataset.resetFilters='true';button.onclick=()=>{if(currentPage==='players'){playerSearch='';playerPos=playerOwner='ALL';playerSort='points';playerLimit=40;drawPlayersPage();}else if(currentPage==='draft'){draftYear=2026;draftPos=draftOwner=draftKind='ALL';drawDraftPage();}else if(currentPage==='matchups'){archiveMatchYear=2025;archiveMatchWeek=17;ensureArchive({years:[2025]}).then(drawArchiveMatchups);}syncRoute();};root.append(button);}
 });
 document.querySelectorAll('table').forEach(table=>table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach(cell=>{if(/^-?[\d,$.]+$/.test(cell.textContent.trim()))cell.classList.add('numeric-cell');})));
}
function groupRecords(){
 const root=document.getElementById('recordWall');if(!root||root.dataset.grouped==='true')return;
 const grid=root.querySelector('.record-grid');if(!grid)return;const cards=[...grid.children],groups=[['Scoring',r=>!/Auction|COTY|Spectator|Waiver|Our Guys|Moneyball|Cheapskate|Spend|Dollar/i.test(r.querySelector('.record-title')?.textContent||'')],['Management',r=>/COTY|Spectator|Waiver|Our Guys|Moneyball/i.test(r.querySelector('.record-title')?.textContent||'')],['Auction & value',()=>true]];
 for(const [title,test] of groups){const subset=cards.filter(r=>r.parentElement===grid&&test(r));if(!subset.length)continue;const details=document.createElement('details');details.className='record-category';details.open=true;const summary=document.createElement('summary');summary.textContent=title;const body=document.createElement('div');body.className='record-grid';subset.forEach(r=>body.append(r));details.append(summary,body);grid.before(details);}grid.remove();root.dataset.grouped='true';
}
function onRouteChange(){go(readRoute(),{restore:true});}
let lastHandledHash=location.hash;
function handleLocation(){if(lastHandledHash===location.hash)return;lastHandledHash=location.hash;onRouteChange();}
window.addEventListener('popstate',handleLocation);window.addEventListener('hashchange',handleLocation);
document.addEventListener('click',ev=>{if(ev.target.closest('[data-retry]')){SL.init(true).then(()=>go(currentPage,{restore:true})).catch(()=>go(currentPage,{restore:true}));}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPage();});
const controlsObserver=new MutationObserver(()=>{polishControls();groupRecords();});controlsObserver.observe(app,{subtree:true,childList:true});
setInterval(()=>refreshPage(),45000);
