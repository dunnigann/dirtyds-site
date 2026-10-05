/* Missing inputs remain missing. Coarse field-goal projections are labeled estimates. */
(() => {
 'use strict';
 const numeric=x=>x!==null&&x!==''&&Number.isFinite(Number(x));
 function calculate(row,settings,options={}){
  if(!row||typeof row!=='object')return {points:null,approximate:false,reason:'Projection unavailable'};
  const stats={...(row.stats||row)},estimates=[];
  if(numeric(stats.fgm_50p)&&!['fgm_50_59','fgm_60p'].some(k=>numeric(stats[k]))&&['fgm_50_59','fgm_60p'].some(k=>k in settings)){
   const a=options.actual?.stats||options.actual||{},total=Number(a.fgm_50_59||0)+Number(a.fgm_60p||0),share=total?Number(a.fgm_60p||0)/total:0;
   stats.fgm_50_59=Number(stats.fgm_50p)*(1-share);stats.fgm_60p=Number(stats.fgm_50p)*share;estimates.push('50+ yard field goals split using recorded distances; 50–59 yards without history');
  }
  if(!numeric(stats.fgmiss)){const keys=['fgmiss_0_19','fgmiss_20_29','fgmiss_30_39','fgmiss_40_49','fgmiss_50p'];if(keys.some(k=>numeric(stats[k])))stats.fgmiss=keys.reduce((n,k)=>n+Number(stats[k]||0),0);}
  const known=Object.entries(settings||{}).filter(([key,weight])=>numeric(weight)&&numeric(stats[key]));
  if(!known.length)return {points:null,approximate:false,reason:'No compatible scoring fields'};
  return {points:Math.round(known.reduce((n,[k,w])=>n+Number(stats[k])*Number(w),0)*100)/100,approximate:estimates.length>0,reason:estimates.join('; ')};
 }
 window.DIRTY_DS_SCORING={calculate};
})();
