import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {workPackAction,resolvePackClip,parsePackManifest,packFrameAt} from '../src/client/resource-pack'

test('work phases select independent clips while walking and reactions retain priority',()=>{
 for(const [phase,action] of [['building','build'],['git','git'],['agents','agents']] as const){
  assert.equal(workPackAction(phase==='agents'?'search':'check',phase,true),action)
  for(const protectedAction of ['idle','walk-left','walk-right','success','failed'] as const)assert.equal(workPackAction(protectedAction,phase,true),protectedAction)
  assert.equal(workPackAction('check',phase,false),'check')
 }
 assert.equal(workPackAction('check','testing',true),'check')
})
test('both whale forms provide independent front work clips with matching one-second timing',()=>{
 const hd=parsePackManifest(JSON.parse(readFileSync('assets/characters/whale-dual-hd/manifest.json','utf8'))).character!
 const pixel=parsePackManifest(JSON.parse(readFileSync('assets/characters/whale-dual-pixel/manifest.json','utf8'))).character!
 for(const character of [hd,pixel])for(const action of ['idle','check','build','git','agents'] as const){
  const {clip}=resolvePackClip(character,action),scale=character.rendering==='smooth'?1:8
  assert.equal(resolvePackClip(character,action).action,action);assert.equal(clip.loop,true);assert.equal(clip.frames.length,8)
  assert.equal(new Set(clip.frames.map(f=>`${f.atlas}:${f.x}:${f.y}`)).size,8)
  clip.frames.forEach((f,i)=>{assert.equal(f.durationMs,125);assert.equal(f.anchorY,448/scale);assert.equal(packFrameAt(clip,i*.125),f)})
  assert.equal(packFrameAt(clip,1),clip.frames[0])
 }
 const older={...pixel,actions:{idle:pixel.actions.idle,check:pixel.actions.check,search:pixel.actions.search}}
 assert.equal(resolvePackClip(older,'build').action,'check');assert.equal(resolvePackClip(older,'git').action,'check');assert.equal(resolvePackClip(older,'agents').action,'search')
 assert.equal(hd.actions.agents!.frames[0]!.w,768)
 assert.equal(hd.actions.agents!.frames[0]!.anchorX,384)
})
