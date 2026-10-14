import {test} from 'node:test'
import assert from 'node:assert/strict'
import {paint} from '../src/client/sprite'
import type {MascotDraw} from '../src/engine/script'
import type {PackResources} from '../src/client/resource-pack'

test('HD paints at display resolution between the logical background and foreground, without moving the foot anchor',()=>{
 const events:{surface:string;image:unknown;smoothing:boolean;args:number[]}[]=[],transforms:number[][]=[]
 function context(surface:string,width:number,height:number){
  const g={canvas:{width,height,dataset:{} as Record<string,string>},imageSmoothingEnabled:false,clearRect(){},fillRect(){},fillText(){},save(){},restore(){},setTransform(...args:number[]){transforms.push(args)},drawImage(image:unknown,...args:number[]){events.push({surface,image,args,smoothing:g.imageSmoothingEnabled})}}
  return g as unknown as CanvasRenderingContext2D
 }
 const logical=context('logical',720,112),display=context('display',2160,336)
 const hero={width:512,height:512} as HTMLImageElement,bg={width:720,height:112} as HTMLImageElement,fg={...bg}
 const frames=[{atlas:'main',x:0,y:0,w:512,h:512,anchorX:256,anchorY:448,durationMs:125}]
 const resources:PackResources={character:{id:'hd',spec:{rendering:'smooth',referenceHeight:336,atlases:{main:'hero.png'},actions:{idle:{loop:true,stance:'standing',frames}}},images:{main:hero}},scene:{id:'garden',spec:{background:'bg.png',foreground:'fg.png',fit:'stretch',color:'#102030',centerX:.5,footY:.94,scale:1},background:bg,foreground:fg}}
 const frame={cells:new Uint32Array(90*8*3),cols:90,rows:8,t:0,mascots:[{x:1,py:1,look:{pose:'stand',scale:1,facing:0}} as MascotDraw]}
 paint(logical,frame,hero,[],'running','none',undefined,{time:0,outcomeAge:0,playing:true},resources,undefined,display)
 assert.deepEqual(events.map(e=>[e.surface,e.image===hero?'hero':e.image===bg?'bg':e.image===fg?'fg':'composite']),[['logical','bg'],['display','composite'],['display','hero'],['logical','fg'],['display','composite']])
 const drawn=events.find(e=>e.image===hero)!
 assert.equal(drawn.smoothing,true)
 assert.ok(transforms.some(t=>t[0]===3&&t[3]===3))
 assert.equal(drawn.args[4]!+drawn.args[6]!/2,360)
 assert.equal(logical.canvas.dataset.characterPack,'hd')
 assert.equal(logical.canvas.dataset.frame,'0')
})
