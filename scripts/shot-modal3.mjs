import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1200, height:780 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1800)
// open a product with a longer description — navigate catalog then click one
await p.evaluate(() => { const el=document.querySelector('.luxury-image'); if(el) el.click(); })
await p.waitForTimeout(600)
await p.screenshot({ path:'redesign-shots/v21-modal-top.png', fullPage:false })
// scroll the description down
await p.evaluate(() => { const d=document.querySelector('.photo-details'); if(d) d.scrollTop = 220; })
await p.waitForTimeout(400)
const st = await p.evaluate(() => { const d=document.querySelector('.photo-details'); return { scrollTop:d.scrollTop, scrollH:d.scrollHeight, clientH:d.clientHeight, footVisible: (()=>{const f=document.querySelector('.photo-foot'); const r=f.getBoundingClientRect(); const dr=d.getBoundingClientRect(); return r.bottom<=dr.bottom+2 && r.bottom>dr.top;})() }; })
await p.screenshot({ path:'redesign-shots/v21-modal-scrolled.png', fullPage:false })
await b.close(); console.log(JSON.stringify(st))
