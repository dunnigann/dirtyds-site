// Lightweight data and page-render validation without browser dependencies.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    innerHTML: '', textContent: '', hidden: false, value: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    focus() {}, setAttribute() {}, addEventListener() {}, scrollIntoView() {},
  });
  return elements.get(id);
}
const pages = ['home', 'season2025', 'matchups', 'seasons', 'history', 'players', 'teams', 'draft'];
const nav = pages.map(page => ({ ...element(`nav-${page}`), dataset: { page } }));
const context = {
  window: { scrollTo() {} }, URL,
  document: {
    getElementById: element, querySelectorAll(s) { return s === '.nav-link' ? nav : []; },
    addEventListener() {}, body: { style: {} },
  },
  history: { replaceState() {} }, location: { hash: '#home' },
};
vm.createContext(context);
for (const file of ['public/data/site-data.js', 'public/data/history-data.js', 'public/assets/js/app.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const H = context.window.DIRTY_DS_HISTORY;
const D = context.window.DIRTY_DS_DATA;
assert.equal(H.meta.workbookGames, 762);
assert.equal(H.meta.games, 765);
assert.equal(H.matchups['2025']['17'].length, 3);
assert.equal(H.matchups['2025']['17'][0].a.score, 217.54);
assert.equal(D.draftHistory.length, 1529);
assert.equal(H.players.length, 807);
assert.equal(Object.values(H.standings).flat().length, 96);
for (const page of pages) {
  vm.runInContext(`go('${page}')`, context);
  assert.ok(element('app').innerHTML.length > 600, `${page} did not render`);
}
assert.match(element('matchupList').innerHTML, /217\.54/);
assert.match(element('playerResults').innerHTML, /starter pts/);
assert.match(element('draftBoard').innerHTML, /Auction/);
vm.runInContext("showPlayer(H.players.find(p=>p.name==='Christian McCaffrey').key)", context);
assert.match(element('modalContent').innerHTML, /2024/);
assert.match(element('modalContent').innerHTML, /\$73/);
for (const file of ['public/index.html', 'public/404.html', 'public/assets/css/styles.css',
  'public/assets/css/mobile.css', 'public/assets/css/dirtyds.css',
  'public/assets/images/logo/dirtyds-logo.svg']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} missing`);
}
console.log('PASS: 8 pages render, player and auction details load, 765 known games reconcile.');
