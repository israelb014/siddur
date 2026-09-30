/* Zmanim + Hebrew-calendar engine (Israel, Sephardic custom). No network. */
var Engine = (function () {
  var LAT = 31.9296, LON = 34.8656; // Ramla
  var rad = Math.PI / 180, DAY = 864e5, J1970 = 2440588, J2000 = 2451545, E = rad * 23.4397;
  function toJulian(d) { return d.valueOf() / DAY - 0.5 + J1970; }
  function fromJulian(j) { return new Date((j + 0.5 - J1970) * DAY); }
  function toDays(d) { return toJulian(d) - J2000; }
  function declination(l) { return Math.asin(Math.sin(0) * Math.cos(E) + Math.cos(0) * Math.sin(E) * Math.sin(l)); }
  function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
  function eclipticLongitude(M) {
    var C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    return M + C + rad * 102.9372 + Math.PI;
  }
  var J0 = 0.0009;
  function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * Math.PI)); }
  function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * Math.PI) + n; }
  function solarTransitJ(ds, M, L) { return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L); }
  function hourAngle(h, phi, d) { return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d))); }

  // returns {rise, set, noon} for sun altitude h (degrees)
  function sunAt(date, h) {
    var lw = rad * -LON, phi = rad * LAT, d = toDays(date), n = julianCycle(d, lw), ds = approxTransit(0, lw, n),
      M = solarMeanAnomaly(ds), L = eclipticLongitude(M), dec = declination(L), Jnoon = solarTransitJ(ds, M, L);
    var w = hourAngle(h * rad, phi, dec), a = approxTransit(w, lw, n), Jset = solarTransitJ(a, M, L), Jrise = Jnoon - (Jset - Jnoon);
    return { rise: fromJulian(Jrise), set: fromJulian(Jset), noon: fromJulian(Jnoon) };
  }

  function zmanim(civil) {
    var noonLocal = new Date(civil.getFullYear(), civil.getMonth(), civil.getDate(), 12, 0, 0);
    var s = sunAt(noonLocal, -0.833);
    var rise = s.rise, set = s.set, hour = (set - rise) / 12, zm = hour / 60;
    var mgaStart = new Date(rise - 72 * zm), mgaEnd = new Date(+set + 72 * zm), mgaHour = (mgaEnd - mgaStart) / 12;
    var chatzot = new Date((+rise + +set) / 2);
    return {
      alot: mgaStart,
      sunrise: rise,
      shemaMGA: new Date(+mgaStart + 3 * mgaHour),
      shemaGRA: new Date(+rise + 3 * hour),
      tefila: new Date(+rise + 4 * hour),
      chatzot: chatzot,
      minchaG: new Date(+chatzot + Math.max(hour / 2, 30 * 6e4)),
      plag: new Date(+set - 1.25 * hour),
      sunset: set,
      tzeit: new Date(+set + 13.5 * zm)
    };
  }

  var MON = { "Tishri": 1, "Heshvan": 2, "Kislev": 3, "Tevet": 4, "Shevat": 5, "Adar I": 6, "Adar": 6.5, "Adar II": 6.5, "Nisan": 7, "Iyar": 8, "Sivan": 9, "Tamuz": 10, "Av": 11, "Elul": 12 };
  var FMT = null;
  function heb(civil) {
    if (!FMT) FMT = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric" });
    var p = FMT.formatToParts(new Date(civil.getFullYear(), civil.getMonth(), civil.getDate(), 12)), r = { d: 0, m: "", y: 0 };
    p.forEach(function (x) { if (x.type === "day") r.d = +x.value; if (x.type === "month") r.m = x.value; if (x.type === "year" || x.type === "relatedYear") r.y = +x.value; });
    r.mi = MON[r.m] || 0;
    r.leap = ((7 * r.y + 1) % 19) < 7;
    return r;
  }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); }

  // Flags for one halachic day (civil date = the daytime of that day)
  function dayFlags(civil) {
    var h = heb(civil), d = h.d, mi = h.mi, M = h.m, dow = civil.getDay(), f = { h: h, dow: dow };
    var adar = (M === "Adar" || M === "Adar II");
    f.shabbat = dow === 6;
    f.yt = (mi === 1 && (d === 1 || d === 2 || d === 10 || d === 15 || d === 22)) || (mi === 7 && (d === 15 || d === 21)) || (mi === 9 && d === 6);
    f.yk = mi === 1 && d === 10;
    f.rc = d === 30 || (d === 1 && mi !== 1);
    f.chsukkot = mi === 1 && d >= 16 && d <= 21;
    f.chpesach = mi === 7 && d >= 16 && d <= 20;
    f.ch = f.chsukkot || f.chpesach;
    f.chanukah = false;
    for (var k = 0; k < 8; k++) { var x = heb(addDays(civil, -k)); if (x.m === "Kislev" && x.d === 25) { f.chanukah = true; f.chanukahDay = k + 1; break; } }
    f.purim = adar && d === 14;
    f.shushan = adar && d === 15;
    f.gedalia = mi === 1 && ((d === 3 && dow !== 6) || (d === 4 && dow === 0));
    f.tevet10 = mi === 4 && d === 10;
    f.esther = adar && ((d === 13 && dow !== 6) || (d === 11 && dow === 4));
    f.tamuz17 = mi === 10 && ((d === 17 && dow !== 6) || (d === 18 && dow === 0));
    f.av9 = mi === 11 && ((d === 9 && dow !== 6) || (d === 10 && dow === 0));
    f.fast = f.gedalia || f.tevet10 || f.esther || f.tamuz17 || f.av9;
    f.ayt = mi === 1 && d >= 3 && d <= 9;
    f.geshem = (mi === 1 && d >= 22) || (mi >= 2 && mi <= 6.5) || (mi === 7 && d < 15);
    f.tal = !f.geshem;
    f.winter9 = (mi === 2 && d >= 7) || (mi >= 3 && mi <= 6.5) || (mi === 7 && d < 15);
    f.summer9 = !f.winter9;
    f.nissim = f.chanukah || f.purim;
    f.hallelFull = f.chsukkot || f.chanukah;
    f.hallel = f.hallelFull || f.rc || f.chpesach;
    f.hallelHalf = f.hallel && !f.hallelFull;
    f.musaf = f.rc || f.ch;
    f.musafRC = f.rc && !f.ch;
    f.musafFest = f.ch;
    f.leap = h.leap && mi <= 6.5;
    f.tachanun = !(f.shabbat || f.yt || f.rc || f.ch || f.chanukah || mi === 7 || (mi === 1 && (d <= 2 || d >= 9)) ||
      (mi === 12 && d === 29) || f.purim || f.shushan || (M === "Adar I" && (d === 14 || d === 15)) || (mi === 5 && d === 15) ||
      (mi === 8 && (d === 14 || d === 18)) || (mi === 9 && d <= 12) || f.av9 || (mi === 11 && d === 15));
    f.monthu = dow === 1 || dow === 4;
    f.tefillin = !(f.ch || f.av9 || f.shabbat || f.yt);
    f.omer = 0;
    if (mi === 7 && d >= 16) f.omer = d - 15; else if (mi === 8) f.omer = 15 + d; else if (mi === 9 && d <= 5) f.omer = 44 + d;
    f.weekday = !(f.shabbat || f.yt);
    for (var i = 0; i < 7; i++) f["dow" + i] = dow === i;
    f.song83 = f.gedalia || f.tevet10; f.song85 = mi === 1 && d === 11; f.song30 = f.chanukah; f.song22 = f.esther || f.purim; f.song79 = f.tamuz17;
    f.songSpecial = f.song83 || f.song85 || f.song30 || f.song22 || f.song79;
    return f;
  }

  // Which prayer is due now, and the flags for it
  function context(now) {
    now = now || new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12), z = zmanim(today), prayer, day;
    if (now >= z.sunset) { prayer = "arvit"; day = addDays(today, 1); }
    else if (now < z.alot) { prayer = "arvit"; day = today; }
    else if (now < z.chatzot) { prayer = "shacharit"; day = today; }
    else { prayer = "mincha"; day = today; }
    return { now: now, prayer: prayer, day: day, today: today, z: z };
  }

  // flags tuned for a specific prayer on a halachic day
  function prayerFlags(day, prayer) {
    var f = dayFlags(day), prev = dayFlags(addDays(day, -1)), next = dayFlags(addDays(day, 1)), o = {};
    for (var k in f) o[k] = f[k];
    o.shacharit = prayer === "shacharit"; o.mincha = prayer === "mincha"; o.arvit = prayer === "arvit";
    o.aneinu = (prayer !== "arvit" && f.fast) || (prayer === "arvit" && f.av9);
    if (prayer === "mincha") o.tachanun = f.tachanun && f.dow !== 5 && next.tachanun;
    if (prayer === "arvit") { o.tachanun = false; o.motzash = prev.shabbat || prev.yt; o.hallel = false; o.musaf = false; }
    if (prayer !== "shacharit") { o.hallel = false; o.hallelFull = false; o.hallelHalf = false; o.musaf = false; o.musafRC = false; o.musafFest = false; }
    if (prayer !== "arvit") o.omer = 0;
    o.omerOn = !!o.omer;
    if (o.omer) o["omer" + o.omer] = true;
    o.hr = f.h.mi === 1 && f.h.d === 21;
    o.aytOrHr = o.ayt || o.hr;
    o.nachem = prayer === "mincha" && f.av9;
    o.lamnatzeach = o.tachanun;
    o.friday = f.dow === 5;
    return o;
  }

  return { zmanim: zmanim, heb: heb, dayFlags: dayFlags, context: context, prayerFlags: prayerFlags, addDays: addDays };
})();
if (typeof module !== "undefined") module.exports = Engine;
