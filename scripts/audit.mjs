import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const widths = [320, 360, 390, 414, 768, 1024, 1280, 1440]
const routes = ['', '#/catalog', '#/delivery', '#/about', '#/product/2286', '#/admin']
for (const w of widths) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } })
  const issues = []
  for (const r of routes) {
    await p.goto('http://127.0.0.1:4177/' + r, { waitUntil: 'load' }).catch(() => {})
    await p.waitForTimeout(900)
    const o = await p.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      kabinet: document.body.textContent.includes('Кабинет'),
      tabbar: !!document.querySelector('.mobile-tabbar') && getComputedStyle(document.querySelector('.mobile-tabbar')).display !== 'none',
    }))
    if (o.sw > o.cw + 1) issues.push(`${r || 'home'}: overflow ${o.sw}>${o.cw}`)
    if (o.kabinet) issues.push(`${r || 'home'}: Кабинет still present`)
    if (w <= 760 && !o.tabbar && (r === '' )) issues.push(`${r||'home'}: tabbar missing`)
    if (w > 760 && o.tabbar) issues.push(`${r || 'home'}: tabbar visible on desktop`)
  }
  console.log(`w=${w}: ${issues.length ? issues.join(' | ') : 'OK'}`)
  await p.close()
}
await b.close()
