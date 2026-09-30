# tools — מחולל index.html

- `siddur-source.json` — ייצוא Sefaria של Siddur Edot HaMizrach, גרסה " Shaliehsaboo Edition", רישיון CC0 (ראה שדה license בקובץ).
- `build.py` — ממפה סגמנטים לתפילות/רמות/תנאים ומייצר את `../index.html`.
- `engine.js` — חישוב זמנים לפי עיר (NOAA + גובה) ולוח עברי + דגלים (תחנון, יעלה ויבוא, צומות...).
- `template.html` — מעטפת ה-UI; `{{PRAYERS}}` ו-`/*{{ENGINE}}*/` מוחלפים בבנייה.

הרצה: `python3 tools/build.py` מתוך שורש הריפו.

## בדיקות (כלי פיתוח בלבד, לא נכללים באפליקציה)
```
cd tools && npm install
node test_zmanim.mjs     # זריחה/שקיעה/חצות מול @hebcal/core, 5 ערים × 12 תאריכים, סטייה ≤ 2 דק׳
node test_calendar.mjs   # דגלי לוח מול @hebcal/core (ישראל), 2026-09-01 עד 2028-12-31
node verify_app.mjs      # Playwright: חלקי תפילה לפי תאריך, שגיאות, גלילה אופקית ב-360px, עבודה בלי רשת
node store_assets.mjs    # מחולל את תמונות החנות ב-../store
```
