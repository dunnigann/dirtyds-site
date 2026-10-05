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
  const unique=new Map();
  for(const row of rows){
    const key=norm(row.player),old=unique.get(key);
    if(!old||row.keeper&&!old.keeper)unique.set(key,row);
  }
  return [...unique.values()];
}
function drawDraftPage(hasLive=true){
  if(currentPage!=='draft')return;
  const yearOptions=hasLive?[2026,...years]:years;
  if(!hasLive && draftYear===2026) draftYear=2025;
  const ownerOptions=draftYear===2026?(hasLive?liveTeams().map(x=>x.manager):[]):D.ownerOrder;
  app.innerHTML=`<div class="page">${pageHero('AUCTION HEADQUARTERS','Draft Central')}<div class="stats-strip"><div class="wrap stat-grid">${stat('Completed historical auctions',8)}${stat('Historical entries',D.draftHistory.length)}${stat('Largest auction purchase',dollar(Math.max(...[...D.draftHistory,...(hasLive?liveDraftRows():[])].filter(x=>!x.keeper&&x.cost!=null).map(x=>num(x.cost)))))}${stat('2026 confirmed keepers',K26.length)}</div></div><section class="section"><div class="wrap">${heading('THE AUCTION BOARD','What everybody paid.')}<div class="dd-controls"><label>Year</label><select id="dYear">${yearOptions.map(y=>`<option value="${y}" ${y===draftYear?'selected':''}>${y}</option>`).join('')}</select><label>Position</label><select id="dPos">${['ALL','QB','RB','WR','TE','K','DEF'].map(x=>`<option ${x===draftPos?'selected':''}>${x}</option>`).join('')}</select><label>Manager</label><select id="dOwner"><option>ALL</option>${ownerOptions.map(x=>`<option ${x===draftOwner?'selected':''}>${e(x)}</option>`).join('')}</select><label>Entry</label><select id="dKind"><option value="ALL" ${draftKind==='ALL'?'selected':''}>Auction + keeper</option><option value="Auction" ${draftKind==='Auction'?'selected':''}>Auction purchases</option><option value="Keeper" ${draftKind==='Keeper'?'selected':''}>Keepers</option></select></div><div id="draftSummary"></div><div id="draftBoard"></div></div></section><section class="section alt"><div class="wrap">${heading('AUCTION HISTORY','Where the biggest dollars went.','Auction purchases exclude keeper entries.')}<div class="dd-grid">${[...D.draftHistory,...(hasLive?liveDraftRows():[])].filter(x=>!x.keeper&&x.cost!=null).sort((a,b)=>b.cost-a.cost).slice(0,6).map(x=>`<article class="dd-card"><div class="dd-year-label">${x.year} · ${posBadge(x.position)}</div><div class="dd-price">${dollar(x.cost)}</div><h3>${e(x.player)}</h3><p>${e(x.owner)} · ${e(x.teamName)}</p></article>`).join('')}</div></div></section></div>`;
  ['dYear','dPos','dOwner','dKind'].forEach(id=>document.getElementById(id).onchange=()=>{draftYear=Number(document.getElementById('dYear').value);draftPos=document.getElementById('dPos').value;draftOwner=document.getElementById('dOwner').value;draftKind=document.getElementById('dKind').value;if(id==='dYear'){draftOwner='ALL';drawDraftPage(hasLive);}else drawDraftBoard();syncRoute();});
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

