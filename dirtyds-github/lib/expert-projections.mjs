/* CBS publishes ROS counting stats. Re-score them under the league's rules. */
const strip=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const aliases={WSH:'WAS',JAC:'JAX',LA:'LAR'};
const fields={gp:'gp',passing_att:'pass_att',passing_cmp:'pass_cmp',passing_yds:'pass_yd',passing_td:'pass_td',passing_int:'pass_int',rushing_att:'rush_att',rushing_yds:'rush_yd',rushing_td:'rush_td',receiving_rec:'rec',receiving_yds:'rec_yd',receiving_td:'rec_td',misc_fl:'fum_lost',misc_2pt:'rec_2pt'};
export function parseCBS(html,pos){
 const head=[...html.matchAll(/<tr\b[^>]*class=["'][^"']*TableBase-headTr[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)][0]?.[1];
 if(!head)throw new Error('CBS projection table header changed.');
 const keys=[...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>m[1].match(/sortcol=([^&"']+)/)?.[1]||'player');
 if(!keys.includes('gp')||!keys.some(k=>fields[k]&&k!=='gp'))throw new Error('CBS projection columns are unsupported.');
 const result=[];
 for(const m of html.matchAll(/<tr\b[^>]*class=["'][^"']*TableBase-bodyTr[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);if(cells.length!==keys.length)throw new Error('CBS table row does not match its header.');
  const names=[...cells[0].matchAll(/<a\b[^>]*href=["'][^"']*\/players\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const name=strip(names.at(-1)?.[1]||''),teamMatches=[...cells[0].matchAll(/class=["'][^"']*CellPlayerName-team[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)],team=strip(teamMatches.at(-1)?.[1]||'');if(!name||!team)continue;
  const stats={};for(let i=1;i<keys.length;i++){const key=fields[decodeURIComponent(keys[i])];if(!key)continue;const value=Number(strip(cells[i]).replaceAll(',',''));if(!Number.isFinite(value))throw new Error('CBS counting stat is missing.');stats[key]=value;}
  if(stats.gp>0)result.push({name,pos,team:aliases[team]||team,stats});
 }
 if(result.length<10)throw new Error('CBS ROS feed returned too few players.');return result;
}
export const expertURL=(pos,season)=>`https://www.cbssports.com/fantasy/football/stats/${pos}/${season}/restofseason/projections/nonppr/`;
