import {test} from 'node:test'
import assert from 'node:assert/strict'
import {paintFormTransition,type CharacterLayer} from '../src/client/form-transition'

test('scan reveals the destination above the boundary and preserves the source below',()=>{
 const images:unknown[]=[],clips:number[][]=[],fills:number[][]=[]
 const g={save(){},restore(){},beginPath(){},rect(...r:number[]){clips.push(r)},clip(){},drawImage(image:unknown){images.push(image)},fillRect(...r:number[]){fills.push(r)},createLinearGradient(){return {addColorStop(){}}}} as unknown as CanvasRenderingContext2D
 const from:CharacterLayer={image:{} as HTMLImageElement,frame:{atlas:'a',x:0,y:0,w:64,h:64,anchorX:32,anchorY:56,durationMs:125},x:20,y:10,width:80,height:80,mirror:false,smooth:false},to={...from,image:{} as HTMLImageElement,smooth:true}
 paintFormTransition(g,from,to,.5)
 assert.deepEqual(images,[from.image,to.image])
 assert.deepEqual(clips.slice(0,2),[[20,50,80,40],[20,10,80,40]])
 assert.ok(fills.every(([x,,w])=>x!>=20&&x!+w!<=100),'Scanner stays within the actor area')
 for(const progress of [-1,1,2]){
  images.length=0;clips.length=0;fills.length=0
  paintFormTransition(g,from,to,progress)
  assert.deepEqual(images,[progress<0?from.image:to.image]);assert.equal(clips.length,0);assert.equal(fills.length,0)
 }
})
