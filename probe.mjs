import { chromium } from 'playwright';
const BASE = (process.env.TARGET_URL || 'https://looking-glass-eta.vercel.app').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.goto(BASE+'/', {waitUntil:'domcontentloaded',timeout:30000});
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const pick = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return {sel, missing:true};
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return {
      sel,
      w: Math.round(r.width), h: Math.round(r.height),
      width: cs.width, height: cs.height,
      minWidth: cs.minWidth, minHeight: cs.minHeight,
      transform: cs.transform,
      pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
      max767: window.matchMedia('(max-width: 767px)').matches,
    };
  };
  return ['.lg-orb-tool','.lg-orb-send','.lg-orb-pill-action','.lg-orb-pill-close','.lg-orb-pill-brand','.lg-orb-pill','.lg-orb-chat'].map(pick);
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
