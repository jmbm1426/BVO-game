# كاردوبولي — Cardopoly 🎴

لعبة لوحية بالكروت (مونوبولي بطابع الورق). هذا المجلد جاهز للرفع على `GitHub` ونشره عبر `GitHub Pages`.

## محتويات المجلد

- `index.html` — صفحة تفتح اللعبة تلقائياً (ضرورية لـ `GitHub Pages`)
- `BVO.html` — اللعبة نفسها
- `cards/` — كل صور الكروت (السوداء والكلاسيكية)
- `manifest.json` و `service-worker.js` — ملفات تطبيق `PWA` (لمرحلة لاحقة)
- `icon-192.png` و `icon-512.png` و `icon-maskable-512.png` و `apple-touch-icon.png` — أيقونات التطبيق

> ⚠️ ارفع المجلد **كاملاً** مع مجلد `cards/`، وإلا لن تظهر الكروت.

## خطوات الرفع والنشر

1. أنشئ حساباً على `github.com` (إن لم يكن لديك).
2. اضغط زر **New** لإنشاء مستودع جديد (`repository`):
   - الاسم: مثلاً `cardopoly`
   - اختر **Public**
   - اضغط **Create repository**
3. ارفع الملفات: في صفحة المستودع اختر **Add file → Upload files**، ثم اسحب **كل محتويات هذا المجلد** (بما فيها مجلد `cards`) إلى الصفحة، ثم اضغط **Commit changes**.
4. فعّل النشر: **Settings → Pages**، وتحت **Branch** اختر `main` و `/ (root)`، ثم **Save**.
5. انتظر دقيقة، وسيظهر رابط لعبتك بالشكل:
   `https://USERNAME.github.io/cardopoly/`
   (استبدل `USERNAME` باسم حسابك).

## عند تعديل اللعبة لاحقاً

- عدّل `BVO.html` ثم ارفعه مرة أخرى عبر **Add file → Upload files** (سيستبدل القديم).
- إذا فعّلت تطبيق الـ `PWA` لاحقاً، غيّر رقم `CACHE_VERSION` داخل `service-worker.js` حتى يتحدّث التطبيق عند المستخدمين.
