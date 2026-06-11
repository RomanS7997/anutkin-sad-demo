import { chromium } from 'playwright-core'
const [,,url,out,w,h]=process.argv
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:parseInt(w), height:400 } })
await p.goto(url, { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1500)
await p.screenshot({ path:out, clip:{x:0,y:0,width:parseInt(w),height:parseInt(h)} })
await b.close(); console.log('saved',out)
