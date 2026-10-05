# Upload this update

1. Extract the ZIP. Copy its **contents into the root of your existing `dirtyds-site` repository**, replacing files with the same paths. Do not create an extra nested `dirtyds-update` folder, and do not upload the ZIP itself as the website.
2. Include the root `wrangler.jsonc`, `package.json`, `package-lock.json`, `.github/workflows/check.yml`, and the `dirtyds-github` folder. GitHub Desktop or a local clone is the easiest way to preserve all paths. If using GitHub’s browser uploader, upload folders in separate batches as necessary and ensure the workflow file is included.
3. Commit the uploaded files to your existing deployment branch. Use your existing Cloudflare **Workers** project, with the repository root as its root directory and `npx wrangler deploy` as the deploy command. The checked-in public assets are already built. A build command of `npm run build` can also be used.
4. The new Wrangler configuration creates the `LEAGUE_STORE` Durable Object/SQLite binding and a five-minute cron automatically on Worker deployment. Keep the included migration entry. This update does not require a Sleeper API token, a manually entered database ID, or a change to your domain.
5. After Cloudflare finishes, hard-refresh the site. Check Home, Analyst Rankings, Matchups → List, Standings, Players, Draft Central and an archived season. `/api/snapshots` initially returns empty weeks until the first scheduled capture runs; within roughly five minutes it should show captured weeks.

Only uploading `public/` to a static host will show the redesigned frontend and direct Sleeper fallback, but **will not activate the shared backend cache or scheduled snapshots**. Upload the full package and deploy the root Worker configuration to include all technical changes.

## Included changes

### Technical

- Split the former monolithic page script into shared helpers and page modules; load historical player and season payloads on demand.
- One active stylesheet with shared design tokens; generated assets have content hashes and cache headers, with a reproducible build.
- Restricted backend Sleeper proxy, shared SQLite caching, request deduplication, cache expiration, request timeouts, retries, stale-data fallback, visible freshness status and manual refresh.
- Visibility-aware live updates; transaction fetching stops at the current week rather than fetching all future weeks on every visit.
- Stable manager user-ID mapping, finalized-score handling and independently copied weekly metadata snapshots captured on a schedule.
- Missing projections stay missing rather than silently becoming zero; custom kicker scoring handles coarse distance buckets and marks estimates.
- Efficient legal lineup assignment, position eligibility, bye handling, no duplicate starters and explicit fallback/unfilled-slot disclosure.
- Page navigation uses browser history; selected weeks, archive seasons, matchup mode/presentation, rankings author and filters can be shared in URLs. Live player details can be linked directly.
- Modal focus trapping, Escape handling, background isolation and focus restoration; visible form labels, focus styles and motion preferences.
- Archive checks, behavioral regression tests, Cloudflare runtime/storage tests and a GitHub Actions validation workflow.

### Visual

- Shorter heroes and tighter page spacing; compact homepage with current league information.
- Direct Standings navigation and a clearer Weekly Review label for the season recaps.
- Analyst ranking cards with Strength / 100, projected starter points per week, ROS starter points, replacement value, positional strengths/weaknesses and usable bench coverage. Playoff odds and simulations are removed.
- Matchup scoreboards with actual scores, estimated final totals and players remaining; Field/List controls and readable List defaults on phones.
- Readable field text without the former seven-pixel mobile labels; horizontal field viewing remains available.
- Labeled filters with reset controls, aligned numeric table values, sticky desktop headers and mobile table cards.
- Collapsible scoring, management and auction/value record groups.
- Horizontal mobile player leader carousel, compact team identity cards, consistent dark styling and larger mobile controls.

## Validation and limits

The included checks cover all ten pages in a DOM test environment, desktop/phone interaction defaults, historical reconciliation, custom scoring, retries, legal lineups, filters, modal focus, the Cloudflare Worker runtime, SQLite cache and snapshots. The Cloudflare deployment dry run passes.

The updated site has not been deployed. Full browser screenshot/layout inspection could not be completed in this session because the browser cannot open local previews and automatic approval review rejected an external public preview tunnel. Review the deployed desktop and phone layouts after upload.

Snapshots start at deployment; earlier historical metadata is labeled as incomplete. Future projection availability depends on Sleeper’s undocumented feeds. Projected finals use pregame points adjusted by game time remaining and are labeled approximate; they are not live rest-of-game forecasts.

No playoff model, playoff tab or deferred content feature work is included. Existing Jack’s Week 3 commentary is preserved.
