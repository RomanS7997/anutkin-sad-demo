import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1180, height:760 } })
await p.goto('http://127.0.0.1:4177/#/catalog', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1700)
await p.evaluate(() => { const el=document.querySelector('.catalog-page-grid .luxury-image'); if(el) el.click(); })
await p.waitForTimeout(700)
await p.screenshot({ path:'redesign-shots/v21-chr.png', fullPage:false })
await b.close(); console.log('done')
