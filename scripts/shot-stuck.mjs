import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1440, height:300 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1500)
await p.evaluate(async () => { for(let y=0;y<=450;y+=150){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))} })
await p.waitForTimeout(500)
const stuck = await p.evaluate(() => document.querySelector('.experience-header')?.classList.contains('is-stuck'))
await p.screenshot({ path:'redesign-shots/v8-stuck2.png', fullPage:false })
await b.close(); console.log('is-stuck:', stuck)
