import { chromium } from 'playwright-core'
const [, , urlArg, outArg, wArg, hArg, scrollArg] = process.argv
const width = parseInt(wArg || '1280', 10)
const height = parseInt(hArg || '900', 10)
const scrollY = parseInt(scrollArg || '0', 10)
let browser
try { browser = await chromium.launch({ channel: 'chrome', headless: true }) }
catch { browser = await chromium.launch({ headless: true }) }
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
await page.goto(urlArg, { waitUntil: 'load', timeout: 60000 }).catch(()=>{})
await page.waitForTimeout(1200)
// gradual scroll to target (so observers fire naturally like a real user)
await page.evaluate(async (target) => {
  for (let y = 0; y <= target; y += 300) { window.scrollTo(0, y); await new Promise(r=>setTimeout(r,40)) }
  window.scrollTo(0, target)
}, scrollY)
await page.waitForTimeout(900)
await page.screenshot({ path: outArg, fullPage: false })
await browser.close()
console.log('saved', outArg, 'at scrollY', scrollY)
