# Dirty D’s season fixes and playoff predictor

1. Extract the ZIP.
2. Open https://github.com/dunnigann/dirtyds-site on the main branch (the repository’s top page).
3. Choose Add file → Upload files.
4. Drag all four items INSIDE the extracted folder: dirtyds-github, package.json, package-lock.json, and UPLOAD_GUIDE.md.
5. Wait for every file, then commit directly to main with “Season fixes and playoff predictor”.
6. Check Cloudflare → Workers & Pages → dirtyds-site → Deployments for Success.
7. Open dirtydfantasy.com and press Ctrl+Shift+R.

This is an update package. It contains changed and new files only; existing files stay in place. Preserve the nested dirtyds-github folder. Do not upload the outer ZIP folder as another directory. No existing folders need to be deleted. No changes to wrangler.jsonc, secrets or Cloudflare bindings are required.

The first Playoff Predictor load collects the real remaining schedule and expert forecasts and may take up to 90 seconds. The scheduled Worker warms the model every five minutes. A missing expert projection or matchup produces an explanatory error instead of invented odds. If it fails, send the exact error and the Cloudflare deployment log.

## Completed changes

- Weekly Review table cannot overlap the matchup review beneath it; recap headings wrap safely.
- Removed the Field/List setting, list presentation and projected-final summary box. The field and original matchup selector remain.
- Removed the separate Standings navigation tab.
- Filled all 96 historical manager-season final places from the championship, third-place, fifth-place and consolation placement games.
- Added Playoff Predictor under 2026 Season, ranked by playoff probability, with a quiet bottom methods dropdown.
- 20,000 deterministic Monte Carlo trials use the real fantasy schedule, finalized W–L–T / PF / PA, actual league scoring, weekly legal optimal lineups, confirmed NFL byes, bench replacement, variance, and Sleeper seeding rules. Division-winner and median-game formats are supported if enabled by league settings.
- CBS Sports ROS counting-stat forecasts drive QB/RB/WR/TE expectations. Sleeper weekly forecasts fill unmatched players, kickers and defenses. Expert data refreshes every six hours; simulations every five minutes. Required missing data prevents publishing false precision.
- Week 4 remains unfinished in the model until Sleeper finalizes it. The predictor does not condition on in-progress scores.
- Analyst and Jack rankings share the same one-team-per-row layout, record, notes and movement position. Analyst metrics and methodology are hidden in the bottom dropdown.
- Published ranking controls show Weeks 1, 2 and 3 only. Analyst editions are reconstructed from each week’s recorded rosters and projection feeds through that week, then stored consistently for all visitors. Week 4 is not published automatically.
- Jack Weeks 1–2 remain unsubmitted and contain no rankings; the original Week 3 order and writeups remain intact. Jack movement arrows await a prior submitted edition.

## Important model limits

The earliest historical roster lists are available, but original ROS forecasts and injury metadata were not archived. The retroactive Analyst editions are labeled reconstructions; they do not claim to reproduce original forecasts. Current NFL metadata can affect historical team labels when no original snapshot exists.

The playoff model assumes fixed current rosters and optimal projected starters, rather than perfect knowledge of eventual scores. Injuries use expert projected games played to approximate earliest missed games; future injury surprises and transactions are not forecast. CBS lacks some scoring bonus and special-stat fields, listed in the dropdown. The positional variability and correlation parameters are transparent assumptions, not a calibrated forecast guarantee.

## Validation

Browser DOM checks cover desktop and phone modes, all navigation pages, ranking controls, removed controls, modal behavior and the predictor view. Independent model checks cover bye replacement, legal unique starters, records, ties, median games, division winners, symmetric odds, deterministic sampling, missing-data refusal, historical roster changes and all 96 historical finishes. Cloudflare runtime checks cover expert parsing, simulation endpoints, shared cache, frozen ranking editions and stale-feed handling. Wrangler deployment bundling passed.

The Cloudflare-to-CBS production fetch and the final live visual layout still need confirmation after upload. No live deployment was made here.

## Future ranking updates

New editions require an intentional code update; there is no Week 4 ranking in this package. Keep the frozen Weeks 1–3 archived. Add Jack’s missing weeks only when he supplies those rankings.

After rebuilding archive data from the source workbook, first apply the Week 17 correction, then run: python dirtyds-github/scripts/repair_finishes.py.
