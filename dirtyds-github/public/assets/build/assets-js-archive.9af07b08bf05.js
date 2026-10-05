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
  document.querySelectorAll('[data-season-year]').forEach(b=>b.onclick=async()=>{seasonYear=Number(b.dataset.seasonYear);syncRoute();if(seasonYear!==2026)await ensureArchive({years:[seasonYear]});if(currentPage!=='seasons')return;drawSeasonDetail();document.getElementById('seasonDetail').scrollIntoView({behavior:'smooth',block:'start'});});drawSeasonDetail();
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
 const week=Number(Object.entries(SL.data.weeks||{}).find(([,rows])=>rows.includes(row))?.[0]||0),snapshot=SL.data.snapshots?.[week];
 const roster=snapshot?.historicalMetadataUnknown?null:snapshot?.rosters?.find(r=>r.roster_id===row.roster_id),reserve=new Set((roster?.reserve||[]).map(String));
 const slots=(SL.data.league?.roster_positions||[]).filter(s=>!['BN','IR','TAXI'].includes(s));
 const players=[...new Set((row.players||[]).filter(id=>id&&id!=='0').map(String))].map(id=>{const p=snapshot?.players?.[id]||SL.player(id);return {id,pos:p.position,positions:p.fantasy_positions?.length?p.fantasy_positions:[p.position],points:scoreFor(row,id),available:!reserve.has(id)};});
 const key=JSON.stringify([week,row.roster_id,slots,players]);if(optimalCache.has(key))return optimalCache.get(key);
 const result=assignLegalLineup(slots,players),safe=result.lineup.every(p=>p.id)?Math.max(result.mean,num(row.points)):num(row.points);
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
    ['Closest Game','Smallest final-score margin',x=>x.games.map(g=>({value:Math.abs(num(g.a.score)-num(g.b.score)),owner:`${g.a.owner} vs ${g.b.owner}`,year:x.year,detail:`Week ${g.week} · ${fmt(g.a.score)}–${fmt(g.b.score)} final`})),true],
    ['Biggest Blowout','Largest final-score margin',x=>x.games.map(g=>({value:Math.abs(num(g.a.score)-num(g.b.score)),owner:`${g.a.owner} vs ${g.b.owner}`,year:x.year,detail:`Week ${g.week} · ${fmt(g.a.score)}–${fmt(g.b.score)} final`}))],
    ['Highest Scoring Week','Highest single-team score',x=>x.weeks.map(r=>({value:r.score,owner:r.owner,year:x.year,detail:`Week ${r.week} · team score`}))],
    ['Lowest Scoring Week','Lowest single-team score',x=>x.weeks.map(r=>({value:r.score,owner:r.owner,year:x.year,detail:`Week ${r.week} · team score`})),true],
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
    const eligible=selection==='all'?sources.filter(x=>x.year!==2026||seasonFinished||['Highest Scoring Week','Lowest Scoring Week','Largest Auction Purchase'].includes(title)):sources;
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
  root.removeAttribute('data-grouped');root.innerHTML=`<div class="record-grid">${records.filter(r=>!positional.includes(r)).map(recordCard).join('')}</div><div class="record-divider"><span>POSITION PRODUCTION</span><h3>Most and least starter points by position</h3></div><div class="record-grid">${positional.map(recordCard).join('')}</div>`;
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
  document.querySelectorAll('[data-record-year]').forEach(b=>b.onclick=()=>{recordYear=b.dataset.recordYear;syncRoute();drawRecords();});drawRecords();
  document.querySelectorAll('[data-h2h]').forEach(b=>b.onclick=()=>{h2hScope=b.dataset.h2h;syncRoute();document.querySelectorAll('[data-h2h]').forEach(x=>x.classList.toggle('active',x===b));drawH2H();});drawH2H();
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
function uniquePlayerYears(entries){
  const byYear=new Map();
  for(const entry of entries){
    const key=Number(entry.year),old=byYear.get(key);
    if(!old||entry.type==='Keeper'&&old.type!=='Keeper')byYear.set(key,entry);
  }
  return [...byYear.values()].sort((a,b)=>b.year-a.year);
}
function playerProfile(name,id){
  const historical=(H.players||[]).find(p=>norm(p.name)===norm(name));
  id=id||liveIdForName(name);
  const current=id?SL.player(id):null;
  const playerName=current?.full_name||historical?.name||name;
  const history=(historical?.seasons||[]).slice().sort((a,b)=>b.year-a.year);
  const auctionEntries=(historical?.events||[]).filter(x=>['Draft','Keeper'].includes(x.type)).map(x=>({year:x.year,owner:x.owner,cost:x.cost,type:x.type}));
  const pick=id?SL.data.picks.find(x=>SL.pickPlayerId(x)===String(id)):null;
  if(pick)auctionEntries.push({year:2026,owner:managerFor(SL.roster(pick.roster_id)),cost:SL.pickCost(pick),type:pick.is_keeper?'Keeper':'Draft'});
  const confirmed=K26.find(k=>norm(k.player)===norm(playerName));
  if(confirmed)auctionEntries.push({year:2026,owner:confirmed.owner,cost:confirmed.cost,type:'Keeper'});
  const auction=uniquePlayerYears(auctionEntries);
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

