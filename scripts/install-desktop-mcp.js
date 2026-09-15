#!/usr/bin/env node
/**
 * يربط Playwright بتطبيق Claude على الحاسب، بالكتابة في claude_desktop_config.json.
 * Registers Playwright MCP with the Claude desktop app.
 *
 *   node scripts/install-desktop-mcp.js            التنفيذ
 *   node scripts/install-desktop-mcp.js --dry-run  عرض ما سيُكتب دون كتابة
 *   node scripts/install-desktop-mcp.js --latest   استخدام أحدث إصدار بدل المثبّت
 *   node scripts/install-desktop-mcp.js --force     التنفيذ حتى لو كان التطبيق مشتغلاً
 *   node scripts/install-desktop-mcp.js --config <path>   مسار إعدادات صريح
 *   node scripts/install-desktop-mcp.js --download-browser  تجاهل Chrome/Edge ونزّل متصفح Playwright
 *
 * ملاحظة: هذا ملف تطبيق Claude على الحاسب، وهو مختلف عن .mcp.json الخاص بـ Claude Code.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const MCP_PACKAGE = '@playwright/mcp';
const PINNED_VERSION = '0.0.81'; // نفس إصدار devDependencies
const SERVER_NAME = 'playwright';
const CONFIG_NAME = 'claude_desktop_config.json';

/* ============================ منطق قابل للاختبار ============================ */

/**
 * أماكن ملف إعدادات تطبيق Claude المحتملة، مرتّبة بالأولوية.
 * على Windows يوجد مساران: نسخة المتجر (MSIX) تقرأ مساراً داخل
 * AppData\Local\Packages، بينما زرّ "Edit Config" يفتح AppData\Roaming — وهذا
 * سبب فشل صامت شائع، لذلك نتعامل مع الاثنين.
 */
function configCandidates({
  platform = process.platform,
  env = process.env,
  home = os.homedir(),
  exists = fs.existsSync,
  readdir = fs.readdirSync,
} = {}) {
  // نتبع النظام المُمرَّر لا نظام الجهاز، حتى يبقى المنطق قابلاً للاختبار
  // على أي نظام. على Windows الحقيقي path.join هو نفسه path.win32.join.
  const P = platform === 'win32' ? path.win32 : path.posix;
  const dirs = [];

  if (platform === 'win32') {
    // نسخة MSIX أولاً لأنها هي التي يقرأها التطبيق فعلاً عند وجودها
    const packages = env.LOCALAPPDATA && P.join(env.LOCALAPPDATA, 'Packages');
    if (packages && exists(packages)) {
      let entries = [];
      try {
        entries = readdir(packages);
      } catch {
        entries = [];
      }
      for (const entry of entries.filter((e) => /^Claude_/i.test(e)).sort()) {
        dirs.push({ kind: 'msix', dir: P.join(packages, entry, 'LocalCache', 'Roaming', 'Claude') });
      }
    }
    if (env.APPDATA) dirs.push({ kind: 'installer', dir: P.join(env.APPDATA, 'Claude') });
  } else if (platform === 'darwin') {
    dirs.push({ kind: 'macos', dir: P.join(home, 'Library', 'Application Support', 'Claude') });
  } else {
    const base = env.XDG_CONFIG_HOME || P.join(home, '.config');
    dirs.push({ kind: 'linux', dir: P.join(base, 'Claude') });
  }

  return dirs.map((c) => ({ ...c, file: P.join(c.dir, CONFIG_NAME) }));
}

/**
 * يبحث عن متصفح مثبّت أصلاً على الجهاز (Chrome ثم Edge).
 *
 * استخدام متصفح موجود يوفّر تنزيل ~150MB، والأهم أنه يتجنّب مشكلة حقيقية:
 * @playwright/mcp يعتمد نسخة playwright مختلفة عن نسخة المستودع، ولكل نسخة
 * رقم إصدار متصفح خاص بها، فقد يُنزّل المستودع إصداراً لا يقبله السيرفر.
 * وعلى Windows يوجد Edge دائماً، فالنتيجة تكاد تكون مضمونة.
 */
