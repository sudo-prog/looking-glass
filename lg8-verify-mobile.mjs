// lg8-verify-mobile.mjs — per-element mobile gate for Looking Glass (LG-8)
// Single-page SPA (no router). Verifies all 8 fixes at 390x844.
// Gate: docOverflow<=2 ; realOff===0 ; consoleErrs===0 ; smallTaps===0
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = (process.env.TARGET_URL || 'https://looking-glass-eta.vercel.app').replace(/\/$/, '');
const VW = 390;

const browser = await chromium.launch({ headless: true });

// ---- fresh context (no persisted AI config -> LiquidOrb setup auto-opens) ----
async function newCtx() {
  return browser.newContext({ viewport: { width: VW, height: 844 }, hasTouch: true, isMobile: true });
}

const results = {};
const snap = async (page, label) => {
  const res = await page.evaluate((vw) => {
    const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const inScroll = (el) => {
      let p = el.parentElement;
      while (p) {
        const cs = getComputedStyle(p);
        if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'hidden') && p.getBoundingClientRect().width <= vw + 1) return true;
        p = p.parentElement;
      }
      return false;
    };
    const off = [];
    const visible = (el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const walk = (el) => {
      if (!visible(el)) return;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && el.offsetParent !== null) {
        if (r.right > vw + 1 && !inScroll(el)) {
          off.push({ tag: el.tagName.toLowerCase(), cls: (el.className && el.className.toString) ? el.className.toString().slice(0, 50) : '', right: Math.round(r.right) });
        }
      }
      for (const c of el.children) walk(c);
    };
    walk(document.body);
    const taps = [...document.querySelectorAll('button,a,[role=button]')]
      .map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })
      .filter((t) => t.h > 0);
    const smallTaps = taps.filter((t) => t.w < 44 || t.h < 44).length;
    return { docOverflow, realOff: off.length, offList: off.slice(0, 12), totalTaps: taps.length, smallTaps };
  }, VW);
  return res;
};

// 1) BASELINE (canvas loads)
{
  const ctx = await newCtx();
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push('PE:' + e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000); // SSE/AI settle; LiquidOrb setup may appear
  results['baseline'] = { ...(await snap(page, 'baseline')), consoleErrs: errs.length, errSample: errs.slice(0, 3) };
  await ctx.close();
}

// helper: open a modal via key, measure, close
async function modalState(keyCombo, closeKey, label, settle = 800) {
  const ctx = await newCtx();
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push('PE:' + e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  if (keyCombo) {
    if (keyCombo.ctrl) await page.keyboard.down('Control');
    if (keyCombo.alt) await page.keyboard.down('Alt');
    if (keyCombo.shift) await page.keyboard.down('Shift');
    await page.keyboard.press(keyCombo.key);
    if (keyCombo.ctrl) await page.keyboard.up('Control');
    if (keyCombo.alt) await page.keyboard.up('Alt');
    if (keyCombo.shift) await page.keyboard.up('Shift');
  }
  await page.waitForTimeout(settle);
  const s = await snap(page, label);
  results[label] = { ...s, consoleErrs: errs.length, errSample: errs.slice(0, 3) };
  await ctx.close();
}

// 2) CommandPalette (Ctrl+K)
await modalState({ ctrl: true, key: 'k' }, 'Escape', 'command-palette');
// 3) ScratchPad (Alt+Shift+Space)
await modalState({ alt: true, shift: true, key: ' ' }, 'Escape', 'scratchpad');
// 4) LiquidOrb setup (auto-opens on fresh ctx) — re-measured standalone
await modalState(null, 'Escape', 'orb-setup', 2500);

await browser.close();

const bad = Object.entries(results).filter(([_, g]) => g.realOff > 0 || g.docOverflow > 2 || g.consoleErrs > 0 || g.smallTaps > 0);
fs.writeFileSync('lg8-verify-report.json', JSON.stringify(results, null, 2));
console.log('=== LG-8 MOBILE GATE @390x844 ===');
for (const [k, g] of Object.entries(results)) {
  console.log(`[${k}] docOverflow=${g.docOverflow} realOff=${g.realOff} smallTaps=${g.smallTaps}/${g.totalTaps} consoleErrs=${g.consoleErrs}`);
  if (g.offList && g.offList.length) console.log('   offList:', JSON.stringify(g.offList));
  if (g.errSample && g.errSample.length) console.log('   errs:', JSON.stringify(g.errSample));
}
console.log(`\nTOTAL_STATES=${Object.keys(results).length} FAILING=${bad.length}`);
process.exit(bad.length ? 1 : 0);
