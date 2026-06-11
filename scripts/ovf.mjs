import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
for (const w of [1440,1280,390,320]) {
  const p = await b.newPage({ viewport:{ width:w, height:900 } })
  await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
  await p.waitForTimeout(1000)
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  console.log(`w=${w} scrollWidth=${o.sw} clientWidth=${o.cw} overflow=${o.sw>o.cw+1?'YES':'no'}`)
  await p.close()
}
await b.close()
