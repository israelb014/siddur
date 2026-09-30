# tools — מחולל index.html

- `siddur-source.json` — ייצוא Sefaria של Siddur Edot HaMizrach, גרסה " Shaliehsaboo Edition", רישיון CC0 (ראה שדה license בקובץ).
- `build.py` — ממפה סגמנטים לתפילות/רמות/תנאים ומייצר את `../index.html`.
- `engine.js` — חישוב זמנים (רמלה) ולוח עברי + דגלים (תחנון, יעלה ויבוא, צומות...).
- `template.html` — מעטפת ה-UI; `{{PRAYERS}}` ו-`/*{{ENGINE}}*/` מוחלפים בבנייה.

הרצה: `python3 tools/build.py` מתוך שורש הריפו.
