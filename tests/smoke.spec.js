// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * اختبارات دخان أساسية: تتأكد أن اللعبة تُحمَّل وتعمل شاشاتها الأولى.
 * Baseline smoke tests: the game loads and its first screens work.
 */

test('الصفحة الرئيسية تحوّل إلى اللعبة / index redirects to the game', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/BVO\.html$/);
});

test('شاشة الدخول تظهر / login screen renders', async ({ page }) => {
  await page.goto('/BVO.html');

  await expect(page).toHaveTitle('BVO');
  await expect(page.locator('#s-login')).toHaveClass(/active/);
  await expect(page.locator('.bvo-logo')).toHaveText('BVO');

  // أزرار الدخول الثلاثة / the three sign-in buttons
  await expect(page.locator('#s-login .btn-google')).toBeVisible();
  await expect(page.locator('#s-login .btn-email')).toBeVisible();
  await expect(page.locator('#s-login .btn-guest')).toBeVisible();
});

test('الدخول كضيف ينقل إلى القائمة الرئيسية / guest login reaches the main menu', async ({ page }) => {
  await page.goto('/BVO.html');

  await page.locator('#s-login .btn-guest').click();

  await expect(page.locator('#s-main')).toHaveClass(/active/, { timeout: 15_000 });
  await expect(page.locator('#s-login')).not.toHaveClass(/active/);
});

test('اختيار اللغة يُفتح ويُغلق / language picker opens and closes', async ({ page }) => {
  await page.goto('/BVO.html');

  const overlay = page.locator('#lang-overlay');
  await expect(overlay).toBeHidden();

  await page.locator('#s-login .lang-btn-top').click();
  await expect(overlay).toBeVisible();
  await expect(page.locator('#lang-list > *').first()).toBeVisible();

  await page.locator('#lang-overlay .cancel-btn').click();
  await expect(overlay).toBeHidden();
});

test('لا أخطاء في الـ console عند التحميل / no console errors on load', async ({ page }) => {
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // نتجاهل فشل الشبكة: Firebase و CDN غير متاحين في الاختبارات المعزولة
    if (m.type() === 'error' && !/net::|Failed to load resource|firebase/i.test(m.text())) {
      errors.push(`console: ${m.text()}`);
    }
  });

  await page.goto('/BVO.html');
  await expect(page.locator('#s-login')).toHaveClass(/active/);

  expect(errors).toEqual([]);
});
