import sharp from 'sharp'
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {join} from 'node:path'

const root='design/deepseek-walk-aligned-v1',size=512,offset={x:34,y:28},floor=460
for(const dir of ['sources','frames','legs/near','legs/far','preview-frames'])mkdirSync(join(root,dir),{recursive:true})
if(!existsSync(join(root,'sources/walk-before.png')))copyFileSync('assets/animations/walk.png',join(root,'sources/walk-before.png'))
const source=await sharp('assets/animations/idle.png').extract({left:0,top:0,width:444,height:443}).ensureAlpha().raw().toBuffer()
await sharp(source,{raw:{width:444,height:443,channels:4}}).png().toFile(join(root,'sources/idle-frame-1.png'))
const original=Buffer.alloc(size*size*4)
for(let y=0;y<443;y++)source.copy(original,((y+offset.y)*size+offset.x)*4,y*444*4,(y+1)*444*4)
const limbs=[{hipY:396,ankleY:408,region:[158,396,214,443]},{hipY:396,ankleY:408,region:[216,396,269,443]}]
const gait=[
 [[-10,0],[10,-2]],[[-5,0],[10,-6]],[[0,0],[2,-10]],[[5,0],[-5,-4]],
 [[10,-4],[-10,0]],[[8,-8],[-5,0]],[[0,-10],[0,0]],[[-5,-6],[5,0]],
]
const bob=[0,1,0,-1,0,1,0,-1]
const masks=limbs.map(()=>new Uint8Array(size*size)),body=Buffer.from(original)
for(const [side,limb]of limbs.entries()){
 const [x0,y0,x1,y1]=limb.region
 for(let y=y0+offset.y;y<y1+offset.y;y++)for(let x=x0+offset.x;x<x1+offset.x;x++){
  const p=y*size+x
  if(original[p*4+3]){masks[side][p]=1;body.fill(0,p*4,p*4+4)}
 }
}
await sharp(body,{raw:{width:size,height:size,channels:4}}).png().toFile(join(root,'body.png'))
const hash=b=>createHash('sha256').update(b).digest('hex')
const atlas=Buffer.alloc(size*4*size*2*4),records=[],panels=[]
function over(dst,at,src,from){
 const a=src[from+3]/255
 if(!a)return
 if(a===1||!dst[at+3]){src.copy(dst,at,from,from+4);return}
 const b=dst[at+3]/255,out=a+b*(1-a)
 for(let c=0;c<3;c++)dst[at+c]=Math.round((src[from+c]*a+dst[at+c]*b*(1-a))/out)
 dst[at+3]=Math.round(out*255)
}
for(let f=0;f<8;f++){
 const separate=[]
 for(const [side,limb]of limbs.entries()){
  const layer=Buffer.alloc(original.length),hip=limb.hipY+offset.y,ankle=limb.ankleY+offset.y,span=ankle-hip
  const [dx,dy]=gait[f][side],delta=dy-bob[f],compression=1+delta/span
  if(compression<=0)throw Error('Collapsed calf in frame '+(f+1))
  for(let y=hip+bob[f];y<=floor+2;y++)for(let x=170;x<330;x++){
   const sy=y>=ankle+dy?y-dy:(y-bob[f]+delta*hip/span)/compression
   const weight=Math.max(0,Math.min(1,(sy-hip)/span)),sx=Math.round(x-dx*weight),iy=Math.round(sy)
   if(sx<0||sx>=size||iy<0||iy>=size||!masks[side][iy*size+sx])continue
   original.copy(layer,(y*size+x)*4,(iy*size+sx)*4,(iy*size+sx)*4+4)
  }
  await sharp(layer,{raw:{width:size,height:size,channels:4}}).png().toFile(join(root,'legs',side?'far':'near',`${f+1}.png`))
  separate.push(layer)
 }
 const dst=Buffer.alloc(original.length)
 for(const side of f>=4&&f<=6?[0,1]:[1,0])for(let p=0;p<size*size;p++)over(dst,p*4,separate[side],p*4)
 let unchanged=0
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const by=y-bob[f]
  if(by>=0&&by<size){const from=(by*size+x)*4;over(dst,(y*size+x)*4,body,from);if(body[from+3]===255)unchanged++}
 }
 const contacts=Array.from({length:size},(_,x)=>dst[(floor*size+x)*4+3]).filter(a=>a>80).length
 if(!contacts)throw Error('No planted shoe in frame '+(f+1))
 const frame=await sharp(dst,{raw:{width:size,height:size,channels:4}}).png().toBuffer()
 writeFileSync(join(root,'frames',`${f+1}.png`),frame)
 panels.push(frame)
 for(let y=0;y<size;y++)dst.copy(atlas,((Math.floor(f/4)*size+y)*size*4+f%4*size)*4,y*size*4,(y+1)*size*4)
 records.push({frame:f+1,bob:bob[f],feet:gait[f],contacts,bodyPixels:unchanged,rgbaHash:hash(dst),legHashes:separate.map(hash)})
}
await sharp(atlas,{raw:{width:2048,height:1024,channels:4}}).png().toFile(join(root,'walk-left.png'))
writeFileSync(join(root,'rig.json'),JSON.stringify({source:'assets/animations/idle.png',sourceFrame:{x:0,y:0,w:444,h:443},sourceOffset:offset,canvas:[size,size],floor,anchorX:256,anchorY:461,referenceHeight:397.5,sourceBodyHash:hash(original),limbs,bob,gait,frameMs:125,frames:records},null,2)+'\n')
console.log(JSON.stringify({frames:8,frameMs:125,referenceHeight:397.5,floor,contacts:records.map(r=>r.contacts)}))
