/**
 * يحدّد مسار متصفح Chromium المستخدم في الاختبارات و MCP.
 * Resolves which Chromium binary to drive.
 *
 * 1. PLAYWRIGHT_CHROMIUM_PATH إن كان محدّداً (تجاوز يدوي / manual override)
 * 2. النسخة التي ينزّلها Playwright نفسه (بعد `npx playwright install chromium`)
 * 3. متصفح مُثبّت مسبقاً في بيئات CI/الحاويات مثل /opt/pw-browsers/chromium
 *
 * تُرجع undefined عند الاعتماد على نسخة Playwright الافتراضية،
 * وهي القيمة التي يتوقعها خيار executablePath في هذه الحالة.
 */
const fs = require('fs');

const PREINSTALLED = ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

function chromiumExecutablePath() {
  const override = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (override) return override;

  try {
    const { chromium } = require('@playwright/test');
    if (fs.existsSync(chromium.executablePath())) return undefined;
  } catch {
    // لا شيء: نكمل إلى المتصفحات المثبّتة مسبقاً
  }

  return PREINSTALLED.find((p) => fs.existsSync(p));
}

module.exports = { chromiumExecutablePath };
