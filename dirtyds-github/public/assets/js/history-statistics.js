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

function postseasonSummary(year,teamCount,weeks,postseason={}){
 const {standings=[],playoffIds=[],finalWeek,podium=[],rosters}=postseason;
 const cut=teamCount/2,qualifiers=new Set(playoffIds),ids=new Set(standings.map(t=>t.id));
 const fieldReady=Number.isInteger(cut)&&cut>0&&ids.size===teamCount&&standings.length===teamCount&&
  qualifiers.size===cut&&[...qualifiers].every(id=>ids.has(id))&&standings.every(t=>t.team&&t.owner&&cents(t.pf)!==null);
 const ranked=fieldReady?standings.slice().sort((a,b)=>cents(b.pf)-cents(a.pf)||(a.seed??Infinity)-(b.seed??Infinity)||a.id-b.id)
  .map((t,i)=>({id:t.id,year,owner:t.owner,team:t.team,pf:cents(t.pf),pfRank:i+1,seed:t.seed||null})):[];
 const missedTopPF=ranked.slice(0,cut).filter(t=>!qualifiers.has(t.id));
 const qualifiedBottomPF=ranked.slice(cut).filter(t=>qualifiers.has(t.id));
 const finalRosters=rosters??weeks.find(w=>w.week===finalWeek)?.rosters??[];
 const podiumRosters=podium.map(id=>finalRosters.find(r=>r.id===id));
 const podiumReady=podium.length===3&&new Set(podium).size===3&&
  podiumRosters.every(r=>r?.players.some(p=>p.status==='starter')&&r.players.every(p=>p.name&&playerKey(p.name)));
 const finishes=new Map();
 if(podiumReady)podiumRosters.forEach((r,i)=>{
  for(const p of r.players){
   // The Yahoo archive has names, while Sleeper has player IDs. Match names
   // across platforms using the same normalization as the auction archive.
   const key=playerKey(p.name);
   if(!finishes.has(key))finishes.set(key,{key,name:p.name,year,place:i+1});
  }
 });
 return {fieldReady,missedTopPF,qualifiedBottomPF,podiumReady,finishes:[...finishes.values()]};
}

function rankAccolades(finishes){
 const players=new Map();
 for(const f of finishes){
  if(!players.has(f.key))players.set(f.key,{key:f.key,name:f.name,year:f.year,byYear:new Map()});
  const player=players.get(f.key),prior=player.byYear.get(f.year);
  if(f.year>player.year)Object.assign(player,{name:f.name,year:f.year});
  if(!prior||f.place<prior.place)player.byYear.set(f.year,f);
 }
 return [...players.values()].map(({key,name,byYear})=>{
  const medals=[1,2,3].map(place=>[...byYear.values()].filter(f=>f.place===place).length);
  return {key,name,medals,points:3*medals[0]+2*medals[1]+medals[2]};
 }).sort((a,b)=>b.points-a.points||b.medals[0]-a.medals[0]||b.medals[1]-a.medals[1]||a.name.localeCompare(b.name)||a.key.localeCompare(b.key)).slice(0,5);
}

function sleeperPostseason({teams,weeks,bracket=[],start=1,playoffStart,spots,lastWeek,leagueWeek,finished,finalRosters}){
 const end=playoffStart-1;
 if(!Number.isInteger(end)||end<start||!Number.isInteger(spots)||lastWeek<end||(!finished&&leagueWeek<playoffStart))return {};
 const ids=new Set(teams.map(t=>t.id)),pf=new Map(teams.map(t=>[t.id,0]));
 for(let w=start;w<=end;w++){
  const seen=new Set(),round=weeks.find(x=>x.week===w);
  for(const {a,b,playoff} of round?.games||[]){
   if(playoff)return {};
   for(const side of [a,b]){
    const points=cents(side.score);
    if(!ids.has(side.id)||seen.has(side.id)||points===null)return {};
    pf.set(side.id,pf.get(side.id)+points);seen.add(side.id);
   }
  }
  if(seen.size!==ids.size)return {};
 }
 const playoffIds=[...new Set(bracket.flatMap(g=>[g.t1,g.t2]).filter(id=>ids.has(id)))];
 if(playoffIds.length!==spots)return {};
 const title=bracket.find(g=>g.p===1),third=bracket.find(g=>g.p===3);
 const played=(g,week)=>g&&playoffIds.includes(g.w)&&playoffIds.includes(g.l)&&g.w!==g.l&&
  weeks.find(r=>r.week===week)?.games.some(m=>[m.a.id,m.b.id].includes(g.w)&&[m.a.id,m.b.id].includes(g.l));
 const finalWeek=title?.r?playoffStart+title.r-1:null,thirdWeek=third?.r?playoffStart+third.r-1:null;
 const podium=finalWeek&&thirdWeek===finalWeek&&lastWeek>=finalWeek&&played(title,finalWeek)&&played(third,thirdWeek)?[title.w,title.l,third.w]:[];
 return {standings:teams.map(t=>({...t,pf:pf.get(t.id)/100})),playoffIds,podium,finalWeek,rosters:finalRosters?.[finalWeek]||[]};
}

function summarize({year,teamCount,weeks,draft=[],postseason}){
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
 const {fieldReady,podiumReady,missedTopPF,qualifiedBottomPF,finishes}=postseasonSummary(year,teamCount,weeks,postseason);
 return {
  top:topTen(starters,(a,b)=>b.points-a.points||playerOrder(a,b)),
  bottom:topTen(starters,(a,b)=>a.points-b.points||playerOrder(a,b)),
  bench:topTen(bench,(a,b)=>b.points-a.points||playerOrder(a,b)),
  secondHigh:secondHigh.sort(dateOrder),secondLow:secondLow.sort(dateOrder),
  value:topTen(eligible,(a,b)=>draftOrder(a,b,false)),busts:topTen(eligible,(a,b)=>draftOrder(a,b,true)),
  missedTopPF,qualifiedBottomPF,finishes,
  coverage:[{year,matchupWeeks,lineupWeeks,benchWeeks,lineupGaps,benchGaps,...(Object.keys(benchConfirmations).length?{benchConfirmations}:{}),lastWeek:Math.max(0,...weeks.map(w=>w.week)),draftAvailable:eligible.length>0,fieldReady,podiumReady}]
 };
}

function combine(summaries){
 const rows=key=>summaries.flatMap(s=>s[key]||[]);
 return {
  top:topTen(rows('top'),(a,b)=>b.points-a.points||playerOrder(a,b)),
  bottom:topTen(rows('bottom'),(a,b)=>a.points-b.points||playerOrder(a,b)),
  bench:topTen(rows('bench'),(a,b)=>b.points-a.points||playerOrder(a,b)),
  secondHigh:rows('secondHigh').sort(dateOrder),secondLow:rows('secondLow').sort(dateOrder),
  value:topTen(rows('value'),(a,b)=>draftOrder(a,b,false)),busts:topTen(rows('busts'),(a,b)=>draftOrder(a,b,true)),
  missedTopPF:rows('missedTopPF').sort((a,b)=>b.year-a.year||a.pfRank-b.pfRank),
  qualifiedBottomPF:rows('qualifiedBottomPF').sort((a,b)=>b.year-a.year||a.pfRank-b.pfRank),
  accolades:rankAccolades(rows('finishes')),
  coverage:rows('coverage').sort((a,b)=>b.year-a.year)
 };
}

const api={summarize,combine,matchupMargin,sleeperPostseason};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.DIRTY_DS_HISTORY_STATS=api;
})(typeof window==='undefined'?globalThis:window);
