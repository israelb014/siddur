// Generates the Google Play store assets in /store from the real built app. Dev-only.
// Run from tools/: npm install && node store_assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { serve, ROOT } from './serve.mjs';

const OUT = path.join(ROOT, 'store');
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'screenshots-9x16'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'icon-512.png'), path.join(OUT, 'icon-512.png'));

const { server, base } = await serve();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

// feature graphic, exactly 1024x500
{
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.goto(base + 'tools/feature-graphic.html');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, 'feature-graphic.png') });
  await page.close();
}

// log of prayers marked during the week before 2026-11-05, for the tracker shot
const LOG = { '2026-10-30': 'sma', '2026-10-31': 'sma', '2026-11-1': 'sa', '2026-11-2': 'sma', '2026-11-3': 'sm', '2026-11-4': 'sma', '2026-11-5': 'sm' };
const log = {};
for (const [k, v] of Object.entries(LOG)) { const [y, m, d] = k.split('-').map(Number); log[`${y}-${m}-${d}`] = Object.fromEntries([...v].map(c => [c, 1])); }

const SHOTS = [
  { file: '1-shacharit-zmanim', t: '2026-11-02T07:20', ls: { city: 'jerusalem' }, prep: async p => { await p.click('details.z summary'); } },
  { file: '2-levels', t: '2026-11-03T15:10', ls: { level: 2 }, prep: async p => { await p.click('#tabs button[data-p="mincha"]'); } },
  { file: '3-amida-rosh-chodesh', t: '2026-10-12T08:00', ls: {}, prep: async p => { await center(p, '#sh-amida p.t[data-when="rc|ch"]'); } },
  { file: '4-chanukah-changes', t: '2026-12-07T08:00', ls: {}, prep: async p => { await center(p, '#todayList'); } },
  { file: '5-tracker-dark', t: '2026-11-05T19:30', ls: { theme: 'dark', log }, dark: true, prep: async p => { await center(p, '#doneCard'); } },
];
async function center(page, sel) {
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
}

const SIZES = [
  { dir: 'screenshots', viewport: { width: 390, height: 845 }, deviceScaleFactor: 1080 / 390 },     // 1080x2340 as requested
  { dir: 'screenshots-9x16', viewport: { width: 405, height: 720 }, deviceScaleFactor: 1080 / 405 }, // 1080x1920, Play's 2:1 aspect limit
];
for (const size of SIZES) {
  for (const s of SHOTS) {
    const ctx = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: size.deviceScaleFactor, locale: 'he-IL',
      timezoneId: 'Asia/Jerusalem', colorScheme: s.dark ? 'dark' : 'light', serviceWorkers: 'block' });
    await ctx.addInitScript(ls => { for (const [k, v] of Object.entries(ls)) localStorage.setItem('sid_' + k, JSON.stringify(v)); }, s.ls);
    const page = await ctx.newPage();
    await page.goto(base + '?t=' + s.t);
    await page.evaluate(() => document.fonts.ready);
    await s.prep(page);
    await page.waitForTimeout(700); // let card animations finish
    await page.screenshot({ path: path.join(OUT, size.dir, s.file + '.png') });
    await ctx.close();
  }
}
await browser.close(); server.close();
console.log('store assets written to', OUT);
