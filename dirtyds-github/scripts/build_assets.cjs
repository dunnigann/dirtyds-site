// Split archive payloads and generate deterministic, cache-safe deployed assets.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),pub=path.join(root,'public');
const read=p=>fs.readFileSync(path.join(pub,p),'utf8');
const write=(p,value)=>{fs.mkdirSync(path.dirname(path.join(pub,p)),{recursive:true});fs.writeFileSync(path.join(pub,p),value);};
const ctx={window:{}};vm.createContext(ctx);
for(const name of ['site-data','history-data'])vm.runInContext(read('data/'+name+'.js'),ctx);
const D=ctx.window.DIRTY_DS_DATA,H=ctx.window.DIRTY_DS_HISTORY,baseD={...D};
delete baseD.players;delete baseD.rivalries;delete baseD.draftCentral;
write('data/archive-base.js','window.DIRTY_DS_DATA='+JSON.stringify(baseD)+';\nwindow.DIRTY_DS_HISTORY='+JSON.stringify({...H,players:[],weekly:{},matchups:{}})+';\n');
write('data/archive-players.js','window.DIRTY_DS_DATA.players='+JSON.stringify(D.players)+';\nwindow.DIRTY_DS_HISTORY.players='+JSON.stringify(H.players)+';\n');
for(const year of Object.keys(H.matchups))write('data/seasons/'+year+'.js',`window.DIRTY_DS_HISTORY.matchups['${year}']=${JSON.stringify(H.matchups[year])};\nwindow.DIRTY_DS_HISTORY.weekly['${year}']=${JSON.stringify(H.weekly[year])};\n`);
const generated=path.join(pub,'assets/build');fs.mkdirSync(generated,{recursive:true});
// Existing generations are intentionally retained for open tabs during an upload.
const assets={};
const files=['assets/css/site.css',...fs.readdirSync(path.join(pub,'assets/js')).filter(f=>f.endsWith('.js')).map(f=>'assets/js/'+f),...['archive-base','archive-players','award-data','lineup-data','photo-data','keepers-2026'].map(f=>'data/'+f+'.js'),...Object.keys(H.matchups).map(y=>'data/seasons/'+y+'.js')];
for(const file of files){const value=read(file),hash=crypto.createHash('sha256').update(value).digest('hex').slice(0,12),name=file.replaceAll('/','-').replace(/\.(js|css)$/,'.'+hash+'.$1'),target='assets/build/'+name;write(target,value);assets[file]=target;}
const manifest='window.DIRTY_DS_ASSETS='+JSON.stringify(assets)+';\n',hash=crypto.createHash('sha256').update(manifest).digest('hex').slice(0,12),manifestPath='assets/build/manifest.'+hash+'.js';write(manifestPath,manifest);
let html=fs.readFileSync(path.join(root,'source/index.template.html'),'utf8');
html=html.replace(/(src|href)="([^"]+)"/g,(all,attr,file)=>assets[file]?`${attr}="${assets[file]}"`:file==='assets/manifest.js'?`${attr}="${manifestPath}"`:all);
write('index.html',html);
write('_headers','/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/assets/build/*\n  Cache-Control: public, max-age=31536000, immutable\n');
console.log(`Built ${files.length} fingerprinted assets; archive data loads on demand.`);
