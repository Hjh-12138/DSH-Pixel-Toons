import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {unzipSync} from 'fflate';
import {repo,actions,labels,frontActions,loadFrames,pixelFrame,hash,readJson,saveJson} from './whale-art.mjs';

function region(f,[x,y,w,h],offset=0){
 const data=Buffer.alloc(w*h*4);
 for(let row=0;row<h;row++)f.data.copy(data,row*w*4,((row+y)*f.width+x+offset)*4,((row+y)*f.width+x+offset+w)*4);
 for(let at=0;at<data.length;at+=4)if(data[at+3]<=1)data.fill(0,at,at+4);
 return data;
}
function tailConnection(f,unit,reference){
 // Flood the actual opaque pixels from the torso, then examine the tail/hair
 // area behind the body. The separate floating robot lies above this area.
 const {data,width,height}=f,seen=new Uint8Array(width*height),queue=[];
 const opaque=at=>data[at*4+3]>=96;
 const seed=Math.floor(330/unit)*width+Math.floor((256+(width===768?128:width===96?16:0)*unit)/unit);
 assert.ok(opaque(seed),'torso seed must be opaque');queue.push(seed);seen[seed]=1;
 for(let at=0;at<queue.length;at++){
  const n=queue[at],x=n%width,y=Math.floor(n/width);
  for(const v of [x?n-1:-1,x+1<width?n+1:-1,y?n-width:-1,y+1<height?n+width:-1])if(v>=0&&!seen[v]&&opaque(v)){seen[v]=1;queue.push(v);}
 }
 const shift=width===768?128:width===96?16:0;let total=0,connected=0;
 for(let y=Math.ceil(270/unit);y<Math.floor(435/unit);y++)for(let x=Math.ceil(375/unit)+shift;x<Math.floor(493/unit)+shift;x++){
  const n=y*width+x,referenceAt=(y*reference.width+x-shift)*4;
  if(reference.data[referenceAt+3]>=96){total++;if(opaque(n)&&seen[n])connected++;}
 }
 return {total,connected,ratio:connected/Math.max(1,total)};
}
export function verifySharedFrame(form,id,i,frames,identity){
 const unit=form==='hd'?1:8,f=frames[id][i],bodyIndex=id==='failed'?identity.failedBodyFrames[i]:i,offset=id==='agents'?128/unit:0;
 for(const [name,rect]of Object.entries(identity.protectedRegions[form]))assert.deepEqual(region(f,rect,offset),region(frames.idle[name==='robot'?i:bodyIndex],rect),`${form}/${id}/${i+1}: ${name} changed from the shared idle body`);
 const tail=tailConnection(f,unit,id==='agents'?frames.idle[i]:f);assert.ok(tail.total>40/unit,`${form}/${id}/${i+1} tail is missing`);assert.ok(tail.ratio>.98,`${form}/${id}/${i+1} tail is detached (${tail.ratio})`);
}
export function verifyPixelWalkingFeet(f){
 const {data,width,height}=f,labels=new Int32Array(width*height),sizes=[0];let label=0;
 for(let n=0;n<labels.length;n++)if(data[n*4+3]&&!labels[n]){
  label++;const queue=[n];labels[n]=label;
  for(let at=0;at<queue.length;at++){const v=queue[at],x=v%width,y=Math.floor(v/width);for(const k of [x?v-1:-1,x+1<width?v+1:-1,y?v-width:-1,y+1<height?v+width:-1])if(k>=0&&!labels[k]&&data[k*4+3]){labels[k]=label;queue.push(k);}}
  sizes.push(queue.length);
 }
 const main=sizes.indexOf(Math.max(...sizes));let contacts=0;
 for(let y=52;y<58;y++)for(let x=17;x<47;x++){
  const at=y*width+x;if(data[at*4+3])assert.equal(labels[at],main,'pixel walking shoes or socks detached from the body');
  if(y===55&&data[at*4+3])contacts++;
 }
 assert.ok(contacts>=2,'pixel walking must keep a planted sole on the common floor');
}
export async function inspectWhaleArt(){
 const identity=await readJson(join(repo,'design/whale-source/identity.json')),packs={hd:await loadFrames('hd'),pixel:await loadFrames('pixel')},summary=[];
 for(const [form,{manifest,frames}]of Object.entries(packs)){
  const unit=form==='hd'?1:8,character=manifest.character;
  assert.deepEqual(new Set(Object.keys(character.actions)),new Set(actions));
  const archive=unzipSync(await readFile(join(repo,`examples/character-packs/whale-dual-${form}.toons.zip`)));
  for(const file of ['manifest.json',...Object.values(character.atlases)])assert.deepEqual(Buffer.from(archive[file]),await readFile(join(repo,`assets/characters/whale-dual-${form}`,file)),`${form} archive differs from runtime ${file}`);
  for(const id of actions){
   const clip=character.actions[id];assert.equal(clip.frames.length,8);assert.equal(clip.loop,!['success','failed'].includes(id));
   assert.equal(new Set(frames[id].map(f=>hash(f.data))).size,8,`${form}/${id} repeats a frame`);
   for(let i=0;i<8;i++){
    const f=frames[id][i],spec=clip.frames[i];assert.equal(spec.durationMs,identity.frameMs);assert.equal(spec.anchorY,448/unit);
    assert.equal(spec.anchorX,(id==='agents'?384:id==='walk-left'?192:id==='walk-right'?320:256)/unit);
    for(let x=0;x<f.width;x++)assert.equal(f.data[x*4+3]+f.data[((f.height-1)*f.width+x)*4+3],0,`${form}/${id}/${i+1} touches top/bottom edge`);
    for(let y=0;y<f.height;y++)assert.equal(f.data[y*f.width*4+3]+f.data[(y*f.width+f.width-1)*4+3],0,`${form}/${id}/${i+1} touches side edge`);
    if(frontActions.includes(id))verifySharedFrame(form,id,i,frames,identity);
    if(form==='pixel'){
     const expected=await pixelFrame(packs.hd.frames[id][i]);assert.deepEqual(f.data,expected.data,`${id}/${i+1} pixel pose or palette no longer corresponds to HD`);
     assert.equal(f.width,packs.hd.frames[id][i].width/8);assert.equal(f.height,64);
     if(id.startsWith('walk-'))verifyPixelWalkingFeet(f);
    }
   }
   summary.push({form,action:id,frames:8,frameMs:125,distinctFrames:8});
  }
 }
 // Catch accidental edits to any source layer, not just selected face crops.
 const baseline=await readJson(join(repo,'design/whale-source/source-lock.json'));
 for(const [file,expected]of Object.entries(baseline.files))assert.equal(hash(await readFile(join(repo,'design/whale-source',file))),expected,`Archived source changed: ${file}; inspect and explicitly revise the source lock after approval`);
 const approved=await readJson(join(repo,'design/whale-source/approved-hd-frames.json'));
 for(const id of actions)for(let i=0;i<8;i++)assert.equal(hash(packs.hd.frames[id][i].data),approved.actions[id][i],`${id}/${i+1}: approved HD artwork changed; compare the review before updating its baseline`);
 return {packs,identity,report:{actionsPerForm:13,frames:208,protectedHeadShoesRobot:true,tailConnected:true,pixelPosesMatchHD:true,sourceLayersVerified:Object.keys(baseline.files).length,actions:summary}};
}

