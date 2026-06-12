import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1800)
await p.evaluate(() => { const e = document.querySelector('.reviews-band'); window.scrollTo(0, e.offsetTop - 100) })
await p.waitForTimeout(800)
const snap = () => p.evaluate(() => Array.from(document.querySelectorAll('.marquee-row')).map(r => {
  const m = getComputedStyle(r).transform
  return { t: m, state: getComputedStyle(r).animationPlayState, w: Math.round(r.getBoundingClientRect().width) }
}))
const a = await snap()
await p.waitForTimeout(1600)
const c = await snap()
console.log('row widths:', a.map(x => x.w).join(', '))
a.forEach((x, i) => {
  const m1 = x.t.match(/-?[\d.]+(?=\)$)/) // last value ~ tx? use full compare
  console.log(`row${i + 1}: state=${x.state} moved=${x.t !== c[i].t}`)
})
// тап по карточке второй ленты — не должна залипнуть
await p.touchscreen.tap(195, 700)
await p.waitForTimeout(300)
const d = await snap()
await p.waitForTimeout(1300)
const e2 = await snap()
d.forEach((x, i) => console.log(`after tap row${i + 1}: moved=${x.t !== e2[i].t} state=${x.state}`))
await b.close()
