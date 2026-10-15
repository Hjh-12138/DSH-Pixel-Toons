import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {zipSync} from 'fflate'
import sharp from 'sharp'
import {nativeSpriteEntries,NATIVE_SPRITES} from '../src/client/native-sprites'
import {readBuiltinPackArchive} from '../src/builtin-pack-files'

test('lazy native WebP sprites preserve every original RGBA pixel and image dimension',async()=>{
 const response=await readBuiltinPackArchive('default-deepseek'),files=nativeSpriteEntries(Buffer.from(response.archive,'base64'))
 for(const id of NATIVE_SPRITES){
  const original=await sharp(readFileSync(`assets/animations/${id}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const decoded=await sharp(files[id+'.webp']).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  assert.equal(decoded.info.width,original.info.width);assert.equal(decoded.info.height,original.info.height)
  assert.deepEqual(decoded.data,original.data,id)
 }
})
test('native sprite archives reject missing, unexpected and disguised image entries',()=>{
 const files=nativeSpriteEntries(readFileSync('assets/runtime/native-sprites.zip'))
 const missing={...files};delete missing['walk.webp'];assert.throws(()=>nativeSpriteEntries(zipSync(missing)),/不完整/)
 assert.throws(()=>nativeSpriteEntries(zipSync({...files,'surprise.webp':files['idle.webp']})),/不完整/)
 assert.throws(()=>nativeSpriteEntries(zipSync({...files,'walk.webp':new Uint8Array([1,2,3])})))
})
