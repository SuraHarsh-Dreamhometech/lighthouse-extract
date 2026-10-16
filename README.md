# Lighthouse data extractor

Runs Lighthouse on any URL — a localhost app or an online website — in headless Chrome
and saves the complete results to your PC.

## Setup

Requires [Node.js](https://nodejs.org/) 20.11+ and a local Chrome installation.

```
npm install
```

## Usage

```
node run.js <url> [--desktop] [--out <dir>]
```

Examples:

```
node run.js https://example.com          # mobile audit (Lighthouse default)
node run.js localhost:3000 --desktop     # desktop audit of a local dev server
```

For localhost URLs, your dev server must already be running.

## What you get per run

```
reports/<host>_<timestamp>/
  report.json    complete Lighthouse result — every audit, metric, and detail
  report.html    the visual report, identical to what Chrome DevTools shows
  summary.json   category scores, key metrics, and all failing audits
reports/history.csv    one row per run — scores + metrics, accumulates over time
```

`report.json` is the full Lighthouse LHR object, so nothing is lost: all ~150 audits,
timings, network requests, opportunities, diagnostics, and stack packs are in there.

The output folder gets its own `.gitignore`, so reports are never committed by accident.

## Use it in Claude Code

This repo is also a Claude Code plugin. It adds the `/lighthouse:audit` skill: Claude runs
the audit, reads the results, and gives you a short, prioritized fix list. When the audited
site is your current project, it finds the code behind each issue and offers to fix it.

Install it once:

```
/plugin marketplace add SuraHarsh-Dreamhometech/lighthouse-extract
/plugin install lighthouse@lighthouse-extract
```

Then, in any project:

```
/lighthouse:audit localhost:3000
/lighthouse:audit https://example.com --desktop
```

Or just ask: "run Lighthouse on my dev server". Reports are saved in the project's
`lighthouse-reports/` folder, so each project keeps its own score history.
