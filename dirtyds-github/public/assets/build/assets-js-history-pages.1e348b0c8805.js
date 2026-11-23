/* Hall of Fame, the shared season picker, and the detailed leaderboards. */
const historyStatistics=window.DIRTY_DS_HISTORY_STATS;
const historyPoints=points=>fmt(points/100);
const hallBanner=c=>`<button class="banner" type="button" data-champion-year="${Number(c.year)}" aria-label="Show ${e(c.year)} champion starting lineup"><span class="banner-year">${e(c.year)}</span><span class="banner-team">${e(c.team)}</span><span class="banner-owner">${e(c.owner)}</span><span class="banner-record">${e(c.record)}</span></button>`;
const historyScopes=(attr,label,selected)=>`<div class="dd-season-bar record-year-bar history-scopes" role="group" aria-label="${label}">${['all',2026,...years].map(y=>`<button type="button" data-${attr}="${y}" class="${String(y)===selected?'active':''}" aria-pressed="${String(y)===selected}">${y==='all'?'All Time':y}</button>`).join('')}</div>`;
const historySlot=slot=>({'W/R/T':'FLEX','Q/WR/T':'SUPERFLEX','Q/W/R/T':'SUPERFLEX','SUPER_FLEX':'SUPERFLEX',BN:'Bench'})[slot]||slot;
let liveHistoryStatus='loading';

function liveHistoryGames(week){
 if(!weekComplete(week))return [];
 const playoff=week>=Number(SL.data.league?.settings?.playoff_week_start||15);
 const groups=new Map();
 for(const r of SL.data.weeks[week]||[]){
  if(!r.matchup_id)continue; // Do not turn playoff byes into opponent matchups.
  const id=Number(r.roster_id),score=r.custom_points??r.points;
  if(!groups.has(r.matchup_id))groups.set(r.matchup_id,[]);
  groups.get(r.matchup_id).push({id,owner:identityAtWeek(id,week).manager,score});
 }
 return [...groups.values()].filter(g=>g.length===2).map(([a,b])=>({year:2026,week,playoff,a,b}));
}

function currentHistoryStatistics(){
 const {data}=SL,lastWeek=Math.min(18,Math.max(0,Number(data.league?.settings?.last_scored_leg)||0));
 const weeks=Array.from({length:lastWeek},(_,i)=>{
  const week=i+1,games=liveHistoryGames(week),snapshot=data.snapshots?.[week];
  const rosters=games.length?(data.weeks[week]||[]).map(row=>{
   const id=Number(row.roster_id),{manager:owner}=identityAtWeek(id,week);
   const starters=starterEntries(row,week).map(p=>({...p,status:'starter'}));
   const {benchKnown,benchIds}=weeklyBenchSlots(row,week);
   const bench=benchIds.map(p=>({
    id:p,slot:'BN',name:snapshot?.players?.[p]?.full_name||SL.fullName(p),status:'bench',points:scoreFor(row,p),benchConfirmed:!benchKnown
   }));
   return {id,owner,benchKnown,players:starters.concat(bench)};
  }):[];
  return {week,games,rosters};
 });
 const draft=liveDraftRows().map(p=>({...p,name:p.player,id:String(p.id||'')}));
 return historyStatistics.summarize({year:2026,teamCount:data.rosters.length,weeks,draft});
}

function renderSuperlatives(){
 app.innerHTML=`<div class="page"><section class="section"><div class="wrap">${heading('SUPERLATIVES','The awards wall.')}${historyScopes('record-year','Superlatives season',recordYear)}<div id="recordWall"></div></div></section></div>`;
 document.querySelectorAll('[data-record-year]').forEach(b=>b.onclick=()=>{recordYear=b.dataset.recordYear;syncRoute();drawRecords();});
 drawRecords();ensureLive().then(()=>{if(currentPage==='superlatives')drawRecords();}).catch(()=>{});
}

