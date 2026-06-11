import { chromium } from 'playwright-core'
let browser
try { browser = await chromium.launch({ channel: 'chrome', headless: true }) }
catch { browser = await chromium.launch({ headless: true }) }
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 1 })
await page.goto('http://127.0.0.1:4177/', { waitUntil: 'load' }).catch(()=>{})
await page.waitForTimeout(1500)
const r = await page.evaluate(() => {
  const pick = (sel) => { const e=document.querySelector(sel); if(!e) return null; const c=getComputedStyle(e); const b=e.getBoundingClientRect(); return {pos:c.position, top:Math.round(b.top), left:Math.round(b.left), w:Math.round(b.width), h:Math.round(b.height), z:c.zIndex}; };
  return { orbit: pick('.hero-orbit'), word: pick('.hero-word'), frame: pick('.hero-photo-frame'), visual: pick('.hero-visual-v3'), eyebrow: pick('.hero-copy-v2 .eyebrow'), bodyW: document.body.getBoundingClientRect().width, scrollW: document.documentElement.scrollWidth };
})
console.log(JSON.stringify(r, null, 2))
await browser.close()
