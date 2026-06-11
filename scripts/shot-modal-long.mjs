import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1200, height:760 } })
await p.goto('http://127.0.0.1:4177/#/catalog', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1800)
// try opening cards until one overflows
let found = false, info = {}
const cards = await p.$$('.catalog-page-grid .luxury-image')
for (let i = 0; i < Math.min(cards.length, 12); i++) {
  await cards[i].click()
  await p.waitForTimeout(450)
  info = await p.evaluate(() => { const d=document.querySelector('.photo-details'); return d ? { over: d.scrollHeight - d.clientHeight, name: d.querySelector('h2')?.textContent } : {over:0}; })
  if (info.over > 30) { found = true; break }
  await p.evaluate(() => document.querySelector('.modal-close')?.click())
  await p.waitForTimeout(250)
}
// scroll a bit to show the berry scrollbar
await p.evaluate(() => { const d=document.querySelector('.photo-details'); if(d) d.scrollTop = Math.min(160, d.scrollHeight); })
await p.waitForTimeout(400)
await p.screenshot({ path:'redesign-shots/v21-modal-long.png', fullPage:false })
await b.close()
console.log('found overflow:', found, JSON.stringify(info))
