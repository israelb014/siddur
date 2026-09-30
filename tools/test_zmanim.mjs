// Compares Engine.zmanim (sunrise, sunset, chatzot) with @hebcal/core for 5 cities x 12 dates.
// Dev-only: @hebcal/core is never shipped in the app. Run: cd tools && npm install && node test_zmanim.mjs
process.env.TZ = 'Asia/Jerusalem';
import { createRequire } from 'node:module';
import { GeoLocation, Zmanim } from '@hebcal/core';
const require = createRequire(import.meta.url);
const Engine = require('./engine.js');

const LIMIT_MIN = 2;
const CITY_IDS = ['jerusalem', 'tel-aviv', 'safed', 'beer-sheva', 'eilat'];
const DATES = [];
for (let m = 0; m < 12; m++) DATES.push(new Date(2027, m, 15, 12)); // mid-month through a full year, both DST states

let worst = 0, fails = 0, checks = 0;
for (const id of CITY_IDS) {
  const c = Engine.city(id);
  if (c.id !== id) throw new Error('unknown city ' + id);
  // hebcal rejects negative elevations; the engine treats them as sea level too
  const gloc = new GeoLocation(c.name, c.lat, c.lon, Math.max(0, c.elev), 'Asia/Jerusalem');
  for (const d of DATES) {
    const ours = Engine.zmanim(d, c);
    const ref = new Zmanim(gloc, d, true);
    for (const [k, theirs] of [['sunrise', ref.sunrise()], ['sunset', ref.sunset()], ['chatzot', ref.chatzot()]]) {
      const diff = Math.abs(ours[k] - theirs) / 6e4;
      checks++; worst = Math.max(worst, diff);
      if (diff > LIMIT_MIN) {
        fails++;
        console.log(`FAIL ${id} ${d.toDateString()} ${k}: engine ${ours[k].toTimeString().slice(0, 8)} hebcal ${theirs.toTimeString().slice(0, 8)} (${diff.toFixed(2)} min)`);
      }
    }
  }
}
console.log(`zmanim: ${checks} checks, worst difference ${worst.toFixed(2)} min, ${fails} over ${LIMIT_MIN} min`);
process.exit(fails ? 1 : 0);
