import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1280, height:520 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1200)
await p.evaluate(() => { const f=document.querySelector('.footer-hero'); if(f) f.scrollIntoView({block:'start'}); })
await p.waitForTimeout(500)
await p.screenshot({ path:'redesign-shots/v6-footer-top.png', fullPage:false })
await b.close(); console.log('done')
