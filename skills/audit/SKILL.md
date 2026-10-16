---
name: audit
description: Run a Google Lighthouse audit on any URL — a local dev server (localhost) or a live website — save the complete results, and turn them into a prioritized fix list. Use when the user asks to run Lighthouse, or to check page speed, performance, Core Web Vitals (LCP, CLS, TBT), accessibility, SEO, or best-practices scores, or to compare scores before and after a change.
argument-hint: <url> [--desktop]
---

# Lighthouse audit

Arguments: `$ARGUMENTS`

- The URL can be bare: `localhost:3000` becomes `http://`, `example.com` becomes `https://`.
- `--desktop` audits as a desktop browser. Without it the audit is mobile (the Lighthouse default): a mid-range phone on slow 4G, so scores are lower than desktop.
- If no URL was given, use the current project's running dev server when it is obvious. Otherwise ask for the URL.

## 1. Pre-flight

1. If `${CLAUDE_PLUGIN_ROOT}/node_modules/lighthouse` does not exist, run `npm ci --prefix "${CLAUDE_PLUGIN_ROOT}"` once.
2. For a localhost URL, check that the server answers (`curl -sI <url>`). If it does not, tell the user and offer to start it. Do not audit a dead URL.
3. A dev server (Vite, Next.js, webpack dev mode) serves unminified code. Its performance score is pessimistic and does not reflect production. The accessibility, SEO, and best-practices scores are still valid. Say this in the report when you audit a dev server. For a true performance number, audit a production build (for example `npm run build` and then the project's preview or start command).

## 2. Run

```
node "${CLAUDE_PLUGIN_ROOT}/run.js" <url> [--desktop] --out "${CLAUDE_PROJECT_DIR}/lighthouse-reports"
```

- A run takes 20–60 seconds. It needs Chrome installed locally. If Chrome is not found, set the `CHROME_PATH` environment variable to the Chrome executable.
- The last lines print `Saved to <run dir>`. Use that path below.
- `lighthouse-reports/` gets its own `.gitignore`, so reports never get committed to the user's project.
- `Lighthouse could not audit the page` means the page did not load: wrong URL, server down, or certificate error.

## 3. Read the results

1. Read `<run dir>/summary.json`. It has the category scores (0–100), the 5 key metrics, and every failing audit (score below 0.9), worst first.
2. Do not read `report.json` whole. It is several MB. To see the details of one audit (which files, elements, or URLs cause it), run:

   ```
   node -e "const r=require(process.argv[1]),a=r.audits[process.argv[2]];console.log(JSON.stringify({title:a.title,description:a.description,displayValue:a.displayValue,items:(a.details?.items||[]).slice(0,10)},null,2))" "<run dir>/report.json" <audit-id>
   ```

3. Find the previous row for the same URL and preset in `lighthouse-reports/history.csv`. Use it to show what changed.

## 4. Report to the user

Keep it short and plain:

1. **Scores** — a table of the 4 categories. Add the change since the previous run when one exists.
2. **Key metrics** — LCP, CLS, TBT, FCP, Speed Index with their display values. Rate each from its `score` in summary.json: 0.9 or more is good, 0.5–0.89 needs work, below 0.5 is poor. The score already accounts for mobile or desktop.
3. **Top fixes** — at most 8, highest impact first. Rank performance audits by their potential savings (in the display value). For each: what is wrong, where (file, element, or URL from the audit details), and how to fix it.
4. **Files** — the path to `report.html` (the full visual report; it opens in any browser).

If the audited site is the current project, find the code that causes each top issue and offer to fix it. After fixing, run the audit again with the same URL and preset to confirm the result.

## Notes

- Performance scores vary by about ±5 points between runs (network and CPU noise). Do not call a small change a win or a regression. Run again if the difference matters.
- The tool cannot log in. Audit public pages, or a local build of pages that need a login.
