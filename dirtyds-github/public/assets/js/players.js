/* PLAYERS */
function renderPlayers(){
  app.innerHTML=liveLoading('Players');
  ensureLive().then(()=>SL.loadStats()).then(()=>drawPlayersPage(true)).catch(()=>drawPlayersPage(false));
}
function aggregateSeasonPoints(){
  const totals={};for(let w=1;w<=SL.currentWeek();w++){for(const row of (SL.data.weeks[w]||[])){for(const [id,v] of Object.entries(row.players_points||{}))totals[id]=(totals[id]||0)+num(v);}}return totals;
}
function topLivePlayers(pos){
  const stats=SL.data.stats||{},fallback=aggregateSeasonPoints(),ids=new Set([...Object.keys(stats),...Object.keys(fallback)]);
  const out=[];
  ids.forEach(id=>{const p=SL.player(id),position=p.position||'';if(pos==='FLEX'?!['RB','WR','TE'].includes(position):position!==pos)return;const scored=SL.statPoints(stats[id],id),points=scored??fallback[id]??0;if(points<=0)return;out.push({id,name:SL.fullName(id),position,nfl:p.team||'',points,headshot:SL.headshot(id)});});
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
  app.innerHTML=`<div class="page">${pageHero('THE PLAYER INDEX','Players','')}<section class="player-top-section"><div class="wrap"><div class="player-top-heading"><div><div class="eyebrow">2026 SCORING LEADERS</div><div class="player-top-title">Top <select id="playerTopPos" aria-label="Scoring leader position" class="player-top-select pos-${e(playerTopPos)}">${['QB','RB','WR','TE','FLEX','K','DEF'].map(x=>`<option ${x===playerTopPos?'selected':''}>${x}</option>`).join('')}</select></div><p>Top 10 by NFL season points in Dirty D’s scoring. Bubble size scales with points.</p></div><span class="player-top-note">LIVE SLEEPER DATA</span></div><p class="carousel-hint">Swipe to see all 10 players →</p><div id="playerTopTen" tabindex="0" aria-label="Top ten players; scroll horizontally"></div></div></section><section class="section"><div class="wrap">${heading('SEARCH THE ARCHIVE','Every name has a file.','Career starts, scoring, auction prices and roster history.')}<div class="dd-controls"><input id="pSearch" type="search" placeholder="Search player…" value="${e(playerSearch)}"><select id="pPos">${positions.map(x=>`<option ${x===playerPos?'selected':''}>${x}</option>`).join('')}</select><select id="pOwner">${owners.map(x=>`<option ${x===playerOwner?'selected':''}>${e(x)}</option>`).join('')}</select><select id="pSort"><option value="points" ${playerSort==='points'?'selected':''}>Starter points</option><option value="starts" ${playerSort==='starts'?'selected':''}>Starts</option><option value="price" ${playerSort==='price'?'selected':''}>Highest price</option><option value="name" ${playerSort==='name'?'selected':''}>Name</option></select></div><div id="playerCount" class="dd-muted" style="margin-bottom:18px"></div><div id="playerResults" class="dd-player-list"></div><button id="morePlayers" class="dd-action dd-load">Show more players</button></div></section></div>`;
  document.getElementById('playerTopPos').onchange=ev=>{playerTopPos=ev.target.value;ev.target.className=`player-top-select pos-${playerTopPos}`;syncRoute();drawTopPlayers();};
  const update=()=>{playerSearch=document.getElementById('pSearch').value;playerPos=document.getElementById('pPos').value;playerOwner=document.getElementById('pOwner').value;playerSort=document.getElementById('pSort').value;playerLimit=40;syncRoute();drawArchivePlayers();};
  ['pSearch','pPos','pOwner','pSort'].forEach(id=>document.getElementById(id).addEventListener(id==='pSearch'?'input':'change',update));
  document.getElementById('morePlayers').onclick=()=>{playerLimit+=40;drawArchivePlayers();};
  if(hasLive)drawTopPlayers();else document.getElementById('playerTopTen').innerHTML=`<div class="live-error">Live Sleeper scoring did not load; the archive below is still available.</div>`;
  drawArchivePlayers();
}
function drawArchivePlayers(){
  let rows=(H.players||[]).filter(p=>(playerPos==='ALL'||p.position===playerPos)&&(playerOwner==='ALL'||(p.owners||[]).includes(playerOwner)||(p.seasons||[]).some(r=>r.owner===playerOwner))&&p.name.toLowerCase().includes(playerSearch.trim().toLowerCase()));
  rows.sort((a,b)=>playerSort==='name'?a.name.localeCompare(b.name):playerSort==='starts'?num(b.starts)-num(a.starts)||num(b.points)-num(a.points):playerSort==='price'?num(b.maxPrice??-1)-num(a.maxPrice??-1)||num(b.points)-num(a.points):num(b.points)-num(a.points)||a.name.localeCompare(b.name));
  document.getElementById('playerCount').textContent=`Showing ${Math.min(playerLimit,rows.length)} of ${rows.length} matching historical players`;
  document.getElementById('playerResults').innerHTML=rows.slice(0,playerLimit).map(p=>`<button class="dd-player" data-archive-player="${e(p.key)}"><span class="dd-player-portrait">${photo(archivePortrait(p),p.name)}</span><span class="dd-player-info"><strong>${e(p.name)}</strong><small>${posBadge(p.position)} <span>${p.starts} starts · ${fmt(p.points,1)} career points</span></small></span></button>`).join('');
  document.getElementById('morePlayers').hidden=playerLimit>=rows.length;wireImageFallback(document.getElementById('playerResults'));
  document.querySelectorAll('[data-archive-player]').forEach(b=>b.onclick=()=>showArchivePlayer(b.dataset.archivePlayer));
}
function showArchivePlayer(key){
  const p=H.players.find(x=>x.key===key);if(p)playerProfile(p.name);
}

