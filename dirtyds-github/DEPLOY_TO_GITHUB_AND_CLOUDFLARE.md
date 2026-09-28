# Publish Dirty D's with GitHub and Cloudflare Pages

## 1. Make the repository

1. Download and extract the ZIP. You should see `public/`, `source/`, `scripts/`, this guide, and `README.md` inside the extracted folder. The actual home page is `public/index.html`.
2. In GitHub, open [New repository](https://github.com/new). Use owner `dunnigann`, name `dirtyds-site`, and choose public or private visibility. This is a **separate** repository from `zynfl-site`. Leave **Add a README**, `.gitignore`, and license unchecked because this package already contains its own README. Select **Create repository**.
3. In the new empty repository, select **uploading an existing file** (or **Add file → Upload files**). Drag the **uncompressed `public` folder**, plus `source`, `scripts`, `README.md`, and this guide, from the extracted folder. Do **not** drag the ZIP itself.
4. Check the upload list: it must include **`public/index.html`**, **`public/assets/css/styles.css`**, **`public/assets/js/app.js`**, **`public/data/site-data.js`**, and **`public/data/history-data.js`**. Then commit the upload to `main`.

GitHub documents [new repository creation](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository) and [dragging files or folders into the uploader](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository). The large historical JS file is under the browser uploader's 25 MiB per-file limit.

If dragging a folder does not preserve its paths in your browser, use GitHub Desktop or Git from the extracted folder instead:

```powershell
git init
git add .
git commit -m "Launch Dirty D's league archive"
git branch -M main
git remote add origin https://github.com/dunnigann/dirtyds-site.git
git push -u origin main
```

Run those commands inside the extracted `dirtyds-github` folder **after** making the empty GitHub repository. GitHub may ask you to sign in during the push.

## 2. Connect Cloudflare Pages

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** (sometimes shown as **Import an existing Git repository**).
2. Connect GitHub if prompted and allow Cloudflare access to `dunnigann/dirtyds-site`. Select that repository, then **Begin setup**.
3. Set the project name to `dirtyds-site` (or any available name). Set **Production branch** to `main`.
4. In **Build settings**, choose **Framework preset: None**, **Build command: `exit 0`**, **Build output directory: `public`**. Leave the root directory at the repository root. No environment variables are needed.
5. Select **Save and Deploy**. Open the resulting `*.pages.dev` address and check Home, Matchups, Players, and Draft Central.

Cloudflare's [Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/) explains automatic redeploys when `main` receives a commit. Its [static HTML guide](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) recommends `exit 0` when no build is needed and confirms that the output directory should point to the folder containing `index.html`.

## 3. Use your own domain, if you have one

After the `pages.dev` site works, in the new Pages project select **Custom domains → Set up a domain** and enter the domain or subdomain. Follow Cloudflare's DNS steps. If the domain is already on another host, move its DNS only after confirming the new site works. Cloudflare's [custom-domain instructions](https://developers.cloudflare.com/pages/configuration/custom-domains/) cover apex domains and subdomains.

## Future updates

Edit the corresponding file in this repository and commit to `main`; Cloudflare Pages redeploys automatically. To add 2026 game data, update the source inputs and historical bundle first. The included 2026 keeper board is a dated snapshot, not a live season feed.
