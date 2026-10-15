import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DecodedCache} from '../src/client/decoded-cache'

test('decoded resources deduplicate pending loads and reuse the same image object',async()=>{
 const cache=new DecodedCache(100),value={image:{}},read=()=>Promise.resolve(value)
 const first=cache.load('hd',read,()=>80),second=cache.load('hd',()=>{throw Error('duplicate')},()=>80)
 assert.equal(first,second);assert.equal(await first,value)
 assert.equal(await cache.load('hd',()=>{throw Error('decode again')},()=>80),value)
})
test('the decoded cache evicts least-recently-used images within its byte budget',async()=>{
 const cache=new DecodedCache(100)
 await cache.load('hd',async()=>1,()=>80);await cache.load('pixel',async()=>2,()=>10)
 await cache.load('hd',async()=>99,()=>80)
 await cache.load('other',async()=>3,()=>20)
 assert.equal(cache.bytes,100)
 let reloaded=false;await cache.load('pixel',async()=>{reloaded=true;return 2},()=>10)
 assert.ok(reloaded);assert.ok(cache.bytes<=100)
})
test('failed decoding, failed sizing and invalidated pending resources remain retryable',async()=>{
 const cache=new DecodedCache(100)
 await assert.rejects(cache.load('bad',async()=>{throw Error('decode')},()=>10),/decode/)
 assert.equal(await cache.load('bad',async()=>1,()=>10),1)
 await assert.rejects(cache.load('sizing',async()=>1,()=>{throw Error('size')}),/size/)
 assert.equal(await cache.load('sizing',async()=>2,()=>10),2)
 let resolve!:(value:number)=>void
 const old=cache.load('pack:cat:1',()=>new Promise<number>(r=>resolve=r),()=>80)
 await Promise.resolve();cache.invalidate('pack:cat:')
 const latest=cache.load('pack:cat:1',async()=>3,()=>10);resolve(1)
 assert.equal(await old,1);assert.equal(await latest,3)
 assert.equal(await cache.load('pack:cat:1',async()=>4,()=>80),3)
})
