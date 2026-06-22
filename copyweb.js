// ينسخ ملفات لعبة الويب إلى مجلد www (نقطة دخول تطبيق Capacitor)
// شغّله قبل كل بناء:  node copyweb.js
const fs = require('fs');
const path = require('path');
const root = __dirname;
const www = path.join(root, 'www');

const items = [
  'BVO.html', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
  'cards'
];

function cp(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(src)) cp(path.join(src, f), path.join(dest, f));
  } else {
    fs.copyFileSync(src, dest);
  }
}

fs.mkdirSync(www, { recursive: true });
for (const it of items) {
  const s = path.join(root, it);
  if (fs.existsSync(s)) cp(s, path.join(www, it));
}
// نقطة دخول التطبيق = اللعبة مباشرة
fs.copyFileSync(path.join(root, 'BVO.html'), path.join(www, 'index.html'));
console.log('✅ تم تجهيز مجلد www');
