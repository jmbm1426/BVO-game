#!/usr/bin/env node
/**
 * يشغّل سيرفر Playwright MCP بالإعدادات المناسبة لهذا المشروع.
 * Launches the Playwright MCP server with this project's settings.
 *
 * السبب في وجود هذا الملف: ‏.mcp.json ملف JSON ثابت لا يمكنه اختيار مسار
 * المتصفح حسب البيئة. هذا السكربت يفعل ذلك، فيعمل نفس الإعداد على جهازك
 * وفي الحاويات التي تأتي بمتصفح مثبّت مسبقاً.
 *
 * متغيّرات التحكّم / env knobs:
 *   PWMCP_HEADED=1              تشغيل المتصفح مرئياً (يحتاج شاشة)
 *   PWMCP_NO_SANDBOX=1          تعطيل صندوق حماية Chromium يدوياً
 *   PWMCP_SANDBOX=1             إبقاؤه مفعّلاً حتى لو كنا root
 *   PLAYWRIGHT_CHROMIUM_PATH    فرض مسار متصفح معيّن
 */
const { spawn } = require('child_process');
const path = require('path');
const { chromiumExecutablePath } = require('./chromium-path');

const args = ['--isolated', '--output-dir', path.resolve(__dirname, '..', 'test-results', 'mcp')];

if (!process.env.PWMCP_HEADED) args.push('--headless');

const executablePath = chromiumExecutablePath();
if (executablePath) args.push('--executable-path', executablePath);

// صندوق حماية Chromium لا يعمل عند التشغيل بصلاحية root (الحاويات و CI).
// على جهازك العادي يبقى مفعّلاً، فهو حدّ أمني حقيقي عند فتح صفحات خارجية.
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
if (!process.env.PWMCP_SANDBOX && (process.env.PWMCP_NO_SANDBOX || isRoot)) args.push('--no-sandbox');

// ما بعد "--" يُمرَّر كما هو إلى @playwright/mcp
args.push(...process.argv.slice(2));

const mcp = path.resolve(__dirname, '..', 'node_modules', '@playwright', 'mcp', 'cli.js');

spawn(process.execPath, [mcp, ...args], { stdio: 'inherit' })
  .on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 0));
