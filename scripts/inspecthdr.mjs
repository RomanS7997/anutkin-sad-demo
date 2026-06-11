import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1280, height:800 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1200)
const r = await p.evaluate(() => {
  const out={};
  for (const s of ['.experience-header','.experience-nav','.header-meta','.header-brand-zone']) {
    const e=document.querySelector(s); if(!e){out[s]='none';continue}
    const c=getComputedStyle(e);
    out[s]={borderBottom:c.borderBottom, boxShadow:c.boxShadow.slice(0,60), bg:c.backgroundColor};
  }
  return out;
})
console.log(JSON.stringify(r,null,2))
await b.close()
