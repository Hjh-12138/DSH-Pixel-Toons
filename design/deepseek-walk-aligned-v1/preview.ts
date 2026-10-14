import sharp from 'sharp'
import {mkdirSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {animationBoundsFromPixels} from '../../src/client/sprite'
import {pngPixels} from '../../tests/helpers/png'
const root='design/deepseek-walk-aligned-v1',paths=['assets/animations/idle.png',root+'/sources/walk-before.png',root+'/walk-left.png',root+'/walk-left.png']
const labels=['Other actions / Idle','Previous walk','Aligned walk / Left','Aligned walk / Right']
const sheets=paths.map(file=>{const p=pngPixels(file);return animationBoundsFromPixels(p.pixels,p.width,p.height,[0,1])})
const reference=sheets[0].referenceHeight
sheets[2].referenceHeight=reference;sheets[3].referenceHeight=reference
mkdirSync(join(root,'preview-frames'),{recursive:true})
for(let f=0;f<8;f++){
 const layers=[]
 for(let i=0;i<paths.length;i++){
  const s=sheets[i],r=s.frames[i===0?0:f],c=r.crop,unit=160/s.referenceHeight
  let sprite=sharp(paths[i]).extract({left:c.x,top:c.y,width:c.w,height:c.h})
  if(i===3)sprite=sprite.flop()
  const image=await sprite.resize(Math.round(c.w*unit),Math.round(c.h*unit),{kernel:'nearest'}).png().toBuffer()
  const anchor=i===3?c.w-r.anchorX:r.anchorX
  layers.push({input:image,left:i*220+Math.round(110-anchor*unit),top:Math.round(202-r.anchorY*unit)})
 }
 const base=Buffer.from(`<svg width="880" height="230"><rect width="880" height="230" fill="#e8eaee"/><path d="M0 203H880" stroke="#a2aab7"/>${labels.map((label,i)=>`<text x="${i*220+110}" y="24" font-family="Segoe UI,Arial" font-size="14" fill="#263954" text-anchor="middle">${label}</text>`).join('')}<text x="870" y="222" text-anchor="end" font-size="12" fill="#637085">${f+1}/8</text></svg>`)
 await sharp(base).composite(layers).png().toFile(join(root,'preview-frames',`${f+1}.png`))
}
console.log(JSON.stringify({referenceHeight:reference,bodySource:'original idle pixels',frameMs:125}))
