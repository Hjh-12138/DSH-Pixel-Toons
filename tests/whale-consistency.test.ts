import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parsePackManifest,packFrameAt,PACK_ACTIONS} from '../src/client/resource-pack'

test('the consistent HD pack provides thirteen independently addressable eight-frame actions',()=>{
  const character=parsePackManifest(JSON.parse(readFileSync('assets/characters/whale-dual-hd/manifest.json','utf8'))).character!
  assert.equal(character.rendering,'smooth');assert.equal(character.referenceHeight,336)
  assert.deepEqual(new Set(Object.keys(character.actions)),new Set(PACK_ACTIONS))
  assert.equal(Object.keys(character.atlases).length,7)
  for(const action of PACK_ACTIONS){
    const clip=character.actions[action]!
    assert.equal(clip.frames.length,8);assert.equal(clip.loop,action!=='success'&&action!=='failed')
    assert.equal(new Set(clip.frames.map(f=>`${f.atlas}:${f.x}:${f.y}`)).size,8)
    clip.frames.forEach((frame,i)=>{
      assert.equal(frame.durationMs,125);assert.equal(frame.h,512);assert.equal(frame.anchorY,448)
      assert.equal(packFrameAt(clip,i*.125),frame)
      if(action==='agents'){assert.equal(frame.w,768);assert.equal(frame.anchorX,384)}
      else {assert.equal(frame.w,512);assert.equal(frame.anchorX,action==='walk-left'?192:action==='walk-right'?320:256)}
    })
    assert.equal(packFrameAt(clip,1),clip.frames[clip.loop?0:7])
  }
})