function historyList(title,rows,{auction=false}={}){
 const empty=auction?'No qualifying auction purchases with verified lineup data.':'No verified performances for this season.';
 return `<section class="history-stat-card"><h2>${title}</h2>${rows.length?`<ol class="history-stat-list">${rows.map(p=>`<li><div><strong>${e(p.name)}</strong><small>${auction?`${e(p.owner)} · ${p.year} · ${dollar(p.cost)} bid · ${historyPoints(p.points)} starter pts`:`${e(historySlot(p.slot))} · ${e(p.owner)} · ${p.year} Week ${p.week}`}</small></div><b>${auction?`${fmt(p.points/100/p.cost,3)} <small>pts/$</small>`:historyPoints(p.points)}</b></li>`).join('')}</ol>`:`<p class="history-empty">${empty}</p>`}</section>`;
}
function historyMatchupList(title,rows){
 return `<section class="history-stat-card"><h2>${title}</h2><p class="history-case-count">${rows.length} ${rows.length===1?'matchup':'matchups'}</p>${rows.length?`<ul class="history-game-list">${rows.map(g=>{
  const [winner,loser]=[g.first,g.second].sort((a,b)=>b.points-a.points);
  return `<li><small>${g.year} · Week ${g.week}</small><div class="history-game-score"><span><strong>${e(winner.owner)}</strong> <b>${historyPoints(winner.points)}</b></span><span>def.</span><span><strong>${e(loser.owner)}</strong> <b>${historyPoints(loser.points)}</b></span></div></li>`;
 }).join('')}</ul>`:'<p class="history-empty">No qualifying matchups for this season.</p>'}</section>`;
}
function historyCoverage(stats){
 const archived=stats.coverage.filter(c=>c.year!==2026),current=stats.coverage.find(c=>c.year===2026);
 const notes=[];
 if(archived.length>1)notes.push(`Completed seasons: ${archived.at(-1).year}–${archived[0].year}.`);
 else if(archived.length)notes.push(`${archived[0].year}: ${archived[0].matchupWeeks} weeks of completed matchups and ${archived[0].lineupWeeks} weeks of verified lineups.`);
 if(detailYear==='all'||detailYear==='2026'){
  if(current?.lastWeek){
   const complete=current.lastWeek>=17&&current.lineupGaps.length===0;
   notes.push(`2026 through Week ${current.lastWeek}${complete?'.':' (season in progress).'}`);
   if(current.lineupGaps.length)notes.push(`Starter lineups missing for Week(s) ${current.lineupGaps.join(', ')}.`);
   const confirmed=Object.entries(current.benchConfirmations||{});
   if(confirmed.length){
    const count=confirmed.reduce((total,[,n])=>total+n,0),weekLabel=confirmed.length===1?'Week':'Weeks';
    notes.push(`Includes ${count} confirmed bench performances from ${weekLabel} ${confirmed.map(([week])=>week).join(', ')}. Other bench slots from those weeks are unverified.`);
   }
   const benchGaps=current.benchGaps.filter(week=>!current.benchConfirmations?.[week]);
   if(benchGaps.length)notes.push(`Bench slots could not be verified for Week(s) ${benchGaps.join(', ')}.`);
   if(!current.draftAvailable)notes.push('2026 draft rankings need the paid auction picks and verified starter lineups for every completed week.');
  }else notes.push(liveHistoryStatus==='loading'?'Checking for completed 2026 weeks…':liveHistoryStatus==='failed'?'2026 data is currently unavailable.':'No finalized 2026 weeks yet.');
 }
 return notes.join(' ');
}
function drawDetailedStatistics(){
 const target=document.getElementById('historyDetails');if(!target)return;
 const seasons={...window.DIRTY_DS_HISTORY_SUMMARY};
 if(detailYear==='all'||detailYear==='2026')seasons[2026]=currentHistoryStatistics();
 const stats=historyStatistics.combine(detailYear==='all'?Object.values(seasons):[seasons[detailYear]].filter(Boolean));
 target.innerHTML=`
   <p class="history-coverage">${e(historyCoverage(stats))}</p>
   <div class="history-player-grid">${historyList('Top 10 Starter Performances',stats.top)}${historyList('Bottom 10 Starter Performances',stats.bottom)}${historyList('Top 10 Bench Performances',stats.bench)}</div>
   <div class="history-matchup-grid">${historyMatchupList('2nd-Highest Scorer Lost to the Highest',stats.secondHigh)}${historyMatchupList('2nd-Lowest Scorer Beat the Lowest',stats.secondLow)}</div>
   <div class="history-matchup-grid">${historyList('Top 10 Points Per Dollar',stats.value,{auction:true})}${historyList('Top 10 Busts',stats.busts,{auction:true})}</div>
   <p class="history-method">The two weekly scoring matchup lists use regular-season games only. Player performance lists include playoffs, kickers and defenses, and exclude IR. A tie for highest or lowest score leaves no second place at that end.</p>
   <p class="history-method">Draft value is the season’s starter points for the drafting manager divided by the original auction price. Bench points, points for other managers, keeper entries, kickers, defenses and picks without a positive bid are excluded. Paid picks with no starts count as zero. When ratios tie, the higher bid ranks first.</p>`;
 document.querySelectorAll('[data-detail-year]').forEach(b=>{const active=b.dataset.detailYear===detailYear;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
function renderDetailedStatistics(){
 app.innerHTML=`<div class="page history-details"><section class="page-hero"><div class="wrap"><h1>Detailed Statistics</h1></div></section><section class="section"><div class="wrap">${historyScopes('detail-year','Detailed statistics season',detailYear)}<div id="historyDetails"></div></div></section></div>`;
 document.querySelectorAll('[data-detail-year]').forEach(b=>b.onclick=()=>{detailYear=b.dataset.detailYear;syncRoute();drawDetailedStatistics();});
 drawDetailedStatistics();
 ensureLive().then(()=>{liveHistoryStatus='ready';if(currentPage==='history-stats')drawDetailedStatistics();}).catch(()=>{liveHistoryStatus='failed';if(currentPage==='history-stats')drawDetailedStatistics();});
}
