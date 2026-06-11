import { chromium } from 'playwright-core'
let b; try { b = await chromium.launch({ channel:'chrome', headless:true }) } catch { b = await chromium.launch({ headless:true }) }
const p = await b.newPage({ viewport:{ width:1600, height:900 } })
await p.goto('http://127.0.0.1:4177/', { waitUntil:'load' }).catch(()=>{})
await p.waitForTimeout(1500)
await p.evaluate(async () => { const h=document.documentElement.scrollHeight; for(let y=0;y<=h;y+=600){window.scrollTo(0,y); await new Promise(r=>setTimeout(r,40))} window.scrollTo(0,0) })
await p.waitForTimeout(500)
const r = await p.evaluate(() => {
  const pick=(s)=>{const e=document.querySelector(s); if(!e)return null; const b=e.getBoundingClientRect(); const c=getComputedStyle(e); return {w:Math.round(b.width),h:Math.round(b.height),ar:c.aspectRatio,ofit:c.objectFit,pos:c.position}};
  return {
    section: pick('.signature-section'),
    frame: pick('.signature-frame'),
    photo: pick('.signature-photo'),
    photoImg: pick('.signature-photo img'),
    thumbs: pick('.signature-thumbs'),
    thumb: pick('.signature-thumb'),
    thumbImg: pick('.signature-thumb img'),
  }
})
console.log(JSON.stringify(r,null,2))
await b.close()
