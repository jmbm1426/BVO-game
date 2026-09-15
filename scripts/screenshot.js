#!/usr/bin/env node
/**
 * يأخذ لقطات شاشة للعبة: شاشة الدخول ثم القائمة الرئيسية، بمقاس الجوال
 * وبمقاس سطح المكتب. لا يحتاج MCP، فيعمل داخل Cowork بأمر واحد.
 *
 * Screenshots the game (login + main menu) on phone and desktop sizes.
 * Needs no MCP, so it works inside Cowork as a single command.
 *
 *   node scripts/screenshot.js
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium, devices } = require('@playwright/test');
const { chromiumExecutablePath } = require('./chromium-path');

const PORT = Number(process.env.PORT || 4174);
const OUT = path.resolve(__dirname, '..', 'test-results', 'screenshots');

const SIZES = [
  { name: 'mobile', context: { ...devices['Pixel 7'] } },
  { name: 'desktop', context: { viewport: { width: 1280, height: 800 } } },
];

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // السيرفر لم يجهز بعد
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`السيرفر لم يستجب على ${url}`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), String(PORT)], {
    stdio: 'ignore',
  });
  const shots = [];

  try {
    await waitForServer(`http://localhost:${PORT}/BVO.html`);

    const browser = await chromium.launch({ executablePath: chromiumExecutablePath() });

    for (const size of SIZES) {
      const context = await browser.newContext(size.context);
      const page = await context.newPage();
      await page.goto(`http://localhost:${PORT}/BVO.html`);

      // شاشة الدخول
      await page.locator('#s-login').waitFor({ state: 'visible' });
      const login = path.join(OUT, `${size.name}-login.png`);
      await page.screenshot({ path: login });
      shots.push(login);

      // القائمة الرئيسية بعد الدخول كضيف
      await page.locator('#s-login .btn-guest').click();
      await page.locator('#s-main.active').waitFor({ state: 'visible', timeout: 15000 });
      const main = path.join(OUT, `${size.name}-main.png`);
      await page.screenshot({ path: main });
      shots.push(main);

      await context.close();
    }

    await browser.close();
  } finally {
    server.kill();
  }

  console.log('✅ اللقطات:');
  for (const s of shots) console.log('  ' + path.relative(path.resolve(__dirname, '..'), s));
})().catch((e) => {
  console.error('❌ فشل أخذ اللقطات:', e.message);
  process.exit(1);
});
