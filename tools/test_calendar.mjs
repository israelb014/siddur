// Checks Engine.dayFlags against @hebcal/core (Israel mode) for every day 2026-09-01 .. 2028-12-31.
// Dev-only: @hebcal/core is never shipped in the app. Run: cd tools && npm install && node test_calendar.mjs
process.env.TZ = 'Asia/Jerusalem';
import { createRequire } from 'node:module';
import { HebrewCalendar, HDate, flags as FL, months } from '@hebcal/core';
const require = createRequire(import.meta.url);
const Engine = require('./engine.js');

const START = new Date(2026, 8, 1, 12), END = new Date(2028, 11, 31, 12);
const events = HebrewCalendar.calendar({ start: START, end: END, il: true, omer: true, locale: 'en' });
const byDay = new Map();
for (const ev of events) {
  const k = ev.getDate().abs();
  if (!byDay.has(k)) byDay.set(k, []);
  byDay.get(k).push(ev);
}

const FASTS = {
  gedalia: "Tzom Gedaliah", tevet10: "Asara B'Tevet", esther: "Ta'anit Esther", tamuz17: "Tzom Tammuz", av9: "Tish'a B'Av",
};
// geshem: from Shemini Atzeret (22 Tishrei) through 14 Nisan; barech aleinu (winter9): 7 Cheshvan through 14 Nisan.
// hebcal months: NISAN=1 .. ELUL=6, TISHREI=7, CHESHVAN=8 .. ADAR_II=13
function inWinter(hd, startMonth, startDay) {
  const m = hd.getMonth(), d = hd.getDate();
  if (m === months.NISAN) return d < 15;
  if (m >= months.TISHREI) return m > startMonth || (m === startMonth && d >= startDay);
  return false;
}

let days = 0, fails = 0;
const counts = {};
function check(date, name, got, want) {
  counts[name] = (counts[name] || 0) + (want ? 1 : 0);
  if (!!got !== !!want && !(typeof want === 'number' && got === want)) {
    fails++;
    if (fails <= 60) console.log(`FAIL ${date.toDateString()} (${new HDate(date).toString()}): ${name} engine=${got} hebcal=${want}`);
  }
}

for (let d = new Date(START); d <= END; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)) {
  days++;
  const hd = new HDate(d), evs = byDay.get(hd.abs()) || [], f = Engine.dayFlags(d);
  const has = pred => evs.some(pred);
  const desc = s => has(e => e.getDesc() === s);
  const flag = x => has(e => e.getFlags() & x);

  check(d, 'Rosh Chodesh', f.rc, flag(FL.ROSH_CHODESH));
  check(d, 'Chol HaMoed', f.ch, flag(FL.CHOL_HAMOED));
  const k25 = new HDate(25, months.KISLEV, hd.getFullYear()).abs(); // Kislev and Tevet share a Hebrew year
  const chanukahDay = hd.abs() - k25 + 1;
  check(d, 'Chanukah', f.chanukah, chanukahDay >= 1 && chanukahDay <= 8);
  if (f.chanukah && f.chanukahDay !== chanukahDay) { fails++; console.log(`FAIL ${d.toDateString()}: chanukahDay ${f.chanukahDay} != ${chanukahDay}`); }
  check(d, 'Purim', f.purim, desc('Purim'));
  for (const k in FASTS) check(d, FASTS[k], f[k], desc(FASTS[k]) || (k === 'av9' && desc("Tish'a B'Av (observed)")));
  check(d, 'any fast', f.fast, Object.values(FASTS).some(desc) || desc("Tish'a B'Av (observed)"));
  const omerEv = evs.find(e => e.getFlags() & FL.OMER_COUNT);
  const wantOmer = omerEv ? omerEv.omer : 0;
  if (f.omer !== wantOmer) { fails++; console.log(`FAIL ${d.toDateString()}: omer engine=${f.omer} hebcal=${wantOmer}`); }
  if (wantOmer) counts.omer = (counts.omer || 0) + 1;
  check(d, 'Yom Tov (Israel)', f.yt, flag(FL.CHAG));
  check(d, 'geshem', f.geshem, inWinter(hd, months.TISHREI, 22));
  check(d, 'tal', f.tal, !inWinter(hd, months.TISHREI, 22));
  check(d, 'barech aleinu (tal umatar)', f.winter9, inWinter(hd, months.CHESHVAN, 7));
  check(d, "Yom HaAtzma'ut", f.yomHaatzmaut, desc("Yom HaAtzma'ut"));
  check(d, 'Yom Yerushalayim', f.yomYerushalayim, desc('Yom Yerushalayim'));
  if ((f.yomHaatzmaut || f.yomYerushalayim) && f.tachanun) { fails++; console.log(`FAIL ${d.toDateString()}: tachanun on a no-Tachanun day`); }
  if ((f.yomHaatzmaut || f.yomYerushalayim) && (f.hallel || f.musaf)) { fails++; console.log(`FAIL ${d.toDateString()}: Yom HaAtzmaut/Yerushalayim must not add Hallel/Musaf`); }
}

console.log(`calendar: ${days} days checked; days found per check:`, JSON.stringify(counts));
console.log(fails ? `calendar: ${fails} failures` : 'calendar: all checks passed');
process.exit(fails ? 1 : 0);
