# الاختبارات و Playwright 🎭

هذا الملف يشرح كيف تشغّل اللعبة محلياً، كيف تشغّل الاختبارات، وكيف يتحكّم
`Claude` بالمتصفح مباشرة عبر `Playwright MCP`.

## التجهيز لمرّة واحدة

```bash
npm install
npm run setup:browsers   # ينزّل متصفح Chromium الخاص بـ Playwright
```

> في البيئات التي يوجد فيها متصفح مثبّت مسبقاً (مثل حاويات `CI`) تُكتشف نسخته
> تلقائياً ولا حاجة لتشغيل `setup:browsers`.

## تشغيل اللعبة محلياً

```bash
npm start            # ثم افتح http://localhost:4173/
```

سيرفر ثابت صغير بدون أي مكتبات خارجية (`scripts/serve.js`).

## تشغيل الاختبارات

```bash
npm test             # كل الاختبارات (جوال + سطح مكتب)
npm run test:headed  # مع إظهار المتصفح
npm run test:ui      # الواجهة التفاعلية لـ Playwright
npm run test:report  # فتح تقرير آخر تشغيل
```

الاختبارات تشغّل السيرفر تلقائياً، فلا حاجة لتشغيل `npm start` قبلها.

### الاختبارات الموجودة

`tests/smoke.spec.js` — اختبارات دخان أساسية:

| الاختبار | ما يتحقّق منه |
| --- | --- |
| تحويل الصفحة الرئيسية | `index.html` ينقل إلى `BVO.html` |
| شاشة الدخول | العنوان، الشعار، وأزرار الدخول الثلاثة |
| الدخول كضيف | الانتقال من `#s-login` إلى `#s-main` |
| اختيار اللغة | فتح وإغلاق `#lang-overlay` |
| نظافة الـ console | لا أخطاء `JavaScript` عند التحميل |

تعمل هذه الاختبارات بدون إنترنت: عند تعذّر الوصول إلى `Firebase` يرجع
`bvoGuestLogin()` إلى `doLogin()` مباشرة.

### مشروعان (projects)

- `mobile` — بمقاسات `Pixel 7` (الاستخدام الأساسي للعبة)
- `desktop` — `1280×800`

لتشغيل واحد فقط: `npx playwright test --project=mobile`

## ربط Claude بالمتصفح (Playwright MCP)

`.mcp.json` يسجّل سيرفر `playwright` لدى `Claude Code`، فيصبح `Claude` قادراً على
فتح اللعبة والنقر والكتابة وأخذ لقطات شاشة وقراءة أخطاء الـ console بنفسه.

**للتفعيل:** أعد تشغيل `Claude Code` في هذا المجلد ووافق على السيرفر عند السؤال.
للتأكد: اكتب `/mcp` — يجب أن يظهر `playwright` بحالة `connected`.

بعد ذلك يمكنك أن تطلب مثلاً:

> شغّل اللعبة، سجّل دخول كضيف، وأعطني لقطة شاشة للقائمة الرئيسية

أدوات متاحة لـ `Claude` (26 أداة) منها: `browser_navigate`، `browser_click`،
`browser_type`، `browser_snapshot`، `browser_take_screenshot`،
`browser_console_messages`، `browser_network_requests`، `browser_evaluate`.

### متغيّرات التحكّم

| المتغيّر | الأثر |
| --- | --- |
| `PWMCP_HEADED=1` | يُظهر المتصفح بدل تشغيله مخفياً |
| `PWMCP_SANDBOX=1` | يُبقي صندوق حماية Chromium مفعّلاً حتى مع `root` |
| `PWMCP_NO_SANDBOX=1` | يعطّل صندوق الحماية يدوياً |
| `PLAYWRIGHT_CHROMIUM_PATH` | يفرض مسار متصفح معيّن |
| `PORT` | منفذ السيرفر المحلي (الافتراضي `4173`) |

> صندوق حماية `Chromium` يبقى مفعّلاً على جهازك، ويُعطَّل تلقائياً فقط عند
> التشغيل بصلاحية `root` (الحاويات و `CI`) لأنه لا يعمل هناك.

## الملفات المضافة

```
.mcp.json                  تسجيل سيرفر Playwright MCP لدى Claude
playwright.config.js       إعداد الاختبارات (مشروعان + سيرفر تلقائي)
tests/smoke.spec.js        اختبارات الدخان
scripts/serve.js           سيرفر ثابت بدون مكتبات
scripts/chromium-path.js   تحديد مسار المتصفح حسب البيئة
scripts/playwright-mcp.js  مشغّل سيرفر MCP
```

`copyweb.js` يعتمد قائمة ملفات محدّدة، لذلك لا تدخل ملفات الاختبار في بناء
`Capacitor` للأندرويد.
