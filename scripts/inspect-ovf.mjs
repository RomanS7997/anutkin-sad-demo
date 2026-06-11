import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1440, height:800 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1200)
const r = await p.evaluate(() => {
  const out=[]; let el=document.querySelector('.experience-header');
  while (el) { const c=getComputedStyle(el); out.push({ tag: el.tagName+'.'+(el.className||'').toString().split(' ').slice(0,2).join('.'), ox:c.overflowX, oy:c.overflowY, pos:c.position, transform:c.transform!=='none' }); el=el.parentElement; }
  return out;
})
console.log(JSON.stringify(r,null,2))
await b.close()
