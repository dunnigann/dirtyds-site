# Upload and deployment

Use the repository-root **UPLOAD_GUIDE.md**. This version uses the existing Cloudflare **Worker** configuration plus static assets, a Durable Object, and a scheduled capture job. The former static Pages-only instructions are superseded.

Upload the extracted package into the existing `dunnigann/dirtyds-site` repository, preserving its root structure. The root `wrangler.jsonc` is required for the backend cache and snapshots. `dirtyds-github/public/index.html` is the website entry point.

The package contains prebuilt assets. For future source edits, build with `npm run build` from the repository root and commit the generated changes.
