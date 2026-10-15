import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {decodePreferences} from '../src/client/preferences'
import {whaleForm,WHALE_FORM_IDS} from '../src/client/whale-forms'
import {readLocalPack,parsePackManifest,checkFrameBounds,packFrameAt,packReactionSeconds,ACTIONS} from '../src/client/resource-pack'
import {playbackAction} from '../src/client/animation'
import type {MascotDraw} from '../src/engine/script'

test('whale selection persists without changing scene, style or compact preference',()=>{
  for(const form of ['pixel','hd'] as const){
    const prefs=decodePreferences(JSON.stringify({characterPackId:WHALE_FORM_IDS[form],scenePackId:'custom-garden',compact:true,style:'all'}))
    assert.equal(whaleForm(prefs.characterPackId),form)
    assert.equal(prefs.scenePackId,'custom-garden');assert.equal(prefs.compact,true);assert.equal(prefs.style,'all')
  }
  assert.equal(whaleForm('builtin-silver-music'),undefined)
})

test('both actual whale archives import with proportional anchors and independent animation timing',async()=>{
  const packs=await Promise.all(['pixel','hd'].map(async form=>readLocalPack(new Blob([readFileSync(`examples/character-packs/whale-dual-${form}.toons.zip`)]))))
  const [pixel,hd]=packs.map(p=>p.manifest.character!)
  assert.equal(hd!.rendering,'smooth');assert.equal(pixel!.rendering,'pixelated')
  for(const pack of packs){
    const c=pack.manifest.character!,images:Record<string,{width:number;height:number}>={}
    for(const [id,path] of Object.entries(c.atlases)){
      const bytes=Buffer.from(await pack.assets[path]!.arrayBuffer())
      if(path.endsWith('.webp')){assert.equal(bytes.toString('ascii',12,16),'VP8L');const bits=bytes.readUInt32LE(21);images[id]={width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1}}
      else images[id]={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}
    }
    checkFrameBounds(c,images)
  }
  for(const action of ACTIONS){
    const a=pixel!.actions[action]!,b=hd!.actions[action]!
    assert.equal(a.frames.length,8);assert.equal(b.frames.length,8);assert.equal(a.loop,b.loop)
    for(let i=0;i<8;i++){
      const p=a.frames[i]!,h=b.frames[i]!
      assert.equal(h.durationMs,125)
      for(const key of ['w','h','anchorY'] as const)assert.equal(h[key],p[key]*8)
      // HD walking has a wider trailing tail. Offset its canvas anchor while
      // retaining the same world-space foot point instead of clipping the fluke.
      assert.equal(h.anchorX,action==='walk-left'?192:action==='walk-right'?320:p.anchorX*8)
    }
    const seconds=a.frames.reduce((s,f)=>s+f.durationMs,0)/1000
    assert.equal(packFrameAt(a,seconds),a.frames[a.loop?0:7]);assert.equal(packFrameAt(b,b.frames.reduce((s,f)=>s+f.durationMs,0)/1000),b.frames[b.loop?0:7])
  }
  assert.equal(hd!.actions.idle.frames.reduce((s,f)=>s+f.durationMs,0),1000)
  const mascot={look:{pose:'stand'}} as MascotDraw,duration=packReactionSeconds(hd,'failed')
  assert.equal(duration,1)
  assert.equal(packReactionSeconds(pixel,'failed'),1.4)
  assert.equal(playbackAction(mascot,'running','failed',{time:.999,outcomeAge:.999,playing:true,working:false},duration),'failed')
  assert.equal(playbackAction(mascot,'running','failed',{time:1,outcomeAge:1,playing:true,working:false},duration),'idle')
  const raw=JSON.parse(readFileSync('assets/characters/whale-dual-hd/manifest.json','utf8'));raw.character.rendering='unsafe'
  assert.throws(()=>parsePackManifest(raw),/绘制方式/)
})
