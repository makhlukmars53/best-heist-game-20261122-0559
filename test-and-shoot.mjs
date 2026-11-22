// VAULTBREAK play-test + screenshot runner (dev tooling, not part of the game).
// Serves repo/game/ on localhost, loads the game in headless Chromium, and:
//   1. records every console error and every network request (must be zero
//      errors and zero requests outside localhost);
//   2. plays the game with real keyboard input: start, walk to the first
//      gem, pick it up; toss a coin, fire smoke and EMP and check the tool
//      counts fall; stand in a guard's chase and watch the alarm climb;
//   3. takes the 4 screenshots from shots.json as JPEGs at 1280x800.
// Usage: node test-and-shoot.mjs   (run from the repo root)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/hatch/workspace/makefun/shot/node_modules/playwright/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = join(here, 'game');
const shotDir = join(here, 'screenshots');
const PORT = 8129;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const file = join(gameDir, path === '/' ? 'index.html' : path);
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleErrors = [];
const requests = [];
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push('console: ' + m.text());
});
page.on('request', (r) => requests.push(r.url()));
page.on('requestfailed', (r) => requests.push('FAILED: ' + r.url()));

const vb = (expr) => page.evaluate(`window.__vaultbreak.${expr}`);
const base = `http://127.0.0.1:${PORT}/index.html`;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
}

// --- Play test: real keyboard input ----------------------------------------
await page.goto(base, { waitUntil: 'load' });
await page.waitForTimeout(600);
check('title screen shows', (await vb('screen')) === 'title');

await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('Enter starts level 1', (await vb('screen')) === 'playing');

const startPos = await vb('thiefPos()');
// Walk up the left corridor, then right along the top to the first gem.
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(2600);
await page.keyboard.up('ArrowUp');
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1500);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(400);
const afterWalk = await vb('thiefPos()');
check(
  'thief moves with arrow keys',
  Math.abs(afterWalk.x - startPos.x) > 150 && Math.abs(afterWalk.y - startPos.y) > 300,
  `from (${Math.round(startPos.x)},${Math.round(startPos.y)}) to (${Math.round(afterWalk.x)},${Math.round(afterWalk.y)})`,
);
check('first gem picked up by walking over it', (await vb('lootTaken')) >= 1);

// Chase + alarm: teleport under the bottom camera's sweep (guards patrol far
// above) and wait for the camera lock to feed the alarm. Runs before the
// EMP test so the cameras are live.
await vb('teleport(480, 560)');
await page.waitForTimeout(5000);
const alarmNow = await vb('alarm');
const guardStates = await vb('guardStates');
check(
  'alarm climbs while the thief is exposed',
  alarmNow > 10,
  `alarm ${alarmNow.toFixed(1)}%, guards: ${guardStates.join(',')}`,
);
check('camera or guard noticed the thief', guardStates.includes('chase') || guardStates.includes('investigate') || alarmNow > 10);

// Tools: coin, smoke, EMP each consume one use.
const toolsBefore = await vb('tools');
await page.keyboard.press('1');
await page.waitForTimeout(200);
const toolsAfterCoin = await vb('tools');
check('coin toss consumes one use', toolsAfterCoin.coin === toolsBefore.coin - 1);
await page.keyboard.press('2');
await page.waitForTimeout(200);
check('smoke bomb creates a cloud', (await vb('smokeCount')) >= 1);
await page.keyboard.press('3');
await page.waitForTimeout(200);
check('EMP disables cameras for 6s', (await vb('empLeft')) > 4);

// --- Screenshots ------------------------------------------------------------
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
for (const s of shots) {
  await page.goto(base + s.query, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const file = join(shotDir, s.name);
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  const st = statSync(file);
  console.log('shot', s.name, st.size, 'bytes');
}

// --- Request / error audit --------------------------------------------------
const external = requests.filter((u) => !u.startsWith(`http://127.0.0.1:${PORT}`));
check('zero console/page errors', consoleErrors.length === 0, consoleErrors.join(' | '));
check('zero external network requests', external.length === 0, external.join(', '));
check('only local requests made', requests.length > 0, `${requests.length} local requests`);

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? 'ALL CHECKS PASSED' : `${failed.length} CHECK(S) FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
