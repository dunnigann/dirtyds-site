/* Dirty D's live 2026 data bridge. Sleeper's public API is read-only. */
(() => {
  'use strict';
  const LEAGUE_ID = '1388389962587590656';
  const API = 'https://api.sleeper.app/v1';
  const PLAYER_CACHE = 'dirtyds-sleeper-player-cache-v4';
  const CACHE_MS = 24 * 60 * 60 * 1000;
  const data = {
    league: null, users: [], rosters: [], players: {}, state: null,
    drafts: [], picks: [], weeks: {}, transactions: {}, stats: {}, projections: {}, rosProjections: {}, season: '2026'
  };
  let readyPromise = null;

  async function json(url) {
    const response = await fetch(url, {cache:'no-store'});
    if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
    return response.json();
  }
  function slimPlayerMap(raw) {
    const out = {};
    for (const [id,p] of Object.entries(raw || {})) {
      if (!p) continue;
      out[String(id)] = {
        player_id: String(p.player_id || id),
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        full_name: p.full_name || [p.first_name,p.last_name].filter(Boolean).join(' '),
        position: p.position || p.fantasy_positions?.[0] || '',
        fantasy_positions: p.fantasy_positions || [],
        team: p.team || '',
        espn_id: p.espn_id || '',
        injury_status: p.injury_status || null,
        depth_chart_order: p.depth_chart_order || null,
        depth_chart_position: p.depth_chart_position || '',
        status: p.status || ''
      };
    }
    return out;
  }
  async function loadPlayers() {
    try {
      const cached = JSON.parse(localStorage.getItem(PLAYER_CACHE) || 'null');
      if (cached?.players && Date.now() - cached.saved < CACHE_MS) return cached.players;
    } catch {}
    let raw;
    try { raw = await json(`${API}/players/nfl?active=true`); }
    catch { raw = await json(`${API}/players/nfl`); }
    const players = slimPlayerMap(raw);
    try { localStorage.setItem(PLAYER_CACHE, JSON.stringify({saved:Date.now(), players})); } catch {}
    return players;
  }
  function normalizeMap(raw) {
    if (!raw) return {};
    if (Array.isArray(raw)) {
      return Object.fromEntries(raw.map(x => [String(x.player_id || x.id || ''), x]).filter(x => x[0]));
    }
    return raw;
  }
  async function getWeek(week) {
    week = Number(week);
    if (!data.weeks[week]) data.weeks[week] = await json(`${API}/league/${LEAGUE_ID}/matchups/${week}`);
    return data.weeks[week];
  }
  async function getProjections(week) {
    week = Number(week);
    if (!data.projections[week]) {
      try { data.projections[week] = normalizeMap(await json(`${API}/projections/nfl/regular/${data.season}/${week}`)); }
      catch { data.projections[week] = {}; }
    }
    return data.projections[week];
  }
  async function getROSProjections() {
    if (Object.keys(data.rosProjections).length) return data.rosProjections;
    try { data.rosProjections=normalizeMap(await json(`${API}/projections/nfl/regular/${data.season}`)); }
    catch { data.rosProjections={}; }
    return data.rosProjections;
  }
  async function getTransactions(week) {
    week=Number(week);
    if(!data.transactions[week]) data.transactions[week]=await json(`${API}/league/${LEAGUE_ID}/transactions/${week}`);
    return data.transactions[week];
  }
  async function init() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      const [league,users,rosters,state,drafts,players] = await Promise.all([
        json(`${API}/league/${LEAGUE_ID}`),
        json(`${API}/league/${LEAGUE_ID}/users`),
        json(`${API}/league/${LEAGUE_ID}/rosters`),
        json(`${API}/state/nfl`),
        json(`${API}/league/${LEAGUE_ID}/drafts`),
        loadPlayers()
      ]);
      data.league = league;
      data.users = users || [];
      data.rosters = rosters || [];
      data.state = state || {};
      data.drafts = drafts || [];
      data.players = players || {};
      data.season = String(league?.season || state?.season || '2026');

      const draftId = league?.draft_id || data.drafts[0]?.draft_id;
      if (draftId) {
        try { data.picks = await json(`${API}/draft/${draftId}/picks`); }
        catch { data.picks = []; }
      }

      const current = currentWeek();
      const calls = [];
      for (let w=1; w<=current; w++) {
        calls.push(getWeek(w).catch(() => []));
        calls.push(getTransactions(w).catch(() => []));
      }
      calls.push(getProjections(current));
      calls.push(
        json(`${API}/stats/nfl/regular/${data.season}`)
          .then(x => { data.stats = normalizeMap(x); })
          .catch(() => { data.stats = {}; })
      );
      await Promise.all(calls);
      return data;
    })();
    return readyPromise;
  }
  function currentWeek() { return Math.max(1, Math.min(18, Number(data.state?.week || 1))); }
  function user(userId) { return data.users.find(x => String(x.user_id) === String(userId)); }
  function roster(rosterId) { return data.rosters.find(x => Number(x.roster_id) === Number(rosterId)); }
  function rosterUser(r) { return user(r?.owner_id); }
  function teamName(r) {
    const u = rosterUser(r);
    return u?.metadata?.team_name || u?.display_name || u?.username || `Roster ${r?.roster_id ?? ''}`.trim();
  }
  function managerName(r) {
    const u = rosterUser(r);
    return u?.display_name || u?.username || teamName(r);
  }
  function player(id) {
    id = String(id);
    if (data.players[id]) return data.players[id];
    if (/^[A-Z]{2,3}$/.test(id)) return {player_id:id, full_name:`${id} D/ST`, position:'DEF', team:id};
    return {player_id:id, full_name:`Player ${id}`, position:'', team:''};
  }
  function fullName(id) {
    const p = player(id);
    return p.full_name || [p.first_name,p.last_name].filter(Boolean).join(' ') || String(id);
  }
  function headshot(id) {
    const p = player(id);
    if (!id || p.position === 'DEF') return '';
    return `https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(String(id))}.jpg`;
  }
  function leaguePoints(row) {
    const x = row?.stats || row || {};
    const settings = data.league?.scoring_settings || {};
    const entries = Object.entries(settings);
    if (entries.length) {
      const score = entries.reduce((sum,[key,weight]) => sum + (Number(x[key] || 0) * Number(weight || 0)), 0);
      if (Number.isFinite(score)) return Math.round(score * 100) / 100;
    }
    return Number(x.pts_half_ppr ?? x.pts_ppr ?? x.pts_std ?? x.fantasy_points ?? 0) || 0;
  }
  function statPoints(row) { return leaguePoints(row); }
  function projectionPoints(row) { return leaguePoints(row); }
  function pickCost(pick) {
    const m = pick?.metadata || {};
    const value = m.amount ?? m.price ?? m.cost ?? m.bid_amount ?? pick?.amount ?? pick?.price;
    return value == null || value === '' ? null : Number(value);
  }
  function pickPlayerId(pick) { return String(pick?.player_id || pick?.metadata?.player_id || ''); }

  window.DIRTY_DS_LIVE = {
    LEAGUE_ID, data, init, ready:null, getWeek, getTransactions, getProjections, getROSProjections, currentWeek,
    user, roster, rosterUser, teamName, managerName, player, fullName, headshot,
    leaguePoints, statPoints, projectionPoints, pickCost, pickPlayerId
  };
  window.DIRTY_DS_LIVE.ready = init();
})();
