import http from 'http';
import { chromium } from 'playwright';

function get(host, path, extraHeaders) {
  return new Promise((resolve) => {
    const req = http.request({ host, port: 3000, path, headers: extraHeaders || {} }, (res) => {
      let n = 0; res.on('data', (d) => (n += d.length)); res.on('end', () => resolve({ status: res.statusCode, len: n }));
    });
    req.on('error', (e) => resolve({ err: e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ err: 'timeout' }); }); req.end();
  });
}
function fetchHtml(host) {
  return new Promise((r) => {
    http.get({ host, port: 3000, path: '/', headers: { Host: host === '127.0.0.1' ? 'localhost:3000' : `${host}:3000` } }, (res) => {
      let s = ''; res.on('data', (d) => (s += d)); res.on('end', () => r(s));
    }).on('error', () => r(''));
  });
}

// 等服务器就绪
let html = '';
for (let i = 0; i < 40; i++) {
  const r = await get('192.168.5.37', '/');
  if (r.status === 200) { html = await fetchHtml('192.168.5.37'); if (html.length > 1000) break; }
  await new Promise((r) => setTimeout(r, 1500));
}
console.log('SERVER READY, html len', html.length);

const chunks = [...new Set((html.match(/\/_next\/static\/[^"']+\.js/g) || []))];
const lanHeaders = { Host: '192.168.5.37:3000', Origin: 'http://192.168.5.37:3000', Referer: 'http://192.168.5.37:3000/' };
let blocked = 0;
for (const c of chunks) { const v = await get('192.168.5.37', c, lanHeaders); if (v.status !== 200) { blocked++; console.log('BLOCKED', v.status, c); } }
console.log(`CHUNKS TOTAL ${chunks.length}, BLOCKED ${blocked}`);

// Playwright 真机点击验证
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
await page.goto('http://192.168.5.37:3000/', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('GOTO', e.message));
await page.waitForTimeout(2500);
try { await page.locator('button[aria-label="切换侧边栏"]').click({ timeout: 5000 }); await page.waitForTimeout(800);
  const m = await page.evaluate(() => { const el = document.querySelector('.fixed.inset-0'); if (!el) return 'no-mask'; const cs = getComputedStyle(el); return `opacity=${cs.opacity} pe=${cs.pointerEvents}`; });
  console.log('MENU_CLICK -> sidebar mask:', m);
  await page.screenshot({ path: 'd:\\Circleica\\_verify_menu.png' });
} catch (e) { console.log('MENU_CLICK_FAILED', e.message.split('\n')[0]); }
// 点侧边栏里的“发现”
try { await page.locator('a[href="/discover"]').first().click({ timeout: 5000 }); await page.waitForTimeout(1500); console.log('DISCOVER_CLICK -> url:', page.url()); } catch (e) { console.log('DISCOVER_FAILED', e.message.split('\n')[0]); }
await browser.close();
console.log('VERIFY DONE');
