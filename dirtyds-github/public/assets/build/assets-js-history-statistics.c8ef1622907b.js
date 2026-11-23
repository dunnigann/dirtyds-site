/* Shared scoring for the build-time Yahoo archive and the current Sleeper season. */
(function(root){
'use strict';
const cents=value=>Number.isFinite(value)?Math.round(value*100):null;
const dateOrder=(a,b)=>a.year-b.year||a.week-b.week;
const playerOrder=(a,b)=>dateOrder(a,b)||a.owner.localeCompare(b.owner)||a.name.localeCompare(b.name);
const draftOrder=(a,b,low)=>((low?1:-1)*(a.points*b.cost-b.points*a.cost))||b.cost-a.cost||b.year-a.year||a.name.localeCompare(b.name)||a.owner.localeCompare(b.owner);
const topTen=(rows,compare)=>rows.slice().sort(compare).slice(0,10);
const playerKey=name=>String(name||'').toLowerCase().replace(/[.'’]/g,'').replace(/(?:[\s-]+(?:jr|sr|ii|iii|iv))+$/,'').replace(/[^a-z0-9]/g,'');

function matchupMargin(g){
 const a=cents(g.a.score),b=cents(g.b.score);
 if(a===null||b===null||a===b||g.a.id===g.b.id)return null;
 const winner=a>b?g.a:g.b,loser=a>b?g.b:g.a;
 return {year:g.year,week:g.week,playoff:g.playoff,winner:winner.owner,loser:loser.owner,winnerScore:Math.max(a,b),loserScore:Math.min(a,b),margin:Math.abs(a-b)};
}

const isKickerOrDefense=position=>/^(K|PK|KICKER|D|DEF|DST|DEFST|DEFENSE|TEAMDEFENSE)$/.test(String(position||'').toUpperCase().replace(/[^A-Z]/g,''));

function summarize({year,teamCount,weeks,draft=[]}){
 const starters=[],bench=[],secondHigh=[],secondLow=[],starterTotals=new Map(),lineupGaps=[],benchGaps=[],benchConfirmations={};
 let matchupWeeks=0,lineupWeeks=0,benchWeeks=0;
 for(const {week,games,rosters=[]} of weeks){
  const final=games.filter(g=>cents(g.a.score)!==null&&cents(g.b.score)!==null&&g.a.id!==g.b.id);
  if(!final.length||final.length!==games.length){lineupGaps.push(week);continue;}
  const playoff=final.some(g=>g.playoff);
  const sides=final.flatMap(({a,b})=>[[a,b],[b,a]]).map(([p,opp])=>({id:p.id,owner:p.owner,opponent:opp.id,points:cents(p.score)}));
  if(new Set(sides.map(p=>p.id)).size!==sides.length||(!playoff&&sides.length!==teamCount)){lineupGaps.push(week);continue;}
  matchupWeeks++;
  if(!playoff)for(const [results,dir] of [[secondHigh,-1],[secondLow,1]]){
   const ranked=sides.slice().sort((a,b)=>dir*(a.points-b.points));
   const [first,second]=ranked;
   if(!second||first.points===second.points)continue; // A tie for first leaves no second place.
   const opponent=ranked.find(p=>p.id===first.opponent);
   if(opponent?.points===second.points)results.push({year,week,first,second:opponent});
  }

  const byId=new Map(rosters.map(r=>[r.id,r]));
  const participants=sides.map(s=>byId.get(s.id));
  if(!participants.every(r=>r?.players.some(p=>p.status==='starter')&&r.players.every(p=>p.status!=='starter'||cents(p.points)!==null))){
   lineupGaps.push(week);continue;
  }
  lineupWeeks++;
  const benchVerified=participants.every(r=>r.benchKnown!==false&&r.players.every(p=>p.status!=='bench'||cents(p.points)!==null));
  if(benchVerified)benchWeeks++;else benchGaps.push(week);
  for(const roster of participants){
   const seen=new Set();
   const active=roster.players.filter(p=>p.status==='starter').concat(roster.players.filter(p=>p.status==='bench'&&(benchVerified||p.benchConfirmed===true)&&cents(p.points)!==null));
   for(const p of active){
    const id=p.id||playerKey(p.name);
    if(!id||!p.name||seen.has(id))continue;
    seen.add(id);
    const row={year,week,owner:roster.owner,name:p.name,slot:p.slot,points:cents(p.points)};
    if(p.status==='bench'){
     bench.push(row);
     if(!benchVerified)benchConfirmations[week]=(benchConfirmations[week]||0)+1;
     continue;
    }
    starters.push(row);
    const key=JSON.stringify([roster.owner,id]),prior=starterTotals.get(key)||0;
    starterTotals.set(key,prior+row.points);
   }
  }
 }
 const purchased=draft.filter(p=>!p.keeper&&!isKickerOrDefense(p.position)&&p.cost>0&&Number.isFinite(p.cost)&&p.owner&&p.name).map(p=>({
  year,owner:p.owner,name:p.name,cost:p.cost,points:starterTotals.get(JSON.stringify([p.owner,p.id||playerKey(p.name)]))??0
 }));
 // An incomplete lineup archive can silently turn missing production into a draft bust.
 const eligible=lineupWeeks&&!lineupGaps.length&&matchupWeeks===weeks.length?purchased:[];
 return {
  top:topTen(starters,(a,b)=>b.points-a.points||playerOrder(a,b)),
  bottom:topTen(starters,(a,b)=>a.points-b.points||playerOrder(a,b)),
  bench:topTen(bench,(a,b)=>b.points-a.points||playerOrder(a,b)),
  secondHigh:secondHigh.sort(dateOrder),secondLow:secondLow.sort(dateOrder),
  value:topTen(eligible,(a,b)=>draftOrder(a,b,false)),busts:topTen(eligible,(a,b)=>draftOrder(a,b,true)),
  coverage:[{year,matchupWeeks,lineupWeeks,benchWeeks,lineupGaps,benchGaps,...(Object.keys(benchConfirmations).length?{benchConfirmations}:{}),lastWeek:Math.max(0,...weeks.map(w=>w.week)),draftAvailable:eligible.length>0}]
 };
}

function combine(summaries){
 const rows=key=>summaries.flatMap(s=>s[key]);
 return {
  top:topTen(rows('top'),(a,b)=>b.points-a.points||playerOrder(a,b)),
  bottom:topTen(rows('bottom'),(a,b)=>a.points-b.points||playerOrder(a,b)),
  bench:topTen(rows('bench'),(a,b)=>b.points-a.points||playerOrder(a,b)),
  secondHigh:rows('secondHigh').sort(dateOrder),secondLow:rows('secondLow').sort(dateOrder),
  value:topTen(rows('value'),(a,b)=>draftOrder(a,b,false)),busts:topTen(rows('busts'),(a,b)=>draftOrder(a,b,true)),
  coverage:rows('coverage').sort((a,b)=>b.year-a.year)
 };
}

const api={summarize,combine,matchupMargin};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.DIRTY_DS_HISTORY_STATS=api;
})(typeof window==='undefined'?globalThis:window);
