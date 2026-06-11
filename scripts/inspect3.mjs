import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1440, height:900 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1400)
const r = await p.evaluate(() => {
  const box=(s)=>{const e=document.querySelector(s); if(!e)return null; const b=e.getBoundingClientRect(); const c=getComputedStyle(e); return {left:Math.round(b.left),right:Math.round(b.right),w:Math.round(b.width),padL:c.paddingLeft,padR:c.paddingRight}};
  const brand=document.querySelector('.experience-header .brand'); const bb=brand?brand.getBoundingClientRect():null;
  return {
    header: box('.experience-header'),
    headerBrandLeft: bb?Math.round(bb.left):null,
    heroSection: box('.experience-hero'),
    heroCopyLeft: (()=>{const e=document.querySelector('.hero-copy-v2 h1'); return e?Math.round(e.getBoundingClientRect().left):null})(),
    categoryBand: box('.category-band'),
    editorial: box('.editorial-section'),
  }
})
console.log(JSON.stringify(r,null,2))
await b.close()
