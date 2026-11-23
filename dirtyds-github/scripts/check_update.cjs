require('./audit_player_attribution.cjs');
// Reproducible checks for the archive and live identity / week logic.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {JSDOM}=require('jsdom');
const dom=new JSDOM(fs.readFileSync(path.join(root,'source/index.template.html'),'utf8'),{url:'http://localhost/#home',runScripts:'outside-only'});
const context=dom.getInternalVMContext(),el=id=>context.document.getElementById(id);
context.window.scrollTo=()=>{};
for(const file of ['public/data/site-data.js','public/data/history-data.js','public/data/award-data.js','public/data/lineup-data.js','public/data/photo-data.js','public/data/keepers-2026.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const users=[{user_id:'a',display_name:'jdunnigan',metadata:{team_name:"Annie's Boobs"}},{user_id:'b',display_name:'Zwack',metadata:{team_name:'Cheese Curds'}}];
const rosters=[{roster_id:1,owner_id:'a',settings:{wins:1,losses:0},players:['9509']},{roster_id:2,owner_id:'b',settings:{wins:0,losses:1},players:['4984']}];
const league={settings:{last_scored_leg:1},roster_positions:['QB','RB']};
const players={'9509':{full_name:'Bijan Robinson',position:'RB',team:'ATL',fantasy_positions:['RB']},'4984':{full_name:'Josh Allen',position:'QB',team:'BUF',fantasy_positions:['QB']}};
const picks=[{player_id:'9509',roster_id:1,metadata:{amount:'75'},is_keeper:false}];
const weeks={1:[{roster_id:1,matchup_id:1,points:30,players:['9509'],starters:['9509'],players_points:{'9509':30}},{roster_id:2,matchup_id:1,points:20,players:['4984'],starters:['4984'],players_points:{'4984':20}}],2:[{roster_id:1,matchup_id:1,points:0,players:[],starters:[]},{roster_id:2,matchup_id:1,points:0,players:[],starters:[]}]};
const SL={data:{users,rosters,league,picks,state:{week:2},players,weeks,transactions:{},projections:{},rosProjections:{},stats:{},snapshots:{},nflGames:{}},loadHistory:async()=>{},loadStats:async()=>{},currentWeek(){return 2},roster(id){return rosters.find(x=>x.roster_id==id)},rosterUser(r){return users.find(x=>x.user_id==r?.owner_id)},managerName(r){return this.rosterUser(r)?.display_name||''},teamName(r){let u=this.rosterUser(r);return u?.metadata?.team_name||u?.display_name||''},player(id){return players[id]||{full_name:`Player ${id}`,position:''}},fullName(id){return this.player(id).full_name},headshot(){return ''},pickPlayerId(p){return String(p.player_id)},pickCost(p){return p.metadata?.amount==null?null:Number(p.metadata.amount)},scoreDetails(){return {points:0,approximate:false}},projectionPoints(){return 0},statPoints(){return 0},ready:Promise.resolve()};
context.window.DIRTY_DS_LIVE=SL;
for(const file of ['football-model','core','home','season','rankings','playoffs','transactions','matchups','archive','history-statistics','history-pages','players','teams','draft'])vm.runInContext(fs.readFileSync(path.join(root,'public/assets/js',file+'.js'),'utf8'),context);
const run=code=>vm.runInContext(code,context);
const {summarize,matchupMargin,combine}=require('../public/assets/js/history-statistics.js');
const fixtureYear=2025;
const game=(week,a,aScore,b,bScore)=>({year:fixtureYear,week,a:{id:a,owner:a,score:aScore},b:{id:b,owner:b,score:bScore}});
const roster=(id,entries)=>({id,owner:id,players:entries.map(([name,points,status='starter'])=>({name,points,status,slot:status==='starter'?'RB':status==='bench'?'BN':'IR'}))});
const week1={week:1,games:[game(1,'A',100,'B',90),game(1,'C',80,'D',70)],rosters:[
 roster('A',[['Drafted Player Jr.',20],['Bench Only',40,'bench'],['IR Player',100,'ir']]),
 roster('B',[['Other Player',30]]),roster('C',[['Negative Starter',-2]]),roster('D',[['Keeper',10]])
]};
const week2={week:2,games:[game(2,'A',90,'D',80),game(2,'B',90,'C',60)],rosters:[
 roster('A',[['Drafted Player',200,'bench'],['Waiver Add',25]]),roster('B',[['Other Player',25]]),roster('C',[['Reacquired',1]]),roster('D',[['Keeper',20]])
]};
const week3={week:3,games:[game(3,'A',80,'B',90),game(3,'C',84,'D',60)],rosters:[
 roster('A',[['Waiver Add',20]]),roster('B',[['Drafted Player',21]]),roster('C',[['Reacquired',1]]),roster('D',[['Keeper',10]])
]};
const draft=[{name:'Drafted Player',owner:'A',cost:5},{name:'Bench Only',owner:'A',cost:10},{name:'Never Used',owner:'A',cost:2},{name:'Keeper',owner:'D',cost:1,keeper:true},{name:'Other Player',owner:'B',cost:null},{name:'IR Player',owner:'A',cost:40,position:'K'},{name:'Other Player',owner:'B',cost:1,position:'D/ST'}];
const historyFixture={year:fixtureYear,teamCount:4,weeks:[week1,week2,week3],draft};
const computed=summarize(historyFixture);
assert.equal(computed.top[0].name,'Other Player','high bench and IR scores never enter the starters list');
assert.equal(computed.bottom[0].points,-200,'a started negative score counts');
const playoffWeek={...week1,week:4,games:[game(4,'A',100,'B',90),game(4,'C',80,'D',70)].map(g=>({...g,playoff:true}))};
const withPlayoffs=summarize({...historyFixture,weeks:[week1,week2,week3,playoffWeek]});
assert.deepEqual(withPlayoffs.secondHigh.map(x=>x.week),[1]);
assert.deepEqual(withPlayoffs.secondLow.map(x=>x.week),[1]);
assert.equal(summarize({...historyFixture,weeks:[playoffWeek]}).top.length,4,'playoff starts remain eligible for the player leaderboards');
assert.equal(withPlayoffs.value[0].points,4000,'playoff starter points still contribute to auction value');

assert.equal(computed.bench[0].points,20000,'bench includes active bench players and excludes IR');
const partialBench={...week1,rosters:[
 {...week1.rosters[0],benchKnown:false,players:[
  ...week1.rosters[0].players,
  {name:'Confirmed Bench',slot:'BN',status:'bench',points:32,benchConfirmed:true},
  {name:'No Verified Score',slot:'BN',status:'bench',points:null,benchConfirmed:true}
 ]},...week1.rosters.slice(1)
]};
const partial=summarize({...historyFixture,weeks:[partialBench]});
assert.deepEqual(partial.bench.map(p=>p.name),['Confirmed Bench'],'only individually confirmed bench slots with known scores count in an unverified week');
assert.deepEqual(partial.coverage[0].benchGaps,[1]);
assert.deepEqual(partial.coverage[0].benchConfirmations,{1:1});
assert.equal(partial.top.length,4,'bench coverage does not affect starter results');
assert.deepEqual(computed.secondHigh.map(x=>x.week),[1],'a first place tie has no second place; ranks use the true opponent');
assert.deepEqual(computed.secondLow.map(x=>x.week),[1],'the actual second lowest scorer must face the last place scorer');
assert.deepEqual(computed.value[0],{year:fixtureYear,name:'Drafted Player',owner:'A',cost:5,points:2000},'attribute starter points to the original auction buyer only');
assert.deepEqual(computed.busts.map(p=>p.name),['Bench Only','Never Used','Drafted Player'],'zero starts count as zero and keepers or unknown bids do not qualify');
assert.equal(matchupMargin(game(4,'A',92.01,'B',92)).margin,1,'score decimals stay exact');
assert.equal(matchupMargin(game(4,'A',92,'B',92)),null,'ties are not margins of victory');
assert.equal(summarize({...historyFixture,weeks:[week1,{...week2,rosters:[]}]}).busts.length,0,'missing starters must not create false busts');
vm.runInContext(fs.readFileSync(path.join(root,'public/data/history-statistics.js'),'utf8'),context);
const archived=Object.values(context.window.DIRTY_DS_HISTORY_SUMMARY);
assert.equal(archived.length,8);
assert.ok(archived.every(s=>s.coverage[0].lineupGaps.length===0&&s.value.length===10&&s.busts.length===10),'all yearly auction boards have complete archived coverage');
assert.equal(combine(archived).top[0].name,'Alvin Kamara');
for(const stats of archived){
 const cutoff=stats.coverage[0].year<=2020?14:15;
 assert.ok([...stats.secondHigh,...stats.secondLow].every(g=>g.week<cutoff));
 const draft=context.window.DIRTY_DS_DATA.draftHistory;
 for(const p of [...stats.value,...stats.busts])assert.ok(draft.some(x=>x.year===p.year&&x.owner===p.owner&&x.player===p.name&&!['K','DEF'].includes(x.position)));
}
assert.equal(run('canonicalManager(SL.roster(1))'),'Jack');
assert.equal(run('canonicalManager(SL.roster(2))'),'Ben');
assert.equal(run('completedWeeks().join(",")'),'1');
assert.equal(run('weekRecord(recordAt(1,1))'),'1–0');
assert.equal(run('weekRecord(recordAt(2,1))'),'0–1');
assert.equal(run("recordsFor('all').find(x=>x.title==='Largest Auction Purchase').value"),'$75');
assert.equal(run("recordsFor('all').find(x=>x.title==='Largest Auction Purchase').team"),'Bijan Robinson');
assert.equal(run("recordsFor('all').find(x=>x.title==='Goat').year"),2018);
run("currentPage='history';renderHistory()");assert.match(el('app').innerHTML,/Hall of Fame/);assert.equal(el('recordWall'),null);assert.match(el('app').innerHTML,/data-champion-year="2025"/);
run("currentPage='superlatives';renderSuperlatives()");assert.match(el('recordWall').innerHTML,/Bijan Robinson/);assert.match(el('recordWall').innerHTML,/POSITION PRODUCTION/);
assert.equal(context.window.DIRTY_DS_LINEUPS.championships['2025'].score,217.54);
assert.equal(context.window.DIRTY_DS_LINEUPS.championships['2025'].starters.find(p=>p.name==='Derrick Henry').points,45.6);
const oldWeek2=weeks[2];
const playerFile=()=>el('modalContent').querySelector('[data-player-roster-history]');
const rosterRows=()=>[...playerFile().querySelectorAll('.dd-history-row')].map(el=>[...el.children].map(x=>x.textContent));
const refreshProfile=()=>run('refreshPlayerHistory(openLivePlayerHistory())');
rosters[0].players=[];rosters[1].players.push('9509');
weeks[2]=[{roster_id:1,matchup_id:1,points:10,starters:['0'],players_points:{}},{roster_id:2,matchup_id:1,points:25,starters:['9509','9509'],players_points:{'9509':25}}];
run("playerProfile('Bijan Robinson','9509')");
assert.deepEqual(rosterRows(),[['2026','Ben · Cheese Curds1 start · 0 bench','25.0 pts'],['2026',"Jack · Annie's Boobs1 start · 0 bench",'30.0 pts']],'a trade preserves distinct manager rows, and duplicate slots do not count twice');
const sameTarget=playerFile();
weeks[2][1].players_points['9509']=26;
refreshProfile();
assert.equal(playerFile(),sameTarget,'scores refresh without replacing the popup');
assert.equal(rosterRows()[0][2],'26.0 pts');
league.settings.last_scored_leg=2;
refreshProfile();
assert.equal(rosterRows().length,2,'finalizing the current week does not add a second row');
assert.equal(run("seasonPlayerRows(2026).filter(p=>p.id==='9509').reduce((sum,p)=>sum+p.starts,0)"),2);
assert.equal(run("seasonPlayerRows(2026).some(p=>p.id==='0')"),false);
league.settings.last_scored_leg=1;
rosters[0].players=['9509'];rosters[1].players=['4984'];
weeks[2]=[{roster_id:1,matchup_id:1,points:12,players:['9509'],starters:['9509'],players_points:{'9509':12}},oldWeek2[1]];
refreshProfile();
assert.deepEqual(rosterRows(),[['2026',"Jack · Annie's Boobs2 starts · 0 bench",'42.0 pts']],'the live week folds into the finalized totals for the same manager');
weeks[2][0].starters=['0'];weeks[2][0].players_points['9509']=0;
refreshProfile();
assert.equal(rosterRows()[0][1],"Jack · Annie's Boobs1 start · 0 bench",'a zero before kickoff does not count as a bench appearance');
SL.data.nflGames[2]=[{a:'ATL',b:'BUF',state:'in'}];
refreshProfile();
assert.deepEqual(rosterRows(),[['2026',"Jack · Annie's Boobs1 start · 1 bench",'30.0 pts']],'a scoreless bench appearance counts once the game starts');
rosters[0].reserve=['9509'];
refreshProfile();
assert.equal(rosterRows()[0][1],"Jack · Annie's Boobs1 start · 0 bench",'IR is excluded');
delete rosters[0].reserve;delete SL.data.nflGames[2];weeks[2]=oldWeek2;
assert.doesNotMatch(playerFile().textContent,/provisional/);
run('showChampionship(2025)');assert.match(el('modalContent').innerHTML,/Derrick Henry/);
run("currentPage='teams';drawTeamsPage(true)");assert.equal((el('app').innerHTML.match(/data-manager=/g)||[]).length,13);assert.match(el('app').innerHTML,/HISTORICAL MANAGERS/);assert.match(el('app').innerHTML,/data-manager="Hunter"/);assert.doesNotMatch(el('app').innerHTML,/team-photo has-photo/);
run("showManager('Tyler')");assert.match(el('modalContent').innerHTML,/Top 10 Most Started Players \(Points Scored\)/);assert.match(el('modalContent').innerHTML,/Final place: 1st/);assert.match(el('modalContent').innerHTML,/ PA/);
assert.notEqual(run("recordsFor('all').find(x=>x.title==='COTY').value"),'Unavailable');assert.equal(run("recordsFor('2018').find(x=>x.title==='Cheapskate').value"),'Unavailable');assert.notEqual(run("recordsFor('2024').find(x=>x.title==='Least RB Points · Season').value"),'Unavailable');assert.equal(run("recordDefinitions().some(x=>['Daddy Warbucks','Storage Wars','Turtling'].includes(x[0]))"),false);
for(const year of [2018,2019,2020,2021,2022,2023,2024,2025,2026])for(const title of ['Closest Matchup','Biggest Blowout','Highest Scoring Week','Lowest Scoring Week'])assert.notEqual(run(`recordsFor('${year}').find(x=>x.title==='${title}').value`),'Unavailable',`${year}: ${title}`);
run("currentPage='season2026';liveWeek=1;drawSeason2026()");assert.doesNotMatch(el('app').innerHTML,/id="livePowerRankings"/);
run("currentPage='power';app.innerHTML='<div id=livePowerContent></div>';powerView='jack';powerWeek=3;drawPowerRankings()");assert.match(el('livePowerContent').innerHTML,/Drake London/);
run("publishedAnalystEditions[3]={teams:liveTeams().map((t,i)=>({...t,roster_id:t.r.roster_id,rank:i+1,record:recordAt(t.r.roster_id,1),powerScore:50,ros:100,vor:5,depth:.3,strength:{pos:'QB'},weakness:{pos:'RB'}}))};powerView='analyst';drawPowerRankings()");assert.match(el('livePowerContent').innerHTML,/ROS starter points/);
assert.equal(run('liveDraftRows().filter(x=>x.keeper).length'),33);
for(const [position,count] of [['QB',1],['RB',2],['WR',3],['TE',2],['K',1]])for(let i=1;i<=count;i++){const id=`ATL-${position}${i}`;players[id]={player_id:id,full_name:`Test ${position} ${i}`,position,team:'ATL',status:'Active',depth_chart_order:i};}
assert.equal(run("nflLineup('ATL').length"),10);
assert.equal(run("nflLineup('ATL').filter(x=>x.owner==='Free Agent').length"),10);
assert.match(run("formation(nflLineup('ATL'),true,true)"),/z-backs[\s\S]*Test K 1[\s\S]*ATL D\/ST/);
run("currentPage='players';drawPlayersPage(true)");run("playerProfile('Bijan Robinson','9509')");assert.match(el('modalContent').innerHTML,/Career starts/);assert.match(el('modalContent').innerHTML,/\$75/);assert.match(el('modalContent').innerHTML,/Trophy case/);assert.match(el('playerResults').innerHTML,/sleepercdn.com/);
assert.match(el('playerResults').innerHTML,/career points/);assert.doesNotMatch(el('playerResults').innerHTML,/auction \/ keeper entries/);
players.lamar={player_id:'lamar',full_name:'Lamar Jackson',position:'QB',team:'BAL'};picks.push({player_id:'lamar',roster_id:1,metadata:{amount:'41'},is_keeper:false});
run("playerProfile('Lamar Jackson','lamar')");
const lamarHistory=el('modalContent').innerHTML.split('<h3>Draft history</h3>')[1].split('</div></div><div class="dd-modal-block">')[0];
assert.equal((lamarHistory.match(/<strong>2026<\/strong>/g)||[]).length,1);assert.match(lamarHistory,/2026<\/strong><span>James · Keeper/);assert.doesNotMatch(lamarHistory,/2026<\/strong><span>Jack · Draft/);
const trade={transaction_id:'trade-1',status:'complete',type:'trade',leg:1,created:1,roster_ids:[1,2],adds:{'9509':2,'4984':1},draft_picks:[{season:'2027',round:2,owner_id:1,previous_owner_id:2}],waiver_budget:[{receiver:2,sender:1,amount:7}]};
const waiver={transaction_id:'waiver-1',status:'complete',type:'waiver',leg:1,created:2,roster_ids:[1],adds:{'9509':1},drops:{'4984':1},settings:{waiver_bid:12}};
SL.data.transactions={1:[trade,waiver],2:[{transaction_id:'move-2',status:'complete',type:'free_agent',leg:2,created:3,roster_ids:[2],adds:{'4984':2},drops:{}}]};
assert.equal(run('completedTransactions().length'),3);
run("currentPage='transactions';transactionWeek=1;drawTransactionsPage()");assert.match(el('app').innerHTML,/James|Jack/);assert.match(el('app').innerHTML,/2027 round 2 pick/);assert.match(el('app').innerHTML,/\$7 FAAB/);assert.match(el('txMoveResults').innerHTML,/\$12 FAAB/);assert.match(el('txMoveResults').innerHTML,/DROPPED/);
run('transactionWeek=2;drawTransactionMoves(completedTransactions().filter(t=>t.type!==\'trade\'))');assert.match(el('txMoveResults').innerHTML,/Free agent/);
dom.window.close();
console.log('PASS: archive, season records, keeper precedence, transactions, teams and profiles');
