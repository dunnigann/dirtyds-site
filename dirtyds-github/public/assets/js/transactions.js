/* TRANSACTIONS */
function completedTransactions(){
  const seen=new Set();
  return Object.values(SL.data.transactions||{}).flat().filter(t=>{
    if(t.status!=='complete'||seen.has(String(t.transaction_id)))return false;
    seen.add(String(t.transaction_id));return true;
  }).sort((a,b)=>num(b.status_updated||b.created)-num(a.status_updated||a.created));
}
const transactionWeekLabel=w=>Number(w)===0?'Preseason':`Week ${w}`;
function transactionDate(t){
  const timestamp=num(t.status_updated||t.created);
  return timestamp?new Date(timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'}):transactionWeekLabel(t.leg);
}
function transactionPlayer(id){
  const p=SL.player(id),isDefense=p.position==='DEF',portrait=isDefense?nflLogo(p.team||id):SL.headshot(id);
  return `<span class="tx-player">${photo(portrait,SL.fullName(id),'tx-portrait')}<span><strong>${e(SL.fullName(id))}</strong><small>${posBadge(p.position||'—')}${p.team?` · ${e(p.team)}`:''}</small></span></span>`;
}
function transactionRosterLabel(id){
  const r=SL.roster(id);
  return r?{name:managerFor(r),team:SL.teamName(r),avatar:userAvatar(SL.rosterUser(r))}:{name:`Roster ${id}`,team:'',avatar:''};
}
function tradeAssets(t,id){
  const players=Object.entries(t.adds||{}).filter(([,receiver])=>String(receiver)===String(id)).map(([player])=>`<div class="tx-asset">${transactionPlayer(player)}</div>`);
  const picks=(t.draft_picks||[]).filter(p=>String(p.owner_id)===String(id)).map(p=>`<div class="tx-asset tx-extra"><span class="tx-pick-icon">↗</span><span><strong>${e(p.season)} round ${e(p.round)} pick</strong><small>From ${e(transactionRosterLabel(p.previous_owner_id).name)}</small></span></div>`);
  const budget=(t.waiver_budget||[]).filter(b=>String(b.receiver)===String(id)).map(b=>`<div class="tx-asset tx-extra"><span class="tx-pick-icon">$</span><span><strong>${dollar(b.amount)} FAAB</strong><small>From ${e(transactionRosterLabel(b.sender).name)}</small></span></div>`);
  return [...players,...picks,...budget].join('')||'<p class="tx-empty">No incoming assets recorded.</p>';
}
function tradeCard(t){
  const ids=new Set((t.roster_ids||[]).map(String));
  for(const id of Object.values(t.adds||{}))ids.add(String(id));
  for(const p of t.draft_picks||[])ids.add(String(p.owner_id));
  for(const b of t.waiver_budget||[])ids.add(String(b.receiver));
  return `<article class="tx-trade"><div class="tx-card-head"><span>TRADE · ${e(transactionWeekLabel(t.leg))}</span><time>${e(transactionDate(t))}</time></div><div class="tx-trade-sides">${[...ids].map(id=>{const manager=transactionRosterLabel(id);return `<section class="tx-side"><div class="tx-side-heading">${photo(manager.avatar,manager.name,'tx-manager-avatar')}<span><strong>${e(manager.name)}</strong><small>${e(manager.team)} · Received</small></span></div><div class="tx-assets">${tradeAssets(t,id)}</div></section>`;}).join('')}</div></article>`;
}
function moveCard(t){
  const ids=new Set((t.roster_ids||[]).map(String));
  for(const id of [...Object.values(t.adds||{}),...Object.values(t.drops||{})])ids.add(String(id));
  const bid=t.type==='waiver'?num(t.settings?.waiver_bid):0;
  return [...ids].map(id=>{
    const manager=transactionRosterLabel(id);
    const added=Object.entries(t.adds||{}).filter(([,roster])=>String(roster)===id).map(([player])=>`<div class="tx-move-row"><span class="tx-move-tag added">ADDED</span>${transactionPlayer(player)}</div>`).join('');
    const dropped=Object.entries(t.drops||{}).filter(([,roster])=>String(roster)===id).map(([player])=>`<div class="tx-move-row"><span class="tx-move-tag dropped">DROPPED</span>${transactionPlayer(player)}</div>`).join('');
    return `<article class="tx-move"><div class="tx-move-head">${photo(manager.avatar,manager.name,'tx-manager-avatar')}<span><strong>${e(manager.name)}</strong><small>${e(manager.team)}</small></span><div class="tx-move-meta"><b>${t.type==='waiver'?'Waiver claim':'Free agent'}</b><small>${e(transactionDate(t))}${bid?` · ${dollar(bid)} FAAB`:''}</small></div></div><div class="tx-move-assets">${added}${dropped||(!added?'<p class="tx-empty">No player details recorded.</p>':'')}</div></article>`;
  }).join('');
}
function renderTransactions(){
  app.innerHTML=liveLoading('Transactions');
  ensureLive().then(async()=>{
    transactionFetchErrors=0;
    await Promise.all(Array.from({length:SL.currentWeek()+1},(_,i)=>SL.getTransactions(i,i===SL.currentWeek()).catch(()=>{transactionFetchErrors++;return[];})));
    if(currentPage!=='transactions')return;
    if(!location.hash.includes('week='))transactionWeek=SL.currentWeek();
    drawTransactionsPage();
  }).catch(err=>{if(currentPage==='transactions')app.innerHTML=liveError(err);});
}
function drawTransactionsPage(){
  const all=completedTransactions(),trades=all.filter(t=>t.type==='trade'),moves=all.filter(t=>t.type==='waiver'||t.type==='free_agent');
  const weekNumbers=[...(moves.some(t=>num(t.leg)===0)?[0]:[]),...Array.from({length:SL.currentWeek()},(_,i)=>i+1),...new Set(moves.map(t=>num(t.leg)).filter(w=>w>SL.currentWeek()&&w<=18))].sort((a,b)=>a-b);
  const count=Object.fromEntries(weekNumbers.map(w=>[w,moves.filter(t=>num(t.leg)===w).length]));
  app.innerHTML=`<div class="page tx-page">${pageHero('THE 2026 MOVEMENT','Transactions','Every completed trade, waiver claim and free-agent move, straight from Sleeper.')}<section class="section"><div class="wrap">${heading('DEAL DESK','Every trade.','Each side shows what that manager received.') }<div class="tx-summary"><span><strong>${trades.length}</strong> trades</span><span><strong>${moves.length}</strong> roster moves</span><span>Latest moves refresh automatically</span></div>${transactionFetchErrors?note(`${transactionFetchErrors} transaction weeks could not be refreshed. Reload to try again; available weeks are shown below.`):''}<div class="tx-trades">${trades.map(tradeCard).join('')||note('No completed trades have been recorded in the 2026 league yet.')}</div></div></section><section class="section alt"><div class="wrap">${heading('WAIVER WIRE','Adds & drops.','Choose a week to see completed waiver claims and free-agent moves.')}<div class="tx-weekbar" role="group" aria-label="Transaction week">${Object.entries(count).map(([week,n])=>`<button type="button" data-tx-week="${week}" class="${num(week)===transactionWeek?'active':''}" aria-pressed="${num(week)===transactionWeek}">${e(transactionWeekLabel(week))}<span>${n}</span></button>`).join('')}</div><div id="txMoveResults"></div></div></section></div>`;
  document.querySelectorAll('[data-tx-week]').forEach(b=>b.onclick=()=>{transactionWeek=num(b.dataset.txWeek);syncRoute();drawTransactionMoves(moves);});
  drawTransactionMoves(moves);wireImageFallback(app);
}
function drawTransactionMoves(moves){
  document.querySelectorAll('[data-tx-week]').forEach(b=>{const active=num(b.dataset.txWeek)===transactionWeek;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  const selected=moves.filter(t=>num(t.leg)===transactionWeek),root=document.getElementById('txMoveResults');
  root.innerHTML=`<div class="tx-week-label">${e(transactionWeekLabel(transactionWeek).toUpperCase())} · ${selected.length} COMPLETED MOVES</div><div class="tx-moves">${selected.map(moveCard).join('')||note(`No completed waiver or free-agent moves for ${e(transactionWeekLabel(transactionWeek))}.`)}</div>`;
  wireImageFallback(root);
}