function detectBrowserChannel({ platform = process.platform, env = process.env, exists = fs.existsSync } = {}) {
  const P = platform === 'win32' ? path.win32 : path.posix;
  const candidates = [];

  if (platform === 'win32') {
    const roots = [env['ProgramFiles'], env['ProgramFiles(x86)'], env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      candidates.push({ channel: 'chrome', at: P.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe') });
    }
    for (const root of roots) {
      candidates.push({ channel: 'msedge', at: P.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe') });
    }
  } else if (platform === 'darwin') {
    candidates.push({ channel: 'chrome', at: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
    candidates.push({ channel: 'msedge', at: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' });
  }

  return candidates.find((c) => exists(c.at)) || null;
}

/** يبني مدخل السيرفر. على Windows لا يعمل npx وحده في هذا الملف، فنمرّره عبر cmd. */
function serverEntry({ platform = process.platform, outputDir, version = PINNED_VERSION, channel = null } = {}) {
  const spec = `${MCP_PACKAGE}@${version}`;
  // بلا --headless ليظهر المتصفح، وبلا --isolated ليبقى تسجيل الدخول محفوظاً
  const argv = ['-y', spec, '--output-dir', outputDir];
  if (channel) argv.push('--browser', channel);
  return platform === 'win32'
    ? { command: 'cmd', args: ['/c', 'npx', ...argv] }
    : { command: 'npx', args: argv };
}

/** نسخة playwright التي يعتمدها @playwright/mcp فعلاً — تُقرأ لا تُخمَّن. */
function mcpPlaywrightVersion({ read = () => require('../node_modules/@playwright/mcp/package.json') } = {}) {
  try {
    return read().dependencies.playwright;
  } catch {
    return null;
  }
}

/** يدمج السيرفر دون المساس بأي مفتاح آخر (مثل preferences أو سيرفرات أخرى). */
function mergeConfig(existing, entry, name = SERVER_NAME) {
  const next = { ...(existing && typeof existing === 'object' ? existing : {}) };
  next.mcpServers = { ...(next.mcpServers && typeof next.mcpServers === 'object' ? next.mcpServers : {}) };
  next.mcpServers[name] = entry;
  return next;
}

/** يقرأ الإعدادات الحالية. الملف التالف يُنقل جانباً ولا يُفقد. */
function readConfig(file, { exists = fs.existsSync, read = fs.readFileSync } = {}) {
  if (!exists(file)) return { config: {}, status: 'missing' };
  const raw = read(file, 'utf8');
  if (!raw.trim()) return { config: {}, status: 'empty' };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { config: {}, status: 'invalid', raw };
    }
    return { config: parsed, status: 'ok' };
  } catch {
    return { config: {}, status: 'invalid', raw };
  }
}

/** هل تطبيق Claude مشتغل؟ الكتابة أثناء عمله تُمحى بصمت. */
function claudeIsRunning({ platform = process.platform, run = execFileSync } = {}) {
  try {
    if (platform === 'win32') {
      const out = String(run('tasklist', ['/FI', 'IMAGENAME eq Claude.exe', '/NH'], { encoding: 'utf8' }));
      return /claude\.exe/i.test(out);
    }
    if (platform === 'darwin') {
      return String(run('pgrep', ['-x', 'Claude'], { encoding: 'utf8' })).trim().length > 0;
    }
  } catch {
    return false; // الأمر غير موجود أو لا نتائج
  }
  return false;
}

module.exports = {
  configCandidates,
  detectBrowserChannel,
  serverEntry,
  mergeConfig,
  readConfig,
  claudeIsRunning,
  mcpPlaywrightVersion,
  PINNED_VERSION,
};

/* ================================= التنفيذ ================================= */

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  const version = argv.includes('--latest') ? 'latest' : PINNED_VERSION;
  const explicitIdx = argv.indexOf('--config');
  const explicit = explicitIdx >= 0 ? argv[explicitIdx + 1] : null;

  const repoRoot = path.resolve(__dirname, '..');
  const outputDir = path.join(repoRoot, 'test-results', 'mcp');
  const found = argv.includes('--download-browser') ? null : detectBrowserChannel();
  const entry = serverEntry({ outputDir, version, channel: found && found.channel });

  console.log('إعداد Playwright لتطبيق Claude على الحاسب\n');
  console.log(`النظام: ${process.platform}   الإصدار: ${MCP_PACKAGE}@${version}`);
  console.log(
    found
      ? `المتصفح: ${found.channel} الموجود على جهازك — لا حاجة لأي تنزيل\n          ${found.at}`
      : 'المتصفح: لم أجد Chrome أو Edge، فسيُنزَّل متصفح Playwright',
  );

  if (!dryRun && !force && claudeIsRunning()) {
    console.error(
      [
        '',
        '⛔ تطبيق Claude مشتغل حالياً.',
        '',
        'الكتابة الآن ستُمحى بصمت عند فتح المحادثة. أغلق التطبيق إغلاقاً كاملاً أولاً:',
        '  • Windows: انقر بالزر الأيمن على أيقونة Claude في شريط المهام (قد تكون مخفية',
        '             تحت السهم ^ ) ثم اختر Quit — إغلاق النافذة وحده لا يكفي.',
        '  • macOS:   Cmd + Q',
        '',
        'ثم أعد تشغيل هذا الأمر. (للتجاوز على مسؤوليتك: --force)',
      ].join('\n'),
    );
    return 1;
  }

  const candidates = explicit
    ? [{ kind: 'explicit', dir: path.dirname(explicit), file: explicit }]
    : configCandidates();

  const targets = candidates.filter((c) => fs.existsSync(c.dir));

  if (!targets.length) {
    console.error(
      [
        '',
        '⛔ لم أجد مجلد إعدادات تطبيق Claude.',
        '',
        'المسارات التي بحثت فيها:',
        ...candidates.map((c) => `  • ${c.dir}`),
        '',
        'تأكّد أن تطبيق Claude مثبّت، وافتحه مرّة واحدة ثم أغلقه كاملاً، وأعد المحاولة.',
      ].join('\n'),
    );
    return 1;
  }

  console.log(`\nالمسارات التي سيُكتب فيها (${targets.length}):`);
  for (const t of targets) console.log(`  • [${t.kind}] ${t.file}`);

  console.log(`\nالإعداد الذي سيُضاف تحت mcpServers.${SERVER_NAME}:`);
  console.log(JSON.stringify(entry, null, 2));

  if (dryRun) {
    console.log('\n(--dry-run: لم يُكتب أي شيء)');
    return 0;
  }

  for (const target of targets) {
    const { config, status, raw } = readConfig(target.file);

    if (status === 'invalid') {
      const broken = `${target.file}.broken-${stamp()}`;
      fs.writeFileSync(broken, raw);
      console.warn(`\n⚠️  ${target.file} ليس JSON صالحاً. حفظت نسخة في:\n   ${broken}`);
    } else if (status === 'ok') {
      const backup = `${target.file}.bak-${stamp()}`;
      fs.copyFileSync(target.file, backup);
      console.log(`\nنسخة احتياطية: ${backup}`);
    }

    const existingNames = Object.keys(config.mcpServers || {});
    const merged = mergeConfig(config, entry);
    fs.mkdirSync(path.dirname(target.file), { recursive: true });
    fs.writeFileSync(target.file, JSON.stringify(merged, null, 2) + '\n');

    const kept = existingNames.filter((n) => n !== SERVER_NAME);
    console.log(`✅ كُتب: ${target.file}`);
    if (kept.length) console.log(`   وبقيت سيرفراتك الأخرى كما هي: ${kept.join(', ')}`);
    if (existingNames.includes(SERVER_NAME)) console.log(`   (استُبدل إعداد ${SERVER_NAME} السابق)`);
  }

  // التنزيل مطلوب فقط إن لم نجد متصفحاً جاهزاً على الجهاز.
  // نستخدم نسخة playwright التي يعتمدها السيرفر نفسه، لا نسخة المستودع،
  // لأن لكل نسخة رقم إصدار متصفح مختلفاً.
  if (!found) {
    const pwVersion = mcpPlaywrightVersion();
    const spec = pwVersion ? `playwright@${pwVersion}` : 'playwright';
    console.log(`\nتنزيل متصفح Chromium (${spec})…`);
    try {
      execFileSync('npx', ['-y', spec, 'install', 'chromium'], {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
    } catch {
      console.warn(`⚠️  تعذّر التنزيل تلقائياً. شغّل يدوياً:\n   npx -y ${spec} install chromium`);
    }
  }

  console.log(
    [
      '',
      '─────────────────────────────────────────',
      'تم. الخطوات المتبقّية:',
      '',
      '1) افتح تطبيق Claude من جديد.',
      `2) في المحادثة العادية: يجب أن يظهر "${SERVER_NAME}" في قائمة الأدوات.`,
      '   جرّب: «افتح example.com وخذ لقطة شاشة».',
      '3) في Cowork: جرّب الطلب نفسه.',
      '',
      `   إن ظهر الخطأ "This tool has been disabled in your connector settings"`,
      '   فهذا قيد معروف في Cowork على Windows وليس خطأً في الإعداد.',
      '   البديل الجاهز: اطلب من Cowork تشغيل «npm run screenshot» أو «npm test» —',
      '   وكلاهما يعطي نفس الفائدة بلا MCP. التفاصيل في TESTING.md',
      '',
      `اللقطات التي يأخذها Claude تُحفظ في: ${outputDir}`,
    ].join('\n'),
  );
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
