/* HOME */
function renderHome(){
  app.innerHTML=`<div class="page home-page"><section class="hero"><div class="wrap home-hero"><img src="assets/images/logo/dirtyds-chicken.jpg" alt="Dirty D's chicken logo"><div><div class="eyebrow">EST. 2018 · HALF-PPR · SUPERFLEX</div><h1>DIRTY <span class="accent">D'S</span></h1><p class="hero-deck">The league, all in one place.</p></div></div></section><section class="section"><div class="wrap"><div class="home-routes"><button data-go="power"><span>01 / THE OUTLOOK</span><strong>Power Rankings</strong><small>Who looks built for the rest of the season ↗</small></button><button data-go="matchups"><span>02 / GAME DAY</span><strong>Matchups</strong><small>Every starter, on the field ↗</small></button><button data-go="history"><span>03 / THE ARCHIVE</span><strong>League History</strong><small>Champions, records and head-to-head ↗</small></button></div></div></section><section class="section home-live"><div class="wrap"><div id="homeLeaguePanel" class="skeleton"></div></div></section><section class="section alt"><div class="wrap">${heading('AROUND THE NFL','Latest headlines.','Open a story from ESPN.') }<div id="homeNews" class="home-news">${note('Loading NFL headlines…')}</div></div></section></div>`;
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  loadNews();loadHomeLeague();
}
async function loadNews(){
  const root=document.getElementById('homeNews');if(!root)return;
  try{
    const response=await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=6');
    if(!response.ok)throw new Error('News feed unavailable');
    const data=await response.json();if(currentPage!=='home')return;
    const articles=(data.articles||[]).filter(x=>{try{const u=new URL(x.links?.web?.href);return x.headline&&u.protocol==='https:'&&(u.hostname==='espn.com'||u.hostname.endsWith('.espn.com'));}catch{return false;}}).slice(0,6);
    if(!articles.length)throw new Error('No articles returned');
    root.innerHTML=articles.map(x=>`<a class="news-story" href="${e(x.links.web.href)}" target="_blank" rel="noopener noreferrer"><span>ESPN NFL · ${e(x.published?new Date(x.published).toLocaleDateString(): 'LATEST')}</span><strong>${e(x.headline)}</strong><small>Read story ↗</small></a>`).join('');
  }catch{if(currentPage==='home')root.innerHTML='<p class="z-muted">Headlines are temporarily unavailable. <a href="https://www.espn.com/nfl/" target="_blank" rel="noopener noreferrer">See NFL news at ESPN ↗</a></p>';}
}

