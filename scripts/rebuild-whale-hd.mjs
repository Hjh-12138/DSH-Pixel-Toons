import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {repo,actions,frontActions,loadFrames,writePack,saveJson,hash} from './whale-art.mjs';

const out=join(repo,'work/whale-source');
for(const part of ['front','walk']){
 const run=spawnSync(process.execPath,[join(repo,`design/whale-source/${part}/render.cjs`),join(out,part)],{cwd:repo,stdio:'inherit',windowsHide:true});
 if(run.status!==0)throw new Error(`${part} rendering failed`);
}
const approved=await loadFrames('hd'),manifest=structuredClone(approved.manifest),frames={};
for(const id of frontActions)frames[id]=await Promise.all(Array.from({length:8},async(_,i)=>{
 const {data,info}=await sharp(join(out,'front/frames',id,String(i+1).padStart(2,'0')+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 return {data,width:info.width,height:info.height};
}));
function alignBlue(data){
 for(let at=0;at<data.length;at+=4){
  if(!data[at+3])continue;
  const [r,g,b]=[data[at],data[at+1],data[at+2]].map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
  if(!d)continue;
  const s=d/(1-Math.abs(2*l-1)),h=(max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4)*60;
  if(h<=205||h>=255||s<=.3)continue;
  const light=l*.91,c=(1-Math.abs(2*light-1))*s*.62,x=c*(1-Math.abs(h/60%2-1)),m=light-c/2;
  const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  for(let k=0;k<3;k++)data[at+k]=Math.round((rgb[k]+m)*255);
 }
 return data;
}
for(const id of ['walk-left','walk-right']){
 frames[id]=[];
 for(let i=0;i<8;i++){
  const source=await sharp(join(out,'walk',String(i+1).padStart(2,'0')+'.png')).extract({left:0,top:0,width:768,height:768}).png().toBuffer();
  const image=await (id==='walk-right'?sharp(source).flop():sharp(source)).resize(408,408).png().toBuffer();
  const anchor=id==='walk-left'?192:320,origin=id==='walk-left'?270:498;
  const data=await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:image,left:Math.round(anchor-origin*408/768),top:66}]).raw().toBuffer();
  frames[id].push({data:alignBlue(data),width:512,height:512});
 }
}
const dir=join(out,'candidate/whale-dual-hd'),zip=await writePack(manifest,frames,dir,'consistent-v2');
await writeFile(join(out,'candidate/whale-dual-hd.toons.zip'),zip);
const differences=[];
for(const id of actions)for(let i=0;i<8;i++){
 const actual=frames[id][i].data,expected=approved.frames[id][i].data;let visibleChannels=0,maxError=0,totalError=0;
 for(let at=0;at<actual.length;at++){
  // Browsers may round RGB below nearly transparent edge pixels differently.
  if((at%4)!==3&&Math.max(actual[at-at%4+3],expected[at-at%4+3])<=1)continue;
  const error=Math.abs(actual[at]-expected[at]);if(error){visibleChannels++;maxError=Math.max(maxError,error);totalError+=error;}
 }
 differences.push({action:id,frame:i+1,exact:hash(actual)===hash(expected),visibleChannels,maxError,meanError:totalError/actual.length});
}
await saveJson(join(out,'rebuild-validation.json'),{frames:104,differences});
if(differences.some(d=>d.maxError>2||d.visibleChannels>32))throw new Error('Rebuilt artwork differs from the approved frames; inspect work/whale-source/rebuild-validation.json');
console.log(JSON.stringify({candidate:'work/whale-source/candidate',frames:104,exact:differences.filter(x=>x.exact).length,maxMeanError:Math.max(...differences.map(x=>x.meanError))}));
