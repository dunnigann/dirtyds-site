/* Shared, deterministic lineup, ranking and Monte Carlo math. */
(()=>{
'use strict';
function assignLegalLineup(slots,players){
 const order=slots.map((slot,index)=>({slot,index})).sort((a,b)=>(['FLEX','REC_FLEX','WRRB_FLEX','SUPER_FLEX'].indexOf(a.slot)+1)-(['FLEX','REC_FLEX','WRRB_FLEX','SUPER_FLEX'].indexOf(b.slot)+1));
 const eligible=(p,slot)=>p.available!==false&&p.points!==null&&Number.isFinite(p.points)&&(slot==='SUPER_FLEX'?p.positions.some(x=>['QB','RB','WR','TE'].includes(x)):slot==='FLEX'?p.positions.some(x=>['RB','WR','TE'].includes(x)):slot==='REC_FLEX'?p.positions.some(x=>['WR','TE'].includes(x)):slot==='WRRB_FLEX'?p.positions.some(x=>['WR','RB'].includes(x)):p.positions.includes(slot==='DST'?'DEF':slot));
 // Rectangular assignment: maximize filled legal slots, then projected points.
 // Dummy columns allow genuinely unfillable slots without reusing a player.
 const n=order.length,m=players.length+n,bonus=1+2*players.reduce((sum,p)=>sum+Math.abs(p.points||0),0);
 const cost=(i,j)=>j>=players.length?0:eligible(players[j],order[i].slot)?-bonus-players[j].points:1e12;
 const u=Array(n+1).fill(0),v=Array(m+1).fill(0),assigned=Array(m+1).fill(0),way=Array(m+1).fill(0);
 for(let i=1;i<=n;i++){
  assigned[0]=i;let j0=0;const min=Array(m+1).fill(Infinity),seen=Array(m+1).fill(false);
  do{seen[j0]=true;const i0=assigned[j0];let delta=Infinity,j1=0;
   for(let j=1;j<=m;j++)if(!seen[j]){const value=cost(i0-1,j-1)-u[i0]-v[j];if(value<min[j]){min[j]=value;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}
   for(let j=0;j<=m;j++)if(seen[j]){u[assigned[j]]+=delta;v[j]-=delta;}else min[j]-=delta;
   j0=j1;
  }while(assigned[j0]!==0);
  do{const j1=way[j0];assigned[j0]=assigned[j1];j0=j1;}while(j0!==0);
 }
 const columns=Array(n).fill(-1);for(let j=1;j<=m;j++)if(assigned[j])columns[assigned[j]-1]=j-1;
 const lineup=order.map((s,i)=>columns[i]<players.length?{...players[columns[i]],slot:s.slot,index:s.index}:{id:null,pos:s.slot,slot:s.slot,index:s.index,points:0,source:'Unfilled slot'}).sort((a,b)=>a.index-b.index),used=new Set(lineup.map(p=>p.id));
 return {mean:lineup.reduce((sum,p)=>sum+p.points,0),lineup,backup:players.filter(p=>!used.has(p.id)&&p.available&&p.points!==null).sort((a,b)=>b.points-a.points)};
}
const normalize=s=>String(s||'').toLowerCase().replace(/[’'.]/g,'').replace(/\b(jr|sr|ii|iii|iv)\b/g,'').replace(/[^a-z0-9]/g,'');
const number=x=>Number(x)||0;
const activeSlots=league=>(league.roster_positions||[]).filter(s=>!['BN','IR','TAXI'].includes(s));
const player=(data,id)=>data.players[id]||(/^[A-Z]{2,3}$/.test(id)?{full_name:id+' D/ST',team:id,position:'DEF',fantasy_positions:['DEF']}:{full_name:'Player '+id,position:'',fantasy_positions:[]});
function pairs(rows){const groups=new Map();for(const r of rows||[]){if(r.matchup_id==null)continue;const key=String(r.matchup_id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}return [...groups.values()];}
function recordThrough(data,through){
 const output=Object.fromEntries(data.rosters.map(r=>[r.roster_id,{w:0,l:0,t:0,pf:0,pa:0}]));
 for(let w=1;w<=through;w++){
  const groups=pairs(data.weeks[w]);if(groups.length*2!==data.rosters.length||groups.some(g=>g.length!==2))throw new Error('Completed Week '+w+' matchup data is incomplete.');
  const scores=[];
  for(const [a,b] of groups){if(!Number.isFinite(a.points)||!Number.isFinite(b.points))throw new Error('Missing finalized scores.');for(const [x,y] of [[a,b],[b,a]]){const r=output[x.roster_id];r.pf+=x.points;r.pa+=y.points;r[x.points>y.points?'w':x.points<y.points?'l':'t']++;scores.push(x.points);}}
  if(number(data.league.settings?.league_average_match)===1){scores.sort((a,b)=>a-b);const middle=(scores[(scores.length-1)>>1]+scores[scores.length>>1])/2;for(const row of data.weeks[w])output[row.roster_id][row.points>middle?'w':row.points<middle?'l':'t']++;}
 }
 for(const r of Object.values(output)){r.pf=Math.round(r.pf*100)/100;r.pa=Math.round(r.pa*100)/100;}return output;
}
function historicalRanks(data,week){
 const end=number(data.league.settings?.playoff_week_start)-1||14,slots=activeSlots(data.league),rows=data.weeks[week]||[];
 if(rows.length!==data.rosters.length)throw new Error('Week '+week+' rosters unavailable.');
 const rostered=new Set(rows.flatMap(r=>r.players||[]).map(String)),metadata=data.snapshots?.[week]?.players||{},pFor=id=>metadata[id]||player(data,id),records=recordThrough(data,week);
 const forecast=id=>{
  let sum=0,weight=0;
  for(let w=Math.max(1,week-2);w<=week;w++){const detail=globalThis.DIRTY_DS_SCORING.calculate(data.projections[w]?.[id],data.league.scoring_settings);if(detail.points!==null){const n=w===week?2:1;sum+=detail.points*n;weight+=n;}}
  return weight?sum/weight:null;
 };
 const candidates=(ids,w)=>[...new Set(ids.map(String))].map(id=>{const p=pFor(id),games=data.nflGames[w]||[],bye=games.length&&!games.some(g=>g.a===p.team||g.b===p.team),points=forecast(id);return {id,pos:p.position,positions:p.fantasy_positions?.length?p.fantasy_positions:[p.position],points:bye?0:points,available:!bye&&points!==null,source:'Archived weekly projection'};});
 const replacement={};for(const pos of ['QB','RB','WR','TE','K','DEF']){const free=Object.keys(data.players).filter(id=>!rostered.has(id)&&pFor(id).position===pos).map(forecast).filter(v=>v!==null&&v>0).sort((a,b)=>b-a).slice(0,3);replacement[pos]=free.length?free.reduce((a,b)=>a+b,0)/free.length:null;}
 const result=rows.map(row=>{
  const r=data.rosters.find(r=>r.roster_id===row.roster_id),projection=assignLegalLineup(slots,candidates(row.players||[],week)),weekly=[];
  for(let w=week+1;w<=end;w++)weekly.push(assignLegalLineup(slots,candidates(row.players||[],w)));
  const ros=weekly.reduce((n,l)=>n+l.mean,0),average=weekly.length?ros/weekly.length:projection.mean,byPos={};projection.lineup.forEach(p=>{if(p.id)byPos[p.pos]=(byPos[p.pos]||0)+p.points;});
  const vor=projection.lineup.reduce((n,p)=>n+(p.id&&replacement[p.pos]!=null?Math.max(0,p.points-replacement[p.pos]):0),0),coverage={};
  for(const pos of ['QB','RB','WR','TE']){const reserve=projection.backup.find(p=>p.pos===pos),starter=projection.lineup.filter(p=>p.pos===pos).sort((a,b)=>a.points-b.points)[0];coverage[pos]=reserve&&starter?Math.min(1,reserve.points/Math.max(1,starter.points)):0;}
  return {roster_id:r.roster_id,record:records[r.roster_id],average,ros,vor,coverage,depth:Object.values(coverage).reduce((a,b)=>a+b,0)/4,byPos,missing:projection.lineup.filter(p=>!p.id).length};
 });
 const percentile=(t,key)=>{const values=result.map(t=>t[key]),lo=Math.min(...values),hi=Math.max(...values);return hi===lo?.5:(t[key]-lo)/(hi-lo);};
 for(const t of result){const compare=['QB','RB','WR','TE'].map(pos=>{const avg=result.reduce((n,t)=>n+(t.byPos[pos]||0),0)/result.length;return {pos,ratio:avg?(t.byPos[pos]||0)/avg:1};}).sort((a,b)=>b.ratio-a.ratio);t.strength=compare[0];t.weakness=compare.at(-1);const balance=compare.reduce((n,p)=>n+Math.min(1,p.ratio),0)/4;t.powerScore=100*(.55*percentile(t,'average')+.25*percentile(t,'vor')+.15*t.depth+.05*balance);}
 return result.sort((a,b)=>b.powerScore-a.powerScore||b.average-a.average||a.roster_id-b.roster_id).map((t,i)=>({...t,rank:i+1}));
}
function expertIndex(experts,players){
 const exact=new Map(),byName=new Map(),mapped={};
 for(const row of experts){const name=normalize(row.name);exact.set(name+'|'+row.pos+'|'+row.team,row);const key=name+'|'+row.pos;if(!byName.has(key))byName.set(key,[]);byName.get(key).push(row);}
 for(const [id,p] of Object.entries(players)){const name=normalize(p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')),pos=p.position,key=name+'|'+pos;const row=exact.get(key+'|'+p.team)||(byName.get(key)?.length===1?byName.get(key)[0]:null);if(row)mapped[id]=row;}
 return mapped;
}
function buildPlayoffInput(data,experts,through){
 const league=data.league,end=number(league.settings?.playoff_week_start)-1;
 if(!Number.isInteger(end)||end<1||end>18)throw new Error('League playoff start is missing or unsupported.');
 const spots=number(league.settings?.playoff_teams);if(!Number.isInteger(spots)||spots<1||spots>data.rosters.length)throw new Error('League playoff field is missing.');
 const records=recordThrough(data,Math.min(through,end)),first=Math.min(through+1,end+1),slots=activeSlots(league),index=expertIndex(experts,data.players),teams=data.rosters.map(r=>({id:r.roster_id,...records[r.roster_id],division:number(r.settings?.division),weekly:[]})),teamById=new Map(teams.map((t,i)=>[t.id,i]));
 const schedule=[];for(let w=first;w<=end;w++){
  const groups=pairs(data.weeks[w]),ids=groups.flat().map(r=>r.roster_id);
  if(groups.some(g=>g.length!==2)||ids.length!==teams.length||new Set(ids).size!==teams.length||ids.some(id=>!teamById.has(id)))throw new Error('The real league schedule for Week '+w+' is missing; no opponents were invented.');
  schedule.push({week:w,pairs:groups.map(g=>g.map(r=>teamById.get(r.roster_id)))});
 }
 let expertSlots=0,fallbackSlots=0,missingSlots=0;const unmatched=new Set(),expertScoring=new Set();
 const gameCount=(team,start,last)=>{let count=0;for(let w=start;w<=last;w++)if((data.nflGames[w]||[]).some(g=>g.a===team||g.b===team))count++;return count;};
 const projection=(id,w)=>{
  const p=player(data,id),games=data.nflGames[w]||[];if(!games.length)throw new Error('NFL bye-week schedule unavailable for Week '+w+'.');
  if(!p.team||!games.some(g=>g.a===p.team||g.b===p.team))return {points:0,available:false,source:'Bye / no NFL team'};
  const expert=index[id],scheduled=gameCount(p.team,first,18),injured=['Out','IR','Doubtful','Suspended'].includes(p.injury_status);
  // CBS games played can encode missed games. Remove the earliest scheduled
  // games for currently unavailable players, instead of guessing a return date.
  const missed=expert&&injured?Math.max(1,scheduled-Math.min(scheduled,expert.stats.gp)):injured?1:0;
  const gamesBefore=gameCount(p.team,first,w-1);if(gamesBefore<missed)return {points:0,available:false,source:'Unavailable'};
  if(expert){const detail=globalThis.DIRTY_DS_SCORING.calculate(expert.stats,league.scoring_settings);const gp=number(expert.stats.gp);if(detail.points!==null&&gp>0){for(const key of Object.keys(league.scoring_settings))if(!(key in expert.stats))expertScoring.add(key);return {points:detail.points/gp,available:true,source:'CBS ROS',approximate:detail.approximate};}}
  const detail=globalThis.DIRTY_DS_SCORING.calculate(data.projections[w]?.[id],league.scoring_settings);if(detail.points!==null){unmatched.add(id);return {points:detail.points,available:true,source:'Sleeper weekly fallback'};}
  unmatched.add(id);return {points:null,available:false,source:'Projection missing'};
 };
 for(const [i,r] of data.rosters.entries())for(let w=first;w<=end;w++){
  const pool=[...new Set((r.players||[]).concat(r.reserve||[]).map(String))].map(id=>{const p=player(data,id);return {id,pos:p.position,team:p.team,positions:p.fantasy_positions?.length?p.fantasy_positions:[p.position],...projection(id,w)};}),lineup=assignLegalLineup(slots,pool);
  const selected=lineup.lineup.filter(p=>p.id),sameTeam={};for(const p of selected){if(p.source==='CBS ROS')expertSlots++;else fallbackSlots++;const cv={QB:.35,RB:.5,WR:.6,TE:.65,K:.45,DEF:.75}[p.pos]||.5;p.sd=Math.max(p.pos==='DEF'?5:3,Math.abs(p.points)*cv);(sameTeam[p.team]??=[]).push(p);}
  missingSlots+=slots.length-selected.length;
  // A normal team total uses player-level variance plus 15% same-offense
  // covariance. It avoids clipping each player and inflating expected scores.
  let variance=selected.reduce((n,p)=>n+p.sd*p.sd,0);for(const group of Object.values(sameTeam))for(let a=0;a<group.length;a++)for(let b=a+1;b<group.length;b++)variance+=2*.15*group[a].sd*group[b].sd;
  teams[i].weekly.push({week:w,mean:lineup.mean,sd:Math.sqrt(variance),players:selected.map(p=>({id:p.id,slot:p.slot,points:p.points,source:p.source})),unfilled:slots.length-selected.length});
 }
 if(missingSlots)throw new Error(missingSlots+' starter-week slots have no usable projection. The model will not publish misleading odds.');
 if(first<=end&&expertSlots===0)throw new Error('Expert ROS projections could not be matched. Odds are withheld until the expert feed recovers.');
 return {teams,schedule,spots,through:Math.min(through,end),end,median:number(league.settings?.league_average_match)===1,divisions:number(league.settings?.divisions),expertSlots,fallbackSlots,unmatched:[...unmatched],unsupportedScoring:[...expertScoring].filter(k=>number(league.scoring_settings[k])!==0)};
}
function compareSeeds(a,b){const ag=a.w+a.l+a.t,bg=b.w+b.l+b.t;const ap=ag?(a.w+.5*a.t)/ag:0,bp=bg?(b.w+.5*b.t)/bg:0;return bp-ap||b.pf-a.pf||b.pa-a.pa||(a.coin??0)-(b.coin??0);}
function seedTeams(teams,divisions=0){const sorted=teams.slice().sort(compareSeeds);if(divisions<2)return sorted;const winners=[];for(let d=1;d<=divisions;d++){const winner=sorted.find(t=>t.division===d);if(!winner)throw new Error('Division membership is incomplete.');winners.push(winner);}winners.sort(compareSeeds);const ids=new Set(winners.map(t=>t.id));return winners.concat(sorted.filter(t=>!ids.has(t.id)));}
function simulate(input,iterations=20000,seed=20261005){
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return (state+.5)/4294967296;};
 const normal=()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
 const counts=input.teams.map(t=>({id:t.id,playoff:0,first:0,wins:0,seeds:Array(input.teams.length).fill(0)}));
 for(let trial=0;trial<iterations;trial++){
  const teams=input.teams.map(t=>({...t,coin:random()}));
  for(let wi=0;wi<input.schedule.length;wi++){
   const weekly=teams.map(t=>Math.round((t.weekly[wi].mean+t.weekly[wi].sd*normal())*100)/100);
   for(const [a,b] of input.schedule[wi].pairs){teams[a].pf=Math.round((teams[a].pf+weekly[a])*100)/100;teams[b].pf=Math.round((teams[b].pf+weekly[b])*100)/100;teams[a].pa=Math.round((teams[a].pa+weekly[b])*100)/100;teams[b].pa=Math.round((teams[b].pa+weekly[a])*100)/100;if(weekly[a]>weekly[b]){teams[a].w++;teams[b].l++;}else if(weekly[b]>weekly[a]){teams[b].w++;teams[a].l++;}else{teams[a].t++;teams[b].t++;}}
   if(input.median){const ordered=weekly.slice().sort((a,b)=>a-b),median=(ordered[(ordered.length-1)>>1]+ordered[ordered.length>>1])/2;teams.forEach((t,i)=>t[weekly[i]>median?'w':weekly[i]<median?'l':'t']++);}
  }
  seedTeams(teams,input.divisions).forEach((t,i)=>{const c=counts[input.teams.findIndex(x=>x.id===t.id)];if(i<input.spots)c.playoff++;if(i===0)c.first++;c.wins+=t.w;c.seeds[i]++;});
 }
 return counts.map(c=>({roster_id:c.id,odds:100*c.playoff/iterations,first:100*c.first/iterations,expectedWins:c.wins/iterations,seedProbabilities:c.seeds.map(n=>100*n/iterations)})).sort((a,b)=>b.odds-a.odds||a.roster_id-b.roster_id);
}
globalThis.DIRTY_DS_MODEL={assignLegalLineup,normalize,recordThrough,historicalRanks,expertIndex,buildPlayoffInput,compareSeeds,seedTeams,simulate};
})();
