import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1440, height:560 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1500)
// 1: normal header
await p.screenshot({ path:'redesign-shots/v8-header.png', clip:{x:0,y:0,width:1440,height:200} })
// 2: hover Каталог to open mega-menu
const catBtn = await p.$('.nav-mega > button')
if (catBtn) { await catBtn.hover(); await p.waitForTimeout(500) }
await p.screenshot({ path:'redesign-shots/v8-mega.png', clip:{x:0,y:0,width:1440,height:430} })
// 3: sticky shrink — scroll down
await p.evaluate(() => window.scrollTo(0, 400))
await p.waitForTimeout(500)
await p.screenshot({ path:'redesign-shots/v8-stuck.png', clip:{x:0,y:0,width:1440,height:140} })
await b.close(); console.log('done')
