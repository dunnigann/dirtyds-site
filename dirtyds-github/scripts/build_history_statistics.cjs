const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {summarize}=require('../public/assets/js/history-statistics.js');
const source=path.join(__dirname,'../source/weekly-player-rows.json.gz');

module.exports=function buildHistoryStatistics(D,H){
 const seasonData={};
 const {rosters}=JSON.parse(zlib.gunzipSync(fs.readFileSync(source)));
 const byWeek=new Map();
 for(const roster of rosters){
  const key=roster.year+':'+roster.week;
  if(!byWeek.has(key))byWeek.set(key,[]);
  byWeek.get(key).push(roster);
 }
 for(const {year,teams:teamCount} of H.league){
  const weeks=Object.entries(H.matchups[year]||{}).map(([week,rows])=>{
   const owners=new Map((H.weekly[year]?.[week]||[]).map(r=>[r.teamId,r.owner]));
   // In 2018–2020, Week 14 was the start of the playoffs (four byes, 13 regular games).
   const firstPlayoffWeek=year<=2020?14:15;
   const games=rows.map(g=>({...g,playoff:g.playoff||Number(week)>=firstPlayoffWeek,a:{...g.a,id:g.a.teamId},b:{...g.b,id:g.b.teamId}}));
   const rosters=(byWeek.get(year+':'+week)||[]).map(r=>({
    id:r.teamId,owner:owners.get(r.teamId),players:r.players.map(p=>({...p,name:p.player}))
   })).filter(r=>r.owner);
   return {week:Number(week),games,rosters};
  });
  const draft=D.draftHistory.filter(p=>p.year===year).map(p=>({...p,name:p.player}));
  seasonData[year]=summarize({year,teamCount,weeks,draft});
 }
 return 'window.DIRTY_DS_HISTORY_SUMMARY='+JSON.stringify(seasonData)+';\n';
};
