import {test} from 'node:test'
import assert from 'node:assert/strict'
import {inspectWhaleArt,verifySharedFrame,verifyPixelWalkingFeet} from '../scripts/check-whale-art.mjs'

const audit=inspectWhaleArt()
test('all 208 shipped whale frames retain shared identity, connected tails, complete feet and matching form poses',async()=>{
 const {report}=await audit
 assert.equal(report.frames,208);assert.equal(report.actionsPerForm,13)
 assert.ok(report.sourceLayersVerified>=40)
})
test('the identity checks reject changed faces, shoes and robots instead of accepting only frame counts',async()=>{
 const {packs,identity}=await audit
 for(const form of ['hd','pixel'] as const)for(const [name,rect]of Object.entries(identity.protectedRegions[form]) as [string,number[]][]){
  const frames={...packs[form].frames},source=frames.build[0],changed={...source,data:Buffer.from(source.data)}
  frames.build=[changed,...frames.build.slice(1)]
  const [x,y,w,h]=rect;let target=-1
  for(let dy=0;dy<h!&&target<0;dy++)for(let dx=0;dx<w!;dx++){
   const at=((y!+dy)*changed.width+x!+dx)*4;if(changed.data[at+3]>128){target=at;break}
  }
  assert.ok(target>=0);changed.data[target]^=255
  assert.throws(()=>verifySharedFrame(form,'build',0,frames,identity),new RegExp(name))
 }
})
test('the tail check rejects a severed connection even when face, shoes and robot are intact',async()=>{
 const {packs,identity}=await audit,frames={...packs.hd.frames},source=frames.build[0],changed={...source,data:Buffer.from(source.data)}
 frames.build=[changed,...frames.build.slice(1)]
 for(let y=0;y<changed.height;y++)for(let x=350;x<375;x++)changed.data.fill(0,(y*changed.width+x)*4,(y*changed.width+x+1)*4)
 assert.throws(()=>verifySharedFrame('hd','build',0,frames,identity),/tail is detached/)
})
test('walking checks reject a floating shoe detached from the leg',async()=>{
 const {packs}=await audit,f=packs.pixel.frames['walk-left'][0],changed={...f,data:Buffer.from(f.data)}
 // A loose black pixel in the shoe band reproduces the disconnected-foot defect.
 changed.data.set([8,11,20,255],(57*f.width+46)*4)
 assert.throws(()=>verifyPixelWalkingFeet(changed),/detached/)
})
