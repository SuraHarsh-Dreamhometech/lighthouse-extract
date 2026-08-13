#!/usr/bin/env node
/**
 * Lighthouse data extractor.
 *
 * Runs Lighthouse against any URL (localhost or online) in headless Chrome
 * and saves the complete results to disk:
 *
 *   reports/<host>_<timestamp>/report.json   - the full Lighthouse result (every audit, every detail)
 *   reports/<host>_<timestamp>/report.html   - the visual report, same as Chrome DevTools shows
 *   reports/<host>_<timestamp>/summary.json  - category scores, key metrics, failing audits
 *   reports/history.csv                      - one row per run, accumulates across runs
 *
 * Usage:
 *   node run.js <url> [--desktop] [--out <dir>]
 *
 * Examples:
 *   node run.js https://example.com
 *   node run.js localhost:3000 --desktop
 */
import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log('Usage: node run.js <url> [--desktop] [--out <dir>]');
  process.exit(args.length === 0 ? 1 : 0);
}

const preset = args.includes('--desktop') ? 'desktop' : 'mobile';
const outIdx = args.indexOf('--out');
const outRoot = outIdx !== -1 ? args[outIdx + 1] : path.join(import.meta.dirname, 'reports');
let url = args.find((a) => !a.startsWith('--') && a !== (outIdx !== -1 ? args[outIdx + 1] : null));

// Allow bare hostnames: localhost -> http, everything else -> https
if (!/^https?:\/\//i.test(url)) {
  url = (/^(localhost|127\.|192\.168\.|10\.)/i.test(url) ? 'http://' : 'https://') + url;
}

console.log(`Running Lighthouse (${preset}) on ${url} ...`);

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
let runnerResult;
try {
  runnerResult = await lighthouse(
    url,
    { logLevel: 'error', output: ['json', 'html'], port: chrome.port },
    preset === 'desktop' ? desktopConfig : undefined,
  );
} finally {
  try {
    chrome.kill();
  } catch {
    // On Windows, Chrome may still hold locks on its temp profile dir when we
    // kill it; the leftover folder in %TEMP% is harmless and cleaned by the OS.
  }
}

const lhr = runnerResult.lhr;
if (lhr.runtimeError) {
  console.error(`Lighthouse could not audit the page: ${lhr.runtimeError.message}`);
  process.exit(1);
}

// --- Write full reports -----------------------------------------------------
const host = new URL(lhr.finalDisplayedUrl ?? url).hostname.replace(/[^\w.-]/g, '_');
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const runDir = path.join(outRoot, `${host}_${stamp}`);
fs.mkdirSync(runDir, { recursive: true });

const [jsonReport, htmlReport] = runnerResult.report;
fs.writeFileSync(path.join(runDir, 'report.json'), jsonReport);
fs.writeFileSync(path.join(runDir, 'report.html'), htmlReport);

// --- Extract summary --------------------------------------------------------
const scores = {};
for (const [id, cat] of Object.entries(lhr.categories)) {
  scores[id] = cat.score === null ? null : Math.round(cat.score * 100);
}

const METRIC_AUDITS = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'speed-index',
];
const metrics = {};
for (const id of METRIC_AUDITS) {
  const a = lhr.audits[id];
  if (a) metrics[id] = { value: a.numericValue, display: a.displayValue, score: a.score };
}

const failingAudits = Object.values(lhr.audits)
  .filter((a) => a.score !== null && a.score < 0.9)
  .map((a) => ({ id: a.id, title: a.title, score: a.score, display: a.displayValue ?? '' }))
  .sort((a, b) => a.score - b.score);

const summary = {
  url: lhr.finalDisplayedUrl,
  fetchTime: lhr.fetchTime,
  preset,
  lighthouseVersion: lhr.lighthouseVersion,
  scores,
  metrics,
  failingAudits,
};
fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));

// --- Append to history.csv --------------------------------------------------
const historyPath = path.join(outRoot, 'history.csv');
const header =
  'fetchTime,url,preset,performance,accessibility,best-practices,seo,FCP_ms,LCP_ms,TBT_ms,CLS,SpeedIndex_ms\n';
const num = (id, digits = 0) =>
  metrics[id]?.value !== undefined ? metrics[id].value.toFixed(digits) : '';
const row = [
  lhr.fetchTime,
  `"${lhr.finalDisplayedUrl}"`,
  preset,
  scores.performance ?? '',
  scores.accessibility ?? '',
  scores['best-practices'] ?? '',
  scores.seo ?? '',
  num('first-contentful-paint'),
  num('largest-contentful-paint'),
  num('total-blocking-time'),
  num('cumulative-layout-shift', 3),
  num('speed-index'),
].join(',') + '\n';
if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, header);
fs.appendFileSync(historyPath, row);

// --- Console output ---------------------------------------------------------
console.log('\nScores:');
for (const [id, score] of Object.entries(scores)) {
  console.log(`  ${id.padEnd(16)} ${score ?? 'n/a'}`);
}
console.log('\nKey metrics:');
for (const [id, m] of Object.entries(metrics)) {
  console.log(`  ${id.padEnd(28)} ${m.display}`);
}
console.log(`\nSaved to ${runDir}`);
console.log('  report.json   (complete Lighthouse data)');
console.log('  report.html   (open in a browser to view)');
console.log('  summary.json  (scores + metrics + failing audits)');
console.log(`History: ${historyPath}`);
