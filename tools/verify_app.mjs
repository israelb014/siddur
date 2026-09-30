// End-to-end check of the built index.html in Chromium: date-dependent parts, console errors,
// no horizontal scroll at 360px, no third-party requests, offline reload. Dev-only.
// Run from tools/: npm install && node verify_app.mjs
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const { server, base } = await serve();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const CTX = { locale: 'he-IL', timezoneId: 'Asia/Jerusalem' };
let fails = 0;
const errors = [], hosts = new Set();
function ok(cond, msg) { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; }
function watch(page) {
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => hosts.add(new URL(r.url()).host));
}
// any element matching sel is rendered (checkVisibility respects hidden ancestors)
const vis = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].some(e => e.checkVisibility()), sel);
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const CASES = [
  { t: '2026-10-11T08:00', title: 'Rosh Chodesh: half Hallel, Musaf RC', prayer: 'shacharit',
    show: ['#sh-hallel', '#sh-musaf', '#p-shacharit [data-when="rc|ch"]', '#sh-musaf [data-when^="musafRC"]'],
    hide: ['#sh-hallel [data-when="hallelFull"]', '#sh-musaf [data-when^="musafFest"]'], note: /ראש חודש/ },
  { t: '2026-12-07T08:00', title: 'Chanukah: full Hallel, Al HaNissim, no Tachanun', prayer: 'shacharit', level: 3,
    show: ['#sh-hallel', '#sh-hallel [data-when="hallelFull"]', '#p-shacharit .alt[data-when="chanukah"]'],
    hide: ['#sh-tachanun', '#sh-musaf'], note: /לא אומרים תחנון/ },
  { t: '2026-12-20T08:00', title: 'Fast of 10 Tevet: Aneinu', prayer: 'shacharit',
    show: ['#p-shacharit .alt[data-when="aneinu"]'], hide: ['#sh-hallel'], note: /יום צום/ },
  { t: '2027-04-25T21:00', title: 'Arvit, Omer day 4', prayer: 'arvit',
    show: ['#ar-omer', '#ar-omer [data-when="omer4"]'], hide: ['#ar-omer [data-when="omer3"]', '#ar-omer [data-when="omer5"]'], note: /היום 4 לעומר/ },
  { t: '2027-08-12T16:00', title: "Mincha of Tish'a B'Av: Nachem + Aneinu", prayer: 'mincha',
    show: ['#p-mincha .alt[data-when="nachem"]', '#p-mincha .alt[data-when="aneinu"]'], hide: ['#p-mincha .alt[data-when="!nachem"]'], note: /נחם/ },
  { t: '2027-10-05T08:00', title: 'Aseret Yemei Teshuva inserts', prayer: 'shacharit',
    show: ['#p-shacharit .alt[data-when="ayt"]'], hide: ['#p-shacharit .alt[data-when="!ayt"]'], note: /עשרת ימי תשובה/ },
];

const ctx = await browser.newContext({ ...CTX, viewport: { width: 360, height: 780 } });
for (const c of CASES) {
  const page = await ctx.newPage(); watch(page);
  await page.goto(base + '?t=' + c.t);
  if (c.level) await page.click(`#levels button[data-l="${c.level}"]`);
  console.log(`\n${c.t}  ${c.title}`);
  const pressed = await page.getAttribute('#tabs button[aria-pressed="true"]', 'data-p');
  ok(pressed === c.prayer, `current prayer is ${c.prayer} (got ${pressed})`);
  for (const s of c.show) ok(await vis(page, s), `visible: ${s}`);
  for (const s of c.hide) ok(!(await vis(page, s)), `hidden:  ${s}`);
  ok(c.note.test(await page.textContent('#todayList')), `"מה משתנה" card mentions ${c.note}`);
  ok(await noHScroll(page), 'no horizontal scroll at 360px');
  await page.close();
}

// sheets and privacy page at 360px
{
  const page = await ctx.newPage(); watch(page);
  await page.goto(base + '?t=2026-10-12T08:00');
  console.log('\nUI at 360px');
  await page.click('#openSet'); ok(await noHScroll(page), 'settings sheet: no horizontal scroll');
  await page.click('#cityRow'); await page.fill('#citySearch', 'באר');
  ok((await page.$$eval('#cityList button', b => b.length)) === 1, 'city search filters the list');
  await page.click('#cityList button');
  ok((await page.textContent('#zTitle')) === 'זמני היום בבאר שבע', 'zmanim card title follows the chosen city');
  await page.reload();
  ok((await page.textContent('#zTitle')) === 'זמני היום בבאר שבע', 'city choice survives reload (localStorage)');
  await page.click('#openSet'); await page.click('#aboutRow');
  ok(await vis(page, '#aboutSheet a[href="privacy.html"]'), 'About sheet links to privacy.html');
  ok(/בכל ספק הלכתי יש לשאול רב/.test(await page.textContent('#aboutSheet')), 'About sheet shows the disclaimer');
  ok(await noHScroll(page), 'about sheet: no horizontal scroll');
  await page.goto(base + 'privacy.html');
  ok(await noHScroll(page), 'privacy.html: no horizontal scroll');
  await page.close();
}

// offline reload after the first visit
{
  const octx = await browser.newContext({ ...CTX, viewport: { width: 390, height: 844 } });
  const page = await octx.newPage(); watch(page);
  console.log('\nOffline');
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => (await (await caches.open('siddur-v2')).keys()).length >= 14, null, { timeout: 20000 });
  await page.reload(); // now controlled by the service worker
  await octx.setOffline(true);
  await page.reload();
  ok(await vis(page, '#p-shacharit, #p-mincha, #p-arvit'), 'offline reload renders the prayer');
  await page.evaluate(() => document.fonts.ready);
  ok(await page.evaluate(() => document.fonts.check('700 20px "Frank Ruhl Libre"', 'שלום') && [...document.fonts].some(f => f.family.includes('Frank') && f.status === 'loaded')), 'offline: bundled fonts load from cache');
  await page.goto(base + '?t=2026-12-07T08:00');
  ok(await vis(page, '#sh-hallel'), 'offline: page with ?t= query loads from cache');
  await page.goto(base + 'privacy.html');
  ok(/מדיניות פרטיות/.test(await page.textContent('h1')), 'offline: privacy.html loads from cache');
  await octx.close();
}

console.log('\nConsole errors:', errors.length ? errors : 'none');
ok(errors.length === 0, 'no console errors');
const foreign = [...hosts].filter(h => !/^localhost(:\d+)?$/.test(h));
ok(foreign.length === 0, 'no request to any host but the app\'s own' + (foreign.length ? ': ' + foreign.join(', ') : ''));
await browser.close(); server.close();
console.log(fails ? `\n${fails} checks failed` : '\nall app checks passed');
process.exit(fails ? 1 : 0);
