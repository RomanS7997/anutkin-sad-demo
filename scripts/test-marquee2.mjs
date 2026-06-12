import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1800)
await p.evaluate(() => { const e = document.querySelector('.reviews-band'); window.scrollTo(0, e.offsetTop - 100) })
await p.waitForTimeout(800)
const snap = () => p.evaluate(() => Array.from(document.querySelectorAll('.marquee-row')).map(r => ({
  sl: Math.round(r.scrollLeft * 10) / 10,
  anim: getComputedStyle(r).animationName,
  cardsInView: Array.from(r.querySelectorAll('.review-card')).filter(c => { const b = c.getBoundingClientRect(); return b.right > 0 && b.left < 390 }).length,
})))
const a = await snap()
await p.waitForTimeout(2000)
const c = await snap()
a.forEach((x, i) => console.log(`row${i+1}: anim=${x.anim} scroll ${x.sl} -> ${c[i].sl} (drift=${Math.round((c[i].sl - x.sl)*10)/10}) cardsVisible=${c[i].cardsInView}`))
// свайп пальцем — дрейф должен пауз+возобновиться, и ряд остаётся листаемым
await p.touchscreen.tap(195, 640)
await p.waitForTimeout(400)
const d = await snap()
await p.waitForTimeout(3600)
const e2 = await snap()
console.log('after touch: paused drift=', Math.round((e2[0].sl - d[0].sl)*10)/10, '(резюм после 3.5с паузы → >0)')
await b.close()
