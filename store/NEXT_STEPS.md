# מה נשאר לעשות (רק אתה יכול)

1. **יצירת חבילת האנדרואיד:** נכנסים ל־https://www.pwabuilder.com, מזינים את הכתובת `https://israelb014.github.io/siddur/`, בוחרים Android ואז Google Play.
   ממלאים package id `com.ibfix.siddur` ושם `סידור יומי`, ובוחרים ליצור מפתח חתימה חדש. מורידים את קובץ ה־zip. **את מפתח החתימה והסיסמה מגבים בשני מקומות נפרדים.** בלעדיהם אי אפשר לעדכן את האפליקציה.

2. **טביעת האצבע:** מעתיקים את ערך ה־SHA-256 מקובץ `assetlinks.json` שבתוך ה־zip של PWABuilder.
   מדביקים אותו במקום `REPLACE_WITH_SHA256_FROM_PWABUILDER` בקובץ `store/user-site-repo/.well-known/assetlinks.json`.

3. **ריפו לאימות הדומיין:** יוצרים ב־GitHub ריפו חדש בשם `israelb014.github.io` ומעלים אליו את כל התוכן של `store/user-site-repo/`, כולל התיקייה `.well-known` והקובץ `.nojekyll`.
   ב־Settings → Pages בוחרים `main` / root. בודקים שהכתובת `https://israelb014.github.io/.well-known/assetlinks.json` נפתחת.

4. **Play Console:** יוצרים אפליקציה, מעלים את ה־`.aab` ל־Closed testing, ממלאים את דף החנות מ־`store/listing.md` (תמונות: `icon-512.png`, `feature-graphic.png`, `screenshots-9x16/`) ואת כתובת הפרטיות `https://israelb014.github.io/siddur/privacy.html`.
   ממלאים את Data safety ואת דירוג התוכן לפי `listing.md`, ומוסיפים לפחות 12 בודקים.

5. **מעבר לייצור:** אחרי 14 ימים של בדיקה סגורה, ואחרי שרב עבר על האפליקציה, מגישים בקשה לגישה ל־Production.
