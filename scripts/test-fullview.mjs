import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1280, height:900 } })
p.on('pageerror', e => console.log('PAGEERR:', e.message.slice(0,150)))
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1600)
// 1) открыть модалку с карточки
await p.evaluate(() => { document.querySelector('.luxury-image')?.click() })
await p.waitForTimeout(600)
// 2) клик по фото в модалке → фуллскрин
await p.evaluate(() => { document.querySelector('.photo-stage-open')?.click() })
await p.waitForTimeout(500)
const s1 = await p.evaluate(() => ({
  fullview: !!document.querySelector('.photo-fullview'),
  fit: document.querySelector('.photo-fullview__stage img') ? getComputedStyle(document.querySelector('.photo-fullview__stage img')).objectFit : null,
}))
console.log('1) fullview opened:', JSON.stringify(s1))
await p.screenshot({ path:'redesign-shots/fullview.png' })
// 3) зум в точку
await p.evaluate(() => { const a=document.querySelector('.photo-fullview__stage'); const r=a.getBoundingClientRect(); a.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*0.4,clientY:r.top+r.height*0.35})) })
await p.waitForTimeout(400)
const s2 = await p.evaluate(() => document.querySelector('.photo-fullview__stage img')?.style.transform || '(none)')
console.log('2) zoom:', s2)
await p.screenshot({ path:'redesign-shots/fullview-zoom.png' })
// 4) закрыть фуллскрин — модалка остаётся
await p.evaluate(() => { document.querySelector('.photo-fullview__close')?.click() })
await p.waitForTimeout(400)
const s3 = await p.evaluate(() => ({ fullview: !!document.querySelector('.photo-fullview'), modal: !!document.querySelector('.photo-lightbox') }))
console.log('3) after close:', JSON.stringify(s3))
await b.close()
