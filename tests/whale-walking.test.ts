import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pngPixels} from './helpers/png'

const walking=pngPixels(new URL('../assets/animations/walk.png',import.meta.url))
const idle=pngPixels(new URL('../assets/animations/idle.png',import.meta.url))
const rig=JSON.parse(readFileSync(new URL('../design/deepseek-walk-aligned-v1/rig.json',import.meta.url),'utf8')) as {
 sourceFrame:{w:number;h:number}
 sourceOffset:{x:number;y:number}
 floor:number
 bob:number[]
 gait:[number,number][][]
 limbs:{hipY:number;ankleY:number;region:[number,number,number,number]}[]
}
const {pixels,width,height}=walking,{x:offsetX,y:offsetY}=rig.sourceOffset
const pixel=(frame:number,x:number,y:number)=>((Math.floor(frame/4)*512+y)*width+frame%4*512+x)*4
const legs=Array.from({length:8},(_,f)=>['near','far'].map(side=>
 pngPixels(new URL(`../design/deepseek-walk-aligned-v1/legs/${side}/${f+1}.png`,import.meta.url))))

test('default Deep seek keeps both blue eyes visible in every near-front walking phase',()=>{
 assert.equal(width,2048);assert.equal(height,1024)
 for(let f=0;f<8;f++){
  const eyes=[0,0]
  for(let y=203;y<235;y++)for(let x=151;x<279;x++){
   const at=pixel(f,x+offsetX,y+offsetY+rig.bob[f]!),r=pixels[at]!,g=pixels[at+1]!,b=pixels[at+2]!
   if(pixels[at+3]!>80&&b>140&&g>90&&b>r+60)eyes[x<215?0:1]!++
  }
  assert.ok(eyes.every(n=>n>20),`frame ${f+1} must retain both blue eyes`)
 }
})

test('default walking preserves the original idle face, hair, hands, dress and tail at one pixel scale',()=>{
 // Compare against the standing artwork, including the low skirt and tail.
 // Only the independently articulated original legs are excluded.
 for(let f=0;f<8;f++){
  let checked=0
  for(let y=0;y<rig.sourceFrame.h;y++)for(let x=0;x<rig.sourceFrame.w;x++){
   if(rig.limbs.some(({region:[x0,y0,x1,y1]})=>x>=x0&&x<x1&&y>=y0&&y<y1))continue
   const source=(y*idle.width+x)*4
   if(idle.pixels[source+3]!<128)continue
   const target=pixel(f,x+offsetX,y+offsetY+rig.bob[f]!)
   for(let c=0;c<4;c++)assert.equal(pixels[target+c],idle.pixels[source+c],`standing body changed in frame ${f+1} at ${x},${y}`)
   checked++
  }
  assert.ok(checked>85000,'compare the complete original body and clothing')
 }
})

test('each original shoe keeps its complete shape, material and size through all eight phases',()=>{
 for(let f=0;f<8;f++)for(let side=0;side<2;side++){
  const layer=legs[f]![side]!,limb=rig.limbs[side]!,[dx,dy]=rig.gait[f]![side]!
  let checked=0
  // Below the ankle the complete original shoe must only translate. Include
  // antialiased pixels as well as its solid toe, strap and white highlight.
  for(let y=limb.ankleY;y<=434;y++)for(let x=limb.region[0];x<limb.region[2];x++){
   const source=(y*idle.width+x)*4
   if(!idle.pixels[source+3])continue
   const target=((y+offsetY+dy)*layer.width+x+offsetX+dx)*4
   for(let c=0;c<4;c++)assert.equal(layer.pixels[target+c],idle.pixels[source+c],`shoe ${side+1} changes shape or colour in frame ${f+1}`)
   checked++
  }
  assert.ok(checked>1200,'the comparison must include the entire original shoe')
 }
})

test('the two original feet alternate support without any airborne frame',()=>{
 for(let f=0;f<8;f++){
  const bottoms=legs[f]!.map(layer=>{
   let bottom=-1
   for(let y=400;y<layer.height;y++)for(let x=170;x<330;x++)if(layer.pixels[(y*layer.width+x)*4+3]!>80)bottom=y
   return bottom
  })
  const support=f<4?0:1,swing=1-support
  assert.equal(bottoms[support],rig.floor,`the supporting shoe leaves the floor in frame ${f+1}`)
  assert.ok(bottoms[swing]!<rig.floor,`the other foot must recover in frame ${f+1}`)
  let contacts=0
  for(let x=170;x<330;x++)if(pixels[pixel(f,x,rig.floor)+3]!>80)contacts++
  assert.ok(contacts>=10,`the shipped frame ${f+1} must have a planted sole`)
 }
})

test('both walking feet remain connected to the unchanged body in every frame',()=>{
 for(let f=0;f<8;f++){
  const seen=new Uint8Array(512*512),queue=[(200+offsetY+rig.bob[f]!)*512+212+offsetX]
  seen[queue[0]!]=1
  for(let i=0;i<queue.length;i++){
   const p=queue[i]!,x=p%512,y=Math.floor(p/512)
   for(const [nx,ny]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
    if(nx!<0||nx!>=512||ny!<0||ny!>=512)continue
    const next=ny!*512+nx!
    if(!seen[next]&&pixels[pixel(f,nx!,ny!)+3]!>=80){seen[next]=1;queue.push(next)}
   }
  }
  for(let side=0;side<2;side++){
   const [dx,dy]=rig.gait[f]![side]!,shoe=(421+offsetY+dy)*512+(side?242:183)+offsetX+dx
   assert.equal(seen[shoe],1,`shoe ${side+1} is detached from the body in frame ${f+1}`)
  }
 }
})
