import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1280, height:850 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1500)
// open lightbox via a luxury card image button
await p.evaluate(() => { const el = document.querySelector('.luxury-image'); if (el) el.click(); })
await p.waitForTimeout(700)
await p.screenshot({ path:'redesign-shots/v4-modal.png', fullPage:false })
await b.close(); console.log('modal shot done')