export async function writeReview({packs,identity,report},out=join(repo,'work/character-review')){
 await mkdir(join(out,'frames'),{recursive:true});const tiles=[],frameUrls={},tileW=480,tileH=270,cols=3;
 for(const [j,id]of actions.entries()){
  frameUrls[id]={};
  for(const form of ['hd','pixel']){
   frameUrls[id][form]=[];
   for(let i=0;i<8;i++){
    const f=packs[form].frames[id][i],file=`${id}-${form}-${i}.png`,png=await sharp(f.data,{raw:{width:f.width,height:f.height,channels:4}}).png().toBuffer();
    await writeFile(join(out,'frames',file),png);frameUrls[id][form].push(`frames/${file}`);
   }
   const f=packs[form].frames[id][3],w=id==='agents'?312:208,h=208,pic=await sharp(f.data,{raw:{width:f.width,height:f.height,channels:4}}).resize(w,h,{kernel:form==='pixel'?'nearest':'lanczos3'}).png().toBuffer();
   tiles.push({input:pic,left:j%cols*tileW+(id==='agents'?(form==='hd'?0:360):(form==='hd'?16:256)),top:Math.floor(j/cols)*tileH+28});
  }
 }
 const W=cols*tileW,H=Math.ceil(actions.length/cols)*tileH;
 const captions=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${actions.map((id,i)=>`<g fill="#304158" font-family="Microsoft YaHei,sans-serif"><text x="${i%cols*tileW+12}" y="${Math.floor(i/cols)*tileH+23}" font-size="17">${labels[i]}</text><text x="${i%cols*tileW+(id==='agents'?130:80)}" y="${Math.floor(i/cols)*tileH+254}" font-size="12">高清</text><text x="${i%cols*tileW+(id==='agents'?490:320)}" y="${Math.floor(i/cols)*tileH+254}" font-size="12">像素</text></g>`).join('')}</svg>`);
 await sharp({create:{width:W,height:H,channels:4,background:'#e6e6e6'}}).composite([...tiles,{input:captions,left:0,top:0}]).png().toFile(join(out,'overview.png'));
 // Enlarged 8-frame sheets expose duplicate hands, detached tails and seams.
 for(const id of ['idle','check','build','git','agents']){
  const parts=[];for(let i=0;i<8;i++){const f=packs.pixel.frames[id][i],pic=await sharp(f.data,{raw:{width:f.width,height:f.height,channels:4}}).resize(f.width*4,256,{kernel:'nearest'}).png().toBuffer();parts.push({input:pic,left:i%4*f.width*4,top:Math.floor(i/4)*256});}
  const width=packs.pixel.frames[id][0].width*16;
  await sharp({create:{width,height:512,channels:4,background:'#e6e6e6'}}).composite(parts).png().toFile(join(out,id+'-pixel-sheet.png'));
 }
 const html=(await readFile(new URL('./whale-review.html',import.meta.url),'utf8'))
  .replace('{{OPTIONS}}',actions.map((id,i)=>`<option value="${id}">${labels[i]}</option>`).join(''))
  .replace('{{CHECKLIST}}',identity.reviewChecklist.map(s=>`<li>${s}</li>`).join(''))
  .replace('{{FRAMES}}',JSON.stringify(frameUrls));
 await writeFile(join(out,'index.html'),html);await saveJson(join(out,'validation.json'),report);
 return relative(repo,out).replaceAll('\\','/');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const result=await inspectWhaleArt();console.log(JSON.stringify({review:await writeReview(result),...result.report}));
 }catch(error){
  // A failed visual check must still leave a fresh comparison to investigate.
  const report={passed:false,error:error.message};
  try{await writeReview({packs:{hd:await loadFrames('hd'),pixel:await loadFrames('pixel')},identity:await readJson(join(repo,'design/whale-source/identity.json')),report});}catch{}
  console.error(error);process.exitCode=1;
 }
}
