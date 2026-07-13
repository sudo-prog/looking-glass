import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const ROUTES = ['/'];
const VP = { width: 390, height: 844 };

const browser = await chromium.launch();
const results = [];

for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: VP, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

  let status = 0;
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 });
    status = resp ? resp.status() : 0;
  } catch (e) {
    consoleErrors.push('NAV_FAIL: ' + e.message);
  }
  await page.waitForTimeout(2500);

  const audit = await page.evaluate(() => {
    const de = document.documentElement;
    const overflowX = de.scrollWidth - de.clientWidth;
    const vw = window.innerWidth;
    const offscreen = [];
    const tiny = [];
    let tableOverflow = 0;
    document.querySelectorAll('table').forEach(t => {
      if (t.scrollWidth > t.clientWidth + 1) tableOverflow++;
    });
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 2 || r.left < -2) {
        const s = getComputedStyle(el);
        if (s.position !== 'fixed' && s.visibility !== 'hidden' && s.display !== 'none' && r.width > 4) {
          offscreen.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ').filter(Boolean).slice(0,2).join('.')} r=${Math.round(r.right)} w=${Math.round(r.width)}`);
        }
      }
    });
    document.querySelectorAll('button, a, [role="button"], input').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.height < 36 || r.width < 36) {
        tiny.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ').filter(Boolean).slice(0,2).join('.')} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return { overflowX, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offscreen: offscreen.slice(0,15), offscreenCount: offscreen.length, tiny: tiny.slice(0,15), tinyCount: tiny.length, tableOverflow };
  });

  results.push({ route, status, consoleErrors: consoleErrors.slice(0,10), consoleErrorCount: consoleErrors.length, ...audit });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
