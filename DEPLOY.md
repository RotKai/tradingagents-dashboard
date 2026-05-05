# Deploying the dashboard

The dashboard is a static site (one HTML, one JS data file, no build
step), so any static host works. Three good free options below, ranked
by how little effort they take. All three give you a public HTTPS URL.

## 1. Netlify Drop · easiest, no account required to start

1. Go to https://app.netlify.com/drop
2. Drag the entire `D:\tradingagents-skill\reports` folder onto the page.
3. Netlify gives you a URL like `https://romantic-snowflake-12345.netlify.app`. Done.

Pros: literally drag and drop, no git, no terminal.
Cons: the random subdomain stays unless you sign up for a free account
and rename the site. You can also point a custom domain at it once
signed in.

## 2. GitHub Pages · best for ongoing updates via git

Prerequisites: a GitHub account.

```bash
cd D:\tradingagents-skill\reports
git init
git add .
git commit -m "TradingAgents dashboard"
gh repo create tradingagents-dashboard --public --source=. --remote=origin --push
# Then in the repo settings, Pages → Source → Deploy from branch → main → / (root)
```

Your site will be live at `https://<username>.github.io/tradingagents-dashboard/`
within a minute or two. Subsequent updates are just `git push` after
you run `update_dashboard.py` for a new day.

The repo already contains a `.nojekyll` file so GitHub Pages serves the
files as is without any Jekyll processing.

## 3. Cloudflare Pages · best speed, custom domain free

1. Push the folder to a GitHub repo (same as option 2 step 1 to 4).
2. In Cloudflare dashboard, Pages → Connect to Git → pick the repo.
3. Build command: leave empty. Build output directory: `/`. Save.

Cloudflare gives you `https://tradingagents-dashboard.pages.dev` and
deploys to its global edge network. You can attach a custom domain
free of charge from the Pages settings.

## View counter

The dashboard ships with a privacy friendly view counter wired to
[abacus.jasoncameron.dev](https://abacus.jasoncameron.dev). It is free,
requires no account, sets no cookies, and stores no PII. The counter
namespace is set near the top of the script tag in `index.html`:

```js
var ANALYTICS_NS = "tradingagents-dashboard";
```

**Important:** when you deploy publicly, change this to a unique slug
like `your-name-tradingagents` so your counters do not collide with
anyone else who has copied the dashboard. The namespace must be at
least 4 characters; longer is better for uniqueness.

What is tracked, all in raw counts only:

* `total` — every page load
* `date-YYYY-MM-DD` — when a user opens a specific date
* `ticker-CRCL`, `ticker-ORCL`, `ticker-PLTR` — when a user clicks a ticker tab

You can read the current counts at any time from the abacus JSON API:

```
https://abacus.jasoncameron.dev/get/<your-namespace>/total
https://abacus.jasoncameron.dev/get/<your-namespace>/ticker-CRCL
```

Returns `{"value": N}`.

## Optional: richer analytics

If you want session level data (referrer, country, time on page) on top
of the simple counter, add one of these snippets to `<head>` in
`index.html`. Pick at most one.

### Plausible (privacy friendly, paid but cheap)

```html
<script defer data-domain="your-domain.example" src="https://plausible.io/js/script.js"></script>
```

### Google Analytics 4 (free)

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Cloudflare Web Analytics (free, only if you host on Cloudflare Pages)

Enable in the Cloudflare Pages dashboard, no code change needed.

## Domain customisation

Whichever host you pick, you can attach a custom domain (e.g.
`reports.your-name.com`) from the host's dashboard. DNS propagation
usually takes a few minutes.

## Updating the deployed site

1. On your local machine, run a new TradingAgents day and copy the
   markdown reports into `reports/<new-date>/`.
2. Run `python update_dashboard.py <new-date>` to refresh `data.js`.
3. **Netlify Drop**: drag the folder again, or use the Netlify CLI
   (`netlify deploy --dir=. --prod`).
   **GitHub Pages / Cloudflare Pages**: `git add data.js <new-date>/ && git commit -m "Add YYYY-MM-DD" && git push`. The site rebuilds automatically.

That's the whole loop.
