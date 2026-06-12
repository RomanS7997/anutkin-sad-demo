import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1280, height:900 } })
p.on('pageerror', e => console.log('PAGEERR:', e.message.slice(0, 300)))
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)) })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1500)
await p.evaluate(() => { document.querySelector('.luxury-image')?.click() })
await p.waitForTimeout(600)
await p.evaluate(() => {
  const a = document.querySelector('.photo-zoom-area'); const r = a.getBoundingClientRect()
  a.dispatchEvent(new MouseEvent('click', { bubbles:true, clientX:r.left + r.width*0.3, clientY:r.top + r.height*0.4 }))
})
await p.waitForTimeout(400)
const state = await p.evaluate(() => ({
  lightbox: !!document.querySelector('.photo-lightbox'),
  stage: document.querySelector('.photo-stage')?.className || null,
  img: !!document.querySelector('.photo-zoom-area img'),
  imgStyle: document.querySelector('.photo-zoom-area img')?.getAttribute('style') || null,
}))
console.log('after click:', JSON.stringify(state))
await b.close()
