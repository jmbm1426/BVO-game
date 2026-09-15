// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { chromiumExecutablePath } = require('./scripts/chromium-path');

const PORT = Number(process.env.PORT || 4173);
const baseURL = `http://localhost:${PORT}`;

// undefined = استخدم متصفح Playwright الافتراضي / use Playwright's own build
const executablePath = chromiumExecutablePath();

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath },
  },

  // اللعبة أساساً للجوال، لذلك الجوال هو المشروع الأول
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],

  webServer: {
    command: `node scripts/serve.js ${PORT}`,
    url: `${baseURL}/BVO.html`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 30_000,
  },
});
