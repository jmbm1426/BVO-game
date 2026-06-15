// =============================================================
//  Service Worker لكاردوبولي
//  يخزّن ملفات اللعبة حتى تعمل بدون إنترنت (offline)
//  ⚠️ كل ما تعدّل اللعبة، غيّر رقم CACHE_VERSION حتى يتحدّث التطبيق
// =============================================================
const CACHE_VERSION = "cardopoly-v3-mp";

// الملفات الأساسية التي يحتاجها التطبيق ليعمل
const APP_SHELL = [
  "./BVO.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

// عند تثبيت الـ Service Worker: خزّن ملفات اللعبة
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll تفشل لو ملف واحد غاب — نستخدم add مع تجاهل الأخطاء
      return Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// عند التفعيل: احذف الكاش القديم
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// عند أي طلب: جرّب الشبكة أولاً، وإن فشلت ارجع للكاش (مناسب لما نضيف الأونلاين لاحقاً)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // خزّن نسخة محدّثة في الكاش
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(event.request, copy).catch(() => {});
        });
        return response;
      })
      .catch(() => caches.match(event.request).then((c) => c || caches.match("./BVO.html")))
  );
});
