import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1200, height:780 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1800)
await p.evaluate(() => { const el = document.querySelector('.luxury-image'); if (el) el.click(); })
await p.waitForTimeout(700)
const info = await p.evaluate(() => ({
  thumbs: !!document.querySelector('.photo-thumbs'),
  descH: Math.round((document.querySelector('.photo-details > p:not(.eyebrow)')||{}).getBoundingClientRect?.().height || 0),
}))
await p.screenshot({ path:'redesign-shots/v20-modal.png', fullPage:false })
await b.close(); console.log(JSON.stringify(info))
