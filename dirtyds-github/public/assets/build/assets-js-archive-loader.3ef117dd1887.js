/* Load archive datasets only on archive routes or explicit historical details. */
(() => {
 const pending=new Map();
 function script(path){const url=window.DIRTY_DS_ASSETS?.[path]||path;if(!pending.has(path))pending.set(path,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>{pending.delete(path);s.remove();reject(new Error('Archive file could not load. Please retry.'));};document.head.append(s);}));return pending.get(path);}
 async function load({players=false,years=[]}={}){
  await Promise.all(['data/archive-base.js','data/award-data.js','data/lineup-data.js','data/photo-data.js'].map(script));
  if(players)await script('data/archive-players.js');
  await Promise.all(years.map(y=>script(`data/seasons/${y}.js`)));
  return {D:window.DIRTY_DS_DATA,H:window.DIRTY_DS_HISTORY,A:window.DIRTY_DS_AWARDS,L:window.DIRTY_DS_LINEUPS,P:window.DIRTY_DS_PHOTOS};
 }
 window.DIRTY_DS_ARCHIVE={load};
})();
