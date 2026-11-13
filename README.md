# IA AGENT DVL

منصة مراقبة ذكية (PWA): أسعار العملات الرقمية، أخبار العالم، النتائج المباشرة والاحتمالات، قنوات Telegram، تنبيهات، وتقرير يومي.

## الملفات
| الملف | الدور |
|---|---|
| `index.html` | هيكل الصفحة |
| `style.css` | التصميم (فاتح/داكن) |
| `app.js` | منطق التطبيق |
| `sw.js` | العمل دون إنترنت |
| `manifest.webmanifest` + الأيقونات | التثبيت على الشاشة الرئيسية |
| `index.js` + `wrangler.jsonc` | خادم Cloudflare Worker |

## مسارات الخادم (Worker)
- `/news?lang=ar|fr|en`: الأخبار (RSS)
- `/matches`: احتمالات المباريات من The Odds API، وتحتاج السرّ `ODDS_API_KEY`. تُضاف الدوريات العربية تلقائيًا إن توفّرت.
- `/scores`: النتائج المباشرة من ESPN، مجانًا ودون مفتاح (أوروبا + السعودية + مصر + المغرب + الإمارات + قطر)
- `/fng`: مؤشر الخوف والطمع
- `/tg?ch=اسم_القناة`: آخر منشورات قناة Telegram عامة
- `/report?lang=ar|fr|en`: التقرير اليومي يكتبه Claude من البيانات الحية. يحتاج السرّ `ANTHROPIC_API_KEY`، ويُحفظ 3 ساعات لكل لغة. بدونه يعرض التطبيق التقرير التلقائي.

## النشر
1. الواجهة: GitHub Pages ينشر الملفات تلقائيًا.
2. الخادم: `npm install` ثم `npx wrangler deploy`، ثم أضف الأسرار:
   `npx wrangler secret put ODDS_API_KEY` و`npx wrangler secret put ANTHROPIC_API_KEY`.
   تأكد أن رابط الخادم يطابق `WORKER` في أول `app.js`.
