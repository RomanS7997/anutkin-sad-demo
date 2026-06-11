import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1440, height:560 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1500)
const info = await p.evaluate(() => ({
  searchInHeader: !!document.querySelector('.header-search-wrap, .header-search, .header-search-btn'),
  controls: !!document.querySelector('.hero-controls, .hero-dots, .hero-carousel-ctl'),
  totalImgs: document.querySelectorAll('.hero-carousel img').length,
  imgsWithSrc: Array.from(document.querySelectorAll('.hero-carousel img')).filter(i=>i.getAttribute('src')).length,
  caption1: document.querySelector('.hero-caption__info strong')?.textContent,
}))
await p.screenshot({ path:'redesign-shots/v18-hero-a.png', clip:{x:740,y:60,width:700,height:480} })
// wait for auto-rotate (~5s) and capture again
await p.waitForTimeout(5200)
const caption2 = await p.evaluate(() => document.querySelector('.hero-caption__info strong')?.textContent)
await p.screenshot({ path:'redesign-shots/v18-hero-b.png', clip:{x:740,y:60,width:700,height:480} })
await b.close()
console.log(JSON.stringify({...info, caption2}, null, 2))
