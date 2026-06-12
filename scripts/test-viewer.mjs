import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
// desktop
const p = await b.newPage({ viewport:{ width:1280, height:900 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1600)
await p.evaluate(() => { document.querySelector('.hero-carousel')?.click() })
await p.waitForTimeout(700)
const d = await p.evaluate(() => {
  const img = document.querySelector('.photo-zoom-area img')
  const stage = document.querySelector('.photo-stage')
  return { open: !!img, fit: img && getComputedStyle(img).objectFit, bg: stage && getComputedStyle(stage).backgroundColor }
})
console.log('desktop viewer:', JSON.stringify(d))
await p.screenshot({ path:'redesign-shots/viewer-desktop.png' })
await p.close()
// mobile
const m = await b.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:3, hasTouch:true, isMobile:true })
await m.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await m.waitForTimeout(1700)
await m.evaluate(() => { document.querySelector('.hero-carousel')?.click() })
await m.waitForTimeout(700)
const mm = await m.evaluate(() => {
  const img = document.querySelector('.photo-zoom-area img')
  const panel = document.querySelector('.photo-panel')
  const foot = document.querySelector('.photo-foot')
  const fr = foot?.getBoundingClientRect()
  return { open: !!img, fit: img && getComputedStyle(img).objectFit,
    panelDisplay: panel && getComputedStyle(panel).display,
    footVisible: fr ? fr.bottom <= 845 && fr.top > 0 : false }
})
console.log('mobile viewer:', JSON.stringify(mm))
await m.screenshot({ path:'redesign-shots/viewer-mobile.png' })
await b.close()
