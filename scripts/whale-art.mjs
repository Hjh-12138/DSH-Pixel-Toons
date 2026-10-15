import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {zipSync,strToU8} from 'fflate';

export const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const actions=['idle','think','read','type','search','check','success','failed','walk-left','walk-right','build','git','agents'];
export const labels=['待机','思考','阅读','输入','搜索','测试','完成','失落','向左走','向右走','构建','Git','协作'];
export const frontActions=actions.filter(id=>!id.startsWith('walk-'));
export const hash=data=>createHash('sha256').update(data).digest('hex');
export const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
export async function saveJson(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n');}
export async function loadFrames(form,base=join(repo,'assets/characters')){
 const dir=join(base,`whale-dual-${form}`),manifest=await readJson(join(dir,'manifest.json')),images={};
 for(const [key,file]of Object.entries(manifest.character.atlases))images[key]=await sharp(join(dir,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const frames={};
 for(const [id,clip]of Object.entries(manifest.character.actions))frames[id]=clip.frames.map(f=>{
  const image=images[f.atlas],data=Buffer.alloc(f.w*f.h*4);
  for(let y=0;y<f.h;y++)image.data.copy(data,y*f.w*4,((f.y+y)*image.info.width+f.x)*4,((f.y+y)*image.info.width+f.x+f.w)*4);
  return {data,width:f.w,height:f.h,frame:f};
 });
 return {manifest,frames};
}
// One palette for the entire character, every action, and both clones. No
// per-frame palette fitting or dithering: neither can introduce colour flicker.
export const palette=['080b14','101729','18233e','253450','35476b','435d87','5977a6','7899c5','a1b9d6','244a5d','32768b','65b4c3','0a74a8','33bdde','78e2ef','c5f4f1','444858','6e7489','a6acba','d4d3de','f6ecdf','cd96a8','e5b7c5','f4d0c9','681a37','ab193a','e52a4b'].map(h=>[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)));
const paletteCache=new Map();
export async function pixelFrame(frame,options={}){
 const width=frame.width/8,height=frame.height/8;
 // Area filtering retains subpixel socks and probe beams, then binary alpha
 // and the fixed palette restore a crisp, unblurred native pixel grid.
 const data=await sharp(frame.data,{raw:{width:frame.width,height:frame.height,channels:4}}).resize(width,height,{kernel:options.kernel??'lanczos3'}).raw().toBuffer();
 for(let at=0;at<data.length;at+=4){
  if(data[at+3]<(options.alphaThreshold??64)){data.fill(0,at,at+4);continue;}
  const key=data[at]*65536+data[at+1]*256+data[at+2];let color=paletteCache.get(key);
  if(!color){let best=Infinity;for(const p of palette){const distance=(data[at]-p[0])**2*.8+(data[at+1]-p[1])**2+(data[at+2]-p[2])**2*.8;if(distance<best){best=distance;color=p;}}paletteCache.set(key,color);}
  data[at]=color[0];data[at+1]=color[1];data[at+2]=color[2];data[at+3]=255;
 }
 return {data,width,height};
}
export async function writePack(manifest,frames,dir,prefix){
 const entries={},atlasFiles={},size=manifest.character.rendering==='smooth'?512:64;
 for(let at=0;at<actions.length;at+=2){
  const pair=actions.slice(at,at+2),stride=Math.max(...pair.map(id=>frames[id][0].width)),width=stride*4,height=pair.length*size*2,data=Buffer.alloc(width*height*4),key=`${prefix}-${at/2}`,file=key+(size===512?'.webp':'.png');
  for(const [row,id]of pair.entries())for(const [i,f]of frames[id].entries()){
   const x=i%4*stride,y=(row*2+Math.floor(i/4))*size;
   for(let line=0;line<f.height;line++)f.data.copy(data,((y+line)*width+x)*4,line*f.width*4,(line+1)*f.width*4);
   Object.assign(manifest.character.actions[id].frames[i],{atlas:key,x,y});
  }
  const image=sharp(data,{raw:{width,height,channels:4}});
  entries[file]=await (size===512?image.webp({lossless:true,exact:true,effort:6}):image.png()).toBuffer();atlasFiles[key]=file;
 }
 manifest.character.atlases=atlasFiles;entries['manifest.json']=strToU8(JSON.stringify(manifest,null,2)+'\n');
 await mkdir(dir,{recursive:true});for(const [file,data]of Object.entries(entries))await writeFile(join(dir,file),data);
 // A constant timestamp makes repeat builds of the ZIP byte-identical.
 return zipSync(entries,{level:9,mtime:new Date('2026-01-01T00:00:00Z')});
}
