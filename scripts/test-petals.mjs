import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1440, height:760 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(2000)
const r = await p.evaluate(() => {
  const petals = Array.from(document.querySelectorAll('.hero-petals .petal'));
  const ys = petals.map(e => Math.round(e.getBoundingClientRect().top));
  const xs = petals.map(e => Math.round(e.getBoundingClientRect().left));
  const sizes = petals.map(e => Math.round(e.getBoundingClientRect().width));
  return { count: petals.length, hasShape: !!document.querySelector('.petal__sway .petal__shape'),
    yMin: Math.min(...ys), yMax: Math.max(...ys), uniqueY: new Set(ys).size,
    xSpread: Math.max(...xs)-Math.min(...xs), sizeMin: Math.min(...sizes), sizeMax: Math.max(...sizes) };
})
console.log(JSON.stringify(r, null, 2))
await b.close()
