import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1440, height:900 } })
const routes = ['', '#/catalog', '#/delivery', '#/about', '#/product/2286']
for (const r of routes) {
  await p.goto('http://127.0.0.1:4177/'+r, { waitUntil:'load' }).catch(()=>{})
  await p.waitForTimeout(1200)
  const info = await p.evaluate(() => {
    const box = (sel) => { const e=document.querySelector(sel); if(!e) return null; const b=e.getBoundingClientRect(); return {l:Math.round(b.left), r:Math.round(b.right), w:Math.round(b.width)}; };
    const hdr = box('.experience-header');
    // find the first main content section after header
    const main = document.querySelector('.experience-shell > section, .experience-shell main, main > section');
    const candidates = ['.page-hero','.catalog-toolbar','.experience-hero','.delivery-hero','.about-hero','.catalog-page-grid','.editorial-section','.section'];
    let content=null, contentSel=null;
    for (const c of candidates) { const e=document.querySelector(c); if(e){ const bb=e.getBoundingClientRect(); content={l:Math.round(bb.left),r:Math.round(bb.right),w:Math.round(bb.width)}; contentSel=c; break; } }
    return { hdr, content, contentSel };
  })
  console.log((r||'home').padEnd(16), 'header w='+(info.hdr?.w), 'l='+(info.hdr?.l), '| content('+info.contentSel+') w='+(info.content?.w), 'l='+(info.content?.l))
}
await b.close()
