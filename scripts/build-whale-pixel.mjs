import {join} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {repo,actions,loadFrames,pixelFrame,writePack,hash,saveJson,palette} from './whale-art.mjs';

// Export the existing editable HD animation at a fixed 1:8 pixel grid. Keeping
// every action in this pipeline prevents three new poses from becoming a
// different character from the older idle/work poses.
const source=await loadFrames('hd'),manifest=structuredClone(source.manifest),frames={},records={};
manifest.id='whale-dual-pixel';manifest.name='鲸鱼娘 · 像素';
manifest.description='与高清版共用人物与姿势的十三动作像素形态；8帧×125毫秒，独立构建、Git及双分身协作。';
manifest.character.rendering='pixelated';manifest.character.referenceHeight/=8;
for(const id of actions){
 frames[id]=await Promise.all(source.frames[id].map(f=>pixelFrame(f)));
 manifest.character.actions[id].frames.forEach(f=>{for(const key of ['w','h','anchorX','anchorY'])f[key]/=8;f.durationMs=125;});
 records[id]=frames[id].map((f,i)=>({source:hash(source.frames[id][i].data),pixel:hash(f.data)}));
}
const dir=join(repo,'assets/characters/whale-dual-pixel');
const zip=await writePack(manifest,frames,dir,'paired-v1');
await mkdir(join(repo,'examples/character-packs'),{recursive:true});
await writeFile(join(repo,'examples/character-packs/whale-dual-pixel.toons.zip'),zip);
await saveJson(join(repo,'design/whale-source/pixel-export.json'),{scale:1/8,kernel:'lanczos3',alphaThreshold:64,palette,frameMs:125,actions:records});
console.log(JSON.stringify({actions:actions.length,frames:104,archiveBytes:zip.length,distinct:Object.fromEntries(actions.map(id=>[id,new Set(frames[id].map(f=>hash(f.data))).size]))}));
