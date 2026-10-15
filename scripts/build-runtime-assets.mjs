import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {zipSync} from 'fflate';

async function main(){
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=join(repo,'assets/runtime');
const native=['idle','think','read','type','search','check','success','failed','walk'];
const ids=['silver-music','purple-star-cat','orange-flower','blue-fan','blonde-goth','black-beast','whale-dual-pixel','whale-dual-hd'];
const hash=b=>createHash('sha256').update(b).digest('hex'),inputs={};
async function read(path){const data=await readFile(join(repo,path));inputs[path]=hash(data);return data;}
const nativeFiles={};for(const id of native)nativeFiles[id]=await read(`assets/animations/${id}.png`);
const portraits={};
for(const id of ids){
 const manifest=JSON.parse(await read(`assets/characters/${id}/manifest.json`)),f=manifest.character.actions.idle.frames[0];
 const source=await read(`assets/characters/${id}/${manifest.character.atlases[f.atlas]}`);
 portraits['builtin-'+id]={source,rect:{left:f.x,top:f.y,width:f.w,height:f.h},pixel:manifest.character.rendering!=='smooth'};
}
const own=await readFile(fileURLToPath(import.meta.url));inputs.generator=hash(own);
const fingerprint=hash(JSON.stringify(inputs));
try{
 const index=JSON.parse(await readFile(join(out,'index.json'),'utf8'));
 if(index.fingerprint===fingerprint&&await Promise.all(Object.entries(index.outputs).map(async([file,digest])=>hash(await readFile(join(out,file)))===digest)).then(list=>list.every(Boolean))){
  console.log('Runtime assets are current.');return;
 }
}catch{}
await mkdir(out,{recursive:true});
const entries={};
for(const id of native)entries[id+'.webp']=await sharp(nativeFiles[id]).webp({lossless:true,exact:true,effort:4}).toBuffer();
const archive=zipSync(entries,{level:9,mtime:new Date(2026,0,1)});
if(archive.length>20*1024*1024)throw new Error('Native sprite archive exceeds the RPC limit');
await writeFile(join(out,'native-sprites.zip'),archive);
const thumbnails={};
const im=await sharp(nativeFiles.idle).metadata();
portraits['default-deepseek']={source:nativeFiles.idle,rect:{left:0,top:0,width:Math.floor(im.width/4),height:Math.floor(im.height/2)},pixel:false};
for(const [id,p]of Object.entries(portraits)){
 const image=await sharp(p.source).extract(p.rect).trim({threshold:1}).resize(88,88,{fit:'contain',background:'#00000000',kernel:p.pixel?'nearest':'lanczos3'}).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).webp({lossless:true,exact:true}).toBuffer();
 thumbnails[id]='data:image/webp;base64,'+image.toString('base64');
}
const json=JSON.stringify(thumbnails);await writeFile(join(out,'thumbnails.json'),json);
await writeFile(join(out,'index.json'),JSON.stringify({fingerprint,inputs,outputs:{'native-sprites.zip':hash(archive),'thumbnails.json':hash(json)}},null,2)+'\n');
console.log(JSON.stringify({nativeArchiveBytes:archive.length,thumbnailBytes:Buffer.byteLength(json),portraits:Object.keys(thumbnails).length}));
}
await main();
