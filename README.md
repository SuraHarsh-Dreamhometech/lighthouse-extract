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
