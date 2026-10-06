# Dirty D’s playoff lineup fix

1. Extract the ZIP.
2. Open https://github.com/dunnigann/dirtyds-site on main.
3. Choose Add file → Upload files.
4. Drag in the four items inside the extracted folder: dirtyds-github, package.json, package-lock.json and UPLOAD_GUIDE.md.
5. Commit directly to main with “Fix playoff waiver replacements”.
6. Wait for the Cloudflare deployment to show Success.
7. Refresh dirtydfantasy.com with Ctrl+Shift+R and open Playoff Predictor.

This contains changed files only. Preserve the folder structure. No settings, secrets or bindings need changing. The model cache has a new version so an old error/forecast cannot hide the fix. The first refresh may take up to 90 seconds.

## Changes

- Re-optimize every legal slot each week, including FLEX and Superflex, before assuming a pickup.
- Keep the maximum possible number of healthy, positively projected owned starters; pickups fill genuine gaps rather than freely upgrading complete rosters.
- Fill missing slots with the highest projected eligible unrostered players under this league’s scoring. Account for their byes and current injury recovery assumptions.
- Exclude all league-owned players, including reserve/IR and taxi squads, from the free-agent pool. Do not assume taxi promotions.
- Allocate same-week pickups exclusively in current waiver-position order; use worst current record/PF first if priority is missing. Reset the hypothetical streaming pool each week. These are modeling assumptions, not actual transactions or a prediction of FAAB bids.
- If a future projection is missing or zero, use the average of up to three recent positive Sleeper projections, still applying availability and future byes. This is especially useful for K/DEF.
- If no real free agent has a usable forecast for a required slot, use a clearly labeled generic replacement estimate: QB 12, RB 5, WR 6, TE 4, K 6, DEF 5. Such entries do not claim to be named expert-projected players. Empty or zero-point starters no longer stop the model.
- Explain pickup and fallback counts in the existing small bottom methodology dropdown.

The source-data guards for missing finalized scores, real opponent schedules and the expert feed remain. Those are separate from incomplete lineups.

## Validation

Model tests cover bench TE into FLEX, no upgrades to full rosters, legal unique starters, highest eligible pickups, competing claims, bye/injury/IR/taxi exclusion, zero and absent future projections, generic emergency estimates and immutable actual rosters. Cloudflare runtime tests exercise an unpublished future projection endpoint and verify recent projections produce a complete cached forecast. Existing page/navigation and historical ranking tests also run.

The code is tested locally; the production forecast still needs a check after upload.
