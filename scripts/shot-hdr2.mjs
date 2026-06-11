import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1440, height:520 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1500)
await p.screenshot({ path:'redesign-shots/v9-header.png', clip:{x:0,y:0,width:1440,height:170} })
// hover a nav item to show underline
const dlv = await p.$$('.experience-nav button')
if (dlv[2]) { await dlv[2].hover(); await p.waitForTimeout(400) }
await p.screenshot({ path:'redesign-shots/v9-nav-hover.png', clip:{x:430,y:30,width:600,height:90} })
await b.close(); console.log('done')
