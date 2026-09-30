/* Zmanim + Hebrew-calendar engine (Israel, Sephardic custom). No network. Location is a parameter. */
var Engine = (function () {
  // Every zmanim call takes a location {lat, lon, elev}; default Ramla.
  // Israeli cities: latitude, longitude (degrees), elevation (metres, approximate city-centre values).
  var CITIES = [
    { id: "jerusalem", name: "ירושלים", lat: 31.7683, lon: 35.2137, elev: 754 },
    { id: "tel-aviv", name: "תל אביב-יפו", lat: 32.0853, lon: 34.7818, elev: 15 },
    { id: "haifa", name: "חיפה", lat: 32.794, lon: 34.9896, elev: 30 },
    { id: "beer-sheva", name: "באר שבע", lat: 31.2518, lon: 34.7913, elev: 260 },
    { id: "ramla", name: "רמלה", lat: 31.9296, lon: 34.8656, elev: 75 },
    { id: "lod", name: "לוד", lat: 31.951, lon: 34.8881, elev: 60 },
    { id: "rishon", name: "ראשון לציון", lat: 31.973, lon: 34.7925, elev: 40 },
    { id: "petah-tikva", name: "פתח תקווה", lat: 32.084, lon: 34.8878, elev: 40 },
    { id: "ashdod", name: "אשדוד", lat: 31.8014, lon: 34.6435, elev: 20 },
    { id: "ashkelon", name: "אשקלון", lat: 31.6688, lon: 34.5743, elev: 25 },
    { id: "netanya", name: "נתניה", lat: 32.3215, lon: 34.8532, elev: 25 },
    { id: "holon", name: "חולון", lat: 32.0158, lon: 34.7874, elev: 30 },
    { id: "bnei-brak", name: "בני ברק", lat: 32.0807, lon: 34.8338, elev: 30 },
    { id: "bat-yam", name: "בת ים", lat: 32.0132, lon: 34.748, elev: 20 },
    { id: "rehovot", name: "רחובות", lat: 31.8928, lon: 34.8113, elev: 60 },
    { id: "herzliya", name: "הרצליה", lat: 32.1663, lon: 34.8436, elev: 30 },
    { id: "kfar-saba", name: "כפר סבא", lat: 32.175, lon: 34.907, elev: 45 },
    { id: "raanana", name: "רעננה", lat: 32.1848, lon: 34.8713, elev: 50 },
    { id: "modiin", name: "מודיעין", lat: 31.898, lon: 35.0104, elev: 280 },
    { id: "beit-shemesh", name: "בית שמש", lat: 31.747, lon: 34.9881, elev: 300 },
    { id: "elad", name: "אלעד", lat: 32.0522, lon: 34.951, elev: 150 },
    { id: "beitar-illit", name: "ביתר עילית", lat: 31.696, lon: 35.115, elev: 700 },
    { id: "modiin-illit", name: "מודיעין עילית", lat: 31.933, lon: 35.044, elev: 300 },
    { id: "nazareth", name: "נצרת", lat: 32.7021, lon: 35.2978, elev: 350 },
    { id: "nof-hagalil", name: "נוף הגליל", lat: 32.707, lon: 35.323, elev: 450 },
    { id: "tiberias", name: "טבריה", lat: 32.7922, lon: 35.5312, elev: -200 },
    { id: "safed", name: "צפת", lat: 32.9646, lon: 35.496, elev: 850 },
    { id: "karmiel", name: "כרמיאל", lat: 32.919, lon: 35.295, elev: 250 },
    { id: "afula", name: "עפולה", lat: 32.6078, lon: 35.2897, elev: 60 },
    { id: "hadera", name: "חדרה", lat: 32.434, lon: 34.9196, elev: 20 },
    { id: "eilat", name: "אילת", lat: 29.5577, lon: 34.9519, elev: 10 },
    { id: "dimona", name: "דימונה", lat: 31.069, lon: 35.033, elev: 550 },
    { id: "arad", name: "ערד", lat: 31.2589, lon: 35.2128, elev: 600 },
    { id: "kiryat-gat", name: "קריית גת", lat: 31.61, lon: 34.7642, elev: 130 },
    { id: "kiryat-shmona", name: "קריית שמונה", lat: 33.2073, lon: 35.5697, elev: 150 },
    { id: "maale-adumim", name: "מעלה אדומים", lat: 31.777, lon: 35.298, elev: 550 },
    { id: "ariel", name: "אריאל", lat: 32.106, lon: 35.187, elev: 550 },
    { id: "hod-hasharon", name: "הוד השרון", lat: 32.15, lon: 34.888, elev: 40 },
    { id: "rosh-haayin", name: "ראש העין", lat: 32.0956, lon: 34.9566, elev: 70 },
    { id: "yavne", name: "יבנה", lat: 31.878, lon: 34.739, elev: 30 },
    { id: "netivot", name: "נתיבות", lat: 31.423, lon: 34.589, elev: 140 },
    { id: "ofakim", name: "אופקים", lat: 31.314, lon: 34.62, elev: 160 },
    { id: "sderot", name: "שדרות", lat: 31.525, lon: 34.596, elev: 100 }
  ];
  var RAMLA = CITIES.filter(function (c) { return c.id === "ramla"; })[0];
  function city(id) { return CITIES.filter(function (c) { return c.id === id; })[0] || RAMLA; }
  // NOAA solar-position algorithm; each event is recomputed at its own time for accuracy.
  var rad = Math.PI / 180, deg = 180 / Math.PI;
  function sunPos(jd) {
    var T = (jd - 2451545) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360;
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
    var omega = 125.04 - 1934.136 * T;
    var lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * rad);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * Math.cos(omega * rad);
    var dec = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad));
    var y = Math.pow(Math.tan(eps * rad / 2), 2);
    var eqt = 4 * deg * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) -
      0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
    return { dec: dec, eqt: eqt }; // declination (radians), equation of time (minutes)
  }
  // minutes after 00:00 UTC of the day starting at jd0; dir -1 rise, 0 transit, +1 set
  function sunEvent(jd0, loc, depression, dir) {
    var t = 720 - 4 * loc.lon, phi = loc.lat * rad, zen = (90 + depression) * rad;
    for (var i = 0; i < 3; i++) {
      var p = sunPos(jd0 + t / 1440), ha = 0;
      if (dir) {
        var c = Math.cos(zen) / (Math.cos(phi) * Math.cos(p.dec)) - Math.tan(phi) * Math.tan(p.dec);
        ha = Math.acos(Math.max(-1, Math.min(1, c))) * deg;
      }
      t = 720 - 4 * (loc.lon - dir * ha) - p.eqt;
    }
    return t;
  }
  // returns {rise, set, noon} for the civil date of `date`, horizon depression in degrees
  function sunAt(date, depression, loc) {
    var utc0 = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()), jd0 = utc0 / 864e5 + 2440587.5;
    function at(dir) { return new Date(utc0 + sunEvent(jd0, loc, depression, dir) * 6e4); }
    return { rise: at(-1), set: at(1), noon: at(0) };
  }

  // Horizon depression: refraction + solar radius (0.833°) plus the dip of the horizon seen from elevation.
  // Places below sea level are treated as sea level.
  function horizon(elev) { return 0.833 + 0.0347 * Math.sqrt(Math.max(0, +elev || 0)); }

  function zmanim(civil, loc) {
    loc = loc || RAMLA;
    var noonLocal = new Date(civil.getFullYear(), civil.getMonth(), civil.getDate(), 12, 0, 0);
    var s = sunAt(noonLocal, horizon(loc.elev), loc);
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
    // Yom HaAtzmaut (5 Iyar; Fri/Sat -> Thu, Mon -> Tue) and Yom Yerushalayim (28 Iyar): no Tachanun, nothing else changes
    var dow5 = ((dow + 5 - d) % 7 + 7) % 7;
    f.yomHaatzmaut = mi === 8 && d === (dow5 === 5 ? 4 : dow5 === 6 ? 3 : dow5 === 1 ? 6 : 5);
    f.yomYerushalayim = mi === 8 && d === 28;
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
      (mi === 8 && (d === 14 || d === 18)) || f.yomHaatzmaut || f.yomYerushalayim || (mi === 9 && d <= 12) || f.av9 || (mi === 11 && d === 15));
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
  function context(now, loc) {
    now = now || new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12), z = zmanim(today, loc), prayer, day;
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

  return { CITIES: CITIES, RAMLA: RAMLA, city: city, horizon: horizon, zmanim: zmanim, heb: heb, dayFlags: dayFlags, context: context, prayerFlags: prayerFlags, addDays: addDays };
})();
if (typeof module !== "undefined") module.exports = Engine;
