## Sea-Game-App – חוף הצוק: ציד האייפון 16

משחק פעולה מהיר המביא את הילדים (והמבוגרים) לסיור פרוע בחוף הצוק בישראל. עליך למצוא iPhone 16 אבוד, להתחמק מאנשי חליפות עם משקפי שמש, לסרוק את החול, לצלול לים הסוער ולהעביר את המכשיר ליחידת המשטרה – הכול בתוך 15 דקות שמייצגות 15 ימים. המשחק כתוב ב-React + TypeScript + Vite עם מנוע ציור ייעודי ו-HUD דינמי.

### מה יש במשחק?
- מצב POV עם חיצים (או WASD) לניווט, מכות מרחיקות (Space), סורק חול (F), צלילה במים (V), ופינגים של גלאי (G).
- יום/לילה מואנימציה, התקדמות ימים, טיימר יורד וזרם אינסופי של אנשי חליפות בים וביבשה שמפריעים.
- אפשרות לסיים את המשימה כבר בתוך 4 ימים (4 דקות) – חלון “זהב” עם איתותים חזקים במיוחד.
- מערכת יומן מודיעין, מדדי סטמינה/פוקוס/איום, מפה מצוירת בזמן אמת, ושימור שיאי “Fast Finder”.
- תמיכה ב-D1 של Cloudflare לשמירת שיאים, כולל fallback ל-localStorage כאשר ה-API אינו זמין.

---

## פקודות פיתוח

```bash
npm install        # התקנת תלויות
npm run dev        # הרצת שרת פיתוח עם HMR
npm run build      # קומפילציה מלאה + בדיקות טיפוסים
npm run preview    # תצוגה של גרסת ה-build מקומית
```

הקוד נבנה ל-`dist/` ומוכן לפריסה אוטומטית ב-Cloudflare Pages.

---

## הגדרת Cloudflare D1 בשם sea-game-app

1. ודא שהתחברת ל-Cloudflare CLI:
   ```bash
   npx wrangler login
   ```

2. צור את מסד הנתונים:
   ```bash
   npx wrangler d1 create sea-game-app
   ```
   שמור את `database_id` שהפקודה מחזירה.

3. עדכן את `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "sea-game-app"
   database_id = "<הכנס כאן את ה-id מהשלב הקודם>"
   ```

4. הפעל את הסכימה:
   ```bash
   npx wrangler d1 execute sea-game-app --file=./schema.sql
   ```

5. בפריסת Cloudflare Pages ודא שה-Binding `DB` זמינה ב-“Functions > D1 bindings”.

קובץ הפונקציות `functions/api/leaderboard.ts` מספק REST API:
- `GET /api/leaderboard` – מחזיר 10 שיאים מהירים.
- `POST /api/leaderboard` – שומר שיא חדש (`{ username, durationMs, dayCount }`).

---

## עבודה עם Cloudflare Pages

1. בחר בפרויקט חדש ב-Pages והצביע על מאגר GitHub שלך.
2. הגדר:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: 20+
3. דאג להוסיף ל-“Settings > Functions” את binding `DB` שיצרת.

---

## שמירת שיאים מקומית (Fallback)

אם הבקשה ל-`/api/leaderboard` נכשלת (למשל בזמן פיתוח מקומי ללא D1), המשחק ישתמש ב-localStorage (`sea-game-fast-finds`) כדי לשמור ולהציג את חמשת השיאים המהירים ביותר. כך הילדים עדיין מקבלים חוויית “טבלת שיאים” גם בלי חיבור.

---

## מבנה הפרויקט

```
src/
  components/GameCanvas.tsx   # ציור סביבת החוף, האויבים והפולסים
  game/
    constants.ts              # קבועים פיזיים, זמנים וגבולות המפה
    engine.ts                 # לוגיקת המשחק, תנועה, אינטראקציות, אקלים
    types.ts                  # טיפוסים משותפים
    utils.ts                  # פונקציות עזר
  hooks/useGameEngine.ts      # Hook שמפעיל את לולאת המשחק עם RAF
  services/leaderboard.ts     # אינטראקציה עם ה-API ו-fallback
  App.tsx / App.css           # HUD, UX והחיבור למנוע
functions/api/leaderboard.ts  # Cloudflare Pages Function ל-D1
schema.sql                    # טבלת שיאים ל-D1
wrangler.toml                 # Binding ל-DB והגדרות Pages
```

---

## טיפים למשחק

1. **4 הימים הראשונים** – האיתות חזק יותר והסריקה (F) עובדת ברדיוס מורחב.
2. **אנשי חליפות** – פגיעה (Space) משתקת אותם ~2.5 שניות. הימנע ממגע ממושך כדי לא לאבד פוקוס.
3. **צלילה (V)** – זמינה רק כשאתה בים; שוחק מעט פוקוס אך מאפשר קואורדינטות מדויקות של האייפון כשהוא קבור במים.
4. **פינג (G)** – צורך 25% טעינת גלאי ומחזיר זווית יחסית למכשיר.
5. **מסירה (Enter)** – לאחר שהאייפון בידיך, היכנס למעגל של תחנת המשטרה (צפון-מזרח) ולחץ Enter.

בהצלחה בציד האייפון 16! 🏖️📱
