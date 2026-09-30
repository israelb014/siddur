# סידור יומי

סידור בנוסח עדות המזרח (טקסט: Sefaria, Siddur Edot HaMizrach, Shaliehsaboo Edition)
שמתאים את עצמו לתאריך העברי ולזמני היום ברמלה.

## העלאה ל-GitHub Pages
1. יוצרים repository חדש (למשל siddur) ומעלים את כל הקבצים שבתיקייה הזו לשורש שלו.
2. Settings → Pages → Source: Deploy from a branch → main / (root) → Save.
3. אחרי דקה-שתיים האתר זמין בכתובת https://<user>.github.io/siddur/
4. בטלפון: פותחים את הכתובת ב-Chrome → תפריט → "הוספה למסך הבית".

## עדכון גרסה
כשמחליפים את index.html, משנים את VERSION בקובץ sw.js (למשל siddur-v2) כדי שהטלפון יטען את הגרסה החדשה.

## בדיקת תאריך
אפשר לראות איך הדף ייראה ביום אחר עם ?t=, למשל:
index.html?t=2026-12-10T08:00:00+02:00
