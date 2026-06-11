// Reusable screenshot helper for design iteration.
// Usage: node scripts/shot.mjs <url> <outfile> <width> <height> <fullPage:true|false>
import { chromium } from 'playwright-core'

const [, , urlArg, outArg, wArg, hArg, fullArg] = process.argv
const url = urlArg || 'http://127.0.0.1:4177/'
const out = outArg || 'shot.png'
const width = parseInt(wArg || '1280', 10)
const height = parseInt(hArg || '900', 10)
const fullPage = (fullArg || 'true') === 'true'

async function launch() {
  // Prefer system Chrome; fall back to bundled chromium.
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch {
    return await chromium.launch({ headless: true })
  }
}

const browser = await launch()
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
try {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 })
} catch (e) {
  console.error('goto warning:', e.message)
}
// settle fonts/images without hanging on infinite animations
await page.waitForTimeout(1200)
await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
// scroll through to trigger IntersectionObserver reveals, then return to top
await page.evaluate(async () => {
  const h = document.documentElement.scrollHeight
  for (let y = 0; y <= h; y += 500) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 50))
  }
  window.scrollTo(0, 0)
})
await page.waitForTimeout(700)
await page.screenshot({ path: out, fullPage })
await browser.close()
console.log('saved', out, `(${width}x${height}, full=${fullPage})`)
