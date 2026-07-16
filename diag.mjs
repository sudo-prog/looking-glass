import { chromium } from 'playwright';
const BASE = (process.env.TARGET_URL || 'https://looking-glass-eta.vercel.app').replace(/\/$/, '');
const VW = 390;
const browser = await chromium.launch({ headless: true });
async function newCtx() {
  return browser.newContext({ viewport: { width: VW, height: 844 }, hasTouch: true, isMobile: true });
}
async function dump(label, page) {
  const els = await page.evaluate((vw) => {
    const out = [];
    const vis = (el)=>{const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden';};
    for (const e of document.querySelectorAll('button,a,[role=button]')) {
      const r = e.getBoundingClientRect();
      if (r.width<=0||r.height<=0) continue;
      const cs=getComputedStyle(e);
      if (!vis(e)) continue;
      out.push({tag:e.tagName.toLowerCase(),cls:(e.className&&e.className.toString?e.className.toString():'').slice(0,40),w:Math.round(r.width),h:Math.round(r.height),txt:(e.innerText||e.getAttribute('aria-label')||'').slice(0,20)});
    }
    return out;
  }, VW);
  const small = els.filter(e=>e.w<44||e.h<44);
  console.log(`\n===== ${label} (total=${els.length}, small=${small.length}) =====`);
  for (const e of small) console.log(`  <${e.tag}> ${e.cls} w=${e.w} h=${e.h} "${e.txt}"`);
}
// baseline
{
  const ctx = await newCtx(); const page = await ctx.newPage();
  await page.goto(BASE+'/', {waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(3000);
  await dump('baseline', page);
  await ctx.close();
}
async function modal(keyCombo, label){
  const ctx = await newCtx(); const page = await ctx.newPage();
  await page.goto(BASE+'/', {waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(2500);
  if (keyCombo){
    if(keyCombo.ctrl)await page.keyboard.down('Control');
    if(keyCombo.alt)await page.keyboard.down('Alt');
    if(keyCombo.shift)await page.keyboard.down('Shift');
    await page.keyboard.press(keyCombo.key);
    if(keyCombo.ctrl)await page.keyboard.up('Control');
    if(keyCombo.alt)await page.keyboard.up('Alt');
    if(keyCombo.shift)await page.keyboard.up('Shift');
  }
  await page.waitForTimeout(900);
  await dump(label, page);
  await ctx.close();
}
await modal({ctrl:true,key:'k'},'command-palette');
await modal({alt:true,shift:true,key:' '},'scratchpad');
await modal(null,'orb-setup');
await browser.close();
