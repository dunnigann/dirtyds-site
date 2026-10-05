# Dirty D’s league website

The 2018–2025 Yahoo archive and live 2026 Sleeper league, served by Cloudflare Workers with static assets. See the repository-root `UPLOAD_GUIDE.md` for this update.

## Development

Run commands at the repository root, one directory above this file:

```sh
npm ci
npm run build
npm test
npm run dev
```

Node 24 is used in CI. `npm run deploy` builds and deploys the Worker using the root `wrangler.jsonc`. The upload contains already-built assets, so the existing `npx wrangler deploy` deployment command also works. No Sleeper credentials or database IDs need to be entered.

## Code and data

- `public/assets/js/`: shared helpers, scoring adapter, live data bridge, archive loader, and separate page modules.
- `public/assets/css/site.css`: the single active stylesheet; shared design tokens are declared once at its beginning.
- `source/index.template.html`: edit this HTML, then build. `public/index.html` is generated with fingerprinted asset references.
- `scripts/build_assets.cjs`: splits archives by use and season, builds the asset map, and fingerprints JavaScript/CSS for safe caching. Original data bundles remain available for rebuilding and validation, but are not loaded on the homepage.
- `worker.js`: a restricted Sleeper proxy, shared SQLite cache, and Durable Object weekly snapshots. The five-minute cron captures metadata even when nobody visits the site.
- `public/data/`: source bundles, generated archive chunks, and the dated 2026 keeper snapshot. Historical inputs live in `source/`.
- `scripts/validate_site.cjs`: archive reconciliation checks.
- `scripts/check_update.cjs`: existing archive, identity, keeper, transaction and profile checks.
- `scripts/check_regressions.cjs` and `check_worker.cjs`: scoring, retries, stale fallback, legal lineups, navigation, lazy data loading, accessibility interactions and Cloudflare runtime/storage checks.

Historical source reconciliation retains 766 known matchups, 96 team seasons, 807 historical player profiles and 33 confirmed 2026 keepers totaling $726. Rebuild workflows for workbook updates are retained in `scripts/`; run the relevant historical builder, then `npm run build` and `npm test` before uploading.

## Live data behavior

The Worker cache is shared by all visitors. Browsers also retain slim cached responses and deduplicate requests. If the Worker is unavailable, the bridge can read Sleeper directly. Requests time out, retry, and retain older data with a visible warning. Failed initialization can be retried without reloading the entire site.

Active matchups and rosters refresh while the page is visible, at 45-second intervals; projections are cached for 15 minutes, stats for five minutes, and the player catalog for one day. Historical and draft feeds use longer caches. Automatic rendering pauses while a modal is open or a form control is focused. The Refresh button requests current data, subject to the upstream cache.

The current league ID is configured in `sleeper-live.js` and `worker.js`. Stable Sleeper user IDs are mapped in `core.js`; handle aliases remain fallbacks. Update these together if the league changes seasons or owners.

Snapshots retain finalized player metadata while allowing corrected weekly scores. They cannot recreate names, NFL teams or reserve tags from before capture began. Earlier weeks disclose that limitation and do not treat current IR assignments as known historical assignments. The scheduled capture becomes active only after Worker deployment.

## Analyst rankings

The score is 55% normalized projected starter points per remaining regular-season week, 25% normalized value above available replacements, 15% usable QB/RB/WR/TE bench coverage, and 5% positional balance. Records and schedule luck do not enter the score. The score is a relative strength index, not a probability.

Projected lineups maximize points under league slot eligibility, use each player once, and prefer filling legal slots even with negative projected points. Confirmed bye weeks and current unavailable players are excluded. Missing weekly projections can use recorded season points per game; fallback and unfilled-slot counts are displayed. Future projections do not constitute injury recovery predictions. Replacement value, positional comparisons and bench coverage describe the current week; the main points component covers the remaining regular season.

The code reads future weekly projections rather than subtracting season-to-date points from preseason totals. Projection/stat endpoints are undocumented Sleeper feeds; changes or missing responses are handled explicitly. Coarse 50+ yard kicker projections are split using recorded distances when available and labeled estimates. Weekly rank movement appears only after a previous-week ranking has been saved in that browser.

No playoff probability calculation, simulation, new playoff tab or deferred editorial/content features are included.
