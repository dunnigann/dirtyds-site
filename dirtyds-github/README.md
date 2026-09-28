# Dirty D's League Archive

GitHub-ready static website for Dirty D's, styled to match the current ZYNFL archive.

## Start here

Read **DEPLOY_TO_GITHUB_AND_CLOUDFLARE.md** for GitHub and Cloudflare Pages setup. Upload the **extracted folder contents**, preserving `public/index.html`. In Cloudflare Pages, use no framework preset, build command `exit 0`, and build output directory `public`.

The site does not need a database, API token, build system, or npm installation. All data loads from bundled files.

## Pages

- Home, 2025 Season, Matchups, All Seasons, League History, Players, Teams, and Draft Central.
- The rivalry page is intentionally absent.
- Draft Central displays **auction prices and keeper costs**, never fictional rounds or snake draft positions.
- Players show their real draft or keeper year and dollar price, transaction events from the previous site, plus actual Dirty D's starter production from the workbook.
- The 2026 keeper board is an archived **pre-auction snapshot** from the previous site; it is not a current roster feed.

## Data sources and coverage

1. `source/DirtyDs_Master_History_2018_2025_Website_Ready.xlsx`: 762 matchups, 96 team seasons, 3,757 player-season rows and 1,524 team-week rows. The 2025 workbook ends at Week 16.
2. `source/original-site-data.json`: prior site manager mapping, 1,529 auction/keeper entries, champions, narratives, trades, transaction history, 2026 keeper snapshot, and three additional 2025 Week 17 placement games.
3. `source/original-scoring-data.js`: preserved prior bundled general NFL season scoring feed. The replacement's player points instead use **actual Dirty D's starting-lineup points** from the workbook.

The Matchups page contains 765 known games: 762 from the workbook plus three Week 17 placement games. Other possible Week 17 games and **individual player-week lineups** were not supplied. The H2H matrix includes all 765 known games. The workbook's `Playoff?` flag may include consolation games; the site labels that toggle “Playoff-labeled.” Historical team names are matched to owners using the prior site's alias mapping. `Watch List` in 2019–2020 was mapped to Brent.

The workbook has no waiver or transaction exports, so the original site's records for those categories are preserved. Team-season and game scoring records were recomputed from the expanded workbook. The 2025 Week 17 final of 217.54–118.00 comes from the original site.

## Source layout

- `public/` — the complete deployable website; Cloudflare Pages serves this directory.
- `public/data/site-data.js` — bundled original league data.
- `public/data/history-data.js` — generated historical matchups, standings and players.
- `source/` — the inputs used to produce the bundled data, kept outside Cloudflare's deployed directory.
- `scripts/build_history.py` — rebuilds `public/data/history-data.js` from the included workbook and original site JSON. Requires Python and `openpyxl`.

To refresh with a new workbook, update `source/DirtyDs_Master_History_2018_2025_Website_Ready.xlsx`, adjust the script's input filename if needed, run `python scripts/build_history.py`, and commit the changed `public/data/history-data.js`. When changing the original site data, update **both** `source/original-site-data.json` and `public/data/site-data.js` consistently.

## Local preview

From the extracted folder, run `python -m http.server 8000 --directory public`, then open `http://localhost:8000`. On Windows, `py -m http.server 8000 --directory public` also works.
