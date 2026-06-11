import { chromium } from 'playwright-core'
const [, , urlArg, outArg, wArg] = process.argv
const url = urlArg || 'http://127.0.0.1:4177/'
const out = outArg || 'shot.png'
const width = parseInt(wArg || '1280', 10)
let browser
try { browser = await chromium.launch({ channel: 'chrome', headless: true }) }
catch { browser = await chromium.launch({ headless: true }) }
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(()=>{})
await page.waitForTimeout(1500)
// force every reveal visible so fullPage shows true layout
await page.addStyleTag({ content: '.reveal{opacity:1 !important;transform:none !important;}' })
await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in-view')))
await page.evaluate(() => document.fonts && document.fonts.ready).catch(()=>{})
await page.waitForTimeout(500)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log('saved', out)
