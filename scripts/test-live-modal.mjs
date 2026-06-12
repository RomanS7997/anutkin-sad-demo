import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const m = await b.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:3, hasTouch:true, isMobile:true })
const errs = []
m.on('pageerror', e => errs.push(e.message.slice(0,150)))
await m.goto('https://romans7997.github.io/anutkin-sad-demo/#/catalog', { waitUntil:'load', timeout:60000 }).catch(()=>{})
await m.waitForTimeout(3000)
// реальный ТАП по фото первой карточки
const box = await m.evaluate(() => { const e=document.querySelector('.catalog-page-grid .luxury-image'); if(!e) return null; const r=e.getBoundingClientRect(); window.scrollTo(0, r.top+window.scrollY-200); return null; })
await m.waitForTimeout(600)
const box2 = await m.evaluate(() => { const e=document.querySelector('.catalog-page-grid .luxury-image'); const r=e.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2 } })
await m.touchscreen.tap(box2.x, box2.y)
await m.waitForTimeout(900)
const r = await m.evaluate(() => ({ lightbox: !!document.querySelector('.photo-lightbox'), fit: document.querySelector('.photo-zoom-area img') ? getComputedStyle(document.querySelector('.photo-zoom-area img')).objectFit : null }))
console.log('LIVE mobile tap:', JSON.stringify(r), 'errors:', errs.length ? errs : 'none')
await m.screenshot({ path:'redesign-shots/live-modal-tap.png' })
await b.close()
